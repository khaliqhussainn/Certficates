// app/api/exam/complete/route.ts - FIXED VERSION
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId, reason = 'USER_SUBMIT', answers = {}, violations = [], timeSpent = 0 } = await request.json()

    console.log('Completing exam:', { sessionId, reason, answersCount: Object.keys(answers).length })

    // Get exam session with all related data
    const examSession = await prisma.examSession.findFirst({
      where: {
        id: sessionId,
        userId: session.user.id
      }
    })

    if (!examSession) {
      return NextResponse.json({ error: 'Invalid exam session' }, { status: 403 })
    }

    // Get course info
    const course = await prisma.course.findUnique({
      where: { id: examSession.courseId }
    })

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // Get or create exam attempt
    let examAttempt = null
    if (examSession.examAttemptId) {
      examAttempt = await prisma.examAttempt.findUnique({
        where: { id: examSession.examAttemptId },
        include: {
          answers: {
            include: {
              question: {
                select: {
                  correctAnswer: true
                }
              }
            }
          }
        }
      })
    }

    // Create exam attempt if it doesn't exist (fallback)
    if (!examAttempt) {
      examAttempt = await prisma.examAttempt.create({
        data: {
          userId: session.user.id,
          courseId: examSession.courseId,
          sessionId: sessionId,
          startedAt: examSession.startTime || examSession.createdAt
        },
        include: {
          answers: {
            include: {
              question: {
                select: {
                  correctAnswer: true
                }
              }
            }
          }
        }
      })

      await prisma.examSession.update({
        where: { id: sessionId },
        data: { examAttemptId: examAttempt.id }
      })
    }

    // Save any remaining answers from the frontend
    for (const [questionId, selectedAnswer] of Object.entries(answers)) {
      const question = await prisma.examQuestion.findUnique({
        where: { id: questionId }
      })

      if (question && typeof selectedAnswer === 'number') {
        const isCorrect = selectedAnswer === question.correctAnswer

        await prisma.examAnswer.upsert({
          where: {
            examAttemptId_questionId: {
              examAttemptId: examAttempt.id,
              questionId: questionId
            }
          },
          update: {
            selectedAnswer: selectedAnswer,
            isCorrect: isCorrect
          },
          create: {
            examAttemptId: examAttempt.id,
            questionId: questionId,
            selectedAnswer: selectedAnswer,
            isCorrect: isCorrect,
            timeSpent: 0
          }
        })
      }
    }

    // Refresh exam attempt with all answers
    const finalExamAttempt = await prisma.examAttempt.findUnique({
      where: { id: examAttempt.id },
      include: {
        answers: {
          include: {
            question: {
              select: {
                correctAnswer: true
              }
            }
          }
        }
      }
    })

    if (!finalExamAttempt) {
      return NextResponse.json({ error: 'Failed to load exam attempt' }, { status: 500 })
    }

    // Calculate score
    const totalQuestions = finalExamAttempt.answers.length
    const correctAnswers = finalExamAttempt.answers.filter(a => a.isCorrect).length
    const score = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0
    const passed = score >= course.passingScore && reason !== 'SECURITY_VIOLATION'

    // Calculate actual time spent
    const startTime = examSession.startTime || examSession.createdAt
    const actualTimeSpent = Math.round((Date.now() - startTime.getTime()) / 1000 / 60) // minutes

    console.log('Exam completion stats:', {
      totalQuestions,
      correctAnswers,
      score: score.toFixed(1),
      passed,
      timeSpent: actualTimeSpent
    })

    // Update exam attempt with final results
    await prisma.examAttempt.update({
      where: { id: finalExamAttempt.id },
      data: {
        score: score,
        passed: passed,
        completedAt: new Date(),
        timeSpent: actualTimeSpent,
        violations: violations.length > 0 ? violations : undefined
      }
    })

    // Update exam session
    const sessionStatus = reason === 'SECURITY_VIOLATION' ? 'TERMINATED' : 'COMPLETED'
    await prisma.examSession.update({
      where: { id: sessionId },
      data: {
        status: sessionStatus,
        endTime: new Date(),
        score: score,
        passed: passed,
        violations: violations.length > 0 ? violations : examSession.violations
      }
    })

    // Generate certificate if passed
    let certificate = null
    if (passed && reason !== 'SECURITY_VIOLATION') {
      const certificateNumber = `CERT-${course.id.substring(0, 8).toUpperCase()}-${Date.now()}`
      
      certificate = await prisma.certificate.create({
        data: {
          userId: session.user.id,
          courseId: examSession.courseId,
          examAttemptId: finalExamAttempt.id,
          certificateNumber: certificateNumber,
          score: score,
          grade: score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : 'D',
          verificationCode: `VER-${certificateNumber}`,
          issuedAt: new Date(),
          validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Valid for 1 year
          isValid: true
        }
      })

      console.log('Certificate generated:', certificate.certificateNumber)
    }

    const response = {
      success: true,
      examId: finalExamAttempt.id,
      sessionId: sessionId,
      results: {
        score: parseFloat(score.toFixed(1)),
        percentage: Math.round(score),
        passed: passed,
        totalQuestions: totalQuestions,
        correctAnswers: correctAnswers,
        timeSpent: actualTimeSpent,
        passingScore: course.passingScore
      },
      certificate: certificate ? {
        certificateNumber: certificate.certificateNumber,
        verificationCode: certificate.verificationCode,
        grade: certificate.grade
      } : null,
      reason: reason,
      violations: violations.length
    }

    console.log('Exam completed successfully:', response.results)

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error completing exam:', error)
    return NextResponse.json(
      { 
        error: 'Failed to complete exam',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      }, 
      { status: 500 }
    )
  }
}
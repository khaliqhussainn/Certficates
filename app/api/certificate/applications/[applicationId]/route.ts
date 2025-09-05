// app/api/certificate/application/[applicationId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: { applicationId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { applicationId } = params

    const application = await prisma.examApplication.findUnique({
      where: { 
        id: applicationId,
        userId: session.user.id 
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            examDuration: true,
            totalQuestions: true,
            passingScore: true
          }
        },
        examSession: {
          select: {
            id: true,
            status: true,
            startedAt: true,
            endedAt: true,
            score: true,
            passed: true,
            violations: true
          }
        }
      }
    })

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    const response = {
      id: application.id,
      courseId: application.courseId,
      courseName: application.course.title,
      courseTitle: application.course.title,
      status: application.status,
      paymentStatus: application.paymentStatus,
      amountPaid: application.amountPaid,
      currency: application.currency,
      scheduledAt: application.scheduledAt,
      createdAt: application.createdAt,
      examDuration: application.course.examDuration,
      totalQuestions: application.course.totalQuestions,
      passingScore: application.course.passingScore,
      examSession: application.examSession
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error fetching application:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

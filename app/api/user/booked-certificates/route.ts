// app/api/user/booked-certificates/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get courses that user has paid for (booked certificate exams)
    const payments = await prisma.payment.findMany({
      where: {
        userId: session.user.id,
        status: 'COMPLETED'
      },
      include: {
        course: true
      },
      orderBy: { createdAt: 'desc' }
    })

    const bookedCourses = []

    for (const payment of payments) {
      // Get additional data for each course
      const [completion, certificate, examAttempts] = await Promise.all([
        prisma.courseCompletion.findUnique({
          where: {
            userId_courseId: {
              userId: session.user.id,
              courseId: payment.courseId
            }
          }
        }),
        prisma.certificate.findFirst({
          where: {
            userId: session.user.id,
            courseId: payment.courseId,
            isRevoked: false
          }
        }),
        prisma.examAttempt.findMany({
          where: {
            userId: session.user.id,
            courseId: payment.courseId
          },
          orderBy: { startedAt: 'desc' }
        })
      ])

      bookedCourses.push({
        ...payment.course,
        payment: {
          id: payment.id,
          amount: payment.amount,
          status: payment.status,
          createdAt: payment.createdAt
        },
        completion,
        certificate,
        examAttempts,
        canTakeExam: !!completion && !certificate
      })
    }

    return NextResponse.json({ bookedCourses })

  } catch (error) {
    console.error('Error fetching booked certificates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch booked certificates' },
      { status: 500 }
    )
  }
}

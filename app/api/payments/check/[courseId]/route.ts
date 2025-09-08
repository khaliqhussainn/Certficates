// app/api/payments/check/[courseId]/route.ts - Fixed with correct schema fields
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { courseId } = params

    // Validate courseId parameter
    if (!courseId || typeof courseId !== 'string') {
      return NextResponse.json({ error: 'Invalid course ID' }, { status: 400 })
    }

    // Check for completed payment for this course
    const payment = await prisma.payment.findFirst({
      where: {
        userId: session.user.id,
        courseId,
        status: 'COMPLETED'
      },
      orderBy: { createdAt: 'desc' },
      include: {
        course: { select: { title: true } }
      }
    })

    if (payment) {
      return NextResponse.json({
        hasPayment: true,
        payment: {
          id: payment.id,
          status: payment.status,
          amount: payment.amount,
          currency: payment.currency,
          provider: payment.provider,
          createdAt: payment.createdAt,
          course: payment.course
        }
      })
    }

    // Check for pending payments
    const pendingPayment = await prisma.payment.findFirst({
      where: {
        userId: session.user.id,
        courseId,
        status: { in: ['PENDING', 'PROCESSING'] }
      },
      orderBy: { createdAt: 'desc' },
      include: {
        course: { select: { title: true } }
      }
    })

    if (pendingPayment) {
      return NextResponse.json({
        hasPayment: true,
        payment: {
          id: pendingPayment.id,
          status: pendingPayment.status,
          amount: pendingPayment.amount,
          currency: pendingPayment.currency,
          provider: pendingPayment.provider,
          createdAt: pendingPayment.createdAt,
          course: pendingPayment.course
        }
      })
    }

    return NextResponse.json({
      hasPayment: false,
      payment: null
    })

  } catch (error) {
    console.error('Payment check error:', error)
    return NextResponse.json(
      { error: 'Failed to check payment status' },
      { status: 500 }
    )
  }
}

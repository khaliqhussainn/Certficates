// app/api/payments/status/[paymentId]/route.ts - Payment Status Check
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PaymentService } from '@/lib/payment-providers'

export async function GET(
  request: NextRequest,
  { params }: { params: { paymentId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { paymentId } = params

    // Get payment from database
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true } }
      }
    })

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Verify user owns this payment
    if (payment.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check payment status with provider if still pending
    if (payment.status === 'PENDING' || payment.status === 'PROCESSING') {
      try {
        const paymentService = new PaymentService()
        const providerPayment = await paymentService.retrievePayment(
          payment.providerPaymentId,
          payment.provider as 'moyasar' | 'tap'
        )

        // Update payment status if changed
        if (providerPayment.status !== payment.status.toLowerCase()) {
          const updatedPayment = await prisma.payment.update({
            where: { id: paymentId },
            data: {
              status: providerPayment.status.toUpperCase() as any,
              updatedAt: new Date()
            }
          })

          // If payment completed, update user status for exam access
          if (providerPayment.status === 'succeeded') {
            await updateUserExamAccess(payment.userId, payment.courseId)
          }

          return NextResponse.json({
            success: true,
            payment: {
              ...updatedPayment,
              providerStatus: providerPayment.status
            }
          })
        }
      } catch (error) {
        console.error('Error checking payment status with provider:', error)
        // Continue with database status if provider check fails
      }
    }

    return NextResponse.json({
      success: true,
      payment
    })

  } catch (error) {
    console.error('Payment status check error:', error)
    return NextResponse.json(
      { error: 'Failed to check payment status' },
      { status: 500 }
    )
  }
}

async function updateUserExamAccess(userId: string, courseId: string) {
  // Grant exam access - this could be implemented as a separate table
  // or by checking payment status directly in exam routes
  console.log(`Granting exam access to user ${userId} for course ${courseId}`)
  
  // Optional: Create a specific exam access record
  try {
    await prisma.$executeRaw`
      INSERT INTO user_exam_access (user_id, course_id, granted_at, access_type)
      VALUES (${userId}, ${courseId}, NOW(), 'PAID')
      ON CONFLICT (user_id, course_id) DO UPDATE SET
        granted_at = NOW(),
        access_type = 'PAID'
    `
  } catch (error) {
    // Table might not exist yet, that's okay
    console.log('Exam access tracking not available yet')
  }
}
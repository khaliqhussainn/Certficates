// app/api/payments/tap/callback/route.ts - Tap Payments webhook
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PaymentService, PAYMENT_STATUS_MAP } from '@/lib/payment-providers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Tap Payments callback received:', body)

    const { id: paymentId, status, reference } = body

    if (!paymentId) {
      return NextResponse.json({ error: 'Missing payment ID' }, { status: 400 })
    }

    // Find payment in database
    const payment = await prisma.payment.findFirst({
      where: { providerPaymentId: paymentId }
    })

    if (!payment) {
      console.error('Payment not found for Tap callback:', paymentId)
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Verify payment with Tap
    const paymentService = new PaymentService('tap')
    const verifiedPayment = await paymentService.retrievePayment(paymentId, 'tap')

    // Update payment status
    const mappedStatus = PAYMENT_STATUS_MAP[verifiedPayment.status] || 'PENDING'
    
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: mappedStatus as any,
        providerTransactionId: reference?.transaction || reference?.acquirer,
        metadata: {
          ...payment.metadata,
          providerCallback: body,
          verificationTime: new Date().toISOString()
        },
        updatedAt: new Date()
      }
    })

    // If payment completed, grant exam access
    if (mappedStatus === 'COMPLETED') {
      await grantExamAccess(payment.userId, payment.courseId)
      
      // Create notification
      await prisma.notification.create({
        data: {
          userId: payment.userId,
          title: 'Payment Successful',
          message: 'Your certificate exam payment has been processed. You can now take the exam.',
          type: 'SUCCESS',
          actionUrl: `/exam/${payment.courseId}`
        }
      })
    }

    return NextResponse.json({ success: true, status: mappedStatus })

  } catch (error) {
    console.error('Tap Payments callback error:', error)
    return NextResponse.json(
      { error: 'Callback processing failed' },
      { status: 500 }
    )
  }
}

async function grantExamAccess(userId: string, courseId: string) {
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

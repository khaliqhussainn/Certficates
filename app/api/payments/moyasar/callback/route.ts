// app/api/payments/moyasar/callback/route.ts - Moyasar webhook
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PaymentService, PAYMENT_STATUS_MAP } from '@/lib/payment-providers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Moyasar callback received:', body)

    const { id: paymentId, status, metadata } = body

    if (!paymentId) {
      return NextResponse.json({ error: 'Missing payment ID' }, { status: 400 })
    }

    // Find payment in database
    const payment = await prisma.payment.findFirst({
      where: { providerPaymentId: paymentId }
    })

    if (!payment) {
      console.error('Payment not found for Moyasar callback:', paymentId)
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Verify payment with Moyasar
    const paymentService = new PaymentService('moyasar')
    const verifiedPayment = await paymentService.retrievePayment(paymentId, 'moyasar')

    // Update payment status
    const mappedStatus = PAYMENT_STATUS_MAP[verifiedPayment.status] || 'PENDING'
    
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: mappedStatus as any,
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
    console.error('Moyasar callback error:', error)
    return NextResponse.json(
      { error: 'Callback processing failed' },
      { status: 500 }
    )
  }
}

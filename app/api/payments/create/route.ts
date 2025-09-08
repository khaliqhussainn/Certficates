// app/api/payments/create/route.ts - Complete Payment Creation API
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PaymentService } from '@/lib/payment-providers'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { courseId, provider = 'moyasar' } = body

    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 })
    }

    // Get course details
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true, certificatePrice: true, certificateEnabled: true }
    })

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    if (!course.certificateEnabled) {
      return NextResponse.json({ error: 'Certificate not available for this course' }, { status: 400 })
    }

    // Check if user already has a valid payment for this course
    const existingPayment = await prisma.payment.findFirst({
      where: {
        userId: session.user.id,
        courseId,
        status: 'COMPLETED'
      }
    })

    if (existingPayment) {
      return NextResponse.json({ error: 'You have already paid for this course certificate' }, { status: 400 })
    }

    // Create payment intent
    const paymentService = new PaymentService(provider as 'moyasar' | 'tap')
    const paymentIntent = await paymentService.createPayment(
      course.certificatePrice,
      courseId,
      session.user.id,
      provider as 'moyasar' | 'tap'
    )

    // Save payment record in database
    const payment = await prisma.payment.create({
      data: {
        userId: session.user.id,
        courseId,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: 'PENDING',
        provider: paymentIntent.provider,
        providerPaymentId: paymentIntent.id,
        metadata: {
          clientSecret: paymentIntent.clientSecret,
          ...paymentIntent.metadata
        }
      }
    })

    // Generate checkout URL
    const checkoutUrl = await paymentService.generateCheckoutUrl(paymentIntent.id, provider as 'moyasar' | 'tap')

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        provider: payment.provider,
        providerPaymentId: payment.providerPaymentId,
        checkoutUrl,
        clientSecret: paymentIntent.clientSecret
      }
    })

  } catch (error) {
    console.error('Payment creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    )
  }
}
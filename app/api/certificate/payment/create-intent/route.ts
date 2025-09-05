// app/api/certificate/payment/create-intent/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20'
})

interface CreatePaymentIntentRequest {
  courseId: string
  currency?: string
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { courseId, currency = 'USD' }: CreatePaymentIntentRequest = await req.json()

    if (!courseId) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      )
    }

    // Get course details
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        title: true,
        certificatePrice: true,
        certificateDiscount: true,
        certificateEnabled: true,
        passingScore: true,
        examDuration: true,
        totalQuestions: true
      }
    })

    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    if (!course.certificateEnabled) {
      return NextResponse.json(
        { error: 'Certificate is not available for this course' },
        { status: 400 }
      )
    }

    // Check if user already has an application for this course
    const existingApplication = await prisma.examApplication.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId: courseId
        }
      }
    })

    if (existingApplication) {
      return NextResponse.json(
        { error: 'You have already applied for this certificate exam' },
        { status: 400 }
      )
    }

    // Calculate final price
    const basePrice = course.certificatePrice
    const discount = course.certificateDiscount || 0
    const finalPrice = basePrice - (basePrice * discount / 100)
    const amountInCents = Math.round(finalPrice * 100)

    // Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currency.toLowerCase(),
      metadata: {
        userId: session.user.id,
        courseId: courseId,
        courseName: course.title,
        originalPrice: basePrice.toString(),
        discount: discount.toString(),
        finalPrice: finalPrice.toString()
      },
      description: `Certificate Exam for ${course.title}`,
      automatic_payment_methods: {
        enabled: true
      }
    })

    // Create exam application record
    const application = await prisma.examApplication.create({
      data: {
        userId: session.user.id,
        courseId: courseId,
        paymentIntentId: paymentIntent.id,
        amountPaid: finalPrice,
        currency: currency.toUpperCase(),
        status: 'PENDING_PAYMENT'
      },
      include: {
        course: {
          select: {
            title: true,
            certificatePrice: true,
            certificateDiscount: true
          }
        }
      }
    })

    // Create payment record
    await prisma.payment.create({
      data: {
        userId: session.user.id,
        applicationId: application.id,
        stripePaymentIntentId: paymentIntent.id,
        amount: finalPrice,
        currency: currency.toUpperCase(),
        description: `Certificate Exam Payment for ${course.title}`,
        metadata: {
          courseId: courseId,
          examDuration: course.examDuration,
          totalQuestions: course.totalQuestions,
          passingScore: course.passingScore
        }
      }
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      applicationId: application.id,
      amount: finalPrice,
      currency: currency.toUpperCase(),
      courseName: course.title
    })

  } catch (error) {
    console.error('Payment intent creation error:', error)
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: `Payment error: ${error.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Webhook to handle payment confirmation
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { paymentIntentId } = await req.json()

    // Retrieve the payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    if (paymentIntent.status === 'succeeded') {
      // Update application status
      const application = await prisma.examApplication.findFirst({
        where: {
          paymentIntentId: paymentIntentId,
          userId: session.user.id
        }
      })

      if (!application) {
        return NextResponse.json(
          { error: 'Application not found' },
          { status: 404 }
        )
      }

      // Update application and payment status
      await prisma.$transaction([
        prisma.examApplication.update({
          where: { id: application.id },
          data: {
            status: 'PAYMENT_CONFIRMED',
            paymentStatus: 'COMPLETED'
          }
        }),
        prisma.payment.updateMany({
          where: {
            stripePaymentIntentId: paymentIntentId,
            userId: session.user.id
          },
          data: {
            status: 'COMPLETED'
          }
        }),
        // Create notification
        prisma.notification.create({
          data: {
            userId: session.user.id,
            title: 'Payment Confirmed',
            message: 'Your certificate exam payment has been confirmed. You can now schedule your exam.',
            type: 'SUCCESS',
            actionUrl: `/certificate/application/${application.id}`
          }
        })
      ])

      return NextResponse.json({
        success: true,
        applicationId: application.id,
        status: 'PAYMENT_CONFIRMED'
      })
    }

    return NextResponse.json(
      { error: 'Payment not confirmed' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Payment confirmation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
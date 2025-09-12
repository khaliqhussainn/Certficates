// app/api/payments/create-exam-payment/route.ts - UPDATED (Remove completion check)
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { courseId } = await request.json()

    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 })
    }

    // Check if course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId }
    })

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // REMOVED: Course completion requirement
    // The course completion check has been removed - users can now book certificate exams
    // without completing the course first

    // Check if user already paid for this course
    const existingPayment = await prisma.payment.findFirst({
      where: {
        userId: session.user.id,
        courseId: courseId,
        status: 'COMPLETED'
      }
    })

    if (existingPayment) {
      return NextResponse.json({ 
        error: 'You have already paid for this certificate exam' 
      }, { status: 400 })
    }

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(course.certificatePrice * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        userId: session.user.id,
        courseId: courseId,
        type: 'certificate_exam'
      }
    })

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        userId: session.user.id,
        courseId: courseId,
        amount: course.certificatePrice,
        currency: 'USD',
        status: 'PENDING',
        stripePaymentIntentId: paymentIntent.id,
        metadata: {
          type: 'CERTIFICATE_EXAM',
          courseTitle: course.title,
          note: 'Course completion not required for certificate exam'
        }
      }
    })

    return NextResponse.json({
      paymentId: payment.id,
      clientSecret: paymentIntent.client_secret,
      amount: course.certificatePrice
    })

  } catch (error) {
    console.error('Error creating payment:', error)
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    )
  }
}
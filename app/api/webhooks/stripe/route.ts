// app/api/webhooks/stripe/route.ts - Stripe Webhook Handler
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20'
})

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, endpointSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent)
        break
      
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent)
        break
      
      default:
        console.log(`Unhandled event type ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const { userId, courseId } = paymentIntent.metadata

  if (!userId || !courseId) {
    console.error('Missing metadata in payment intent:', paymentIntent.id)
    return
  }

  await prisma.$transaction([
    // Update exam application status
    prisma.examApplication.updateMany({
      where: {
        paymentIntentId: paymentIntent.id,
        userId: userId
      },
      data: {
        status: 'PAYMENT_CONFIRMED',
        paymentStatus: 'COMPLETED'
      }
    }),

    // Update payment status
    prisma.payment.updateMany({
      where: {
        stripePaymentIntentId: paymentIntent.id,
        userId: userId
      },
      data: {
        status: 'COMPLETED'
      }
    }),

    // Create notification
    prisma.notification.create({
      data: {
        userId: userId,
        title: 'Payment Confirmed',
        message: 'Your certificate exam payment has been confirmed. You can now schedule your exam.',
        type: 'SUCCESS',
        actionUrl: '/certificate/dashboard'
      }
    })
  ])
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const { userId } = paymentIntent.metadata

  if (!userId) {
    console.error('Missing userId in payment intent metadata:', paymentIntent.id)
    return
  }

  await prisma.$transaction([
    // Update payment status
    prisma.payment.updateMany({
      where: {
        stripePaymentIntentId: paymentIntent.id,
        userId: userId
      },
      data: {
        status: 'FAILED'
      }
    }),

    // Create notification
    prisma.notification.create({
      data: {
        userId: userId,
        title: 'Payment Failed',
        message: 'Your certificate exam payment has failed. Please try again.',
        type: 'ERROR',        
        actionUrl: '/certificate/dashboard'
      }
    })
  ])
}
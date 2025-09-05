// lib/stripe.ts
import Stripe from 'stripe';
import { prisma } from './prisma';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export class PaymentService {
  // Create payment intent for certificate exam
  async createExamPayment(userId: string, courseId: string) {
    try {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
      });

      if (!course) {
        throw new Error('Course not found');
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Check if user already has a valid certificate
      const existingCertificate = await prisma.certificate.findFirst({
        where: {
          userId,
          courseId,
          isRevoked: false,
          isValid: true,
        },
      });

      if (existingCertificate) {
        throw new Error('Certificate already obtained for this course');
      }

      // Check for pending payments
      const pendingPayment = await prisma.payment.findFirst({
        where: {
          userId,
          courseId,
          status: 'PENDING',
        },
      });

      if (pendingPayment && pendingPayment.stripePaymentIntentId) {
        // Return existing payment intent
        const paymentIntent = await stripe.paymentIntents.retrieve(
          pendingPayment.stripePaymentIntentId
        );
        return {
          clientSecret: paymentIntent.client_secret,
          paymentId: pendingPayment.id,
        };
      }

      // Create new payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(course.certificatePrice * 100), // Convert to cents
        currency: 'usd',
        metadata: {
          userId,
          courseId,
          type: 'certificate_exam',
        },
        description: `Certificate Exam for ${course.title}`,
      });

      // Save payment record
      const payment = await prisma.payment.create({
        data: {
          userId,
          courseId,
          amount: course.certificatePrice,
          currency: 'USD',
          status: 'PENDING',
          paymentMethod: 'stripe',
          stripePaymentIntentId: paymentIntent.id,
          metadata: {
            courseTitle: course.title,
          },
        },
      });

      return {
        clientSecret: paymentIntent.client_secret,
        paymentId: payment.id,
      };
    } catch (error) {
      console.error('Payment creation error:', error);
      throw error;
    }
  }

  // Handle successful payment
  async handleSuccessfulPayment(paymentIntentId: string) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status !== 'succeeded') {
        throw new Error('Payment not successful');
      }

      const payment = await prisma.payment.findFirst({
        where: { stripePaymentIntentId: paymentIntentId },
      });

      if (!payment) {
        throw new Error('Payment record not found');
      }

      // Update payment status
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'COMPLETED' },
      });

      return payment;
    } catch (error) {
      console.error('Payment confirmation error:', error);
      throw error;
    }
  }

  // Check if user has paid for exam
  async hasUserPaidForExam(userId: string, courseId: string): Promise<boolean> {
    const payment = await prisma.payment.findFirst({
      where: {
        userId,
        courseId,
        status: 'COMPLETED',
      },
    });

    return !!payment;
  }

  // Process refund (if needed)
  async processRefund(paymentId: string, reason: string) {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
      });

      if (!payment || !payment.stripePaymentIntentId) {
        throw new Error('Payment not found');
      }

      const refund = await stripe.refunds.create({
        payment_intent: payment.stripePaymentIntentId,
        reason: 'requested_by_customer',
      });

      await prisma.payment.update({
        where: { id: paymentId },
        data: { 
          status: 'REFUNDED',
          metadata: {
            ...(payment.metadata as any || {}),
            refundReason: reason,
            refundId: refund.id,
          },
        },
      });

      return refund;
    } catch (error) {
      console.error('Refund error:', error);
      throw error;
    }
  }
}

// Export both the class and instance
export const paymentService = new PaymentService();
export { stripe };
// app/api/user/course-statuses/route.ts - Fixed TypeScript error
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's course completions, payments, and certificates
    const [courseCompletions, payments, certificates] = await Promise.all([
      prisma.courseCompletion.findMany({
        where: { userId: session.user.id },
        select: { courseId: true, completedAt: true }
      }),
      prisma.payment.findMany({
        where: { 
          userId: session.user.id,
          status: 'COMPLETED',
          courseId: { not: null } // Ensure courseId is not null
        },
        select: { courseId: true, amount: true, status: true, provider: true }
      }),
      prisma.certificate.findMany({
        where: { userId: session.user.id },
        select: { courseId: true, issuedAt: true, certificateNumber: true }
      })
    ])

    // Build status object with proper type safety
    const statuses: Record<string, {
      hasCompleted?: boolean
      completedAt?: Date
      hasPaid?: boolean
      hasBooked?: boolean
      hasCertificate?: boolean
      certificateNumber?: string
      payment?: {
        amount: number
        status: string
        provider: string
      }
    }> = {}

    // Mark completed courses
    courseCompletions.forEach(completion => {
      const courseId = completion.courseId
      if (!statuses[courseId]) {
        statuses[courseId] = {}
      }
      statuses[courseId].hasCompleted = true
      statuses[courseId].completedAt = completion.completedAt
    })

    // Mark paid courses - FIXED: Added null check for courseId
    payments.forEach(payment => {
      // Type guard to ensure courseId is not null
      if (payment.courseId !== null) {
        const courseId = payment.courseId
        if (!statuses[courseId]) {
          statuses[courseId] = {}
        }
        statuses[courseId].hasPaid = true
        statuses[courseId].hasBooked = true // Payment = booking
        statuses[courseId].payment = {
          amount: payment.amount,
          status: payment.status,
          provider: payment.provider
        }
      }
    })

    // Mark certified courses
    certificates.forEach(certificate => {
      const courseId = certificate.courseId
      if (!statuses[courseId]) {
        statuses[courseId] = {}
      }
      statuses[courseId].hasCertificate = true
      statuses[courseId].certificateNumber = certificate.certificateNumber
    })

    return NextResponse.json({ statuses })

  } catch (error) {
    console.error('Error fetching course statuses:', error)
    return NextResponse.json(
      { error: 'Failed to fetch course statuses' },
      { status: 500 }
    )
  }
}

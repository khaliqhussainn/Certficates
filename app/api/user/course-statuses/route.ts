// app/api/user/course-statuses/route.ts - Get user's course statuses
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Get all course completions
    const completions = await prisma.courseCompletion.findMany({
      where: { userId },
      select: { courseId: true }
    })

    // Get all certificates
    const certificates = await prisma.certificate.findMany({
      where: { 
        userId,
        isRevoked: false 
      },
      select: { courseId: true }
    })

    // Get all payments
    const payments = await prisma.payment.findMany({
      where: { 
        userId,
        status: 'COMPLETED',
        courseId: { not: null }
      },
      select: { courseId: true, amount: true, status: true }
    })

    // Build status map
    const statuses: Record<string, any> = {}

    // Mark completed courses
    completions.forEach(completion => {
      if (completion.courseId) {
        statuses[completion.courseId] = {
          ...statuses[completion.courseId],
          hasCompleted: true
        }
      }
    })

    // Mark courses with certificates
    certificates.forEach(certificate => {
      if (certificate.courseId) {
        statuses[certificate.courseId] = {
          ...statuses[certificate.courseId],
          hasCertificate: true
        }
      }
    })

    // Mark courses with payments (booked)
    payments.forEach(payment => {
      if (payment.courseId) {
        statuses[payment.courseId] = {
          ...statuses[payment.courseId],
          hasBooked: true,
          payment: {
            amount: payment.amount,
            status: payment.status
          }
        }
      }
    })

    // Set defaults for all statuses
    Object.keys(statuses).forEach(courseId => {
      statuses[courseId] = {
        hasBooked: false,
        hasCompleted: false,
        hasCertificate: false,
        ...statuses[courseId]
      }
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
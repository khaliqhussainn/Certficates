// app/api/user/course-statuses/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all user's completions, payments, and certificates
    const [completions, payments, certificates] = await Promise.all([
      prisma.courseCompletion.findMany({
        where: { userId: session.user.id }
      }),
      prisma.payment.findMany({
        where: { 
          userId: session.user.id,
          status: 'COMPLETED'
        }
      }),
      prisma.certificate.findMany({
        where: { 
          userId: session.user.id,
          isRevoked: false
        }
      })
    ])

    // Create status map
    const statuses: Record<string, any> = {}

    // Process completions
    completions.forEach((completion: { courseId: string | number }) => {
      statuses[completion.courseId] = {
        hasCompleted: true,
        hasBooked: false,
        hasCertificate: false
      }
    })

    // Process payments
    payments.forEach((payment: { courseId: string | number; status: any; amount: any }) => {
      if (!statuses[payment.courseId]) {
        statuses[payment.courseId] = {
          hasCompleted: false,
          hasBooked: true,
          hasCertificate: false
        }
      } else {
        statuses[payment.courseId].hasBooked = true
      }
      statuses[payment.courseId].payment = {
        status: payment.status,
        amount: payment.amount
      }
    })

    // Process certificates
    certificates.forEach((certificate: { courseId: string | number }) => {
      if (!statuses[certificate.courseId]) {
        statuses[certificate.courseId] = {
          hasCompleted: false,
          hasBooked: false,
          hasCertificate: true
        }
      } else {
        statuses[certificate.courseId].hasCertificate = true
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

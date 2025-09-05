// Certificate Platform: app/api/user/enrollments/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { courseIntegration } from '@/lib/courseIntegration'

// GET /api/user/enrollments - Get user's course completions and certificates
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's course completions
    const completions = await prisma.courseCompletion.findMany({
      where: { userId: session.user.id },
      include: {
        course: true
      },
      orderBy: { completedAt: 'desc' }
    })

    // Get user's certificates
    const certificates = await prisma.certificate.findMany({
      where: { 
        userId: session.user.id,
        isRevoked: false 
      },
      include: {
        course: {
          select: {
            title: true,
            category: true,
            level: true
          }
        }
      },
      orderBy: { issuedAt: 'desc' }
    })

    // Get user's exam attempts
    const examAttempts = await prisma.examAttempt.findMany({
      where: { userId: session.user.id },
      include: {
        course: {
          select: {
            title: true,
            certificatePrice: true
          }
        }
      },
      orderBy: { startedAt: 'desc' }
    })

    // Get user's payments
    const payments = await prisma.payment.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      completions,
      certificates,
      examAttempts,
      payments
    })

  } catch (error) {
    console.error('Error fetching user enrollments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user data' },
      { status: 500 }
    )
  }
}

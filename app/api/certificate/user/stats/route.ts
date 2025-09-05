import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"

// app/api/certificate/user/stats/route.ts - User Statistics
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Get user statistics
    const [
      completedCourses,
      earnedCertificates,
      passedExams,
      payments
    ] = await Promise.all([
      prisma.courseCompletion.count({
        where: { userId }
      }),
      prisma.certificate.count({
        where: { userId, isValid: true }
      }),
      prisma.examSession.count({
        where: { userId, passed: true }
      }),
      prisma.payment.findMany({
        where: { userId, status: 'COMPLETED' },
        select: { amount: true }
      })
    ])

    const totalSpent = payments.reduce((sum: any, payment: { amount: any }) => sum + payment.amount, 0)

    return NextResponse.json({
      completedCourses,
      earnedCertificates,
      passedExams,
      totalSpent
    })

  } catch (error) {
    console.error('Error fetching user stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

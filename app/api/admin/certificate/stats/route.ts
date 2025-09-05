import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// app/api/admin/certificate/stats/route.ts
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Get overall statistics
    const [
      totalApplications,
      totalCertificates,
      totalStudents,
      payments,
      examSessions
    ] = await Promise.all([
      prisma.examApplication.count(),
      prisma.certificate.count({ where: { isValid: true } }),
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.payment.findMany({
        where: { status: 'COMPLETED' },
        select: { amount: true, createdAt: true }
      }),
      prisma.examSession.findMany({
        where: { status: 'COMPLETED' },
        select: { score: true, passed: true }
      })
    ])

    const totalRevenue = payments.reduce((sum: any, payment: { amount: any }) => sum + payment.amount, 0)
    const passedExams = examSessions.filter((session: { passed: any }) => session.passed).length
    const conversionRate = totalApplications > 0 ? (passedExams / totalApplications) * 100 : 0
    const averageScore = examSessions.length > 0 
      ? examSessions.reduce((sum: any, session: { score: any }) => sum + (session.score || 0), 0) / examSessions.length 
      : 0

    // Calculate monthly revenue (last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const recentPayments = payments.filter((p: { createdAt: string | number | Date }) => new Date(p.createdAt) >= sixMonthsAgo)
    const monthlyRevenue = []
    
    for (let i = 5; i >= 0; i--) {
      const month = new Date()
      month.setMonth(month.getMonth() - i)
      const monthStart = new Date(month.getFullYear(), month.getMonth(), 1)
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0)
      
      const monthRevenue = recentPayments
        .filter((p: { createdAt: string | number | Date }) => {
          const paymentDate = new Date(p.createdAt)
          return paymentDate >= monthStart && paymentDate <= monthEnd
        })
        .reduce((sum: any, p: { amount: any }) => sum + p.amount, 0)
      
      monthlyRevenue.push({
        month: month.toLocaleDateString('en-US', { month: 'short' }),
        revenue: monthRevenue
      })
    }

    const stats = {
      totalRevenue,
      totalApplications,
      totalCertificates,
      totalStudents,
      conversionRate: Math.round(conversionRate * 100) / 100,
      averageScore: Math.round(averageScore * 100) / 100,
      revenueGrowth: 15.5, // Calculate actual growth
      monthlyRevenue
    }

    return NextResponse.json(stats)

  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
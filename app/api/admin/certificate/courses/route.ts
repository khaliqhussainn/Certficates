import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"

// app/api/admin/certificate/courses/route.ts
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const courses = await prisma.course.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        level: true,
        certificatePrice: true,
        certificateDiscount: true,
        certificateEnabled: true,
        passingScore: true,
        examDuration: true,
        totalQuestions: true,
        rating: true,
        _count: {
          select: {
            examApplications: true,
            certificates: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Get revenue and enrollment data for each course
    const coursesWithStats = await Promise.all(
      courses.map(async (course: { id: any; _count: { examApplications: any } }) => {
        const [payments, enrollments] = await Promise.all([
          prisma.payment.aggregate({
            where: {
              status: 'COMPLETED',
              application: {
                courseId: course.id
              }
            },
            _sum: { amount: true }
          }),
          prisma.courseCompletion.count({
            where: { courseId: course.id }
          })
        ])

        return {
          ...course,
          enrollmentCount: enrollments,
          certificatesSold: course._count.examApplications,
          revenue: payments._sum.amount || 0,
          examApplications: course._count.examApplications
        }
      })
    )

    return NextResponse.json(coursesWithStats)

  } catch (error) {
    console.error('Error fetching courses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"

// app/api/admin/certificate/applications/route.ts
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const applications = await prisma.examApplication.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        course: {
          select: {
            title: true
          }
        },
        examSession: {
          select: {
            score: true,
            passed: true,
            violations: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const formattedApplications = applications.map((app: { id: any; userId: any; user: { name: any; email: any }; courseId: any; course: { title: any }; status: any; paymentStatus: any; amountPaid: any; scheduledAt: any; createdAt: any; examSession: any }) => ({
      id: app.id,
      userId: app.userId,
      userName: app.user.name || 'Unknown',
      userEmail: app.user.email,
      courseId: app.courseId,
      courseName: app.course.title,
      status: app.status,
      paymentStatus: app.paymentStatus,
      amountPaid: app.amountPaid,
      scheduledAt: app.scheduledAt,
      createdAt: app.createdAt,
      examSession: app.examSession
    }))

    return NextResponse.json(formattedApplications)

  } catch (error) {
    console.error('Error fetching applications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

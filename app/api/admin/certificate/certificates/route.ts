import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"

// app/api/admin/certificate/certificates/route.ts
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const certificates = await prisma.certificate.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        course: {
          select: {
            title: true
          }
        }
      },
      orderBy: { issueDate: 'desc' }
    })

    const formattedCertificates = certificates.map((cert: { id: any; certificateNumber: any; userId: any; user: { name: any; email: any }; courseId: any; course: { title: any }; score: any; grade: any; issueDate: any; isValid: any; verificationCode: any }) => ({
      id: cert.id,
      certificateNumber: cert.certificateNumber,
      userId: cert.userId,
      userName: cert.user.name || 'Unknown',
      userEmail: cert.user.email,
      courseId: cert.courseId,
      courseName: cert.course.title,
      score: cert.score,
      grade: cert.grade,
      issueDate: cert.issueDate,
      isValid: cert.isValid,
      verificationCode: cert.verificationCode
    }))

    return NextResponse.json(formattedCertificates)

  } catch (error) {
    console.error('Error fetching certificates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
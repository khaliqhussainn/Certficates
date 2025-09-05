import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"

// app/api/certificate/certificates/route.ts - User Certificates
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const certificates = await prisma.certificate.findMany({
      where: { userId: session.user.id },
      include: {
        course: {
          select: {
            title: true,
            thumbnail: true
          }
        }
      },
      orderBy: { issueDate: 'desc' }
    })

    const certificatesData = certificates.map((cert: { id: any; certificateNumber: any; courseId: any; course: { title: any }; score: any; grade: any; issueDate: any; isValid: any; verificationCode: any; certificateUrl: any }) => ({
      id: cert.id,
      certificateNumber: cert.certificateNumber,
      courseId: cert.courseId,
      courseName: cert.course.title,
      score: cert.score,
      grade: cert.grade,
      issueDate: cert.issueDate,
      isValid: cert.isValid,
      verificationCode: cert.verificationCode,
      certificateUrl: cert.certificateUrl
    }))

    return NextResponse.json(certificatesData)

  } catch (error) {
    console.error('Error fetching certificates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// app/api/certificate/verify/[certificateNumber]/route.ts - FIXED VERSION
import { NextResponse } from 'next/server'
import { examService } from '@/lib/examService' // ✅ FIXED IMPORT

export async function GET(
  request: Request,
  { params }: { params: { certificateNumber: string } }
) {
  try {
    const certificate = await examService.verifyCertificate(params.certificateNumber)

    if (!certificate) {
      return NextResponse.json(
        { error: 'Certificate not found or has been revoked' }, 
        { status: 404 }
      )
    }

    return NextResponse.json({
      certificate: {
        certificateNumber: certificate.certificateNumber,
        studentName: certificate.user.name,
        courseName: certificate.course.title,
        courseCategory: certificate.course.category,
        courseLevel: certificate.course.level,
        score: certificate.score,
        grade: certificate.grade,
        issuedAt: certificate.issuedAt,
        validUntil: certificate.validUntil,
        isValid: certificate.isValid && !certificate.isRevoked
      }
    })

  } catch (error) {
    console.error('Error verifying certificate:', error)
    return NextResponse.json(
      { error: 'Failed to verify certificate' }, 
      { status: 500 }
    )
  }
}

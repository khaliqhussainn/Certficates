// app/api/certificate/download/[certificateId]/route.ts - FIXED VERSION
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { examService } from '@/lib/examService' // ✅ FIXED IMPORT
import fs from 'fs'
import path from 'path'

export async function GET(
  request: Request,
  { params }: { params: { certificateId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const certificate = await prisma.certificate.findFirst({
      where: {
        id: params.certificateId,
        userId: session.user.id,
        isRevoked: false
      },
      include: {
        user: true,
        course: true,
        examAttempt: true
      }
    })

    if (!certificate) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 })
    }

    // If PDF doesn't exist, generate it
    if (!certificate.pdfPath) {
      const pdfPath = await examService.generateCertificatePDF(
        certificate,
        certificate.user,
        certificate.course
      )
      
      await prisma.certificate.update({
        where: { id: certificate.id },
        data: { pdfPath }
      })
      
      certificate.pdfPath = pdfPath
    }

    // Serve the PDF file
    const filePath = path.join(process.cwd(), 'public', certificate.pdfPath)
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Certificate file not found' }, { status: 404 })
    }

    const fileBuffer = fs.readFileSync(filePath)
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="certificate-${certificate.certificateNumber}.pdf"`
      }
    })

  } catch (error) {
    console.error('Error downloading certificate:', error)
    return NextResponse.json(
      { error: 'Failed to download certificate' }, 
      { status: 500 }
    )
  }
}
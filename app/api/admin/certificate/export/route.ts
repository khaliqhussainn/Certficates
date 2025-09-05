import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"

// app/api/admin/certificate/export/route.ts
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')

    let csvData = ''
    let filename = ''

    switch (type) {
      case 'applications':
        const applications = await prisma.examApplication.findMany({
          include: {
            user: { select: { name: true, email: true } },
            course: { select: { title: true } }
          }
        })
        
        csvData = 'Application ID,User Name,Email,Course,Status,Amount,Date\n'
        applications.forEach((app: { id: any; user: { name: any; email: any }; course: { title: any }; status: any; amountPaid: any; createdAt: any }) => {
          csvData += `${app.id},"${app.user.name}","${app.user.email}","${app.course.title}",${app.status},${app.amountPaid},${app.createdAt}\n`
        })
        filename = 'certificate-applications.csv'
        break

      case 'certificates':
        const certificates = await prisma.certificate.findMany({
          include: {
            user: { select: { name: true, email: true } },
            course: { select: { title: true } }
          }
        })
        
        csvData = 'Certificate Number,User Name,Email,Course,Score,Grade,Issue Date\n'
        certificates.forEach((cert: { certificateNumber: any; user: { name: any; email: any }; course: { title: any }; score: any; grade: any; issueDate: any }) => {
          csvData += `${cert.certificateNumber},"${cert.user.name}","${cert.user.email}","${cert.course.title}",${cert.score},${cert.grade},${cert.issueDate}\n`
        })
        filename = 'certificates.csv'
        break

      case 'revenue':
        const payments = await prisma.payment.findMany({
          where: { status: 'COMPLETED' },
          include: {
            application: {
              include: {
                course: { select: { title: true } }
              }
            }
          }
        })
        
        csvData = 'Payment ID,Course,Amount,Currency,Date\n'
        payments.forEach((payment: { id: any; application: { course: { title: any } }; amount: any; currency: any; createdAt: any }) => {
          csvData += `${payment.id},"${payment.application?.course?.title || 'Unknown'}",${payment.amount},${payment.currency},${payment.createdAt}\n`
        })
        filename = 'revenue.csv'
        break

      default:
        return NextResponse.json(
          { error: 'Invalid export type' },
          { status: 400 }
        )
    }

    return new NextResponse(csvData, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })

  } catch (error) {
    console.error('Error exporting data:', error)
    return NextResponse.json(
      { error: 'Export failed' },
      { status: 500 }
    )
  }
}
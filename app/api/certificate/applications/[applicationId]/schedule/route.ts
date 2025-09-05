import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"

// app/api/certificate/application/[applicationId]/schedule/route.ts
export async function POST(
  req: NextRequest,
  { params }: { params: { applicationId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { scheduledAt } = await req.json()
    const { applicationId } = params

    // Verify application belongs to user and payment is confirmed
    const application = await prisma.examApplication.findUnique({
      where: { 
        id: applicationId,
        userId: session.user.id 
      }
    })

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    if (application.paymentStatus !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Payment not confirmed' },
        { status: 400 }
      )
    }

    // Update application status to scheduled
    await prisma.examApplication.update({
      where: { id: applicationId },
      data: {
        status: 'SCHEDULED',
        scheduledAt: new Date(scheduledAt)
      }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error scheduling exam:', error)
    return NextResponse.json(
      { error: 'Failed to schedule exam' },
      { status: 500 }
    )
  }
}
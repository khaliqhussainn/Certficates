// app/api/exam/violation/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId, violation } = await request.json()

    // Get current violations
    const examSession = await prisma.examSession.findFirst({
      where: {
        id: sessionId,
        userId: session.user.id
      }
    })

    if (!examSession) {
      return NextResponse.json({ error: 'Invalid exam session' }, { status: 403 })
    }

    const currentViolations = Array.isArray(examSession.violations) ? examSession.violations : []
    const updatedViolations = [...currentViolations, violation]

    // Update session with new violation
    await prisma.examSession.update({
      where: { id: sessionId },
      data: {
        violations: updatedViolations
      }
    })

    // If too many violations, terminate session
    if (updatedViolations.length >= 3) {
      await prisma.examSession.update({
        where: { id: sessionId },
        data: { status: 'TERMINATED' }
      })
    }

    return NextResponse.json({ 
      success: true,
      violationCount: updatedViolations.length 
    })

  } catch (error) {
    console.error('Error recording violation:', error)
    return NextResponse.json(
      { error: 'Failed to record violation' }, 
      { status: 500 }
    )
  }
}

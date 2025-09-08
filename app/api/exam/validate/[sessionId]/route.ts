// app/api/exam/validate/[sessionId]/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = params
    const { browserData } = await request.json()

    // Validate exam session
    const examSession = await prisma.examSession.findFirst({
      where: {
        id: sessionId,
        userId: session.user.id,
        status: 'IN_PROGRESS'
      }
    })

    if (!examSession) {
      return NextResponse.json({ error: 'Invalid exam session' }, { status: 403 })
    }

    // Basic security validation
    const storedFingerprint = examSession.browserFingerprint
    const currentFingerprint = Buffer.from(browserData.userAgent).toString('base64')

    if (storedFingerprint !== currentFingerprint) {
      // Log potential security issue but don't fail immediately
      console.warn(`Browser fingerprint mismatch for session ${sessionId}`)
    }

    // Update last activity
    await prisma.examSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error validating exam session:', error)
    return NextResponse.json(
      { error: 'Failed to validate session' }, 
      { status: 500 }
    )
  }
}

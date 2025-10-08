import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })
    if (!user) {
      return NextResponse.json({
        message: 'If an account exists with this email, a password reset link has been sent.'
      })
    }
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex')
    const resetTokenExpiry = new Date(Date.now() + 3600000)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: resetTokenHash,
        resetTokenExpiry: resetTokenExpiry
      }
    })
    const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`
    const { sendPasswordResetEmail } = await import('@/lib/email')
    await sendPasswordResetEmail(user.email!, user.name || 'User', resetUrl)
    return NextResponse.json({
      message: 'If an account exists with this email, a password reset link has been sent.'
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

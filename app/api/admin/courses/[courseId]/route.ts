
// app/api/admin/courses/[courseId]/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    const { courseId } = params

    const course = await prisma.course.update({
      where: { id: courseId },
      data: {
        examDuration: data.examDuration,
        passingScore: data.passingScore,
        totalQuestions: data.totalQuestions,
        certificateEnabled: data.certificateEnabled
      }
    })

    return NextResponse.json({ course })
  } catch (error) {
    console.error('Error updating course:', error)
    return NextResponse.json(
      { error: 'Failed to update course' }, 
      { status: 500 }
    )
  }
}
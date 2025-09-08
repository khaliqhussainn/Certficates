// app/api/admin/mark-completion/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId, courseId } = await request.json()

    const course = await prisma.course.findUnique({
      where: { id: courseId }
    })

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    await prisma.courseCompletion.upsert({
      where: {
        userId_courseId: {
          userId,
          courseId
        }
      },
      update: {
        completedAt: new Date(),
        progress: 100
      },
      create: {
        userId,
        courseId,
        completedAt: new Date(),
        progress: 100,
        courseTitle: course.title,
        courseCategory: course.category,
        courseLevel: course.level
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking completion:', error)
    return NextResponse.json(
      { error: 'Failed to mark completion' }, 
      { status: 500 }
    )
  }
}
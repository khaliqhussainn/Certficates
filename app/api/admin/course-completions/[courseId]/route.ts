// app/api/admin/course-completions/[courseId]/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const users = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      include: {
        courseCompletions: {
          where: { courseId: params.courseId }
        }
      },
      orderBy: { name: 'asc' }
    })

    const students = users.map(user => ({
      id: user.id,
      name: user.name || 'Unknown',
      email: user.email,
      hasCompleted: user.courseCompletions.length > 0,
      completedAt: user.courseCompletions[0]?.completedAt?.toISOString()
    }))

    return NextResponse.json({ students })
  } catch (error) {
    console.error('Error fetching course completions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch course completions' }, 
      { status: 500 }
    )
  }
}
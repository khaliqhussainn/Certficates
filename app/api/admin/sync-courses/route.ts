// app/api/admin/sync-courses/route.ts - Sync courses from main website
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

    const { courses } = await request.json()

    // Sync courses from main website
    for (const courseData of courses) {
      await prisma.course.upsert({
        where: { id: courseData.id },
        update: {
          title: courseData.title,
          description: courseData.description,
          category: courseData.category,
          level: courseData.level,
          thumbnail: courseData.thumbnail,
          isPublished: courseData.isPublished,
          rating: courseData.rating,
          price: courseData.price,
          isFree: courseData.isFree,
          updatedAt: new Date()
        },
        create: {
          id: courseData.id,
          title: courseData.title,
          description: courseData.description,
          category: courseData.category,
          level: courseData.level,
          thumbnail: courseData.thumbnail,
          isPublished: courseData.isPublished,
          certificateEnabled: true,
          passingScore: 70,
          examDuration: 120,
          totalQuestions: 20,
          rating: courseData.rating,
          price: courseData.price,
          isFree: courseData.isFree,
          certificatePrice: 99.00
        }
      })
    }

    return NextResponse.json({ success: true, synced: courses.length })
  } catch (error) {
    console.error('Error syncing courses:', error)
    return NextResponse.json(
      { error: 'Failed to sync courses' }, 
      { status: 500 }
    )
  }
}
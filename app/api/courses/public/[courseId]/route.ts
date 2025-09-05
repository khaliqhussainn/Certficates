// app/api/courses/public/[courseId]/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const courseId = params.courseId
    
    // Try to fetch from course website first
    const courseWebsiteUrl = process.env.COURSE_WEBSITE_URL
    const apiKey = process.env.COURSE_WEBSITE_API_KEY

    let course = null

    if (courseWebsiteUrl && apiKey) {
      try {
        const response = await fetch(`${courseWebsiteUrl}/api/courses/${courseId}`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          }
        })

        if (response.ok) {
          const data = await response.json()
          course = data.course || data
        }
      } catch (fetchError) {
        console.error('Error fetching course from website:', fetchError)
      }
    }

    // Fallback to local database
    if (!course) {
      const { prisma } = await import('@/lib/prisma')
      course = await prisma.course.findUnique({
        where: { id: courseId }
      })
    }

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    return NextResponse.json({ course })

  } catch (error) {
    console.error('Error fetching course details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch course details' },
      { status: 500 }
    )
  }
}

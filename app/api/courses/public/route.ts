// app/api/courses/public/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    // Try to fetch from course website first
    const courseWebsiteUrl = process.env.COURSE_WEBSITE_URL
    const apiKey = process.env.COURSE_WEBSITE_API_KEY

    let courses = []

    if (courseWebsiteUrl && apiKey) {
      try {
        console.log('Fetching from course website:', `${courseWebsiteUrl}/api/courses/public`)
        
        const response = await fetch(`${courseWebsiteUrl}/api/courses/public`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store'
        })

        if (response.ok) {
          const data = await response.json()
          courses = Array.isArray(data) ? data : (data.courses || [])
          console.log(`Successfully fetched ${courses.length} courses`)
        } else {
          console.error('Course website response not ok:', response.status)
        }
      } catch (fetchError) {
        console.error('Error fetching from course website:', fetchError)
      }
    } else {
      console.log('Course website not configured')
    }

    // Fallback to local database if needed
    if (courses.length === 0) {
      const { prisma } = await import('@/lib/prisma')
      const localCourses = await prisma.course.findMany({
        where: { isPublished: true },
        orderBy: { createdAt: 'desc' }
      })
      courses = localCourses
      console.log(`Using ${courses.length} local courses`)
    }

    return NextResponse.json({ 
      courses: courses.filter((course: { isPublished: boolean }) => course.isPublished !== false)
    })

  } catch (error) {
    console.error('Error in public courses API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    )
  }
}

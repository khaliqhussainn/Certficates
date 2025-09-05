// app/api/courses/route.ts - Fixed to properly fetch from course website
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Try to fetch from course website first
    const courseWebsiteUrl = process.env.COURSE_WEBSITE_URL
    const apiKey = process.env.COURSE_WEBSITE_API_KEY

    let courses = []

    if (courseWebsiteUrl && apiKey) {
      try {
        console.log('Fetching courses from:', `${courseWebsiteUrl}/api/courses/public`)
        
        const response = await fetch(`${courseWebsiteUrl}/api/courses/public`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store' // Don't cache to get fresh data
        })

        if (response.ok) {
          const data = await response.json()
          courses = data.courses || data || []
          console.log(`Fetched ${courses.length} courses from course website`)

          // Sync to local database
          for (const courseData of courses) {
            if (courseData.isPublished) {
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
                },
                create: {
                  id: courseData.id,
                  title: courseData.title,
                  description: courseData.description,
                  category: courseData.category,
                  level: courseData.level,
                  thumbnail: courseData.thumbnail,
                  isPublished: courseData.isPublished,
                  certificatePrice: 99.00, // Default certificate price
                  passingScore: 70,
                  examDuration: 120,
                  rating: courseData.rating,
                  price: courseData.price,
                  isFree: courseData.isFree,
                },
              })
            }
          }
        } else {
          console.error('Course website API error:', response.status, response.statusText)
        }
      } catch (fetchError) {
        console.error('Error fetching from course website:', fetchError)
      }
    } else {
      console.log('Course website integration not configured')
    }

    // If no courses from external API, get from local database
    if (courses.length === 0) {
      const localCourses = await prisma.course.findMany({
        where: { isPublished: true },
        orderBy: { createdAt: 'desc' }
      })
      courses = localCourses
      console.log(`Using ${courses.length} courses from local database`)
    }

    return NextResponse.json({ 
      courses: courses.filter((course: { isPublished: any }) => course.isPublished),
      source: courses.length > 0 ? 'synced' : 'local'
    })

  } catch (error) {
    console.error('Error in courses API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    )
  }
}

// Certificate Platform: lib/courseIntegration.ts
import { prisma } from './prisma'
import crypto from 'crypto'

interface CourseWebsiteUser {
  id: string
  email: string
  name: string
  image?: string
  enrollments: {
    courseId: string
    progress: number
    completedAt?: string
    courseTitle?: string
    courseCategory?: string
    courseLevel?: string
  }[]
}

interface CourseWebsiteCourse {
  id: string
  title: string
  description: string
  category: string
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  thumbnail?: string
  isPublished: boolean
  rating?: number
  price?: number
  isFree?: boolean
}

export class CourseIntegrationService {
  private courseWebsiteUrl: string
  private apiKey: string

  constructor() {
    this.courseWebsiteUrl = process.env.COURSE_WEBSITE_URL || ''
    this.apiKey = process.env.COURSE_WEBSITE_API_KEY || ''
  }

  // Check if course integration is configured
  private isConfigured(): boolean {
    return !!(this.courseWebsiteUrl && this.apiKey)
  }

  // Verify and sync user from course website
  async syncUserFromCourseWebsite(email: string, password?: string): Promise<any> {
    try {
      // If course integration is not configured, throw error immediately
      if (!this.isConfigured()) {
        console.error('Course website integration not configured. Missing COURSE_WEBSITE_URL or COURSE_WEBSITE_API_KEY')
        throw new Error('Course website integration not available')
      }

      const response = await fetch(`${this.courseWebsiteUrl}/api/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid course website credentials')
        }
        if (response.status === 404) {
          throw new Error('Course website API not found')
        }
        throw new Error(`Course website error: ${response.status}`)
      }

      const courseUser: CourseWebsiteUser = await response.json()
      
      // Sync or create user in certificate database
      const user = await prisma.user.upsert({
        where: { email },
        update: {
          name: courseUser.name,
          image: courseUser.image,
          courseUserId: courseUser.id,
        },
        create: {
          email: courseUser.email,
          name: courseUser.name,
          image: courseUser.image,
          courseUserId: courseUser.id,
          role: 'STUDENT',
        },
      })

      // Sync course completions
      for (const enrollment of courseUser.enrollments) {
        if (enrollment.completedAt && enrollment.progress >= 100) {
          // First, ensure the course exists in certificate platform
          await this.ensureCourseExists(enrollment.courseId, {
            title: enrollment.courseTitle || `Course ${enrollment.courseId}`,
            category: enrollment.courseCategory || 'General',
            level: enrollment.courseLevel as any || 'BEGINNER'
          })

          // Then create/update the completion record
          await prisma.courseCompletion.upsert({
            where: {
              userId_courseId: {
                userId: user.id,
                courseId: enrollment.courseId,
              },
            },
            update: {
              progress: enrollment.progress,
              completedAt: new Date(enrollment.completedAt),
              courseTitle: enrollment.courseTitle,
              courseCategory: enrollment.courseCategory,
              courseLevel: enrollment.courseLevel,
            },
            create: {
              userId: user.id,
              courseId: enrollment.courseId,
              progress: enrollment.progress,
              completedAt: new Date(enrollment.completedAt),
              courseTitle: enrollment.courseTitle,
              courseCategory: enrollment.courseCategory,
              courseLevel: enrollment.courseLevel,
            },
          })
        }
      }

      return user
    } catch (error) {
      console.error('Course integration error:', error)
      
      // If it's a network error or course website is down, provide helpful message
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Course website is currently unavailable. Please try direct login or try again later.')
      }
      
      // Re-throw with original message for auth errors
      throw error
    }
  }

  // Ensure course exists in certificate platform
  private async ensureCourseExists(courseId: string, metadata: { title: string, category: string, level: string }) {
    try {
      await prisma.course.upsert({
        where: { id: courseId },
        update: {
          title: metadata.title,
          category: metadata.category,
          level: metadata.level as any,
        },
        create: {
          id: courseId,
          title: metadata.title,
          description: `Course synced from main website`,
          category: metadata.category,
          level: metadata.level as any,
          isPublished: true,
          certificatePrice: 99.00,
          passingScore: 70,
          examDuration: 120,
        },
      })
    } catch (error) {
      console.error('Error ensuring course exists:', error)
      // Don't throw - this is not critical
    }
  }

  // Sync all courses from course website
  async syncCoursesFromCourseWebsite(): Promise<void> {
    try {
      if (!this.isConfigured()) {
        console.warn('Course website integration not configured. Skipping course sync.')
        return
      }

      const response = await fetch(`${this.courseWebsiteUrl}/api/courses/public`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch courses')
      }

      const courses: CourseWebsiteCourse[] = await response.json()

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
              certificatePrice: 99.00, // Default price for certificate
              passingScore: 70,
              examDuration: 120,
              rating: courseData.rating,
              price: courseData.price,
              isFree: courseData.isFree,
            },
          })
        }
      }
    } catch (error) {
      console.error('Course sync error:', error)
      // Don't throw here - just log the error
      // This allows the app to work even if course sync fails
    }
  }

  // Get user's completed courses
  async getUserCompletedCourses(userId: string) {
    return await prisma.courseCompletion.findMany({
      where: { userId },
      include: {
        course: true,
      },
    })
  }

  // Check if user has completed a course
  async hasUserCompletedCourse(userId: string, courseId: string): Promise<boolean> {
    const completion = await prisma.courseCompletion.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    })
    return !!completion
  }

  // Generate secure exam session
  async createExamSession(userId: string, courseId: string, browserFingerprint: string, ipAddress: string): Promise<string> {
    const safeBrowserKey = crypto.randomBytes(32).toString('hex')
    
    const session = await prisma.examSession.create({
      data: {
        userId,
        courseId,
        browserFingerprint,
        ipAddress,
        safeBrowserKey,
        status: 'PENDING',
      },
    })

    return session.id
  }

  // Validate exam session security
  async validateExamSession(sessionId: string, browserFingerprint: string, ipAddress: string): Promise<boolean> {
    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
    })

    if (!session) return false

    // Check security parameters
    const isValid = 
      session.browserFingerprint === browserFingerprint &&
      session.ipAddress === ipAddress &&
      session.status === 'IN_PROGRESS'

    return isValid
  }

  // Record security violation
  async recordSecurityViolation(sessionId: string, violation: any): Promise<void> {
    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
    })

    if (!session) return

    const violations = (session.violations as any[]) || []
    violations.push({
      timestamp: new Date(),
      type: violation.type,
      details: violation.details,
    })

    await prisma.examSession.update({
      where: { id: sessionId },
      data: {
        violations: violations,
      },
    })
  }
}

export const courseIntegration = new CourseIntegrationService()
// lib/courseIntegration.ts
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

interface CourseWebsiteUser {
  id: string;
  email: string;
  name: string;
  image?: string;
  enrollments: {
    courseId: string;
    progress: number;
    completedAt?: string;
  }[];
}

interface CourseWebsiteCourse {
  id: string;
  title: string;
  description: string;
  category: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  thumbnail?: string;
  isPublished: boolean;
}

export class CourseIntegrationService {
  private courseWebsiteUrl: string;
  private apiKey: string;

  constructor() {
    this.courseWebsiteUrl = process.env.COURSE_WEBSITE_URL!;
    this.apiKey = process.env.COURSE_WEBSITE_API_KEY!;
  }

  // Verify and sync user from course website
  async syncUserFromCourseWebsite(email: string, password?: string): Promise<any> {
    try {
      const response = await fetch(`${this.courseWebsiteUrl}/api/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Invalid credentials');
      }

      const courseUser: CourseWebsiteUser = await response.json();
      
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
      });

      // Sync course completions
      for (const enrollment of courseUser.enrollments) {
        if (enrollment.completedAt && enrollment.progress >= 100) {
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
            },
            create: {
              userId: user.id,
              courseId: enrollment.courseId,
              progress: enrollment.progress,
              completedAt: new Date(enrollment.completedAt),
            },
          });
        }
      }

      return user;
    } catch (error) {
      console.error('Course integration error:', error);
      throw new Error('Failed to sync with course website');
    }
  }

  // Sync all courses from course website
  async syncCoursesFromCourseWebsite(): Promise<void> {
    try {
      const response = await fetch(`${this.courseWebsiteUrl}/api/courses/public`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch courses');
      }

      const courses: CourseWebsiteCourse[] = await response.json();

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
            },
            create: {
              id: courseData.id,
              title: courseData.title,
              description: courseData.description,
              category: courseData.category,
              level: courseData.level,
              thumbnail: courseData.thumbnail,
              isPublished: courseData.isPublished,
              certificatePrice: 99.00, // Default price
              passingScore: 70,
              examDuration: 120,
            },
          });
        }
      }
    } catch (error) {
      console.error('Course sync error:', error);
      throw new Error('Failed to sync courses');
    }
  }

  // Get user's completed courses
  async getUserCompletedCourses(userId: string) {
    return await prisma.courseCompletion.findMany({
      where: { userId },
      include: {
        course: true,
      },
    });
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
    });
    return !!completion;
  }

  // Generate secure exam session
  async createExamSession(userId: string, courseId: string, browserFingerprint: string, ipAddress: string): Promise<string> {
    const safeBrowserKey = crypto.randomBytes(32).toString('hex');
    
    const session = await prisma.examSession.create({
      data: {
        userId,
        courseId,
        browserFingerprint,
        ipAddress,
        safeBrowserKey,
        status: 'PENDING',
      },
    });

    return session.id;
  }

  // Validate exam session security
  async validateExamSession(sessionId: string, browserFingerprint: string, ipAddress: string): Promise<boolean> {
    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) return false;

    // Check security parameters
    const isValid = 
      session.browserFingerprint === browserFingerprint &&
      session.ipAddress === ipAddress &&
      session.status === 'IN_PROGRESS';

    return isValid;
  }

  // Record security violation
  async recordSecurityViolation(sessionId: string, violation: any): Promise<void> {
    await prisma.examSession.update({
      where: { id: sessionId },
      data: {
        violations: {
          push: {
            timestamp: new Date(),
            type: violation.type,
            details: violation.details,
          },
        },
      },
    });
  }
}

export const courseIntegration = new CourseIntegrationService();
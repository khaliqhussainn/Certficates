// app/api/courses/route.ts - Get all available courses
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { courseIntegration } from '@/lib/courseIntegration';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Sync courses from course website first
    await courseIntegration.syncCoursesFromCourseWebsite();
    
    const courses = await prisma.course.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
  }
}

// app/api/dashboard/route.ts - User dashboard data
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { examService } from '@/lib/examService';
import { courseIntegration } from '@/lib/courseIntegration';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's certificates
    const certificates = await examService.getUserCertificates(session.user.id);
    
    // Get user's completed courses from course website
    const completedCourses = await courseIntegration.getUserCompletedCourses(session.user.id);
    
    return NextResponse.json({
      certificates,
      completedCourses,
      stats: {
        totalCertificates: certificates.length,
        totalCoursesCompleted: completedCourses.length,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}

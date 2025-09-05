// app/api/sync/courses/route.ts - Manual course sync endpoint (for admin)
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { courseIntegration } from '@/lib/courseIntegration';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await courseIntegration.syncCoursesFromCourseWebsite();
    
    return NextResponse.json({ message: 'Courses synced successfully' });
  } catch (error) {
    console.error('Error syncing courses:', error);
    return NextResponse.json({ error: 'Failed to sync courses' }, { status: 500 });
  }
}

// app/api/exam/complete/route.ts - Complete exam and generate certificate
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { examService } from '@/lib/examService';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { examAttemptId } = await request.json();
    
    if (!examAttemptId) {
      return NextResponse.json({ error: 'Exam attempt ID is required' }, { status: 400 });
    }
    
    const results = await examService.completeExam(examAttemptId);
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error completing exam:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to complete exam';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// Check certificate status
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');

    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 });
    }

    const { prisma } = await import('@/lib/prisma');
    
    const certificate = await prisma.certificate.findFirst({
      where: {
        userId: session.user.id,
        courseId: courseId,
        isRevoked: false,
      },
    });

    return NextResponse.json({ hasCompleted: !!certificate });
  } catch (error) {
    console.error('Error checking certificate status:', error);
    return NextResponse.json({ error: 'Failed to check certificate status' }, { status: 500 });
  }
}
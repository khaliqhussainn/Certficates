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
    
    const results = await examService.completeExam(examAttemptId);
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error completing exam:', error);
    return NextResponse.json({ error: 'Failed to complete exam' }, { status: 500 });
  }
}

// app/api/certificates/status/[courseId]/route.ts - Check certificate status
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const certificate = await prisma.certificate.findFirst({
      where: {
        userId: session.user.id,
        courseId: params.courseId,
        isRevoked: false,
      },
    });

    return NextResponse.json({ hasCompleted: !!certificate });
  } catch (error) {
    console.error('Error checking certificate status:', error);
    return NextResponse.json({ error: 'Failed to check certificate status' }, { status: 500 });
  }
}

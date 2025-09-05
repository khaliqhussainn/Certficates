// app/api/exam/start/route.ts - Start secure exam session
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { examSecurity } from '@/lib/examSecurity';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { courseId, browserData } = await request.json();
    const ipAddress = request.headers.get('x-forwarded-for') || 'localhost';

    const examSession = await examSecurity.startExamSession(
      session.user.id,
      courseId,
      browserData,
      ipAddress
    );

    return NextResponse.json(examSession);
  } catch (error) {
    console.error('Error starting exam:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// app/api/exam/submit-answer/route.ts - Submit exam answer
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

    const { examAttemptId, questionId, selectedAnswer, timeSpent } = await request.json();
    
    const result = await examService.submitAnswer(examAttemptId, questionId, selectedAnswer, timeSpent);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error submitting answer:', error);
    return NextResponse.json({ error: 'Failed to submit answer' }, { status: 500 });
  }
}

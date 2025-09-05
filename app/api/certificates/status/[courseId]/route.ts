// app/api/certificates/status/[courseId]/route.ts - Check certificate status
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
// app/api/certificates/verify/[certificateNumber]/route.ts - Verify certificate
import { NextResponse } from 'next/server';
import { examService } from '@/lib/examService';

export async function GET(
  request: Request,
  { params }: { params: { certificateNumber: string } }
) {
  try {
    const certificate = await examService.verifyCertificate(params.certificateNumber);
    
    if (!certificate) {
      return NextResponse.json({ error: 'Certificate not found or revoked' }, { status: 404 });
    }

    return NextResponse.json(certificate);
  } catch (error) {
    console.error('Error verifying certificate:', error);
    return NextResponse.json({ error: 'Failed to verify certificate' }, { status: 500 });
  }
}

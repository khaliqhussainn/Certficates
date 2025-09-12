// app/api/exam/seb-validate/route.ts - SEB Validation API
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import crypto from 'crypto';

interface SEBValidationRequest {
  sessionId: string;
  browserExamKey?: string;
  configKey?: string;
  userAgent: string;
  sebInfo: {
    version?: string;
    platform?: string;
    securityMode: string;
    detectionMethod: string;
    isVerified: boolean;
  };
}

// Generate expected Browser Exam Key
function generateExpectedBrowserExamKey(
  sessionId: string, 
  courseId: string, 
  userId: string
): string {
  const data = `EXAM_${sessionId}_${courseId}_${userId}`;
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
}

// Generate expected Config Key  
function generateExpectedConfigKey(
  courseId: string,
  examURL: string
): string {
  // Simplified config object - in production, this should match your actual SEB config
  const configData = {
    startURL: examURL,
    sendBrowserExamKey: true,
    allowQuit: true,
    courseId: courseId
  };
  
  // Sort keys alphabetically (as per SEB specification)
  const sortedKeys = Object.keys(configData).sort();
  const sortedConfig: any = {};
  sortedKeys.forEach(key => {
    sortedConfig[key] = configData[key as keyof typeof configData];
  });
  
  const configString = JSON.stringify(sortedConfig).replace(/\s/g, '');
  const configHash = crypto.createHash('sha256').update(configString).digest('hex');
  
  // Second hash with URL as per SEB specification
  return crypto.createHash('sha256').update(examURL + configHash).digest('hex').substring(0, 32);
}

// Validate SEB headers (for older SEB versions)
function validateSEBHeaders(headers: Headers): { isValid: boolean; info: any } {
  const browserExamKey = headers.get('X-SafeExamBrowser-RequestHash');
  const configKey = headers.get('X-SafeExamBrowser-ConfigKeyHash');
  const sebUserAgent = headers.get('User-Agent');
  
  return {
    isValid: !!(browserExamKey || configKey),
    info: {
      browserExamKey,
      configKey, 
      userAgent: sebUserAgent,
      method: 'HTTP Headers'
    }
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: SEBValidationRequest = await request.json();
    const { sessionId, browserExamKey, configKey, userAgent, sebInfo } = body;

    // Get exam session from database
    const { prisma } = await import('@/lib/prisma');
    const examSession = await prisma.examSession.findUnique({
      where: { id: sessionId },
      include: { course: true }
    });

    if (!examSession) {
      return NextResponse.json({ error: 'Exam session not found' }, { status: 404 });
    }

    if (examSession.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized access to exam session' }, { status: 403 });
    }

    // Validation results
    let isValid = false;
    let validationMethod = 'none';
    let securityLevel = 'none';
    const issues: string[] = [];
    
    const baseURL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const examURL = `${baseURL}/exam/${examSession.courseId}?session=${sessionId}&seb=true`;

    // Method 1: Modern SEB JavaScript API validation (preferred)
    if (sebInfo.securityMode === 'modern' && browserExamKey && configKey) {
      const expectedBrowserExamKey = generateExpectedBrowserExamKey(
        sessionId, 
        examSession.courseId, 
        session.user.id
      );
      const expectedConfigKey = generateExpectedConfigKey(examSession.courseId, examURL);
      
      const browserKeyValid = browserExamKey === expectedBrowserExamKey;
      const configKeyValid = configKey === expectedConfigKey;
      
      if (browserKeyValid && configKeyValid) {
        isValid = true;
        validationMethod = 'Modern JavaScript API';
        securityLevel = 'high';
      } else {
        if (!browserKeyValid) issues.push('Invalid Browser Exam Key');
        if (!configKeyValid) issues.push('Invalid Config Key');
        securityLevel = 'medium';
      }
    }
    // Method 2: Legacy HTTP Headers validation
    else {
      const headerValidation = validateSEBHeaders(request.headers);
      if (headerValidation.isValid) {
        isValid = true;
        validationMethod = 'HTTP Headers';
        securityLevel = 'medium';
      }
    }
    
    // Method 3: User Agent fallback (least secure)
    if (!isValid) {
      const sebUserAgentPatterns = [
        /SEB[\s\/][\d\.]+/i,
        /SafeExamBrowser/i,
        /Safe.*Exam.*Browser/i
      ];
      
      const isSEBUserAgent = sebUserAgentPatterns.some(pattern => pattern.test(userAgent));
      if (isSEBUserAgent && sebInfo.isVerified) {
        isValid = true;
        validationMethod = 'User Agent';
        securityLevel = 'low';
        issues.push('Using fallback validation method');
      }
    }

    // Update exam session with validation results
    await prisma.examSession.update({
      where: { id: sessionId },
      data: {
        browserFingerprint: crypto.createHash('md5').update(userAgent).digest('hex'),
        updatedAt: new Date(),
        // Store validation info in violations field for tracking
        violations: [
          ...(examSession.violations as any[] || []),
          {
            timestamp: new Date().toISOString(),
            type: 'SEB_VALIDATION',
            isValid,
            validationMethod,
            securityLevel,
            sebInfo,
            issues: issues.length > 0 ? issues : undefined
          }
        ]
      }
    });

    const response = {
      isValid,
      validationMethod,
      securityLevel,
      sebInfo: {
        detected: sebInfo.detectionMethod !== 'none',
        version: sebInfo.version,
        securityMode: sebInfo.securityMode,
        isVerified: sebInfo.isVerified
      },
      issues: issues.length > 0 ? issues : undefined,
      sessionStatus: examSession.status,
      recommendations: [] as string[]
    };

    // Add security recommendations
    if (securityLevel === 'low') {
      response.recommendations.push('Consider upgrading to a newer SEB version for better security');
    }
    if (issues.length > 0) {
      response.recommendations.push('Some security issues detected - exam may be monitored more closely');
    }
    if (!isValid) {
      response.recommendations.push('SEB validation failed - please restart with proper SEB configuration');
    }

    // Log security event
    console.log(`SEB Validation - User: ${session.user.id}, Session: ${sessionId}, Valid: ${isValid}, Method: ${validationMethod}, Level: ${securityLevel}`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('SEB validation error:', error);
    return NextResponse.json(
      { error: 'SEB validation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Check if SEB is detected via headers (for compatibility)
    const headerValidation = validateSEBHeaders(request.headers);
    const userAgent = request.headers.get('User-Agent') || '';
    
    const sebDetected = headerValidation.isValid || /SafeExamBrowser|SEB/i.test(userAgent);
    
    return NextResponse.json({
      sebDetected,
      validationMethod: headerValidation.isValid ? 'HTTP Headers' : 'User Agent',
      userAgent,
      headers: {
        browserExamKey: request.headers.get('X-SafeExamBrowser-RequestHash'),
        configKey: request.headers.get('X-SafeExamBrowser-ConfigKeyHash')
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('SEB status check error:', error);
    return NextResponse.json(
      { error: 'SEB status check failed' },
      { status: 500 }
    );
  }
}
// middleware.ts - Complete SEB Detection and Security
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require SEB validation in production
const SEB_PROTECTED_ROUTES = [
  '/exam/',
  '/api/exam/session/',
  '/api/exam/questions/',
  '/api/exam/submit-answer',
  '/api/exam/complete'
];

// Routes that should always be accessible
const ALWAYS_ACCESSIBLE_ROUTES = [
  '/api/auth/',
  '/api/courses/public',
  '/api/ping',
  '/api/certificate/verify',
  '/api/exam/seb-config',
  '/api/exam/seb-validate',
  '/seb-required',
  '/courses/',
  '/auth/',
  '/_next/',
  '/static/',
  '/favicon.ico'
];

// Check if route requires SEB validation
function requiresSEBValidation(pathname: string): boolean {
  return SEB_PROTECTED_ROUTES.some(route => pathname.startsWith(route));
}

// Check if route should always be accessible
function isAlwaysAccessible(pathname: string): boolean {
  return ALWAYS_ACCESSIBLE_ROUTES.some(route => pathname.startsWith(route)) ||
         pathname.includes('.') || // Static files
         pathname === '/';
}

// Comprehensive SEB validation
function validateSEBHeaders(request: NextRequest): { 
  isValid: boolean; 
  sebDetected: boolean; 
  securityLevel: 'none' | 'basic' | 'enhanced' | 'maximum';
  details: string;
  method: string;
} {
  const userAgent = request.headers.get('User-Agent') || '';
  const browserExamKey = request.headers.get('X-SafeExamBrowser-RequestHash');
  const configKey = request.headers.get('X-SafeExamBrowser-ConfigKeyHash');
  const sebVersion = request.headers.get('X-SafeExamBrowser-Version');
  const sebPlatform = request.headers.get('X-SafeExamBrowser-Platform');
  
  // Advanced SEB patterns
  const sebUserAgentPatterns = [
    /SEB[\s\/]([\d\.]+)/i,           // SEB/2.4.1 or SEB 2.4.1
    /SafeExamBrowser[\s\/]?([\d\.]*)/i, // SafeExamBrowser/2.4 or SafeExamBrowser 2.4
    /Safe.*Exam.*Browser/i,           // Safe Exam Browser
    /SEB\/([\d\.]+)/i                 // SEB/2.4.1
  ];
  
  const sebInUserAgent = sebUserAgentPatterns.some(pattern => pattern.test(userAgent));
  const sebDetected = sebInUserAgent || !!(browserExamKey || configKey || sebVersion);
  
  let securityLevel: 'none' | 'basic' | 'enhanced' | 'maximum' = 'none';
  let isValid = false;
  let details = 'No SEB detected';
  let method = 'none';

  if (sebDetected) {
    if (browserExamKey && configKey) {
      // Maximum security - modern SEB with both keys
      securityLevel = 'maximum';
      isValid = true;
      details = 'Modern SEB with full key validation';
      method = 'HTTP Headers with Keys';
    } else if (browserExamKey || configKey) {
      // Enhanced security - partial key validation
      securityLevel = 'enhanced';
      isValid = true;
      details = `SEB with ${browserExamKey ? 'browser' : 'config'} key validation`;
      method = 'HTTP Headers with Partial Keys';
    } else if (sebVersion && sebPlatform) {
      // Enhanced security - version and platform headers
      securityLevel = 'enhanced';
      isValid = true;
      details = `SEB ${sebVersion} on ${sebPlatform}`;
      method = 'HTTP Headers with Version';
    } else if (sebVersion) {
      // Basic security - version header present
      securityLevel = 'basic';
      isValid = true;
      details = `SEB version ${sebVersion} detected`;
      method = 'HTTP Headers Basic';
    } else if (sebInUserAgent) {
      // Basic security - user agent detection only
      const versionMatch = userAgent.match(/SEB[\s\/]([\d\.]+)/i);
      const version = versionMatch ? versionMatch[1] : 'unknown';
      
      securityLevel = 'basic';
      isValid = true;
      details = `SEB ${version} detected via User Agent`;
      method = 'User Agent Detection';
    }
  }

  // Development mode override
  const isDevelopment = process.env.NODE_ENV === 'development';
  if (isDevelopment) {
    return { 
      isValid: true, 
      sebDetected, 
      securityLevel: sebDetected ? securityLevel : 'none',
      details: `DEV MODE: ${details}`,
      method: `DEV: ${method}`
    };
  }

  return { isValid, sebDetected, securityLevel, details, method };
}

// Create comprehensive SEB error response
function createSEBErrorResponse(request: NextRequest, validation: any) {
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/');
  
  if (isApiRoute) {
    return NextResponse.json(
      {
        error: 'SEB_REQUIRED',
        message: 'Safe Exam Browser is required to access this secure exam resource',
        sebRequired: true,
        detectedSEB: validation.sebDetected,
        securityLevel: validation.securityLevel,
        details: validation.details,
        detectionMethod: validation.method,
        environment: process.env.NODE_ENV,
        setupInstructions: {
          downloadUrl: 'https://safeexambrowser.org/download_en.html',
          configUrl: `/api/exam/seb-config?courseId=${getCourseIdFromPath(request.nextUrl.pathname)}`,
          steps: [
            '1. Download and install Safe Exam Browser',
            '2. Download the exam configuration file (.seb)',
            '3. Close all applications and browsers',
            '4. Double-click the .seb file to start your secure exam'
          ]
        },
        supportInfo: {
          userAgent: request.headers.get('User-Agent'),
          timestamp: new Date().toISOString(),
          requestPath: request.nextUrl.pathname
        }
      },
      { 
        status: 403,
        headers: {
          'X-SEB-Required': 'true',
          'X-Security-Level': validation.securityLevel,
          'X-SEB-Detected': validation.sebDetected.toString(),
          'X-Detection-Method': validation.method,
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache'
        }
      }
    );
  }
  
  // Redirect to SEB setup page for web routes
  const sebSetupUrl = new URL('/seb-required', request.url);
  sebSetupUrl.searchParams.set('returnUrl', request.nextUrl.pathname + request.nextUrl.search);
  sebSetupUrl.searchParams.set('detected', validation.sebDetected.toString());
  sebSetupUrl.searchParams.set('level', validation.securityLevel);
  
  const response = NextResponse.redirect(sebSetupUrl);
  response.headers.set('X-SEB-Required', 'true');
  response.headers.set('X-Security-Level', validation.securityLevel);
  response.headers.set('X-Detection-Method', validation.method);
  
  return response;
}

// Extract course ID from path for config generation
function getCourseIdFromPath(pathname: string): string {
  const examMatch = pathname.match(/\/exam\/([^\/]+)/);
  const questionsMatch = pathname.match(/\/api\/exam\/questions\/([^\/]+)/);
  return examMatch?.[1] || questionsMatch?.[1] || '';
}

// Enhanced security logging
function logSecurityEvent(request: NextRequest, validation: any, action: string) {
  const logData = {
    timestamp: new Date().toISOString(),
    action,
    path: request.nextUrl.pathname,
    sebDetected: validation.sebDetected,
    securityLevel: validation.securityLevel,
    detectionMethod: validation.method,
    userAgent: request.headers.get('User-Agent')?.substring(0, 150),
    ip: request.headers.get('x-forwarded-for') || 
         request.headers.get('x-real-ip') || 
         request.headers.get('cf-connecting-ip') || 
         'unknown',
    headers: {
      browserExamKey: !!request.headers.get('X-SafeExamBrowser-RequestHash'),
      configKey: !!request.headers.get('X-SafeExamBrowser-ConfigKeyHash'),
      sebVersion: request.headers.get('X-SafeExamBrowser-Version'),
      sebPlatform: request.headers.get('X-SafeExamBrowser-Platform')
    },
    environment: process.env.NODE_ENV
  };

  if (process.env.NODE_ENV === 'production') {
    console.log(`🔐 SECURITY [${action}]:`, JSON.stringify(logData));
  } else {
    console.log(`🔍 DEV SECURITY [${action}]:`, logData);
  }
}

// Rate limiting for security endpoints
const securityAttempts = new Map<string, { count: number; lastAttempt: number }>();

function checkRateLimit(ip: string, maxAttempts: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now();
  const attempts = securityAttempts.get(ip);
  
  if (!attempts) {
    securityAttempts.set(ip, { count: 1, lastAttempt: now });
    return true;
  }
  
  // Reset if window has passed
  if (now - attempts.lastAttempt > windowMs) {
    securityAttempts.set(ip, { count: 1, lastAttempt: now });
    return true;
  }
  
  // Increment attempts
  attempts.count++;
  attempts.lastAttempt = now;
  
  return attempts.count <= maxAttempts;
}

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  
  for (const [ip, attempts] of securityAttempts.entries()) {
    if (now - attempts.lastAttempt > windowMs) {
      securityAttempts.delete(ip);
    }
  }
}, 300000); // Clean up every 5 minutes

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  
  // Skip middleware for always accessible routes
  if (isAlwaysAccessible(pathname)) {
    return NextResponse.next();
  }

  // Get client IP for rate limiting
  const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                   request.headers.get('x-real-ip') || 
                   request.headers.get('cf-connecting-ip') || 
                   'unknown';

  // Check if this route requires SEB or has SEB parameter
  const needsSEB = requiresSEBValidation(pathname);
  const hasSEBParam = searchParams.get('seb') === 'true';
  
  // If route doesn't require SEB and doesn't have SEB param, allow access
  if (!needsSEB && !hasSEBParam) {
    return NextResponse.next();
  }

  // Rate limiting for security-sensitive endpoints
  if (needsSEB && !checkRateLimit(clientIP, 20, 60000)) {
    logSecurityEvent(request, { sebDetected: false, securityLevel: 'none', method: 'rate-limited' }, 'RATE_LIMITED');
    
    return NextResponse.json(
      { 
        error: 'RATE_LIMITED',
        message: 'Too many requests. Please wait before trying again.',
        retryAfter: 60
      },
      { 
        status: 429,
        headers: {
          'Retry-After': '60',
          'X-Rate-Limit-Exceeded': 'true'
        }
      }
    );
  }

  // Validate SEB for protected routes
  const validation = validateSEBHeaders(request);
  
  // Development mode - log but allow access with headers
  if (process.env.NODE_ENV === 'development') {
    const response = NextResponse.next();
    
    // Add development headers
    const devHeaders = {
      'X-SEB-Dev-Mode': 'true',
      'X-SEB-Detected': validation.sebDetected.toString(),
      'X-Security-Level': validation.securityLevel,
      'X-SEB-Details': validation.details,
      'X-Detection-Method': validation.method,
      'X-Dev-Timestamp': new Date().toISOString()
    };
    
    Object.entries(devHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    if (needsSEB || hasSEBParam) {
      console.log(`🔍 DEV MODE: Allowing access to ${pathname}`, {
        sebDetected: validation.sebDetected,
        securityLevel: validation.securityLevel,
        method: validation.method,
        userAgent: request.headers.get('User-Agent')?.substring(0, 100)
      });
    }
    
    return response;
  }
  
  // Production mode - enforce SEB validation
  if (!validation.isValid || !validation.sebDetected) {
    logSecurityEvent(request, validation, 'ACCESS_DENIED');
    return createSEBErrorResponse(request, validation);
  }
  
  // SEB validated - allow access with comprehensive security headers
  logSecurityEvent(request, validation, 'ACCESS_GRANTED');
  
  const response = NextResponse.next();
  
  // Add comprehensive security headers for SEB-protected routes
  const securityHeaders: Record<string, string> = {
    // Frame protection
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    
    // SEB validation headers
    'X-SEB-Validated': 'true',
    'X-Security-Level': validation.securityLevel,
    'X-SEB-Details': validation.details,
    'X-Detection-Method': validation.method,
    
    // Transport security
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'X-XSS-Protection': '1; mode=block',
    
    // Cache control for sensitive content
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '0',
    
    // Additional security
    'X-Permitted-Cross-Domain-Policies': 'none',
    'X-Download-Options': 'noopen'
  };

  // Enhanced CSP for maximum security based on SEB level
  let cspDirectives: string[];
  
  if (validation.securityLevel === 'maximum') {
    // Maximum security CSP
    cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'", // Needed for React/Next.js
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "connect-src 'self'",
      "font-src 'self'",
      "object-src 'none'",
      "media-src 'none'",
      "frame-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests"
    ];
  } else if (validation.securityLevel === 'enhanced') {
    // Enhanced security CSP
    cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self'",
      "font-src 'self'",
      "object-src 'none'",
      "media-src 'self'",
      "frame-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ];
  } else {
    // Basic security CSP
    cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self'",
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ];
  }

  securityHeaders['Content-Security-Policy'] = cspDirectives.join('; ');

  // Apply all security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Add exam session monitoring headers
  response.headers.set('X-Exam-Session-Start', Date.now().toString());
  response.headers.set('X-Security-Monitoring', 'active');
  response.headers.set('X-Exam-Environment', 'secure');
  
  // Add SEB-specific headers if detected
  if (validation.sebDetected) {
    response.headers.set('X-SEB-Mode', 'active');
    response.headers.set('X-Lockdown-Level', validation.securityLevel);
    
    // Add exam-specific restrictions
    if (pathname.includes('/exam/')) {
      response.headers.set('X-Exam-Active', 'true');
      response.headers.set('X-Navigation-Blocked', 'true');
      response.headers.set('X-Context-Menu-Disabled', 'true');
    }
  }
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api/auth (authentication routes)
     * - api/exam/seb-config (SEB configuration download)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Static assets with extensions
     * - Root path
     */
    '/((?!api/auth|api/exam/seb-config|_next/static|_next/image|favicon.ico|.*\\.|$).*)',
  ],
};
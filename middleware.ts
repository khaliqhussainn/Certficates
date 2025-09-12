// middleware.ts - Enhanced SEB Detection and Security
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

// Advanced SEB validation
function validateSEBHeaders(request: NextRequest): { 
  isValid: boolean; 
  sebDetected: boolean; 
  securityLevel: 'none' | 'basic' | 'enhanced' | 'maximum';
  details: string;
} {
  const userAgent = request.headers.get('User-Agent') || '';
  const browserExamKey = request.headers.get('X-SafeExamBrowser-RequestHash');
  const configKey = request.headers.get('X-SafeExamBrowser-ConfigKeyHash');
  const sebVersion = request.headers.get('X-SafeExamBrowser-Version');
  
  // Check for SEB patterns in User Agent
  const sebUserAgentPatterns = [
    /SEB[\s\/][\d\.]+/i,
    /SafeExamBrowser/i,
    /Safe.*Exam.*Browser/i
  ];
  
  const sebInUserAgent = sebUserAgentPatterns.some(pattern => pattern.test(userAgent));
  const sebDetected = sebInUserAgent || !!(browserExamKey || configKey || sebVersion);
  
  let securityLevel: 'none' | 'basic' | 'enhanced' | 'maximum' = 'none';
  let isValid = false;
  let details = 'No SEB detected';

  if (sebDetected) {
    if (browserExamKey && configKey) {
      // Maximum security - modern SEB with both keys
      securityLevel = 'maximum';
      isValid = true;
      details = 'Modern SEB with full key validation';
    } else if (browserExamKey || configKey) {
      // Enhanced security - partial key validation
      securityLevel = 'enhanced';
      isValid = true;
      details = 'SEB with partial key validation';
    } else if (sebVersion) {
      // Basic security - version header present
      securityLevel = 'basic';
      isValid = true;
      details = `SEB version ${sebVersion} detected`;
    } else if (sebInUserAgent) {
      // Basic security - user agent detection only
      securityLevel = 'basic';
      isValid = true;
      details = 'SEB detected via User Agent';
    }
  }

  // Development mode bypass
  const isDevelopment = process.env.NODE_ENV === 'development';
  if (isDevelopment) {
    return { 
      isValid: true, 
      sebDetected, 
      securityLevel: sebDetected ? securityLevel : 'none',
      details: `DEV MODE: ${details}`
    };
  }

  return { isValid, sebDetected, securityLevel, details };
}

// Create SEB error response
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
        environment: process.env.NODE_ENV,
        setupUrl: `/seb-required?returnUrl=${encodeURIComponent(request.nextUrl.pathname)}`
      },
      { 
        status: 403,
        headers: {
          'X-SEB-Required': 'true',
          'X-Security-Level': validation.securityLevel,
          'X-SEB-Detected': validation.sebDetected.toString()
        }
      }
    );
  }
  
  // Redirect to SEB setup page for web routes
  const sebSetupUrl = new URL('/seb-required', request.url);
  sebSetupUrl.searchParams.set('returnUrl', request.nextUrl.pathname + request.nextUrl.search);
  
  const response = NextResponse.redirect(sebSetupUrl);
  response.headers.set('X-SEB-Required', 'true');
  response.headers.set('X-Security-Level', validation.securityLevel);
  
  return response;
}

// Log security events
function logSecurityEvent(request: NextRequest, validation: any, action: string) {
  if (process.env.NODE_ENV === 'production') {
    console.log(`🔐 SECURITY: ${action}`, {
      path: request.nextUrl.pathname,
      sebDetected: validation.sebDetected,
      securityLevel: validation.securityLevel,
      userAgent: request.headers.get('User-Agent')?.substring(0, 100),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      timestamp: new Date().toISOString()
    });
  }
}

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  
  // Skip middleware for always accessible routes
  if (isAlwaysAccessible(pathname)) {
    return NextResponse.next();
  }

  // Check if this route requires SEB or has SEB parameter
  const needsSEB = requiresSEBValidation(pathname);
  const hasSEBParam = searchParams.get('seb') === 'true';
  
  // If route doesn't require SEB and doesn't have SEB param, allow access
  if (!needsSEB && !hasSEBParam) {
    return NextResponse.next();
  }

  // Validate SEB for protected routes
  const validation = validateSEBHeaders(request);
  
  // Development mode - log but allow access
  if (process.env.NODE_ENV === 'development') {
    const response = NextResponse.next();
    response.headers.set('X-SEB-Dev-Mode', 'true');
    response.headers.set('X-SEB-Detected', validation.sebDetected.toString());
    response.headers.set('X-Security-Level', validation.securityLevel);
    response.headers.set('X-SEB-Details', validation.details);
    
    if (needsSEB || hasSEBParam) {
      console.log(`🔍 DEV MODE: Allowing access to ${pathname}`, validation);
    }
    
    return response;
  }
  
  // Production mode - enforce SEB validation
  if (!validation.isValid || !validation.sebDetected) {
    logSecurityEvent(request, validation, 'ACCESS_DENIED');
    return createSEBErrorResponse(request, validation);
  }
  
  // SEB validated - allow access with security headers
  logSecurityEvent(request, validation, 'ACCESS_GRANTED');
  
  const response = NextResponse.next();
  
  // Add comprehensive security headers for SEB-protected routes
  const securityHeaders: Record<string, string> = {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-SEB-Validated': 'true',
    'X-Security-Level': validation.securityLevel,
    'X-SEB-Details': validation.details,
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-XSS-Protection': '1; mode=block'
  };

  // Enhanced CSP for maximum security
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'", // Needed for React/Next.js
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "connect-src 'self'",
    "font-src 'self'",
    "object-src 'none'",
    "media-src 'self'",
    "frame-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');

  securityHeaders['Content-Security-Policy'] = csp;

  // Apply all security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Add security monitoring headers
  response.headers.set('X-Exam-Session-Start', Date.now().toString());
  response.headers.set('X-Security-Monitoring', 'active');
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api/auth (authentication routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Static assets
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.).*)',
  ],
};
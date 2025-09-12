// middleware.ts - SEB Header Validation Middleware
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// SEB-protected routes that require browser exam key validation
const SEB_PROTECTED_ROUTES = [
  '/exam/',
  '/api/exam/session/',
  '/api/exam/questions'
];

// Check if route requires SEB validation
function requiresSEBValidation(pathname: string): boolean {
  return SEB_PROTECTED_ROUTES.some(route => pathname.startsWith(route));
}

// Validate SEB headers
function validateSEBHeaders(request: NextRequest): { isValid: boolean; sebDetected: boolean } {
  const userAgent = request.headers.get('User-Agent') || '';
  const browserExamKey = request.headers.get('X-SafeExamBrowser-RequestHash');
  const configKey = request.headers.get('X-SafeExamBrowser-ConfigKeyHash');
  
  // Check for SEB in User Agent
  const sebUserAgentPatterns = [
    /SEB[\s\/][\d\.]+/i,
    /SafeExamBrowser/i,
    /Safe.*Exam.*Browser/i
  ];
  
  const sebDetected = sebUserAgentPatterns.some(pattern => pattern.test(userAgent)) ||
                     !!(browserExamKey || configKey);
  
  // For development/testing, allow bypass
  const isDevelopment = process.env.NODE_ENV === 'development';
  const bypassHeader = request.headers.get('X-SEB-Bypass');
  
  if (isDevelopment && bypassHeader === process.env.SEB_BYPASS_KEY) {
    return { isValid: true, sebDetected: true };
  }
  
  // Validate based on available security keys
  const isValid = !!(browserExamKey && configKey) || // Modern SEB with both keys
                  !!(browserExamKey || configKey) ||   // Legacy SEB with one key
                  sebDetected;                         // Basic SEB detection
  
  return { isValid, sebDetected };
}

// Generate SEB error response
function createSEBErrorResponse(request: NextRequest) {
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/');
  
  if (isApiRoute) {
    return NextResponse.json(
      {
        error: 'SEB_REQUIRED',
        message: 'Safe Exam Browser is required to access this resource',
        sebRequired: true,
        detectedSEB: false
      },
      { status: 403 }
    );
  }
  
  // Redirect to SEB setup page for web routes
  const sebSetupUrl = new URL('/seb-required', request.url);
  sebSetupUrl.searchParams.set('returnUrl', request.nextUrl.pathname + request.nextUrl.search);
  
  return NextResponse.redirect(sebSetupUrl);
}

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  
  // Skip middleware for static files and non-protected routes
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/static/') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }
  
  // Check if this route requires SEB validation
  const needsSEB = requiresSEBValidation(pathname);
  const isSEBMode = searchParams.get('seb') === 'true';
  
  // Only enforce SEB for routes that explicitly require it or have seb=true parameter
  if (!needsSEB && !isSEBMode) {
    return NextResponse.next();
  }
  
  // Validate SEB headers
  const { isValid, sebDetected } = validateSEBHeaders(request);
  
  // Allow access if SEB is properly validated
  if (isValid && sebDetected) {
    const response = NextResponse.next();
    
    // Add security headers for SEB-protected routes
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'no-referrer');
    response.headers.set('X-SEB-Validated', 'true');
    
    // Add CSP for extra security
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self'",
      "font-src 'self'",
      "object-src 'none'",
      "media-src 'self'",
      "frame-src 'none'"
    ].join('; ');
    
    response.headers.set('Content-Security-Policy', csp);
    
    return response;
  }
  
  // For exam routes in development, show warning but allow access
  if (process.env.NODE_ENV === 'development' && pathname.startsWith('/exam/')) {
    console.warn('⚠️ SEB not detected in development mode - this would block in production');
    
    const response = NextResponse.next();
    response.headers.set('X-SEB-Warning', 'SEB not detected - development mode');
    return response;
  }
  
  // Block access if SEB is required but not detected
  console.log(`🚫 SEB required but not detected for ${pathname}`);
  return createSEBErrorResponse(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (authentication routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
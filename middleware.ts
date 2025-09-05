// middleware.ts - Middleware for route protection
import { withAuth } from "next-auth/middleware"

export default withAuth(
  function middleware(req) {
    // Additional middleware logic here if needed
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        
        // Admin routes require ADMIN role
        if (pathname.startsWith('/admin')) {
          return token?.role === 'ADMIN'
        }
        
        // Certificate routes require authentication
        if (pathname.startsWith('/certificate')) {
          return !!token
        }
        
        return true
      },
    },
  }
)

export const config = {
  matcher: [
    '/admin/:path*',
    '/certificate/:path*'
  ]
}

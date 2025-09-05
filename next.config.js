// next.config.js - Next.js Configuration
/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
    serverComponentsExternalPackages: ['@prisma/client']
  },
  async headers() {
    return [
      {
        source: '/exam/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'" }
        ]
      }
    ]
  },
  images: {
    domains: ['localhost', 'your-domain.com', 'lh3.googleusercontent.com']
  },
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  }
}

module.exports = nextConfig



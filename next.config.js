// next.config.js - Fixed Configuration
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      "@prisma/client", 
      "bcryptjs",
      "nodemailer"  // Add nodemailer here
    ],
    esmExternals: "loose",
  },
  webpack: (config, { isServer }) => {
    // Fixes for nodemailer and other Node.js modules
    if (isServer) {
      config.externals.push({
        nodemailer: 'commonjs nodemailer',
      })
    } else {
      // Don't resolve nodemailer on client side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        util: false,
        buffer: false,
        'node:buffer': false,
      }
    }
    return config
  },
  async headers() {
    return [
      {
        source: '/exam/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { 
            key: 'Content-Security-Policy', 
            value: process.env.NODE_ENV === 'development' 
              ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'"
              : "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
          }
        ]
      }
    ]
  },
  images: {
    domains: ['localhost', 'your-domain.com', 'lh3.googleusercontent.com', 'images.unsplash.com']
  },
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  }
}

module.exports = nextConfig
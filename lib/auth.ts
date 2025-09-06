// Certificate Platform: lib/auth.ts
import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"
import { courseIntegration } from "./courseIntegration"

// Build-time guard to prevent database calls during Vercel build
const isBuildTime = process.env.NODE_ENV === 'production' && !process.env.VERCEL_ENV

// Safe database helper with timeout and error handling
const safeDbQuery = async <T>(query: () => Promise<T>, timeoutMs: number = 5000): Promise<T | null> => {
  if (isBuildTime) {
    return null
  }
  
  try {
    return await Promise.race([
      query(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Database timeout')), timeoutMs)
      )
    ])
  } catch (error) {
    console.error("Database query error:", error)
    return null
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        loginType: { label: "Login Type", type: "text" } // 'course' or 'direct'
      },
      async authorize(credentials) {
        // Skip during build time
        if (isBuildTime) {
          return null
        }
        
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          // If user is logging in from course website
          if (credentials.loginType === 'course') {
            const user = await courseIntegration.syncUserFromCourseWebsite(
              credentials.email,
              credentials.password
            )
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              image: user.image,
              role: user.role,
              courseUserId: user.courseUserId,
            }
          }

          // Direct login to certificate platform
          const user = await safeDbQuery(() => 
            prisma.user.findUnique({
              where: { email: credentials.email },
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                password: true,
                image: true,
                courseUserId: true
              }
            })
          )

          if (!user || !user.password) {
            return null
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          )

          if (!isPasswordValid) {
            return null
          }

          // Return user data for NextAuth
          return {
            id: user.id,
            email: user.email!,
            name: user.name,
            role: user.role,
            image: user.image,
            courseUserId: user.courseUserId,
          }
        } catch (error) {
          console.error("Auth error:", error)
          return null
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user, account, trigger }) {
      const isProduction = process.env.NODE_ENV === 'production'
      
      // Skip database operations during build time
      if (isBuildTime) {
        if (user) {
          token.id = user.id
          token.role = user.role
          token.courseUserId = user.courseUserId
          token.email = user.email
        }
        return token
      }
      
      if (!isProduction) {
        console.log("=== JWT Callback ===")
        console.log("Token before:", { id: token.id, email: token.email, sub: token.sub })
        console.log("User:", user ? { id: user.id, email: user.email } : null)
        console.log("Account provider:", account?.provider)
        console.log("Trigger:", trigger)
      }

      // Initial sign in - user object is available
      if (user) {
        if (!isProduction) console.log("Setting token from user object")
        token.id = user.id
        token.role = user.role
        token.courseUserId = user.courseUserId
        token.email = user.email
        return token
      }

      // Subsequent requests - ensure we have user ID
      if (!token.id && token.email) {
        if (!isProduction) console.log("Token missing ID, looking up by email:", token.email)
        
        const dbUser = await safeDbQuery(() =>
          prisma.user.findUnique({
            where: { email: token.email },
            select: { id: true, role: true, email: true, courseUserId: true }
          })
        )
        
        if (dbUser) {
          if (!isProduction) console.log("Found user in DB:", dbUser.id)
          token.id = dbUser.id
          token.role = dbUser.role
          token.courseUserId = dbUser.courseUserId
        } else if (!isProduction) {
          console.warn("User not found in DB for email:", token.email)
        }
      }

      // Final fallback: use sub as ID for OAuth providers
      if (!token.id && token.sub) {
        if (!isProduction) console.log("Using sub as fallback ID:", token.sub)
        token.id = token.sub
      }

      if (!isProduction) {
        console.log("Token after:", { id: token.id, email: token.email, role: token.role })
      }
      
      return token
    },
    
    async session({ session, token }) {
      const isProduction = process.env.NODE_ENV === 'production'
      
      // Skip database operations during build time
      if (isBuildTime) {
        if (session.user) {
          session.user.id = token.id as string || token.sub as string
          session.user.role = (token.role as string) || 'STUDENT'
          session.user.courseUserId = token.courseUserId as string
          session.user.email = token.email as string || session.user.email
        }
        return session
      }
      
      if (!isProduction) {
        console.log("=== Session Callback ===")
        console.log("Token:", { id: token.id, email: token.email, role: token.role, sub: token.sub })
      }
      
      if (session.user) {
        // Ensure we have a user ID
        let userId = token.id as string
        
        // Fallback to sub if no ID
        if (!userId && token.sub) {
          userId = token.sub as string
        }
        
        // Last resort: lookup by email (with safe query)
        if (!userId && token.email && session.user.email) {
          const dbUser = await safeDbQuery(() =>
            prisma.user.findUnique({
              where: { email: session.user.email! },
              select: { id: true, role: true, courseUserId: true }
            })
          )
          
          if (dbUser) {
            userId = dbUser.id
            // Update token for future requests
            token.id = dbUser.id
            token.role = dbUser.role
            token.courseUserId = dbUser.courseUserId
          }
        }

        // Set session data
        session.user.id = userId
        session.user.role = (token.role as string) || 'STUDENT'
        session.user.courseUserId = token.courseUserId ?? undefined
        session.user.email = token.email as string || session.user.email
        
        if (!isProduction) {
          console.log("Final session user:", {
            id: session.user.id,
            email: session.user.email,
            role: session.user.role,
            courseUserId: session.user.courseUserId
          })
        }
      }
      
      return session
    },

    async signIn({ user, account, profile }) {
      const isProduction = process.env.NODE_ENV === 'production'
      
      // Skip database operations during build time
      if (isBuildTime) {
        return true
      }
      
      if (!isProduction) {
        console.log("=== SignIn Callback ===")
        console.log("User:", { id: user.id, email: user.email })
        console.log("Account:", account?.provider)
      }
      
      // Enhanced OAuth handling
      if (account?.provider === "google" && user.email) {
        const existingUser = await safeDbQuery(() =>
          prisma.user.findUnique({
            where: { email: user.email! },
            select: { id: true, name: true, image: true }
          })
        )
        
        if (existingUser) {
          // Update user ID to ensure consistency
          user.id = existingUser.id
          
          // Update profile information if needed
          if (!existingUser.name && user.name) {
            await safeDbQuery(() =>
              prisma.user.update({
                where: { id: existingUser.id },
                data: { 
                  name: user.name,
                  image: user.image 
                }
              })
            )
          }
        }
      }
      
      return true
    }
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
  
  // Production-specific configurations
  useSecureCookies: process.env.NODE_ENV === "production",
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" 
        ? "__Secure-next-auth.session-token" 
        : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60, // 30 days
      },
    },
    callbackUrl: {
      name: process.env.NODE_ENV === "production" 
        ? "__Secure-next-auth.callback-url" 
        : "next-auth.callback-url",
      options: {
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    csrfToken: {
      name: process.env.NODE_ENV === "production" 
        ? "__Host-next-auth.csrf-token" 
        : "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  
  events: {
    async signIn(message) {
      if (!isBuildTime && process.env.NODE_ENV === 'production') {
        console.log("✅ SignIn event:", {
          user: message.user.email,
          account: message.account?.provider
        })
      }
    },
    async signOut(message) {
      if (!isBuildTime && process.env.NODE_ENV === 'production') {
        console.log("👋 SignOut event:", message.token?.email)
      }
    },
    async session(message) {
      if (!isBuildTime && process.env.NODE_ENV === 'production' && !message.session?.user?.id) {
        console.error("⚠️ Session missing user ID:", message.session?.user?.email)
      }
    }
  }
}
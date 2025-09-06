// types/next-auth.d.ts
import { DefaultSession, DefaultUser } from "next-auth"
import { JWT, DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      courseUserId?: string
      email: string
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    id: string
    email: string
    role?: string
    courseUserId?: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id?: string
    role?: string
    courseUserId?: string | null
    email?: string
  }
}
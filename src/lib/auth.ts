import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        login: { label: "Email or Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.login || !credentials?.password) {
          return null
        }

        const login = credentials.login as string

        // Try to find user by email (for parents) or username (for children)
        let user = await prisma.user.findUnique({
          where: { email: login }
        })

        if (!user) {
          user = await prisma.user.findUnique({
            where: { username: login }
          })
        }

        if (!user) {
          return null
        }

        const isValid = await bcrypt.compare(credentials.password as string, user.password)

        if (!isValid) {
          return null
        }

        return {
          id: user.id,
          name: user.email || user.username,
          email: user.email,
        }
      }
    })
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        // Get user type and parentId to include in session
        const user = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { accountType: true, parentId: true }
        })
        session.user.id = token.sub
        session.user.accountType = user?.accountType || "child"
        session.user.parentId = user?.parentId || null
      }
      return session
    }
  },
  pages: {
    signIn: "/",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "super-secret-key-change-in-production",
})
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
          accountType: user.accountType,
          parentId: user.parentId,
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Add user data to token
      if (user) {
        token.id = user.id
        token.accountType = (user as any).accountType || "child"
        token.parentId = (user as any).parentId || null
      }
      return token
    },
    async session({ session, token }) {
      // Add token data to session
      if (session.user) {
        session.user.id = token.id as string
        session.user.accountType = token.accountType as string
        session.user.parentId = token.parentId as string | null
        // Track if parent has switched to view as child
        session.user.switchedToChildId = token.switchedToChildId as string | null
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
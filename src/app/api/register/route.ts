import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { randomBytes } from "crypto"

export async function POST(request: Request) {
  try {
    const session = await auth()
    const { email, username, password, accountType } = await request.json()

    // Parent signup (no auth required)
    if (accountType === "parent") {
      if (!email) {
        return NextResponse.json(
          { error: "Email is required for parent account" },
          { status: 400 }
        )
      }

      if (!password) {
        return NextResponse.json(
          { error: "Password is required for parent account" },
          { status: 400 }
        )
      }

      const existingUser = await prisma.user.findUnique({
        where: { email }
      })

      if (existingUser) {
        return NextResponse.json(
          { error: "Email already registered" },
          { status: 400 }
        )
      }

      const hashedPassword = await bcrypt.hash(password, 10)

      const user = await prisma.user.create({
        data: {
          email,
          username: null,
          password: hashedPassword,
          accountType: "parent",
        }
      })

      return NextResponse.json({
        id: user.id,
        email: user.email,
        accountType: user.accountType,
      })
    }

    // Child account creation (requires parent auth)
    if (!session?.user?.id || session.user.accountType !== "parent") {
      return NextResponse.json(
        { error: "Only parents can create child accounts" },
        { status: 401 }
      )
    }

    if (!username) {
      return NextResponse.json(
        { error: "Username is required for child account" },
        { status: 400 }
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { username }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Username already taken" },
        { status: 400 }
      )
    }

    // Generate a random password for children if not provided
    // Children don't need passwords - parent manages their account
    const childPassword = password || randomBytes(16).toString("hex")
    const hashedPassword = await bcrypt.hash(childPassword, 10)

    const user = await prisma.user.create({
      data: {
        email: null,
        username,
        password: hashedPassword,
        accountType: "child",
        parentId: session.user.id,
      }
    })

    return NextResponse.json({
      id: user.id,
      username: user.username,
      accountType: user.accountType,
    })
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
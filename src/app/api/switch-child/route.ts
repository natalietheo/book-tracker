import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getToken } from "next-auth/jwt"

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id || session.user.accountType !== "parent") {
      return NextResponse.json(
        { error: "Only parents can switch to child accounts" },
        { status: 401 }
      )
    }

    const { childId } = await request.json()

    if (!childId) {
      return NextResponse.json(
        { error: "Child ID is required" },
        { status: 400 }
      )
    }

    // Verify the child belongs to this parent
    const child = await prisma.user.findFirst({
      where: {
        id: childId,
        parentId: session.user.id,
        accountType: "child",
      },
    })

    if (!child) {
      return NextResponse.json(
        { error: "Child not found or not your child" },
        { status: 404 }
      )
    }

    // Return success - the frontend will handle switching context
    return NextResponse.json({
      success: true,
      childId: child.id,
      childUsername: child.username,
    })
  } catch (error) {
    console.error("Switch child error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}

// Endpoint to switch back to parent view
export async function DELETE() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Switch back error:", error)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
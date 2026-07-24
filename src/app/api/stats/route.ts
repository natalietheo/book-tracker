import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const viewingChildId = searchParams.get("childId")
  const viewMode = searchParams.get("viewMode")

  const currentYear = new Date().getFullYear()
  const startOfYear = new Date(currentYear, 0, 1)

  try {
    let userIds: string[] = []

    // If viewing as a specific child, only count that child's books
    if (viewingChildId) {
      userIds = [viewingChildId]
      console.log("Viewing as child:", viewingChildId)
    } else if (viewMode === "myBooks") {
      // Parent viewing only their own books
      userIds = [session.user.id]
      console.log("Viewing myBooks only:", session.user.id)
    } else if (session.user.accountType === "parent") {
      // Parent viewing family - get all children + parent
      const children = await prisma.user.findMany({
        where: { parentId: session.user.id },
        select: { id: true }
      })
      userIds = children.map(c => c.id)
      userIds.push(session.user.id)
      console.log("Viewing family, userIds:", userIds)
    } else {
      // Just this user's books (child user)
      userIds = [session.user.id]
      console.log("Viewing single user:", session.user.id)
    }

    // Count books finished this year
    const booksReadThisYear = await prisma.book.count({
      where: {
        userId: { in: userIds },
        status: "finished",
        createdAt: {
          gte: startOfYear
        }
      }
    })

    // Count total books finished
    const totalBooksFinished = await prisma.book.count({
      where: {
        userId: { in: userIds },
        status: "finished"
      }
    })

    console.log("Stats result:", { booksReadThisYear, totalBooksFinished, userIds })

    return NextResponse.json({
      booksReadThisYear,
      totalBooksFinished,
      year: currentYear
    })
  } catch (error) {
    console.error("Failed to fetch stats:", error)
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    )
  }
}
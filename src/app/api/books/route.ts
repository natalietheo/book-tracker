import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

function getEffectiveUserId(session: any, request: Request): string {
  // Check for x-child-id header (used when parent is viewing as child)
  const childId = request.headers.get("x-child-id")
  if (childId) {
    return childId
  }
  // If parent has switched to a child via session, use the child's ID
  return session.user.switchedToChildId || session.user.id
}

export async function GET(request: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = getEffectiveUserId(session, request)

  const books = await prisma.book.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(books)
}

export async function POST(request: Request) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { isbn, title, author, coverUrl, status, rating, notes } = await request.json()

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      )
    }

    const userId = getEffectiveUserId(session, request)

    const book = await prisma.book.create({
      data: {
        userId,
        isbn,
        title,
        author,
        coverUrl,
        status: status || "want_to_read",
        rating,
        notes,
      },
    })

    return NextResponse.json(book)
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create book" },
      { status: 500 }
    )
  }
}
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET: Get all books from all children for the parent
export async function GET() {
  const session = await auth()

  if (!session?.user?.id || session.user.accountType !== "parent") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get all children
  const children = await prisma.user.findMany({
    where: { parentId: session.user.id },
    select: { id: true, username: true },
  })

  const childIds = children.map(c => c.id)

  if (childIds.length === 0) {
    return NextResponse.json([])
  }

  // Get all books from all children
  const books = await prisma.book.findMany({
    where: { userId: { in: childIds } },
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: { username: true },
      },
    },
  })

  return NextResponse.json(books)
}
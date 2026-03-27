import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET: List all children for the parent
export async function GET() {
  const session = await auth()

  if (!session?.user?.id || session.user.accountType !== "parent") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const children = await prisma.user.findMany({
    where: { parentId: session.user.id },
    select: {
      id: true,
      username: true,
      createdAt: true,
      books: {
        select: {
          id: true,
          title: true,
          author: true,
          coverUrl: true,
          status: true,
          rating: true,
        }
      }
    },
    orderBy: { createdAt: "asc" },
  })

  // Get book counts for each child
  const childrenWithCounts = children.map(child => ({
    ...child,
    bookCount: child.books.length,
    readingCount: child.books.filter(b => b.status === "reading").length,
    finishedCount: child.books.filter(b => b.status === "finished").length,
    wantToReadCount: child.books.filter(b => b.status === "want_to_read").length,
  }))

  return NextResponse.json(childrenWithCounts)
}
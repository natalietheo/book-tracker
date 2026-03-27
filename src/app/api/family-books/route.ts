import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()

  if (!session?.user?.id || session.user.accountType !== "parent") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get all children and their books
  const children = await prisma.user.findMany({
    where: { parentId: session.user.id },
    select: {
      id: true,
      username: true,
      books: {
        orderBy: { createdAt: "desc" },
      },
    },
  })

  // Flatten books with child info attached
  const allBooks = children.flatMap(child =>
    child.books.map(book => ({
      ...book,
      childName: child.username,
      childId: child.id,
    }))
  )

  // Sort by most recent
  allBooks.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return NextResponse.json(allBooks)
}
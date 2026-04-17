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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const { id } = await params

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = getEffectiveUserId(session, request)

  const book = await prisma.book.findFirst({
    where: {
      id,
      userId,
    },
  })

  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 })
  }

  return NextResponse.json(book)
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const { id } = await params

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = getEffectiveUserId(session, request)

  const existingBook = await prisma.book.findFirst({
    where: {
      id,
      userId,
    },
  })

  if (!existingBook) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 })
  }

  const updates = await request.json()

  const book = await prisma.book.update({
    where: { id },
    data: updates,
  })

  return NextResponse.json(book)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const { id } = await params

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = getEffectiveUserId(session, request)

  const existingBook = await prisma.book.findFirst({
    where: {
      id,
      userId,
    },
  })

  if (!existingBook) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 })
  }

  await prisma.book.delete({
    where: { id },
  })

  return NextResponse.json({ success: true })
}
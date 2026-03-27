import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const { id } = await params

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const book = await prisma.book.findFirst({
    where: {
      id,
      userId: session.user.id,
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

  const existingBook = await prisma.book.findFirst({
    where: {
      id,
      userId: session.user.id,
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

  const existingBook = await prisma.book.findFirst({
    where: {
      id,
      userId: session.user.id,
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
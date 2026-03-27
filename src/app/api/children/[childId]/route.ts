import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ childId: string }> }
) {
  const session = await auth()
  const { childId } = await params

  if (!session?.user?.id || session.user.accountType !== "parent") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Verify the child belongs to this parent
  const child = await prisma.user.findFirst({
    where: {
      id: childId,
      parentId: session.user.id,
    },
  })

  if (!child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 })
  }

  // Get child's books
  const books = await prisma.book.findMany({
    where: { userId: childId },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({
    id: child.id,
    username: child.username,
    books,
  })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ childId: string }> }
) {
  const session = await auth()
  const { childId } = await params

  if (!session?.user?.id || session.user.accountType !== "parent") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Verify the child belongs to this parent
  const child = await prisma.user.findFirst({
    where: {
      id: childId,
      parentId: session.user.id,
    },
  })

  if (!child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 })
  }

  // Delete the child and their books (cascade will handle books)
  await prisma.user.delete({
    where: { id: childId },
  })

  return NextResponse.json({ success: true })
}
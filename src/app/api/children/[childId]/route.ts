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

  const child = await prisma.user.findFirst({
    where: {
      id: childId,
      parentId: session.user.id,
    },
  })

  if (!child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 })
  }

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ childId: string }> }
) {
  const session = await auth()
  const { childId } = await params

  if (!session?.user?.id || session.user.accountType !== "parent") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const child = await prisma.user.findFirst({
    where: {
      id: childId,
      parentId: session.user.id,
    },
  })

  if (!child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 })
  }

  const { username } = await request.json()

  if (!username || typeof username !== "string") {
    return NextResponse.json({ error: "Username is required" }, { status: 400 })
  }

  const updatedChild = await prisma.user.update({
    where: { id: childId },
    data: { username: username.trim() },
  })

  return NextResponse.json({
    id: updatedChild.id,
    username: updatedChild.username,
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

  const child = await prisma.user.findFirst({
    where: {
      id: childId,
      parentId: session.user.id,
    },
  })

  if (!child) {
    return NextResponse.json({ error: "Child not found" }, { status: 404 })
  }

  await prisma.user.delete({
    where: { id: childId },
  })

  return NextResponse.json({ success: true })
}

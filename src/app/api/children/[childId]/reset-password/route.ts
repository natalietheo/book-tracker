import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ childId: string }> }
) {
  const session = await auth()
  const { childId } = await params

  if (!session?.user?.id || session.user.accountType !== "parent") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { password } = await request.json()

  if (!password) {
    return NextResponse.json({ error: "Password required" }, { status: 400 })
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

  // Hash new password
  const hashedPassword = await bcrypt.hash(password, 10)

  // Update child's password
  await prisma.user.update({
    where: { id: childId },
    data: {
      password: hashedPassword,
    },
  })

  return NextResponse.json({ message: "Password reset successfully" })
}
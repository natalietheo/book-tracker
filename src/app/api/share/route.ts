import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { randomBytes } from "crypto"

export async function POST() {
  const session = await auth()

  if (!session?.user?.id || session.user.accountType !== "parent") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Check if parent already has a share token
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { shareToken: true }
  })

  if (user?.shareToken) {
    return NextResponse.json({ shareToken: user.shareToken })
  }

  // Generate new share token
  const shareToken = randomBytes(16).toString("hex")

  await prisma.user.update({
    where: { id: session.user.id },
    data: { shareToken }
  })

  return NextResponse.json({ shareToken })
}
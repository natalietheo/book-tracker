import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Resend } from "resend"
import { randomBytes } from "crypto"

const resend = new Resend(process.env.RESEND_API_KEY || "re_123456789")

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Find parent by email
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user || user.accountType !== "parent") {
      // Don't reveal if email exists
      return NextResponse.json({ message: "If that email exists, you will receive a reset link" })
    }

    // Generate reset token
    const resetToken = randomBytes(32).toString("hex")
    const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 hour from now

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    })

    // Send reset email
    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}`

    try {
      await resend.emails.send({
        from: "Book Tracker <onboarding@resend.dev>",
        to: email,
        subject: "Reset your Book Tracker password",
        html: `
          <h1>Reset your password</h1>
          <p>Click the link below to reset your password:</p>
          <a href="${resetUrl}">${resetUrl}</a>
          <p>This link expires in 1 hour.</p>
        `,
      })
    } catch (emailError) {
      console.error("Failed to send email:", emailError)
      // Don't reveal email failure to user
    }

    return NextResponse.json({ message: "If that email exists, you will receive a reset link" })
  } catch (error) {
    console.error("Forgot password error:", error)
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 })
  }
}
import type { Metadata } from "next";
import { Quicksand, Nunito } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

export const metadata: Metadata = {
  title: "Book Tracker - Track Your Reading",
  description: "A simple app for kids to track the books they're reading",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${quicksand.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-blush font-body">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
import { prisma } from "@/lib/prisma"
import BookCard from "@/components/BookCard"
import Link from "next/link"

interface Book {
  id: string
  title: string
  author: string | null
  coverUrl: string | null
  status: string
  rating: number | null
  childName: string
}

export default async function SharedPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  // Find parent by share token
  const parent = await prisma.user.findUnique({
    where: { shareToken: token },
    include: {
      children: {
        select: {
          id: true,
          username: true,
        }
      }
    }
  })

  if (!parent) {
    return (
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Link not found</h1>
          <p className="text-gray-600">This shared link may be invalid or expired.</p>
        </div>
      </main>
    )
  }

  // Get all books from all children
  const childrenIds = parent.children.map(c => c.id)

  const books = await prisma.book.findMany({
    where: { userId: { in: childrenIds } },
    orderBy: { createdAt: "desc" },
  })

  // Map books with child names
  const booksWithChildNames: Book[] = books.map(book => {
    const child = parent.children.find(c => c.id === book.userId)
    return {
      ...book,
      childName: child?.username || "Unknown"
    }
  })

  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4 mx-auto">
            <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Reading List</h1>
          <p className="text-gray-600 mt-2">
            See what {parent.children.map(c => c.username).join(" & ")} are reading!
          </p>
        </header>

        {booksWithChildNames.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No books yet</h2>
            <p className="text-gray-600">
              They haven't added any books to their reading list yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {booksWithChildNames.map(book => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}

        <p className="text-center text-gray-500 text-sm mt-8">
          Shared from Book Tracker
        </p>
      </div>
    </main>
  )
}
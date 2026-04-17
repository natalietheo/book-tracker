import { prisma } from "@/lib/prisma"
import BookCard from "@/components/BookCard"
import ShareFilters from "./ShareFilters"

interface Child {
  id: string
  username: string | null
}

interface Book {
  id: string
  title: string
  author: string | null
  coverUrl: string | null
  status: string
  rating: number | null
  childName: string
}

interface Props {
  params: Promise<{ token: string }>
  searchParams: Promise<{ child?: string; status?: string; rating?: string }>
}

export default async function SharedPage({ params, searchParams }: Props) {
  const { token } = await params
  const { child, status, rating } = await searchParams

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
          <h1 className="text-2xl font-display text-gray-900 mb-2">Link not found</h1>
          <p className="text-gray-600 font-body">This shared link may be invalid or expired.</p>
        </div>
      </main>
    )
  }

  // Get all books from all children
  const childrenIds = parent.children.map(c => c.id)

  // Build filter conditions
  const whereClause: any = { userId: { in: childrenIds } }

  if (child) {
    whereClause.userId = child
  }

  if (status && status !== "all") {
    whereClause.status = status
  }

  if (rating) {
    whereClause.rating = parseInt(rating)
  }

  const books = await prisma.book.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
  })

  // Map books with child names
  const booksWithChildNames: Book[] = books.map(book => {
    const childObj = parent.children.find(c => c.id === book.userId)
    return {
      ...book,
      childName: childObj?.username || "Unknown"
    }
  })

  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-coral rounded-full mb-4 mx-auto">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
            </svg>
          </div>
          <h1 className="text-2xl font-display text-gray-900">My Reading Shelf</h1>
          <p className="text-gray-600 mt-2 font-body">
            See what {parent.children.map(c => c.username).join(" & ")} are reading!
          </p>
        </header>

        <ShareFilters
          children={parent.children}
          currentChild={child || ""}
          currentStatus={status || "all"}
          currentRating={rating || ""}
        />

        {booksWithChildNames.length === 0 ? (
          <div className="text-center py-16 bg-cream rounded-2xl">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-4">
              <svg className="w-8 h-8 text-coral" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29-3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No books found</h2>
            <p className="text-gray-600 font-body">
              No books match your filters. Try changing your filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {booksWithChildNames.map(book => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}

        <p className="text-center text-gray-500 text-sm mt-8 font-body">
          Shared from Book Tracker
        </p>
      </div>
    </main>
  )
}
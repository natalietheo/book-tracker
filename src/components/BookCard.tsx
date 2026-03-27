"use client"

interface Book {
  id: string
  title: string
  author: string | null
  coverUrl: string | null
  status: string
  rating: number | null
  childName?: string
}

interface BookCardProps {
  book: Book
  onClick?: () => void
}

const statusColors: Record<string, string> = {
  want_to_read: "bg-blue-100 text-blue-800",
  reading: "bg-yellow-100 text-yellow-800",
  finished: "bg-green-100 text-green-800",
}

const statusLabels: Record<string, string> = {
  want_to_read: "Want to Read",
  reading: "Reading",
  finished: "Finished",
}

export default function BookCard({ book, onClick }: BookCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
    >
      <div className="aspect-[2/3] bg-gray-200 relative">
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={book.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
            </svg>
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-gray-900 truncate text-sm">{book.title}</h3>
        {book.author && (
          <p className="text-gray-600 text-xs truncate">{book.author}</p>
        )}
        {book.childName && (
          <p className="text-purple-600 text-xs font-medium truncate mt-1">
            {book.childName}
          </p>
        )}
        <div className="mt-2 flex items-center justify-between">
          <span className={`text-xs px-2 py-1 rounded-full ${statusColors[book.status]}`}>
            {statusLabels[book.status]}
          </span>
          {book.rating && (
            <div className="flex text-yellow-400">
              {"★".repeat(book.rating)}
              {"☆".repeat(5 - book.rating)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
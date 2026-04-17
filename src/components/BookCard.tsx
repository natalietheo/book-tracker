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

const statusColors: Record<string, { bg: string; text: string }> = {
  want_to_read: { bg: "bg-purple-100", text: "text-purple-700" },
  reading: { bg: "bg-purple-100", text: "text-purple-700" },
  finished: { bg: "bg-teal-100", text: "text-teal-700" },
}

const statusLabels: Record<string, string> = {
  want_to_read: "Want to Read",
  reading: "Reading",
  finished: "Finished",
}

// Solid colors for covers without images
const coverColors = [
  "bg-coral",
  "bg-amber",
  "bg-teal",
  "bg-purple",
]

function getCoverColor(id: string): string {
  const index = id.charCodeAt(0) % coverColors.length
  return coverColors[index]
}

export default function BookCard({ book, onClick }: BookCardProps) {
  const statusStyle = statusColors[book.status] || statusColors.want_to_read
  const coverColor = getCoverColor(book.id)

  return (
    <div
      onClick={onClick}
      className="bg-cream rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
    >
      <div className={`aspect-[2/3] ${book.coverUrl ? '' : coverColor} relative`}>
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={book.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-3 text-center">
            <span className="text-white font-display text-lg leading-tight drop-shadow-md">
              {book.title}
            </span>
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-bold text-gray-900 truncate text-sm leading-tight">{book.title}</h3>
        {book.author && (
          <p className="text-gray-600 text-xs truncate mt-1">{book.author}</p>
        )}
        {book.childName && (
          <p className="text-purple text-xs font-bold truncate mt-1">
            {book.childName}
          </p>
        )}
        <div className="mt-2 flex items-center justify-between">
          <span className={`text-xs px-3 py-1 rounded-full font-bold ${statusStyle.bg} ${statusStyle.text}`}>
            {statusLabels[book.status]}
          </span>
          {book.rating && (
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <div
                  key={star}
                  className={`w-2 h-2 rounded-full ${
                    star <= book.rating! ? "bg-amber" : "bg-gray-200"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
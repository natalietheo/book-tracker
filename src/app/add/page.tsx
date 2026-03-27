"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

interface BookInfo {
  title: string
  author: string | string[] | null
  coverUrl: string | null
  publishYear: string | number | null
  isbn: string | null
}

interface SearchResult extends BookInfo {
  selected: boolean
}

const statuses = [
  { value: "want_to_read", label: "Want to Read" },
  { value: "reading", label: "Currently Reading" },
  { value: "finished", label: "Finished" },
]

export default function AddBook() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isbn, setIsbn] = useState("")
  const [titleSearch, setTitleSearch] = useState("")
  const [searching, setSearching] = useState(false)
  const [bookInfo, setBookInfo] = useState<BookInfo | null>(null)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchError, setSearchError] = useState("")
  const [activeSearch, setActiveSearch] = useState<"isbn" | "title">("isbn")
  const [formData, setFormData] = useState({
    title: "",
    author: "",
    coverUrl: "",
    status: "want_to_read",
    rating: 0,
    notes: "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  if (status === "loading") {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </main>
    )
  }

  if (status === "unauthenticated") {
    router.push("/")
    return null
  }

  const searchByIsbn = async () => {
    if (!isbn.trim()) return

    setSearching(true)
    setSearchError("")
    setBookInfo(null)
    setSearchResults([])

    try {
      const res = await fetch(`/api/books/search?isbn=${encodeURIComponent(isbn)}`)

      if (!res.ok) {
        const data = await res.json()
        setSearchError(data.error || "Book not found")
        return
      }

      const data = await res.json()
      setBookInfo(data)
      setFormData({
        title: data.title || "",
        author: Array.isArray(data.author) ? data.author.join(", ") : (data.author || ""),
        coverUrl: data.coverUrl || "",
        status: "want_to_read",
        rating: 0,
        notes: "",
      })
    } catch {
      setSearchError("Failed to search for book")
    } finally {
      setSearching(false)
    }
  }

  const searchByTitle = async () => {
    if (!titleSearch.trim()) return

    setSearching(true)
    setSearchError("")
    setBookInfo(null)
    setSearchResults([])

    try {
      const res = await fetch(`/api/books/search-title?q=${encodeURIComponent(titleSearch)}`)

      if (!res.ok) {
        const data = await res.json()
        setSearchError(data.error || "No books found")
        return
      }

      const data = await res.json()
      setSearchResults(data.map((b: BookInfo) => ({ ...b, selected: false })))
    } catch {
      setSearchError("Failed to search for books")
    } finally {
      setSearching(false)
    }
  }

  const selectResult = (result: SearchResult) => {
    setSearchResults([])
    setBookInfo(result)
    setFormData({
      title: result.title || "",
      author: Array.isArray(result.author) ? result.author.join(", ") : (result.author || ""),
      coverUrl: result.coverUrl || "",
      status: "want_to_read",
      rating: 0,
      notes: "",
    })
    setIsbn(result.isbn || "")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      setError("Title is required")
      return
    }

    setSaving(true)
    setError("")

    try {
      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isbn: isbn.trim() || null,
          title: formData.title,
          author: formData.author || null,
          coverUrl: formData.coverUrl || null,
          status: formData.status,
          rating: formData.rating || null,
          notes: formData.notes || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to save book")
        return
      }

      router.push("/dashboard")
    } catch {
      setError("Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900 flex items-center gap-1 mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Add a Book</h1>
        </header>

        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => {
                setActiveSearch("isbn")
                setSearchError("")
                setSearchResults([])
                setBookInfo(null)
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeSearch === "isbn"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Search by ISBN
            </button>
            <button
              onClick={() => {
                setActiveSearch("title")
                setSearchError("")
                setSearchResults([])
                setBookInfo(null)
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeSearch === "title"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Search by Title/Author
            </button>
          </div>

          {activeSearch === "isbn" ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                placeholder="Enter ISBN (e.g., 978-0-06-112008-4)"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onKeyDown={(e) => e.key === "Enter" && searchByIsbn()}
              />
              <button
                onClick={searchByIsbn}
                disabled={searching || !isbn.trim()}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {searching ? "Searching..." : "Search"}
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={titleSearch}
                onChange={(e) => setTitleSearch(e.target.value)}
                placeholder="Enter title or author (e.g., Harry Potter)"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onKeyDown={(e) => e.key === "Enter" && searchByTitle()}
              />
              <button
                onClick={searchByTitle}
                disabled={searching || !titleSearch.trim()}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {searching ? "Searching..." : "Search"}
              </button>
            </div>
          )}

          {searchError && (
            <p className="text-red-500 text-sm mt-2">{searchError}</p>
          )}

          {searchResults.length > 0 && (
            <div className="mt-4 max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
              {searchResults.map((result, index) => (
                <button
                  key={index}
                  onClick={() => selectResult(result)}
                  className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 text-left"
                >
                  {result.coverUrl && (
                    <img
                      src={result.coverUrl}
                      alt={result.title}
                      className="w-10 h-14 object-cover rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{result.title}</p>
                    {result.author && (
                      <p className="text-sm text-gray-600 truncate">{result.author}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {bookInfo && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg flex items-center gap-4">
              {bookInfo.coverUrl && (
                <img
                  src={bookInfo.coverUrl}
                  alt={bookInfo.title}
                  className="w-16 h-24 object-cover rounded"
                />
              )}
              <div>
                <p className="font-medium text-green-800">Book found!</p>
                <p className="text-sm text-green-700">{bookInfo.title}</p>
                {bookInfo.author && (
                  <p className="text-sm text-green-600">{bookInfo.author}</p>
                )}
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Book Details</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Author
              </label>
              <input
                type="text"
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cover URL
              </label>
              <input
                type="url"
                value={formData.coverUrl}
                onChange={(e) => setFormData({ ...formData, coverUrl: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {statuses.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rating
              </label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      rating: formData.rating === star ? 0 : star
                    })}
                    className="text-2xl focus:outline-none"
                  >
                    {star <= formData.rating ? "★" : "☆"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="What do you think about this book?"
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Add Book"}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
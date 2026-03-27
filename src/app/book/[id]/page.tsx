"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"

interface Book {
  id: string
  title: string
  author: string | null
  coverUrl: string | null
  isbn: string | null
  status: string
  rating: number | null
  notes: string | null
  createdAt: string
}

const statuses = [
  { value: "want_to_read", label: "Want to Read" },
  { value: "reading", label: "Currently Reading" },
  { value: "finished", label: "Finished" },
]

export default function BookDetail() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const [book, setBook] = useState<Book | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    title: "",
    author: "",
    status: "want_to_read",
    rating: 0,
    notes: "",
  })

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    }
  }, [status, router])

  useEffect(() => {
    if (session && params.id) {
      fetchBook()
    }
  }, [session, params.id])

  const fetchBook = async () => {
    try {
      const res = await fetch(`/api/books/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setBook(data)
        setFormData({
          title: data.title,
          author: data.author || "",
          status: data.status,
          rating: data.rating || 0,
          notes: data.notes || "",
        })
      }
    } catch (err) {
      console.error("Failed to fetch book:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!formData.title.trim()) {
      setError("Title is required")
      return
    }

    setSaving(true)
    setError("")

    try {
      const res = await fetch(`/api/books/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          author: formData.author || null,
          status: formData.status,
          rating: formData.rating || null,
          notes: formData.notes || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to update book")
        return
      }

      const updatedBook = await res.json()
      setBook(updatedBook)
    } catch {
      setError("Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this book?")) return

    setDeleting(true)

    try {
      const res = await fetch(`/api/books/${params.id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        router.push("/dashboard")
      }
    } catch {
      setError("Failed to delete book")
      setDeleting(false)
    }
  }

  if (status === "loading" || loading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </main>
    )
  }

  if (!book) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="text-gray-600">Book not found</p>
      </main>
    )
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
        </header>

        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {book.coverUrl && (
            <div className="bg-gray-100 p-8 flex justify-center">
              <img
                src={book.coverUrl}
                alt={book.title}
                className="max-h-64 shadow-lg"
              />
            </div>
          )}

          <div className="p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

              {book.isbn && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ISBN
                  </label>
                  <p className="text-gray-900">{book.isbn}</p>
                </div>
              )}

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
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="What do you think about this book?"
                />
              </div>

              {error && (
                <p className="text-red-500 text-sm">{error}</p>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-red-100 text-red-600 px-6 py-3 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
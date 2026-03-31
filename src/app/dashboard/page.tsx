"use client"

import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import BookCard from "@/components/BookCard"

interface Book {
  id: string
  title: string
  author: string | null
  coverUrl: string | null
  status: string
  rating: number | null
  childName?: string
  childId?: string
}

interface Child {
  id: string
  username: string
  createdAt: string
  bookCount: number
  readingCount: number
  finishedCount: number
}

const statusFilters = [
  { value: "all", label: "All Books" },
  { value: "reading", label: "Currently Reading" },
  { value: "finished", label: "Finished" },
  { value: "want_to_read", label: "Want to Read" },
]

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [books, setBooks] = useState<Book[]>([])
  const [children, setChildren] = useState<Child[]>([])
  const [filter, setFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [showAddChild, setShowAddChild] = useState(false)
  const [newChildUsername, setNewChildUsername] = useState("")
  const [newChildPassword, setNewChildPassword] = useState("")
  const [addingChild, setAddingChild] = useState(false)
  const [shareToken, setShareToken] = useState<string | null>(null)
  const [showShareLink, setShowShareLink] = useState(false)

  // Fix hydration mismatch - only use session data after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  // Check if user is a parent (only after mounted to avoid hydration mismatch)
  const isParent = mounted && session?.user?.accountType === "parent"

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    }
  }, [status, router])

  useEffect(() => {
    if (mounted && session) {
      fetchData()
    }
  }, [mounted, session])

  const fetchData = async () => {
    try {
      if (isParent) {
        // Fetch children and family books
        const childrenRes = await fetch("/api/children")
        const booksRes = await fetch("/api/family-books")

        if (childrenRes.ok) {
          const childrenData = await childrenRes.json()
          setChildren(childrenData)
        }
        if (booksRes.ok) {
          const booksData = await booksRes.json()
          setBooks(booksData)
        }
      } else {
        // Child user - fetch their own books
        const res = await fetch("/api/books")
        if (res.ok) {
          const data = await res.json()
          setBooks(data)
        }
      }
    } catch (error) {
      console.error("Failed to fetch data:", error)
    } finally {
      setLoading(false)
    }
  }

  const addChild = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddingChild(true)

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newChildUsername,
          password: newChildPassword,
          accountType: "child",
        }),
      })

      if (res.ok) {
        setShowAddChild(false)
        setNewChildUsername("")
        setNewChildPassword("")
        fetchData() // Refresh children list
      }
    } catch (error) {
      console.error("Failed to add child:", error)
    } finally {
      setAddingChild(false)
    }
  }

  const generateShareLink = async () => {
    try {
      const res = await fetch("/api/share", { method: "POST" })
      const data = await res.json()
      if (data.shareToken) {
        setShareToken(data.shareToken)
        setShowShareLink(true)
      }
    } catch (error) {
      console.error("Failed to generate share link:", error)
    }
  }

  const copyShareLink = () => {
    const url = `${window.location.origin}/share/${shareToken}`
    navigator.clipboard.writeText(url)
  }

  const filteredBooks = filter === "all"
    ? books
    : books.filter(book => book.status === filter)

  if (status === "loading" || loading || !mounted) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </main>
    )
  }

  if (!session || !mounted) {
    return null
  }

  const userName = session?.user?.email || session?.user?.name || "Reader"

  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isParent ? "Family Reading" : "My Books"}
            </h1>
            <p className="text-gray-600">Welcome back, {userName}!</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/add")}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Book
            </button>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Log Out
            </button>
            {isParent && (
              <button
                onClick={generateShareLink}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Share
              </button>
            )}
          </div>
        </header>

        {showShareLink && shareToken && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
            <p className="text-purple-800 font-medium mb-2">Share this link with family & friends:</p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/share/${shareToken}`}
                className="flex-1 px-3 py-2 border border-purple-300 rounded-lg bg-white"
              />
              <button
                onClick={copyShareLink}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
              >
                Copy
              </button>
              <button
                onClick={() => setShowShareLink(false)}
                className="text-purple-600 px-4 py-2"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Parent: Show children section */}
        {isParent && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Your Children</h2>
              <button
                onClick={() => setShowAddChild(!showAddChild)}
                className="text-blue-600 hover:underline text-sm font-medium"
              >
                {showAddChild ? "Cancel" : "+ Add Child"}
              </button>
            </div>

            {showAddChild && (
              <form onSubmit={addChild} className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newChildUsername}
                    onChange={(e) => setNewChildUsername(e.target.value)}
                    placeholder="Child's username"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                  <input
                    type="password"
                    value={newChildPassword}
                    onChange={(e) => setNewChildPassword(e.target.value)}
                    placeholder="Password"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                  <button
                    type="submit"
                    disabled={addingChild}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {addingChild ? "Adding..." : "Add"}
                  </button>
                </div>
              </form>
            )}

            {children.length === 0 ? (
              <p className="text-gray-500 text-sm">No children added yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {children.map(child => (
                  <div
                    key={child.id}
                    className="p-3 bg-gray-50 rounded-lg flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{child.username}</p>
                      <p className="text-xs text-gray-500">
                        {child.readingCount} reading, {child.finishedCount} finished
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {statusFilters.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === f.value
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filteredBooks.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No books yet</h2>
            <p className="text-gray-600 mb-4">
              {filter === "all"
                ? "Start tracking your reading by adding your first book!"
                : `No books in "${statusFilters.find(f => f.value === filter)?.label}"`}
            </p>
            {filter === "all" && (
              <button
                onClick={() => router.push("/add")}
                className="text-blue-600 hover:underline font-medium"
              >
                Add your first book
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredBooks.map(book => (
              <BookCard
                key={book.id}
                book={book}
                onClick={() => router.push(`/book/${book.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
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
  { value: "reading", label: "Reading" },
  { value: "finished", label: "Finished" },
  { value: "want_to_read", label: "Want to Read" },
]

export default function Dashboard() {
  const { data: session, status, update } = useSession()
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
  // Child switching state
  const [switchedChild, setSwitchedChild] = useState<Child | null>(null)
  const [switchingChild, setSwitchingChild] = useState(false)

  // Fix hydration mismatch - only use session data after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  // Check if user is a parent (only after mounted to avoid hydration mismatch)
  const isParent = mounted && session?.user?.accountType === "parent"
  // Check if parent is viewing as a child
  const viewingAsChild = switchedChild !== null

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    }
  }, [status, router])

  useEffect(() => {
    if (mounted && session) {
      fetchData()
    }
  }, [mounted, session, switchedChild])

  const fetchData = async () => {
    try {
      if (isParent && !viewingAsChild) {
        // Parent viewing their family shelf
        const childrenRes = await fetch("/api/children")
        const booksRes = await fetch("/api/family-books")
        const parentBooksRes = await fetch("/api/books")

        if (childrenRes.ok) {
          const childrenData = await childrenRes.json()
          setChildren(childrenData)
        }

        let allBooks: any[] = []

        if (booksRes.ok) {
          const childrenBooks = await booksRes.json()
          allBooks = allBooks.concat(childrenBooks)
        }

        if (parentBooksRes.ok) {
          const pBooks = await parentBooksRes.json()
          allBooks = allBooks.concat(pBooks.map((b: any) => ({ ...b, childName: "You" })))
        }

        setBooks(allBooks)
      } else {
        // Either child user OR parent viewing as a child - fetch that user's books
        // Pass child ID in header if parent is viewing as child
        const headers: HeadersInit = {}
        if (isParent && viewingAsChild && switchedChild) {
          headers["x-child-id"] = switchedChild.id
        }

        const res = await fetch("/api/books", { headers })
        if (res.ok) {
          const data = await res.json()
          // Add childName for parent viewing as child
          if (isParent && viewingAsChild) {
            setBooks(data.map((b: any) => ({ ...b, childName: switchedChild?.username })))
          } else {
            setBooks(data)
          }
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
          // No password for children - they don't need one
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

  const switchToChild = async (child: Child) => {
    setSwitchingChild(true)
    try {
      const res = await fetch("/api/switch-child", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId: child.id }),
      })

      if (res.ok) {
        setSwitchedChild(child)
        // Refresh session to get updated data
        await update()
      }
    } catch (error) {
      console.error("Failed to switch to child:", error)
    } finally {
      setSwitchingChild(false)
    }
  }

  const switchBackToParent = async () => {
    setSwitchingChild(true)
    try {
      setSwitchedChild(null)
      await update()
    } catch (error) {
      console.error("Failed to switch back:", error)
    } finally {
      setSwitchingChild(false)
    }
  }

  const generateShareLink = async () => {
    try {
      const res = await fetch("/api/share", { method: "POST" })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        console.error("Failed to generate share link:", errorData.error || res.statusText)
        return
      }
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
            <h1 className="text-2xl font-display text-gray-900">
              {viewingAsChild
                ? `${switchedChild?.username}'s Books`
                : isParent
                  ? "My Reading Shelf"
                  : "My Books"}
            </h1>
            <p className="text-gray-600 font-body">
              {viewingAsChild
                ? `Managing ${switchedChild?.username}'s reading list`
                : "Track every book your family reads together"}
            </p>
          </div>
          <div className="flex gap-3">
            {/* Child Switcher Dropdown for Parents */}
            {isParent && children.length > 0 && (
              <select
                value={viewingAsChild ? switchedChild?.id : ""}
                onChange={(e) => {
                  if (e.target.value === "") {
                    switchBackToParent()
                  } else {
                    const child = children.find(c => c.id === e.target.value)
                    if (child) switchToChild(child)
                  }
                }}
                disabled={switchingChild}
                className="bg-purple text-white px-4 py-3 rounded-2xl font-bold disabled:opacity-50"
              >
                <option value="">My Shelf</option>
                {children.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.username}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={() => router.push(`/add${viewingAsChild ? `?childId=${switchedChild?.id}` : ''}`)}
              className="bg-coral text-white px-5 py-3 rounded-2xl hover:bg-opacity-90 transition-colors flex items-center gap-2 font-bold"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Book
            </button>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="bg-white text-gray-700 px-4 py-3 rounded-2xl hover:bg-gray-100 transition-colors font-bold"
            >
              Log Out
            </button>
            {isParent && (
              <button
                onClick={generateShareLink}
                className="bg-purple text-white px-5 py-3 rounded-2xl hover:bg-opacity-90 transition-colors font-bold"
              >
                Share
              </button>
            )}
          </div>
        </header>

        {showShareLink && shareToken && (
          <div className="bg-purple-100 border border-purple rounded-2xl p-4 mb-6">
            <p className="text-purple font-bold mb-2">Share this link with family & friends:</p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/share/${shareToken}`}
                className="flex-1 px-4 py-3 border border-purple-200 rounded-2xl bg-white font-body"
              />
              <button
                onClick={copyShareLink}
                className="bg-purple text-white px-5 py-3 rounded-2xl hover:bg-opacity-90 font-bold"
              >
                Copy
              </button>
              <button
                onClick={() => setShowShareLink(false)}
                className="text-purple px-4 py-3 font-bold"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Parent: Show children section - always visible */}
        {isParent && (
          <div className="bg-cream rounded-2xl shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                {viewingAsChild ? "Switch Child" : "Your Children"}
              </h2>
              {!viewingAsChild && (
                <button
                  onClick={() => setShowAddChild(!showAddChild)}
                  className="text-coral hover:underline text-sm font-bold"
                >
                  {showAddChild ? "Cancel" : "+ Add Child"}
                </button>
              )}
              {viewingAsChild && (
                <button
                  onClick={switchBackToParent}
                  disabled={switchingChild}
                  className="text-purple text-sm font-bold hover:underline disabled:opacity-50"
                >
                  ← Back to My Shelf
                </button>
              )}
            </div>

            {showAddChild && (
              <form onSubmit={addChild} className="mb-4 p-4 bg-white rounded-2xl">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newChildUsername}
                    onChange={(e) => setNewChildUsername(e.target.value)}
                    placeholder="Child's username"
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-2xl bg-white font-body"
                    required
                  />
                  <button
                    type="submit"
                    disabled={addingChild}
                    className="bg-coral text-white px-5 py-3 rounded-2xl hover:bg-opacity-90 disabled:opacity-50 font-bold"
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
                {/* My Reading Shelf option - always first when viewing as child */}
                {viewingAsChild && (
                  <button
                    onClick={() => switchBackToParent()}
                    disabled={switchingChild}
                    className="p-4 rounded-2xl flex items-center justify-between hover:bg-gray-100 transition-colors text-left w-full border-2 border-purple bg-purple-50"
                  >
                    <div>
                      <p className="font-bold text-purple">My Reading Shelf</p>
                      <p className="text-xs text-purple-600">View all family books</p>
                    </div>
                    <svg className="w-5 h-5 text-purple" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M12 13l-5-5 5-5 5 5-5 5z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
                {children.map(child => {
                  const isSelected = switchedChild?.id === child.id
                  return (
                    <button
                      key={child.id}
                      onClick={() => switchToChild(child)}
                      disabled={switchingChild}
                      className={`p-4 rounded-2xl flex items-center justify-between hover:bg-purple-50 transition-colors text-left w-full ${
                        isSelected ? "bg-purple text-white" : "bg-white"
                      }`}
                    >
                      <div>
                        <p className={`font-bold ${isSelected ? "text-white" : "text-gray-900"}`}>
                          {child.username}
                        </p>
                        <p className={`text-xs ${isSelected ? "text-purple-200" : "text-gray-500"}`}>
                          {child.readingCount} reading, {child.finishedCount} finished
                        </p>
                      </div>
                      {isSelected && (
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                      {!isSelected && (
                        <div className="w-3 h-3 rounded-full bg-purple"></div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {statusFilters.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${
                filter === f.value
                  ? "bg-coral text-white"
                  : "bg-cream text-gray-700 hover:bg-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filteredBooks.length === 0 ? (
          <div className="text-center py-16 bg-cream rounded-2xl">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-4">
              <svg className="w-8 h-8 text-coral" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No books yet</h2>
            <p className="text-gray-600 mb-4 font-body">
              {filter === "all"
                ? "Start tracking your reading by adding your first book!"
                : `No books in "${statusFilters.find(f => f.value === filter)?.label}"`}
            </p>
            {filter === "all" && (
              <button
                onClick={() => router.push("/add")}
                className="text-coral hover:underline font-bold"
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
                onClick={() => router.push(`/book/${book.id}${viewingAsChild ? `?childId=${switchedChild?.id}` : ''}`)}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
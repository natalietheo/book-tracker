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
  const [editingChildId, setEditingChildId] = useState<string | null>(null)
  const [editingChildName, setEditingChildName] = useState("")
  const [shareToken, setShareToken] = useState<string | null>(null)
  const [showShareLink, setShowShareLink] = useState(false)
  const [showFamilySettings, setShowFamilySettings] = useState(false)
  const [yearStats, setYearStats] = useState<{ booksReadThisYear: number; totalBooksFinished: number; year: number } | null>(null)
  const [switchedChild, setSwitchedChild] = useState<Child | null>(null)
  const [switchingChild, setSwitchingChild] = useState(false)
  const [viewMode, setViewMode] = useState<"myBooks" | "family">("family")
  const [yearlyStats, setYearlyStats] = useState<{ booksReadThisYear: number; totalBooksFinished: number; year: number } | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isParent = mounted && session?.user?.accountType === "parent"
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
  }, [mounted, session, switchedChild, viewMode])

  const fetchData = async () => {
    try {
      if (isParent) {
        const childrenRes = await fetch("/api/children")
        if (childrenRes.ok) {
          const childrenData = await childrenRes.json()
          setChildren(childrenData)
        }
      }

      const statsParams = viewingAsChild && switchedChild
        ? `?childId=${switchedChild.id}`
        : isParent && viewMode === "myBooks"
          ? '?viewMode=myBooks'
          : ''
      const statsRes = await fetch(`/api/stats${statsParams}`)
      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setYearStats(statsData)
      }

      if (viewingAsChild && switchedChild) {
        const headers: HeadersInit = {}
        headers["x-child-id"] = switchedChild.id

        const res = await fetch("/api/books", { headers })
        if (res.ok) {
          const data = await res.json()
          setBooks(data.map((b: any) => ({ ...b, childName: switchedChild?.username })))
        }
      } else if (isParent && viewMode === "family") {
        const familyBooksRes = await fetch("/api/family-books")
        const parentBooksRes = await fetch("/api/books")

        let allBooks: any[] = []

        if (familyBooksRes.ok) {
          const childrenBooks = await familyBooksRes.json()
          allBooks = allBooks.concat(childrenBooks)
        }

        if (parentBooksRes.ok) {
          const pBooks = await parentBooksRes.json()
          allBooks = allBooks.concat(pBooks.map((b: any) => ({ ...b, childName: "You" })))
        }

        setBooks(allBooks)
      } else if (isParent && viewMode === "myBooks") {
        const parentBooksRes = await fetch("/api/books")
        if (parentBooksRes.ok) {
          const pBooks = await parentBooksRes.json()
          setBooks(pBooks.map((b: any) => ({ ...b, childName: "You" })))
        }
      } else {
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
          accountType: "child",
        }),
      })

      if (res.ok) {
        setShowAddChild(false)
        setNewChildUsername("")
        setNewChildPassword("")
        fetchData()
      }
    } catch (error) {
      console.error("Failed to add child:", error)
    } finally {
      setAddingChild(false)
    }
  }

  const editChild = async (childId: string, newUsername: string) => {
    if (!newUsername.trim()) return

    try {
      const res = await fetch(`/api/children/${childId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername }),
      })

      if (res.ok) {
        fetchData()
      }
    } catch (error) {
      console.error("Failed to edit child:", error)
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
              {isParent ? "My Reading Shelf" : "My Books"}
            </h1>
            <p className="text-gray-600 font-body">
              "Track every book your family reads together"
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push(`/add${viewingAsChild ? `?childId=${switchedChild?.id}` : ''}`)}
              className="bg-coral text-white px-5 py-3 rounded-2xl hover:bg-opacity-90 transition-colors flex items-center gap-2 font-bold"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Book
            </button>
            {isParent && (
              <button
                onClick={() => setShowFamilySettings(true)}
                className="bg-purple text-white px-5 py-3 rounded-2xl hover:bg-opacity-90 transition-colors font-bold"
              >
                Family Settings
              </button>
            )}
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="bg-white text-gray-700 px-4 py-3 rounded-2xl hover:bg-gray-100 transition-colors font-bold"
            >
              Log Out
            </button>
          </div>
        </header>

        {isParent && (
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => {
                setViewMode("family")
                setSwitchedChild(null)
              }}
              className={`px-4 py-2 rounded-full font-bold text-sm transition-colors ${
                viewMode === "family" && !viewingAsChild
                  ? "bg-purple text-white"
                  : "bg-white text-gray-700 hover:bg-purple-50 border border-purple"
              }`}
            >
              🏠 Family
            </button>
            <button
              onClick={() => {
                setViewMode("myBooks")
                setSwitchedChild(null)
              }}
              className={`px-4 py-2 rounded-full font-bold text-sm transition-colors ${
                viewMode === "myBooks" && !viewingAsChild
                  ? "bg-purple text-white"
                  : "bg-white text-gray-700 hover:bg-purple-50 border border-purple"
              }`}
            >
              📚 My Books
            </button>
            {children.map(child => (
              <button
                key={child.id}
                onClick={() => {
                  setViewMode("family")
                  setSwitchedChild(child)
                }}
                className={`px-4 py-2 rounded-full font-bold text-sm transition-colors ${
                  viewingAsChild && switchedChild?.id === child.id
                    ? "bg-purple text-white"
                    : "bg-white text-gray-700 hover:bg-purple-50 border border-purple"
                }`}
              >
                {child.username}
              </button>
            ))}
          </div>
        )}

        {yearStats && (
          <div className="bg-gradient-to-r from-amber via-orange-400 to-coral rounded-3xl p-6 mb-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <div className="text-6xl mb-2">📚</div>
                <p className="text-amber-900 text-xs font-bold uppercase tracking-wider mb-1">This Year</p>
                <p className="text-5xl font-display text-white drop-shadow-md">{yearStats.booksReadThisYear}</p>
                <p className="text-amber-100 text-xs mt-1">books read</p>
              </div>
              <div className="flex flex-col items-center px-4">
                <div className="text-3xl">✨</div>
                <div className="w-px h-16 bg-white/30 my-2"></div>
                <div className="text-3xl">🌟</div>
              </div>
              <div className="text-center flex-1">
                <div className="text-6xl mb-2">🏆</div>
                <p className="text-amber-900 text-xs font-bold uppercase tracking-wider mb-1">All Time</p>
                <p className="text-5xl font-display text-white drop-shadow-md">{yearStats.totalBooksFinished}</p>
                <p className="text-amber-100 text-xs mt-1">books finished</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/30">
              <div className="flex items-center justify-between text-xs text-amber-100 mb-2">
                <span>📖 Reading journey</span>
                <span>{yearStats.year}</span>
              </div>
              <div className="h-4 bg-amber-900/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((yearStats.booksReadThisYear / 20) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

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

        {showFamilySettings && isParent && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-display text-gray-900">Family Settings</h2>
                <button
                  onClick={() => setShowFamilySettings(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <p className="text-gray-600 mb-4">Manage your family members below.</p>

              <form onSubmit={addChild} className="mb-6 p-4 bg-cream rounded-2xl">
                <p className="font-bold text-gray-900 mb-3">Add a child</p>
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

              {children.length > 0 && (
                <div>
                  <p className="font-bold text-gray-900 mb-3">Your Children</p>
                  <div className="space-y-2">
                    {children.map(child => (
                      <div
                        key={child.id}
                        className="flex items-center justify-between p-3 bg-cream rounded-2xl"
                      >
                        {editingChildId === child.id ? (
                          <div className="flex gap-2 flex-1">
                            <input
                              type="text"
                              value={editingChildName}
                              onChange={(e) => setEditingChildName(e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-200 rounded-xl bg-white text-sm"
                              autoFocus
                            />
                            <button
                              onClick={async () => {
                                await editChild(child.id, editingChildName)
                                setEditingChildId(null)
                                fetchData()
                              }}
                              className="text-green-600 font-bold text-sm px-2"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingChildId(null)}
                              className="text-gray-500 font-bold text-sm px-2"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <div>
                              <p className="font-bold text-gray-900">{child.username}</p>
                              <p className="text-xs text-gray-500">
                                {child.readingCount} reading, {child.finishedCount} finished
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                setEditingChildId(child.id)
                                setEditingChildName(child.username)
                              }}
                              className="text-purple text-sm font-bold"
                            >
                              Edit
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {children.length === 0 && (
                <p className="text-gray-500 text-center py-4">No children added yet.</p>
              )}
            </div>
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

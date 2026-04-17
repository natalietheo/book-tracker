"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"

interface Child {
  id: string
  username: string | null
}

interface Props {
  children: Child[]
  currentChild: string
  currentStatus: string
  currentRating: string
}

export default function ShareFilters({ children, currentChild, currentStatus, currentRating }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateFilter = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== "all") {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`?${params.toString()}`)
  }, [searchParams, router])

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      {/* Child filter */}
      <select
        value={currentChild}
        onChange={(e) => updateFilter("child", e.target.value)}
        className="px-4 py-2 border border-gray-200 rounded-full bg-cream text-sm font-bold text-gray-700"
      >
        <option value="">All Children</option>
        {children.map((child) => (
          <option key={child.id} value={child.id}>
            {child.username}
          </option>
        ))}
      </select>

      {/* Bookshelf/Status filter */}
      <select
        value={currentStatus}
        onChange={(e) => updateFilter("status", e.target.value)}
        className="px-4 py-2 border border-gray-200 rounded-full bg-cream text-sm font-bold text-gray-700"
      >
        <option value="all">All Bookshelves</option>
        <option value="reading">Reading</option>
        <option value="finished">Finished</option>
        <option value="want_to_read">Want to Read</option>
      </select>

      {/* Rating filter */}
      <select
        value={currentRating}
        onChange={(e) => updateFilter("rating", e.target.value)}
        className="px-4 py-2 border border-gray-200 rounded-full bg-cream text-sm font-bold text-gray-700"
      >
        <option value="">All Ratings</option>
        <option value="5">5 Stars</option>
        <option value="4">4 Stars</option>
        <option value="3">3 Stars</option>
        <option value="2">2 Stars</option>
        <option value="1">1 Star</option>
      </select>

      {/* Clear filters button */}
      {(currentChild || currentStatus !== "all" || currentRating) && (
        <button
          onClick={() => router.push("?")}
          className="px-4 py-2 text-sm text-coral hover:text-coral font-bold"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
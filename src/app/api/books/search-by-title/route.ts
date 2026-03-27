import { NextResponse } from "next/server"
import axios from "axios"

interface BookSearchResult {
  title: string
  author: string | string[] | null
  coverUrl: string | null
  isbn: string | null
  publishYear: string | number | null
}

async function searchOpenLibrary(query: string): Promise<BookSearchResult[]> {
  try {
    const response = await axios.get(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10`,
      { timeout: 5000 }
    )

    if (response.data.docs) {
      return response.data.docs
        .filter((doc: { cover_i?: number; title?: string; author_name?: string[] }) => doc.title)
        .map((doc: { cover_i?: number; title?: string; author_name?: string[]; isbn?: string[]; first_publish_year?: number }) => ({
          title: doc.title,
          author: doc.author_name ? doc.author_name.join(", ") : null,
          coverUrl: doc.cover_i
            ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
            : null,
          isbn: doc.isbn ? doc.isbn[0] : null,
          publishYear: doc.first_publish_year || null,
        }))
    }
    return []
  } catch {
    return []
  }
}

async function searchGoogleBooks(query: string): Promise<BookSearchResult[]> {
  try {
    const response = await axios.get(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10`,
      { timeout: 5000 }
    )

    if (response.data.items) {
      return response.data.items.map((item: { volumeInfo: { title?: string; authors?: string[]; imageLinks?: { thumbnail?: string }; industryIdentifiers?: { identifier: string }[]; publishedDate?: string } }) => ({
        title: item.volumeInfo.title,
        author: item.volumeInfo.authors ? item.volumeInfo.authors.join(", ") : null,
        coverUrl: item.volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:') || null,
        isbn: item.volumeInfo.industryIdentifiers?.[0]?.identifier || null,
        publishYear: item.volumeInfo.publishedDate || null,
      }))
    }
    return []
  } catch {
    return []
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")

  if (!query) {
    return NextResponse.json(
      { error: "Search query is required" },
      { status: 400 }
    )
  }

  // Try Open Library first
  let results = await searchOpenLibrary(query)

  // Fallback to Google Books
  if (results.length === 0) {
    results = await searchGoogleBooks(query)
  }

  if (results.length === 0) {
    return NextResponse.json(
      { error: "No books found" },
      { status: 404 }
    )
  }

  return NextResponse.json(results)
}
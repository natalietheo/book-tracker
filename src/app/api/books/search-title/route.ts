import { NextResponse } from "next/server"
import axios from "axios"

interface BookSearchResult {
  title: string
  author: string | string[] | null
  coverUrl: string | null
  publishYear: string | number | null
  isbn: string | null
}

async function searchOpenLibrary(query: string): Promise<BookSearchResult[]> {
  try {
    const response = await axios.get(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=15`,
      { timeout: 10000 }
    )

    if (response.data.docs) {
      return response.data.docs.map((doc: any) => ({
        title: doc.title,
        author: doc.author_name ? doc.author_name[0] : null,
        coverUrl: doc.cover_i
          ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
          : null,
        publishYear: doc.first_publish_year || null,
        isbn: doc.isbn ? doc.isbn[0] : null,
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
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=15`,
      { timeout: 10000 }
    )

    if (response.data.items) {
      return response.data.items.map((item: any) => {
        const book = item.volumeInfo
        return {
          title: book.title,
          author: book.authors ? book.authors.join(", ") : null,
          coverUrl: book.imageLinks?.thumbnail?.replace('http:', 'https:') || null,
          publishYear: book.publishedDate || null,
          isbn: book.industryIdentifiers
            ? book.industryIdentifiers.find((id: any) => id.type === "ISBN_13")?.identifier ||
              book.industryIdentifiers.find((id: any) => id.type === "ISBN_10")?.identifier
            : null,
        }
      })
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

  // Try Google Books first (more modern/popular books)
  let results = await searchGoogleBooks(query)

  // Also search Open Library and combine unique results
  const openLibraryResults = await searchOpenLibrary(query)

  if (openLibraryResults.length > 0) {
    // Combine results, avoiding duplicates by title
    const existingTitles = new Set(results.map(r => r.title.toLowerCase()))
    for (const book of openLibraryResults) {
      if (!existingTitles.has(book.title.toLowerCase())) {
        results.push(book)
      }
    }
  }

  if (results.length === 0) {
    return NextResponse.json(
      { error: "No books found" },
      { status: 404 }
    )
  }

  return NextResponse.json(results)
}
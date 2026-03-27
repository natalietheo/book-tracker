import { NextResponse } from "next/server"
import axios from "axios"

interface BookSearchResult {
  title: string
  author: string | string[] | null
  coverUrl: string | null
  publishYear: string | number | null
}

async function searchOpenLibrary(isbn: string): Promise<BookSearchResult | null> {
  try {
    const response = await axios.get(
      `https://openlibrary.org/isbn/${isbn}.json`,
      { timeout: 5000 }
    )

    const data = response.data

    let authorName = null
    if (data.authors && data.authors.length > 0) {
      const authorKey = data.authors[0].key
      try {
        const authorResponse = await axios.get(
          `https://openlibrary.org${authorKey}.json`,
          { timeout: 5000 }
        )
        authorName = authorResponse.data.name
      } catch {
        // Author lookup failed
      }
    }

    let coverUrl = null
    if (data.covers && data.covers.length > 0) {
      coverUrl = `https://covers.openlibrary.org/b/id/${data.covers[0]}-L.jpg`
    }

    return {
      title: data.title,
      author: authorName,
      coverUrl,
      publishYear: data.publish_date ? data.publish_date : null,
    }
  } catch {
    return null
  }
}

async function searchGoogleBooks(isbn: string): Promise<BookSearchResult | null> {
  try {
    const response = await axios.get(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`,
      { timeout: 5000 }
    )

    if (response.data.items && response.data.items.length > 0) {
      const book = response.data.items[0].volumeInfo
      return {
        title: book.title,
        author: book.authors || null,
        coverUrl: book.imageLinks?.thumbnail?.replace('http:', 'https:') || null,
        publishYear: book.publishedDate || null,
      }
    }
    return null
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const isbn = searchParams.get("isbn")

  if (!isbn) {
    return NextResponse.json(
      { error: "ISBN is required" },
      { status: 400 }
    )
  }

  // Clean ISBN - remove dashes
  const cleanIsbn = isbn.replace(/[-\s]/g, "")

  // Try Open Library first
  let result = await searchOpenLibrary(cleanIsbn)

  // Fallback to Google Books
  if (!result) {
    result = await searchGoogleBooks(cleanIsbn)
  }

  if (!result) {
    return NextResponse.json(
      { error: "Book not found" },
      { status: 404 }
    )
  }

  return NextResponse.json(result)
}
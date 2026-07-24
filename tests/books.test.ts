import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next-auth before importing the route
vi.mock('next-auth', () => ({
  default: vi.fn(() => ({
    auth: vi.fn(),
    handlers: {},
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
  auth: vi.fn().mockResolvedValue(null),
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}))

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    book: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}))

// Now import after mocking
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { GET as BooksGET } from '@/app/api/books/route'
import { GET as FamilyBooksGET } from '@/app/api/family-books/route'

describe('Books API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns only child user\'s own books', async () => {
    const mockSession = {
      user: {
        id: 'child-1',
        accountType: 'child',
        parentId: 'parent-1',
      },
    }
    vi.mocked(auth).mockResolvedValue(mockSession as any)

    const mockBooks = [
      { id: 'book-1', title: 'Book A', userId: 'child-1', status: 'reading' },
      { id: 'book-2', title: 'Book B', userId: 'child-1', status: 'finished' },
    ]
    vi.mocked(prisma.book.findMany).mockResolvedValue(mockBooks)

    const request = new Request('http://localhost/api/books')
    const response = await BooksGET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(2)
    expect(data[0].userId).toBe('child-1')
    expect(data[1].userId).toBe('child-1')
  })

  it('returns only parent\'s own books when viewing "myBooks" mode', async () => {
    const mockSession = {
      user: {
        id: 'parent-1',
        accountType: 'parent',
        parentId: null,
      },
    }
    vi.mocked(auth).mockResolvedValue(mockSession as any)

    // When x-child-id header is NOT present, return parent's books
    const mockBooks = [
      { id: 'book-1', title: 'My Book', userId: 'parent-1', status: 'reading' },
    ]
    vi.mocked(prisma.book.findMany).mockResolvedValue(mockBooks)

    const request = new Request('http://localhost/api/books')
    const response = await BooksGET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(1)
    expect(data[0].userId).toBe('parent-1')
  })

  it('returns specific child\'s books when parent is viewing as child', async () => {
    const mockSession = {
      user: {
        id: 'parent-1',
        accountType: 'parent',
        parentId: null,
      },
    }
    vi.mocked(auth).mockResolvedValue(mockSession as any)

    // Verify the child exists and belongs to this parent
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'child-1',
      parentId: 'parent-1',
    })

    const mockBooks = [
      { id: 'book-1', title: 'Child Book', userId: 'child-1', status: 'finished' },
    ]
    vi.mocked(prisma.book.findMany).mockResolvedValue(mockBooks)

    const request = new Request('http://localhost/api/books', {
      headers: { 'x-child-id': 'child-1' },
    })
    const response = await BooksGET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(1)
    expect(data[0].userId).toBe('child-1')
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null)

    const request = new Request('http://localhost/api/books')
    const response = await BooksGET(request)

    expect(response.status).toBe(401)
  })
})

describe('Family Books API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns all family members\' books for parent user', async () => {
    const mockSession = {
      user: {
        id: 'parent-1',
        accountType: 'parent',
        parentId: null,
      },
    }
    vi.mocked(auth).mockResolvedValue(mockSession as any)

    // Mock children with their books (using include)
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      {
        id: 'child-1',
        username: 'Alice',
        books: [
          { id: 'book-1', title: 'Alice Book', userId: 'child-1', status: 'reading' },
        ]
      },
      {
        id: 'child-2',
        username: 'Bob',
        books: [
          { id: 'book-2', title: 'Bob Book', userId: 'child-2', status: 'finished' },
        ]
      },
    ])

    const request = new Request('http://localhost/api/family-books')
    const response = await FamilyBooksGET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(2)
    expect(data.map((b: any) => b.userId)).toContain('child-1')
    expect(data.map((b: any) => b.userId)).toContain('child-2')
  })

  it('returns 401 for child user trying to access family books', async () => {
    const mockSession = {
      user: {
        id: 'child-1',
        accountType: 'child',
        parentId: 'parent-1',
      },
    }
    vi.mocked(auth).mockResolvedValue(mockSession as any)

    const request = new Request('http://localhost/api/family-books')
    const response = await FamilyBooksGET(request)

    // Child users are not authorized - returns 401
    expect(response.status).toBe(401)
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null)

    const request = new Request('http://localhost/api/family-books')
    const response = await FamilyBooksGET(request)

    expect(response.status).toBe(401)
  })
})

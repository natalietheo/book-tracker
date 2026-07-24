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

// Mock prisma - use a factory function to avoid hoisting issues
vi.mock('@/lib/prisma', () => {
  const mockFn = vi.fn()
  return {
    prisma: {
      user: {
        findMany: mockFn,
      },
      book: {
        count: vi.fn(),
        findMany: vi.fn(),
      },
    },
    __mockFindMany: mockFn,
  }
})

// Now import after mocking
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { GET } from '@/app/api/stats/route'

describe('Stats API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns only the user\'s own books when viewing own profile (child user)', async () => {
    // Mock session for a child user
    const mockSession = {
      user: {
        id: 'child-1',
        accountType: 'child',
        parentId: 'parent-1',
      },
    }
    vi.mocked(auth).mockResolvedValue(mockSession as any)

    // Mock books for this child - 2 finished this year
    vi.mocked(prisma.book.count)
      .mockResolvedValueOnce(2) // booksReadThisYear
      .mockResolvedValueOnce(5) // totalBooksFinished

    // Mock findMany to return empty for debugging
    vi.mocked(prisma.book.findMany).mockResolvedValue([])

    const request = new Request('http://localhost/api/stats')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.booksReadThisYear).toBe(2)
    expect(data.totalBooksFinished).toBe(5)

    // Verify prisma was called with only child's userId
    expect(prisma.book.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: { in: ['child-1'] },
        }),
      })
    )
  })

  it('returns only the parent\'s own books when viewing "myBooks" mode', async () => {
    // Mock session for a parent user
    const mockSession = {
      user: {
        id: 'parent-1',
        accountType: 'parent',
        parentId: null,
      },
    }
    vi.mocked(auth).mockResolvedValue(mockSession as any)

    vi.mocked(prisma.book.count)
      .mockResolvedValueOnce(1) // booksReadThisYear
      .mockResolvedValueOnce(3) // totalBooksFinished
    vi.mocked(prisma.book.findMany).mockResolvedValue([])

    const request = new Request('http://localhost/api/stats?viewMode=myBooks')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.booksReadThisYear).toBe(1)

    // Verify prisma was called with only parent's userId
    expect(prisma.book.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: { in: ['parent-1'] },
        }),
      })
    )
  })

  it('returns family-wide stats when viewing family mode (parent user)', async () => {
    // Mock session for a parent user
    const mockSession = {
      user: {
        id: 'parent-1',
        accountType: 'parent',
        parentId: null,
      },
    }
    vi.mocked(auth).mockResolvedValue(mockSession as any)

    // Mock children using prisma.user.findMany
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: 'child-1' },
      { id: 'child-2' },
    ])

    vi.mocked(prisma.book.count)
      .mockResolvedValueOnce(10) // booksReadThisYear - family total
      .mockResolvedValueOnce(25) // totalBooksFinished - family total
    vi.mocked(prisma.book.findMany).mockResolvedValue([])

    const request = new Request('http://localhost/api/stats')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.booksReadThisYear).toBe(10)

    // Verify prisma was called with parent + all children userIds
    expect(prisma.book.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: { in: ['child-1', 'child-2', 'parent-1'] },
        }),
      })
    )
  })

  it('returns only specific child\'s stats when viewing as a child', async () => {
    // Mock session for a parent viewing as child
    const mockSession = {
      user: {
        id: 'parent-1',
        accountType: 'parent',
        parentId: null,
      },
    }
    vi.mocked(auth).mockResolvedValue(mockSession as any)

    vi.mocked(prisma.book.count)
      .mockResolvedValueOnce(3) // booksReadThisYear - child only
      .mockResolvedValueOnce(8) // totalBooksFinished - child only
    vi.mocked(prisma.book.findMany).mockResolvedValue([])

    const request = new Request('http://localhost/api/stats?childId=child-1')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.booksReadThisYear).toBe(3)

    // Verify prisma was called with only the specific child's userId
    expect(prisma.book.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: { in: ['child-1'] },
        }),
      })
    )
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null)

    const request = new Request('http://localhost/api/stats')
    const response = await GET(request)

    expect(response.status).toBe(401)
  })
})

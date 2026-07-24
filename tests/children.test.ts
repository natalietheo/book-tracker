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
      update: vi.fn(),
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
import { GET } from '@/app/api/children/route'

describe('Children API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns children for parent user', async () => {
    const mockSession = {
      user: {
        id: 'parent-1',
        accountType: 'parent',
        parentId: null,
      },
    }
    vi.mocked(auth).mockResolvedValue(mockSession as any)

    // Mock children with book counts
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      {
        id: 'child-1',
        username: 'Alice',
        books: [
          { id: 'book-1', status: 'reading' },
          { id: 'book-2', status: 'finished' },
        ]
      },
      {
        id: 'child-2',
        username: 'Bob',
        books: [
          { id: 'book-3', status: 'reading' },
        ]
      },
    ])

    const request = new Request('http://localhost/api/children')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(2)

    // Alice: 1 reading, 1 finished
    expect(data[0].username).toBe('Alice')
    expect(data[0].readingCount).toBe(1)
    expect(data[0].finishedCount).toBe(1)

    // Bob: 1 reading, 0 finished
    expect(data[1].username).toBe('Bob')
    expect(data[1].readingCount).toBe(1)
    expect(data[1].finishedCount).toBe(0)
  })

  it('returns 401 for child user trying to access children API', async () => {
    const mockSession = {
      user: {
        id: 'child-1',
        accountType: 'child',
        parentId: 'parent-1',
      },
    }
    vi.mocked(auth).mockResolvedValue(mockSession as any)

    const request = new Request('http://localhost/api/children')
    const response = await GET(request)

    expect(response.status).toBe(401)
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null)

    const request = new Request('http://localhost/api/children')
    const response = await GET(request)

    expect(response.status).toBe(401)
  })
})

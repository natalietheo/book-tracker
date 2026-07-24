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
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
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
import { POST } from '@/app/api/switch-child/route'

describe('Switch Child API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allows parent to switch to view their child\'s books', async () => {
    const mockSession = {
      user: {
        id: 'parent-1',
        accountType: 'parent',
        parentId: null,
      },
    }
    vi.mocked(auth).mockResolvedValue(mockSession as any)

    // Verify the child belongs to this parent
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: 'child-1',
      username: 'Alice',
      parentId: 'parent-1',
    })

    vi.mocked(prisma.user.update).mockResolvedValue({
      id: 'parent-1',
    })

    const request = new Request('http://localhost/api/switch-child', {
      method: 'POST',
      body: JSON.stringify({ childId: 'child-1' }),
    })
    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'child-1',
        parentId: 'parent-1',
        accountType: 'child',
      },
    })
  })

  it('prevents parent from viewing another parent\'s child', async () => {
    const mockSession = {
      user: {
        id: 'parent-1',
        accountType: 'parent',
        parentId: null,
      },
    }
    vi.mocked(auth).mockResolvedValue(mockSession as any)

    // Child belongs to different parent - findFirst returns null
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null)

    const request = new Request('http://localhost/api/switch-child', {
      method: 'POST',
      body: JSON.stringify({ childId: 'child-1' }),
    })
    const response = await POST(request)

    // Returns 404 when child not found (including wrong parent)
    expect(response.status).toBe(404)
  })

  it('prevents child user from using switch-child API', async () => {
    const mockSession = {
      user: {
        id: 'child-1',
        accountType: 'child',
        parentId: 'parent-1',
      },
    }
    vi.mocked(auth).mockResolvedValue(mockSession as any)

    const request = new Request('http://localhost/api/switch-child', {
      method: 'POST',
      body: JSON.stringify({ childId: 'some-child' }),
    })
    const response = await POST(request)

    // Child users are not authorized
    expect(response.status).toBe(401)
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null)

    const request = new Request('http://localhost/api/switch-child', {
      method: 'POST',
      body: JSON.stringify({ childId: 'child-1' }),
    })
    const response = await POST(request)

    expect(response.status).toBe(401)
  })
})

describe('View Mode Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('family mode fetches all family members books', async () => {
    const mockSession = {
      user: {
        id: 'parent-1',
        accountType: 'parent',
        parentId: null,
      },
    }
    vi.mocked(auth).mockResolvedValue(mockSession as any)

    // Mock children
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: 'child-1', username: 'Alice', books: [{ id: 'b1', status: 'finished' }] },
      { id: 'child-2', username: 'Bob', books: [{ id: 'b2', status: 'reading' }] },
    ])

    // This would test the family-books endpoint
    const { GET } = await import('@/app/api/family-books/route')
    const request = new Request('http://localhost/api/family-books')
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { parentId: 'parent-1' },
      })
    )
  })

  it('myBooks mode only fetches parent\'s own books', async () => {
    const mockSession = {
      user: {
        id: 'parent-1',
        accountType: 'parent',
        parentId: null,
      },
    }
    vi.mocked(auth).mockResolvedValue(mockSession as any)

    vi.mocked(prisma.book.findMany).mockResolvedValue([
      { id: 'book-1', title: 'My Book', userId: 'parent-1', status: 'finished' },
    ])

    // This would test the books endpoint without x-child-id header
    const { GET } = await import('@/app/api/books/route')
    const request = new Request('http://localhost/api/books')
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(prisma.book.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'parent-1' },
      })
    )
  })

  it('viewing specific child fetches only that child\'s books', async () => {
    const mockSession = {
      user: {
        id: 'parent-1',
        accountType: 'parent',
        parentId: null,
      },
    }
    vi.mocked(auth).mockResolvedValue(mockSession as any)

    // Verify child belongs to parent
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'child-1',
      parentId: 'parent-1',
    })

    vi.mocked(prisma.book.findMany).mockResolvedValue([
      { id: 'book-1', title: 'Child Book', userId: 'child-1', status: 'finished' },
    ])

    // This would test the books endpoint with x-child-id header
    const { GET } = await import('@/app/api/books/route')
    const request = new Request('http://localhost/api/books', {
      headers: { 'x-child-id': 'child-1' },
    })
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(prisma.book.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'child-1' },
      })
    )
  })
})

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
import { PATCH, GET } from '@/app/api/children/[childId]/route'

describe('Edit Child API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allows parent to update their child\'s username', async () => {
    const mockSession = {
      user: {
        id: 'parent-1',
        accountType: 'parent',
        parentId: null,
      },
    }
    vi.mocked(auth).mockResolvedValue(mockSession as any)

    // Verify child belongs to parent
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: 'child-1',
      username: 'OldName',
      parentId: 'parent-1',
    })

    // Update the child's name
    vi.mocked(prisma.user.update).mockResolvedValue({
      id: 'child-1',
      username: 'NewName',
      parentId: 'parent-1',
    })

    const request = new Request('http://localhost/api/children/child-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'NewName' }),
    })

    // @ts-ignore - params is a Promise in Next.js 15+
    const response = await PATCH(request, { params: Promise.resolve({ childId: 'child-1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.username).toBe('NewName')
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'child-1' },
      data: { username: 'NewName' },
    })
  })

  it('trims whitespace from username when updating', async () => {
    const mockSession = {
      user: {
        id: 'parent-1',
        accountType: 'parent',
        parentId: null,
      },
    }
    vi.mocked(auth).mockResolvedValue(mockSession as any)

    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: 'child-1',
      username: 'OldName',
      parentId: 'parent-1',
    })

    vi.mocked(prisma.user.update).mockResolvedValue({
      id: 'child-1',
      username: 'TrimmedName',
      parentId: 'parent-1',
    })

    const request = new Request('http://localhost/api/children/child-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: '  TrimmedName  ' }),
    })

    // @ts-ignore - params is a Promise in Next.js 15+
    const response = await PATCH(request, { params: Promise.resolve({ childId: 'child-1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'child-1' },
      data: { username: 'TrimmedName' },
    })
  })

  it('returns 404 when child not found or does not belong to parent', async () => {
    const mockSession = {
      user: {
        id: 'parent-1',
        accountType: 'parent',
        parentId: null,
      },
    }
    vi.mocked(auth).mockResolvedValue(mockSession as any)

    // Child doesn't exist or doesn't belong to this parent
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null)

    const request = new Request('http://localhost/api/children/child-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'NewName' }),
    })

    // @ts-ignore - params is a Promise in Next.js 15+
    const response = await PATCH(request, { params: Promise.resolve({ childId: 'child-1' }) })

    expect(response.status).toBe(404)
  })

  it('returns 400 when username is empty', async () => {
    const mockSession = {
      user: {
        id: 'parent-1',
        accountType: 'parent',
        parentId: null,
      },
    }
    vi.mocked(auth).mockResolvedValue(mockSession as any)

    // First verify child belongs to parent
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: 'child-1',
      username: 'OldName',
      parentId: 'parent-1',
    })

    const request = new Request('http://localhost/api/children/child-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: '' }),
    })

    // @ts-ignore - params is a Promise in Next.js 15+
    const response = await PATCH(request, { params: Promise.resolve({ childId: 'child-1' }) })

    expect(response.status).toBe(400)
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null)

    const request = new Request('http://localhost/api/children/child-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'NewName' }),
    })

    // @ts-ignore - params is a Promise in Next.js 15+
    const response = await PATCH(request, { params: Promise.resolve({ childId: 'child-1' }) })

    expect(response.status).toBe(401)
  })

  it('returns 401 when child tries to edit their own profile', async () => {
    const mockSession = {
      user: {
        id: 'child-1',
        accountType: 'child',
        parentId: 'parent-1',
      },
    }
    vi.mocked(auth).mockResolvedValue(mockSession as any)

    const request = new Request('http://localhost/api/children/child-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'NewName' }),
    })

    // @ts-ignore - params is a Promise in Next.js 15+
    const response = await PATCH(request, { params: Promise.resolve({ childId: 'child-1' }) })

    expect(response.status).toBe(401)
  })
})

describe('Get Child API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns child details for parent', async () => {
    const mockSession = {
      user: {
        id: 'parent-1',
        accountType: 'parent',
        parentId: null,
      },
    }
    vi.mocked(auth).mockResolvedValue(mockSession as any)

    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: 'child-1',
      username: 'Alice',
      parentId: 'parent-1',
    })

    vi.mocked(prisma.book.findMany).mockResolvedValue([
      { id: 'book-1', status: 'reading', userId: 'child-1' },
      { id: 'book-2', status: 'finished', userId: 'child-1' },
    ])

    const request = new Request('http://localhost/api/children/child-1')

    // @ts-ignore - params is a Promise in Next.js 15+
    const response = await GET(request, { params: Promise.resolve({ childId: 'child-1' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.username).toBe('Alice')
    expect(data.books).toHaveLength(2)
  })

  it('returns 404 when child not found', async () => {
    const mockSession = {
      user: {
        id: 'parent-1',
        accountType: 'parent',
        parentId: null,
      },
    }
    vi.mocked(auth).mockResolvedValue(mockSession as any)

    vi.mocked(prisma.user.findFirst).mockResolvedValue(null)

    const request = new Request('http://localhost/api/children/child-1')

    // @ts-ignore - params is a Promise in Next.js 15+
    const response = await GET(request, { params: Promise.resolve({ childId: 'child-1' }) })

    expect(response.status).toBe(404)
  })
})

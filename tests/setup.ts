import { vi } from 'vitest'

// Mock next-auth properly
vi.mock('next-auth', () => ({
  default: vi.fn(() => ({
    auth: vi.fn(),
    handlers: {},
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
  auth: vi.fn(),
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}))

// Mock @/lib/auth to export what the route needs
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
    },
    book: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

global.localStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
} as any

global.navigator = {
  clipboard: {
    writeText: vi.fn(),
    readText: vi.fn(),
  },
} as any

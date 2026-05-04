import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null } })),
    },
  })),
}))

describe('sendChatMessage server action', () => {
  const originalFetch = globalThis.fetch
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.resetModules()
    globalThis.fetch = mockFetch
    mockFetch.mockClear()
    delete process.env.BACKEND_URL
    delete process.env.API_SHARED_SECRET
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.clearAllMocks()
  })

  it('returns CONFIG_ERROR when BACKEND_URL is not set', async () => {
    const { sendChatMessage } = await import('@/app/actions/chat')
    const result = await sendChatMessage('hello')
    expect('error' in result).toBe(true)
    if ('error' in result) {
      expect(result.code).toBe('CONFIG_ERROR')
    }
  })

  it('calls correct endpoint with required headers and returns answer', async () => {
    process.env.BACKEND_URL = 'http://localhost:8000'
    process.env.API_SHARED_SECRET = 'test-secret'

    const mockResponse = {
      answer: 'Test answer',
      sources: [],
      confidence: 0.9,
      cached: false,
    }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    const { sendChatMessage } = await import('@/app/actions/chat')
    const result = await sendChatMessage('test query')

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/chat',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-API-Secret': 'test-secret',
          'Content-Type': 'application/json',
        }),
      })
    )
    expect('error' in result).toBe(false)
    if (!('error' in result)) {
      expect(result.answer).toBe('Test answer')
    }
  })

  it('returns BACKEND_ERROR on non-ok response', async () => {
    process.env.BACKEND_URL = 'http://localhost:8000'
    process.env.API_SHARED_SECRET = 'test-secret'

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    })

    const { sendChatMessage } = await import('@/app/actions/chat')
    const result = await sendChatMessage('test query')
    expect('error' in result).toBe(true)
    if ('error' in result) {
      expect(result.code).toBe('BACKEND_ERROR')
    }
  })
})

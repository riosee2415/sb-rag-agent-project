import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useChat } from '@/hooks/useChat'
import { useChatStore } from '@/stores/chatStore'
import * as chatActions from '@/app/actions/chat'
import type { RAGResponse, ErrorResponse } from '@/types/api'

vi.mock('@/app/actions/chat', () => ({
  sendChatMessage: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}))

describe('useChat', () => {
  beforeEach(() => {
    useChatStore.setState({
      messages: [],
      isLoading: false,
      activeConversationId: null,
    })
    vi.clearAllMocks()
  })

  it('adds user and loading messages on send', async () => {
    const mockResponse: RAGResponse = {
      answer: 'Test answer',
      sources: [],
      confidence: 0.9,
      cached: false,
    }
    vi.mocked(chatActions.sendChatMessage).mockResolvedValueOnce(mockResponse)

    const { result } = renderHook(() => useChat())

    await act(async () => {
      await result.current.sendMessage('test query')
    })

    const messages = useChatStore.getState().messages
    expect(messages.length).toBe(2)
    expect(messages[0].role).toBe('user')
    expect(messages[0].content).toBe('test query')
    expect(messages[1].role).toBe('assistant')
    expect(messages[1].content).toBe('Test answer')
  })

  it('handles error response', async () => {
    const errorResponse: ErrorResponse = {
      error: 'Backend unavailable',
      code: 'BACKEND_ERROR',
    }
    vi.mocked(chatActions.sendChatMessage).mockResolvedValueOnce(errorResponse)

    const { result } = renderHook(() => useChat())

    await act(async () => {
      await result.current.sendMessage('test query')
    })

    const messages = useChatStore.getState().messages
    expect(messages[1].content).toBe('오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
  })

  it('handles timeout error with specific message', async () => {
    const timeoutResponse: ErrorResponse = {
      error: '응답 시간이 초과되었습니다 (30초)',
      code: 'TIMEOUT',
    }
    vi.mocked(chatActions.sendChatMessage).mockResolvedValueOnce(timeoutResponse)

    const { result } = renderHook(() => useChat())

    await act(async () => {
      await result.current.sendMessage('test query')
    })

    const messages = useChatStore.getState().messages
    expect(messages[1].content).toBe('응답 시간이 초과되었습니다. 다시 시도해주세요.')
  })

  it('does not send empty messages', async () => {
    const { result } = renderHook(() => useChat())

    await act(async () => {
      await result.current.sendMessage('   ')
    })

    expect(chatActions.sendChatMessage).not.toHaveBeenCalled()
    expect(useChatStore.getState().messages.length).toBe(0)
  })
})

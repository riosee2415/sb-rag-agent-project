import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChatInput } from '@/components/chat/ChatInput'

const mockSendMessage = vi.fn()
vi.mock('@/hooks/useChat', () => ({
  useChat: () => ({ sendMessage: mockSendMessage, isLoading: false }),
}))

describe('ChatInput', () => {
  beforeEach(() => {
    mockSendMessage.mockClear()
  })

  it('renders textarea and send button', () => {
    render(<ChatInput />)
    expect(screen.getByRole('textbox', { name: /메시지 입력/i })).toBeDefined()
    expect(screen.getByRole('button')).toBeDefined()
  })

  it('submits on Enter key', async () => {
    const user = userEvent.setup()
    render(<ChatInput />)
    const textarea = screen.getByRole('textbox', { name: /메시지 입력/i })
    await user.type(textarea, '테스트 질문')
    await user.keyboard('{Enter}')
    expect(mockSendMessage).toHaveBeenCalledWith('테스트 질문')
  })

  it('does not submit on Shift+Enter', async () => {
    const user = userEvent.setup()
    render(<ChatInput />)
    const textarea = screen.getByRole('textbox', { name: /메시지 입력/i })
    await user.type(textarea, '테스트 질문')
    await user.keyboard('{Shift>}{Enter}{/Shift}')
    expect(mockSendMessage).not.toHaveBeenCalled()
  })

  it('submits on button click', async () => {
    const user = userEvent.setup()
    render(<ChatInput />)
    const textarea = screen.getByRole('textbox', { name: /메시지 입력/i })
    await user.type(textarea, '버튼 클릭 테스트')
    await user.click(screen.getByRole('button'))
    expect(mockSendMessage).toHaveBeenCalledWith('버튼 클릭 테스트')
  })
})

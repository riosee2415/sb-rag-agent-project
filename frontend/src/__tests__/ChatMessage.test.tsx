import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ChatMessage } from '@/components/chat/ChatMessage'
import type { SourceItem } from '@/types/api'

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
      <div {...props}>{children}</div>
    ),
    span: ({ children, ...props }: React.HTMLAttributes<HTMLSpanElement> & { children?: React.ReactNode }) => (
      <span {...props}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

const sources: SourceItem[] = [
  {
    video_title: 'React Tutorial',
    timestamp_label: '01:23',
    timestamp_url: 'https://example.com/video?t=83',
    excerpt: 'React에 대한 설명입니다.',
  },
]

describe('ChatMessage', () => {
  it('renders user message bubble', () => {
    render(
      <ChatMessage
        id="user-1"
        role="user"
        content="안녕하세요!"
        created_at={new Date().toISOString()}
      />
    )
    expect(screen.getByText('안녕하세요!')).toBeDefined()
  })

  it('renders assistant message with data-testid', () => {
    render(
      <ChatMessage
        id="ai-1"
        role="assistant"
        content="AI 응답입니다"
        created_at={new Date().toISOString()}
      />
    )
    expect(screen.getByTestId('ai-message')).toBeDefined()
    expect(screen.getByText('AI 응답입니다')).toBeDefined()
  })

  it('shows typing indicator when isLoading is true', () => {
    render(
      <ChatMessage
        id="ai-2"
        role="assistant"
        content=""
        isLoading={true}
        created_at={new Date().toISOString()}
      />
    )
    expect(screen.getByTestId('typing-indicator')).toBeDefined()
  })

  it('renders source cards when sources provided', () => {
    render(
      <ChatMessage
        id="ai-3"
        role="assistant"
        content="관련 영상을 찾았습니다."
        sources={sources}
        created_at={new Date().toISOString()}
      />
    )
    expect(screen.getByTestId('source-card')).toBeDefined()
    expect(screen.getByText('React Tutorial')).toBeDefined()
  })

  it('does not render ai-message testid for user messages', () => {
    render(
      <ChatMessage
        id="user-2"
        role="user"
        content="사용자 메시지"
        created_at={new Date().toISOString()}
      />
    )
    expect(screen.queryByTestId('ai-message')).toBeNull()
  })
})

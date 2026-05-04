import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ChatMessage } from '@/components/chat/ChatMessage'

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

describe('ChatMessage', () => {
  it('renders user message on the right', () => {
    render(
      <ChatMessage
        id="1"
        role="user"
        content="hello"
        created_at={new Date().toISOString()}
      />
    )
    expect(screen.getByTestId('user-message')).toBeDefined()
    expect(screen.getByText('hello')).toBeDefined()
  })

  it('renders AI message on the left with testid', () => {
    render(
      <ChatMessage
        id="2"
        role="assistant"
        content="AI response"
        created_at={new Date().toISOString()}
      />
    )
    expect(screen.getByTestId('ai-message')).toBeDefined()
    expect(screen.getByText('AI response')).toBeDefined()
  })

  it('renders typing indicator when isLoading is true', () => {
    render(
      <ChatMessage
        id="3"
        role="assistant"
        content=""
        isLoading={true}
        created_at={new Date().toISOString()}
      />
    )
    expect(screen.getByTestId('typing-indicator')).toBeDefined()
  })

  it('renders source cards when sources provided', () => {
    const sources = [
      {
        video_title: 'Test Video',
        timestamp_label: '1:23',
        timestamp_url: 'https://youtube.com/watch?v=test&t=83',
        excerpt: 'This is an excerpt',
      },
    ]
    render(
      <ChatMessage
        id="4"
        role="assistant"
        content="answer"
        sources={sources}
        created_at={new Date().toISOString()}
      />
    )
    expect(screen.getByTestId('source-card')).toBeDefined()
    expect(screen.getByText('Test Video')).toBeDefined()
  })
})

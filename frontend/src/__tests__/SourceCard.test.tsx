import { render, screen, within } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SourceCard } from '@/components/chat/SourceCard'
import type { SourceItem } from '@/types/api'

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

const source: SourceItem = {
  video_title: 'Next.js Tutorial',
  timestamp_label: '02:45',
  timestamp_url: 'https://youtube.com/watch?v=abc&t=165',
  excerpt: 'Next.js App Router를 사용하는 방법을 설명합니다.',
}

describe('SourceCard', () => {
  it('renders source card container', () => {
    render(<SourceCard sources={[source]} />)
    expect(screen.getByTestId('source-card')).toBeDefined()
  })

  it('renders link with correct href', () => {
    render(<SourceCard sources={[source]} />)
    const card = screen.getByTestId('source-card')
    const link = within(card).getByRole('link')
    expect(link).toHaveAttribute('href', source.timestamp_url)
  })

  it('opens link in new tab', () => {
    render(<SourceCard sources={[source]} />)
    const card = screen.getByTestId('source-card')
    const link = within(card).getByRole('link')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('renders video title', () => {
    render(<SourceCard sources={[source]} />)
    expect(screen.getByText(source.video_title)).toBeDefined()
  })

  it('renders timestamp label', () => {
    render(<SourceCard sources={[source]} />)
    expect(screen.getByText(source.timestamp_label)).toBeDefined()
  })

  it('renders excerpt text', () => {
    render(<SourceCard sources={[source]} />)
    expect(screen.getByText(source.excerpt)).toBeDefined()
  })

  it('renders nothing when sources is empty', () => {
    const { container } = render(<SourceCard sources={[]} />)
    expect(container.firstChild).toBeNull()
  })
})

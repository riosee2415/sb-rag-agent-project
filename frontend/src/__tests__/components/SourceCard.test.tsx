import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SourceCard } from '@/components/chat/SourceCard'

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

describe('SourceCard', () => {
  const sources = [
    {
      video_title: 'Next.js Tutorial',
      timestamp_label: '5:32',
      timestamp_url: 'https://youtube.com/watch?v=abc&t=332',
      excerpt: 'This covers the basics of Next.js App Router.',
    },
    {
      video_title: 'TypeScript Tips',
      timestamp_label: '2:10',
      timestamp_url: 'https://youtube.com/watch?v=xyz&t=130',
      excerpt: 'Useful TypeScript patterns for React developers.',
    },
  ]

  it('renders nothing when sources array is empty', () => {
    const { container } = render(<SourceCard sources={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders source cards for each source', () => {
    render(<SourceCard sources={sources} />)
    const cards = screen.getAllByTestId('source-card')
    expect(cards.length).toBe(2)
  })

  it('displays video title and timestamp', () => {
    render(<SourceCard sources={sources} />)
    expect(screen.getByText('Next.js Tutorial')).toBeDefined()
    expect(screen.getByText('5:32')).toBeDefined()
  })

  it('has external link to timestamp URL', () => {
    render(<SourceCard sources={sources} />)
    const links = screen.getAllByRole('link')
    expect(links[0].getAttribute('href')).toBe(sources[0].timestamp_url)
    expect(links[0].getAttribute('target')).toBe('_blank')
  })
})

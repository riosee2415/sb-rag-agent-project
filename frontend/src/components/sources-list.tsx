'use client'

import type { SourceItem } from '@/types/api'
import { v } from '@/lib/design-tokens'

interface SourcesListProps {
  sources: SourceItem[]
}

export function SourcesList({ sources }: SourcesListProps) {
  return (
    <div role="region" aria-label={`출처 ${sources.length}개`}>
      {/* Header */}
      <div
        className="flex items-baseline justify-between pb-2"
        style={{ borderBottom: `1px solid ${v.border}` }}
      >
        <span
          style={{
            fontFamily: v.fontMono,
            fontSize: '11px',
            letterSpacing: '0.15em',
            color: v.accent,
            fontWeight: 600,
          }}
        >
          SOURCES
        </span>
        <span
          style={{
            fontFamily: v.fontMono,
            fontSize: '11px',
            color: v.textDim,
          }}
        >
          {sources.length} result{sources.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Items */}
      <div role="list">
        {sources.map((src, i) => (
          <div
            key={`${src.video_title}-${i}`}
            className="source-item"
            role="listitem"
            style={{
              paddingTop: '16px',
              paddingBottom: '16px',
              borderBottom:
                i < sources.length - 1 ? `1px solid ${v.border}` : undefined,
            }}
          >
            <div className="flex items-start gap-3">
              {/* Arrow + number */}
              <span
                aria-hidden="true"
                style={{
                  fontFamily: v.fontMono,
                  fontSize: '11px',
                  color: v.accent,
                  flexShrink: 0,
                  lineHeight: '1.6',
                  userSelect: 'none',
                }}
              >
                → {String(i + 1).padStart(2, '0')}
              </span>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Title row */}
                <div className="flex items-start justify-between gap-4 mb-1">
                  <span
                    style={{
                      fontSize: '14px',
                      color: v.text,
                      lineHeight: '1.4',
                      fontWeight: 500,
                    }}
                  >
                    {src.video_title}
                  </span>
                  <ViewLink href={src.timestamp_url} label={src.video_title} />
                </div>

                {/* Channel + timestamp */}
                <div
                  className="mb-2"
                  style={{
                    fontFamily: v.fontMono,
                    fontSize: '11px',
                    color: v.textMuted,
                  }}
                >
                  sv.developer · {src.timestamp_label}
                </div>

                {/* Excerpt */}
                <p
                  className="truncate hover:whitespace-normal hover:overflow-visible transition-all duration-[180ms]"
                  style={{
                    fontSize: '13px',
                    color: v.textMuted,
                    lineHeight: '1.5',
                  }}
                  title={src.excerpt}
                >
                  {src.excerpt}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ViewLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex-shrink-0 transition-colors duration-[180ms]"
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        color: 'var(--el-text-dim)',
        whiteSpace: 'nowrap',
        textDecoration: 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = 'var(--el-accent)'
        e.currentTarget.style.textDecoration = 'underline'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = 'var(--el-text-dim)'
        e.currentTarget.style.textDecoration = 'none'
      }}
      aria-label={`${label} 영상 타임스탬프로 이동`}
    >
      [view ↗]
    </a>
  )
}

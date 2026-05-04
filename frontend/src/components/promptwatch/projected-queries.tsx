'use client'

import type { ProjectedQuery } from '@/types/promptwatch'
import { v } from '@/lib/design-tokens'

interface Props {
  queries: ProjectedQuery[]
}

function ConfidenceBar({ value }: { value: number }) {
  const filled = Math.round(value / 10)
  return (
    <span style={{ fontFamily: v.fontMono, fontSize: '10px', color: v.accent, letterSpacing: '0.02em' }}>
      {'█'.repeat(filled)}
      <span style={{ color: v.border }}>{'█'.repeat(10 - filled)}</span>
    </span>
  )
}

export function ProjectedQueries({ queries }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div
        style={{
          padding: '9px 12px 7px',
          borderBottom: `1px solid ${v.border}`,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: v.fontMono,
            fontSize: '10px',
            letterSpacing: '0.1em',
            color: v.textMuted,
            fontWeight: 600,
          }}
        >
          PROJECTED QUERIES
        </span>
      </div>

      <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
        {queries.map(q => (
          <div
            key={q.rank}
            className="flex flex-col gap-1"
            style={{
              padding: '10px 12px',
              borderBottom: `1px solid ${v.border}`,
            }}
          >
            <div className="flex items-start gap-2">
              <span
                style={{
                  fontFamily: v.fontMono,
                  fontSize: '10px',
                  color: v.accent,
                  flexShrink: 0,
                  marginTop: '1px',
                }}
              >
                {String(q.rank).padStart(2, '0')}
              </span>
              <span
                style={{
                  fontFamily: v.fontSans,
                  fontSize: '12px',
                  color: v.text,
                  lineHeight: 1.5,
                  flex: 1,
                  minWidth: 0,
                }}
              >
                {q.query}
              </span>
            </div>

            <div className="flex items-center gap-2" style={{ paddingLeft: '22px' }}>
              <ConfidenceBar value={q.confidence} />
              <span
                style={{
                  fontFamily: v.fontMono,
                  fontSize: '9px',
                  color: v.textDim,
                }}
              >
                {q.confidence}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

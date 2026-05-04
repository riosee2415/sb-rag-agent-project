'use client'

import type { ProjectedKeyword } from '@/types/promptwatch'
import { v } from '@/lib/design-tokens'

interface Props {
  keywords: ProjectedKeyword[]
}

export function ProjectedKeywords({ keywords }: Props) {
  const maxRate = Math.max(...keywords.map(k => k.growthRate))

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
          PROJECTED KEYWORDS
        </span>
      </div>

      <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
        {keywords.map(k => {
          const barWidth = Math.round((k.growthRate / maxRate) * 100)
          return (
            <div
              key={k.rank}
              className="flex flex-col gap-1.5"
              style={{
                padding: '10px 12px',
                borderBottom: `1px solid ${v.border}`,
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    style={{
                      fontFamily: v.fontMono,
                      fontSize: '10px',
                      color: v.accent,
                      flexShrink: 0,
                    }}
                  >
                    {String(k.rank).padStart(2, '0')}
                  </span>
                  <span
                    style={{
                      fontFamily: v.fontMono,
                      fontSize: '12px',
                      color: v.text,
                      letterSpacing: '0.02em',
                    }}
                  >
                    {k.keyword}
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: v.fontMono,
                    fontSize: '10px',
                    color: v.accent,
                    flexShrink: 0,
                  }}
                >
                  +{k.growthRate}%
                </span>
              </div>

              <div
                style={{
                  height: '2px',
                  backgroundColor: v.border,
                  borderRadius: '1px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${barWidth}%`,
                    backgroundColor: v.accent,
                    borderRadius: '1px',
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

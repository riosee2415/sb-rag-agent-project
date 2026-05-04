'use client'

import { useState } from 'react'
import { v } from '@/lib/design-tokens'
import { buildCsv, downloadCsv } from '@/lib/promptwatch/csv-export'
import { MOCK_ANALYTICS } from '@/lib/promptwatch/mock-data'
import { MOCK_PROJECTIONS } from '@/lib/promptwatch/mock-projections'

export function PromptWatchHeader() {
  const [exporting, setExporting] = useState(false)
  const [lastSize, setLastSize] = useState<string | null>(null)

  async function handleExport() {
    setExporting(true)
    try {
      const csv = buildCsv(MOCK_ANALYTICS, MOCK_PROJECTIONS)
      const size = downloadCsv(csv)
      setLastSize(size)
      setTimeout(() => setLastSize(null), 3000)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div
      className="flex items-center justify-between flex-shrink-0"
      style={{
        padding: '0 20px',
        height: '44px',
        borderBottom: `1px solid ${v.border}`,
      }}
    >
      <div className="flex items-center gap-3">
        <span
          style={{
            fontFamily: v.fontMono,
            fontSize: '13px',
            letterSpacing: '0.15em',
            color: v.text,
            fontWeight: 600,
          }}
        >
          PROMPTWATCH
        </span>
        <span
          style={{
            fontFamily: v.fontMono,
            fontSize: '9px',
            color: v.textDim,
            letterSpacing: '0.08em',
          }}
        >
          query analytics
        </span>
      </div>

      <div className="flex items-center gap-4">
        {lastSize && (
          <span
            className="fade-in"
            style={{
              fontFamily: v.fontMono,
              fontSize: '9px',
              color: v.accent,
              letterSpacing: '0.06em',
            }}
          >
            ✓ {lastSize} KB
          </span>
        )}
        <button
          onClick={handleExport}
          disabled={exporting}
          style={{
            fontFamily: v.fontMono,
            fontSize: '11px',
            color: exporting ? v.textDim : v.textMuted,
            background: 'none',
            border: 'none',
            padding: 0,
            letterSpacing: '0.05em',
          }}
          onMouseEnter={e => { if (!exporting) e.currentTarget.style.color = v.accent }}
          onMouseLeave={e => { e.currentTarget.style.color = exporting ? v.textDim : v.textMuted }}
        >
          {exporting ? '...' : 'export csv ↓'}
        </button>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { MOCK_ANALYTICS } from '@/lib/promptwatch/mock-data'
import type { PeriodAnalytics } from '@/types/promptwatch'
import { ChartCell } from './chart-cell'
import { v } from '@/lib/design-tokens'

export function ChartGrid() {
  const [selected, setSelected] = useState<PeriodAnalytics['period'] | null>(null)

  return (
    <div
      className="h-full"
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr',
        gap: '1px',
        backgroundColor: v.border,
      }}
    >
      {MOCK_ANALYTICS.map(pa => (
        <ChartCell
          key={pa.period}
          analytics={pa}
          onClick={() => setSelected(selected === pa.period ? null : pa.period)}
        />
      ))}
    </div>
  )
}

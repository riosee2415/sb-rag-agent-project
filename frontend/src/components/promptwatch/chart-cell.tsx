'use client'

import { useState, useEffect } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import type { PeriodAnalytics } from '@/types/promptwatch'
import { v } from '@/lib/design-tokens'

interface ChartCellProps {
  analytics: PeriodAnalytics
  onClick?: () => void
}

const LABELS: Record<PeriodAnalytics['period'], string> = {
  '3d':  'LAST 3 DAYS',
  '7d':  'LAST 7 DAYS',
  '30d': 'LAST 30 DAYS',
  '3m':  'LAST 3 MONTHS',
}

function fmtDate(date: string, period: PeriodAnalytics['period']): string {
  const d = new Date(date)
  if (period === '3m') return `${d.getMonth() + 1}/${String(d.getDate()).padStart(2, '0')}`
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function renderTooltip(props: Record<string, unknown>) {
  const { active, payload, label } = props as {
    active?: boolean
    payload?: Array<{ value: number }>
    label?: string
  }
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        color: 'var(--el-text)',
        background: 'var(--surface)',
        border: '1px solid var(--el-border)',
        padding: '4px 8px',
        pointerEvents: 'none',
        lineHeight: 1.4,
      }}
    >
      <span style={{ color: 'var(--el-text-dim)' }}>{label}</span>
      {'  '}
      <span style={{ color: 'var(--el-accent)' }}>{payload[0].value}</span>
    </div>
  )
}

export function ChartCell({ analytics, onClick }: ChartCellProps) {
  const [mounted, setMounted] = useState(false)
  const [hovered, setHovered] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const { period, stats, summary } = analytics
  const label = LABELS[period]
  const tickInterval = period === '3m' ? 8 : period === '30d' ? 4 : 0

  const chartData = stats.map(s => ({
    date: fmtDate(s.date, period),
    queries: s.queryCount,
  }))

  const showDots = period === '3d' || period === '7d'

  return (
    <div
      role="button"
      tabIndex={0}
      className="flex flex-col cursor-pointer transition-colors duration-[180ms] overflow-hidden"
      style={{ backgroundColor: hovered ? v.surface : v.bg }}
      onClick={() => { console.log('chart-cell:', period); onClick?.() }}
      onKeyDown={e => e.key === 'Enter' && onClick?.()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={`${label} 질문 통계 차트`}
    >
      {/* ── Cell header ── */}
      <div
        className="flex items-center justify-between flex-shrink-0"
        style={{
          padding: '9px 12px 7px',
          borderBottom: `1px solid ${v.border}`,
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
          {label}
        </span>
        <span
          style={{
            fontFamily: v.fontMono,
            fontSize: '10px',
            color: v.textDim,
          }}
        >
          {summary.totalQueries.toLocaleString()} q
        </span>
      </div>

      {/* ── Chart body ── */}
      <div className="flex-1 min-h-0 px-1 pt-1">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 6, bottom: 0, left: -20 }}>
              <CartesianGrid
                strokeDasharray="2 6"
                stroke={v.border}
                vertical={false}
                strokeOpacity={0.7}
              />
              <XAxis
                dataKey="date"
                tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: v.textDim }}
                axisLine={{ stroke: v.border }}
                tickLine={false}
                interval={tickInterval}
              />
              <YAxis
                tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: v.textDim }}
                axisLine={{ stroke: v.border }}
                tickLine={false}
                width={28}
              />
              <Tooltip
                content={renderTooltip}
                cursor={{ stroke: v.border, strokeWidth: 1, strokeDasharray: '2 2' }}
              />
              <Line
                type="monotone"
                dataKey="queries"
                stroke={v.text}
                strokeWidth={1.5}
                dot={showDots ? { r: 2, fill: v.bg, stroke: v.text, strokeWidth: 1.5 } : false}
                activeDot={{ r: 4, fill: v.accent, stroke: 'none' }}
                animationDuration={400}
                animationEasing="ease-out"
                isAnimationActive={true}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div
            className="w-full h-full"
            style={{ backgroundColor: v.surface, opacity: 0.5 }}
          />
        )}
      </div>

      {/* ── Cell footer: 3 key metrics ── */}
      <div
        className="flex items-center gap-3 flex-shrink-0 overflow-hidden"
        style={{ padding: '6px 12px 8px', borderTop: `1px solid ${v.border}` }}
      >
        {[
          { k: 'peak', val: summary.peakDate.slice(5) },
          { k: 'avg/d', val: String(summary.avgPerDay) },
          { k: 'top', val: summary.topTopic },
        ].map(({ k, val }) => (
          <div key={k} className="flex items-center gap-1 overflow-hidden min-w-0">
            <span
              style={{ fontFamily: v.fontMono, fontSize: '9px', color: v.textDim, flexShrink: 0, letterSpacing: '0.04em' }}
            >
              {k}
            </span>
            <span
              className="truncate"
              style={{ fontFamily: v.fontMono, fontSize: '9px', color: v.textMuted }}
              title={val}
            >
              {val}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

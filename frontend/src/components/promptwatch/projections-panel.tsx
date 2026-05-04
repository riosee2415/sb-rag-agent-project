'use client'

import { useState, useEffect } from 'react'
import type { Projections } from '@/types/promptwatch'
import { MOCK_PROJECTIONS } from '@/lib/promptwatch/mock-projections'
import { ProjectedQueries } from './projected-queries'
import { ProjectedKeywords } from './projected-keywords'
import { v } from '@/lib/design-tokens'

export function ProjectionsPanel() {
  const [projections, setProjections] = useState<Projections>(MOCK_PROJECTIONS)
  const [loading, setLoading] = useState(false)
  const [generatedAt, setGeneratedAt] = useState<string>(MOCK_PROJECTIONS.generatedAt)

  async function loadProjections() {
    setLoading(true)
    try {
      const res = await fetch('/api/promptwatch/project', { method: 'POST' })
      if (res.ok) {
        const data = await res.json() as Projections
        setProjections(data)
        setGeneratedAt(data.generatedAt)
      }
    } catch {
      // keep mock data on error
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProjections()
  }, [])

  const fmtTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  return (
    <div
      className="flex flex-col h-full"
      style={{ borderLeft: `1px solid ${v.border}` }}
    >
      {/* Panel header */}
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
          PROJECTIONS
        </span>
        <div className="flex items-center gap-3">
          {generatedAt && (
            <span style={{ fontFamily: v.fontMono, fontSize: '9px', color: v.textDim }}>
              {fmtTime(generatedAt)}
            </span>
          )}
          <button
            onClick={loadProjections}
            disabled={loading}
            style={{
              fontFamily: v.fontMono,
              fontSize: '10px',
              color: loading ? v.textDim : v.textMuted,
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: loading ? 'default' : 'pointer',
              letterSpacing: '0.05em',
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.color = v.accent }}
            onMouseLeave={e => { e.currentTarget.style.color = loading ? v.textDim : v.textMuted }}
          >
            {loading ? '...' : '↻'}
          </button>
        </div>
      </div>

      {/* Queries section — top half */}
      <div className="flex-1 min-h-0" style={{ borderBottom: `1px solid ${v.border}` }}>
        <ProjectedQueries queries={projections.projectedQueries} />
      </div>

      {/* Keywords section — bottom half */}
      <div className="flex-1 min-h-0">
        <ProjectedKeywords keywords={projections.projectedKeywords} />
      </div>
    </div>
  )
}

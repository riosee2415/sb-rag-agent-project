'use client'

import { useState, useRef, useCallback } from 'react'
import { v } from '@/lib/design-tokens'

export function AnalysisSummary() {
  const [text, setText] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [done, setDone] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const run = useCallback(async () => {
    if (streaming) {
      abortRef.current?.abort()
      return
    }

    abortRef.current = new AbortController()
    setText('')
    setDone(false)
    setStreaming(true)

    try {
      const res = await fetch('/api/promptwatch/analyze', {
        method: 'POST',
        signal: abortRef.current.signal,
      })

      if (!res.ok || !res.body) throw new Error('stream failed')

      const reader = res.body.getReader()
      const dec = new TextDecoder()

      while (true) {
        const { done: d, value } = await reader.read()
        if (d) break
        setText(prev => prev + dec.decode(value, { stream: true }))
      }
      setDone(true)
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setText(prev => prev + '\n[분석 중 오류가 발생했습니다]')
      }
    } finally {
      setStreaming(false)
    }
  }, [streaming])

  return (
    <div
      className="flex items-stretch flex-shrink-0"
      style={{
        borderBottom: `1px solid ${v.border}`,
        minHeight: '72px',
        maxHeight: '120px',
      }}
    >
      {/* Label */}
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: '100px',
          borderRight: `1px solid ${v.border}`,
          padding: '0 12px',
        }}
      >
        <span
          style={{
            fontFamily: v.fontMono,
            fontSize: '9px',
            letterSpacing: '0.12em',
            color: v.textDim,
            fontWeight: 600,
            writingMode: 'vertical-lr',
            transform: 'rotate(180deg)',
          }}
        >
          LLM ANALYSIS
        </span>
      </div>

      {/* Text area */}
      <div
        className="flex-1 min-w-0 overflow-y-auto"
        style={{ padding: '10px 14px' }}
      >
        {text ? (
          <p
            style={{
              fontFamily: v.fontSans,
              fontSize: '12px',
              color: v.textMuted,
              lineHeight: 1.65,
              margin: 0,
              whiteSpace: 'pre-wrap',
            }}
          >
            {text}
            {streaming && (
              <span
                className="cursor-blink"
                style={{ color: v.accent, marginLeft: '2px' }}
              >
                ▊
              </span>
            )}
          </p>
        ) : (
          <p
            style={{
              fontFamily: v.fontMono,
              fontSize: '11px',
              color: v.textDim,
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {streaming ? (
              <>
                <span style={{ color: v.accent }}>분석 중</span>
                <span className="cursor-blink" style={{ color: v.accent, marginLeft: '2px' }}>▊</span>
              </>
            ) : (
              '→ 우측 [regenerate ↻] 버튼으로 LLM 분석을 시작하세요'
            )}
          </p>
        )}
      </div>

      {/* Controls */}
      <div
        className="flex items-center flex-shrink-0"
        style={{
          borderLeft: `1px solid ${v.border}`,
          padding: '0 14px',
          gap: '8px',
        }}
      >
        {done && (
          <span style={{ fontFamily: v.fontMono, fontSize: '9px', color: v.textDim }}>done</span>
        )}
        <button
          onClick={run}
          style={{
            fontFamily: v.fontMono,
            fontSize: '11px',
            color: streaming ? v.accent : v.textMuted,
            background: 'none',
            border: 'none',
            padding: 0,
            letterSpacing: '0.04em',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = v.accent }}
          onMouseLeave={e => { e.currentTarget.style.color = streaming ? v.accent : v.textMuted }}
        >
          {streaming ? '■ stop' : 'regenerate ↻'}
        </button>
      </div>
    </div>
  )
}

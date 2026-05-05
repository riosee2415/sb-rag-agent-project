'use client'

import { useRef } from 'react'
import { v } from '@/lib/design-tokens'

interface EmptyStateProps {
  onSampleClick: (query: string) => void
}

const SAMPLES = [
  '이 채널에서 RAG를 처음 다룬 영상이 뭐야?',
  '최근 한 달간 에이전트 관련 영상 요약해줘',
  'OpenAI에 대한 의견이 시간에 따라 바뀌었어?',
] as const

export function EmptyState({ onSampleClick }: EmptyStateProps) {
  return (
    <div
      role="main"
      aria-label="Elysia 시작 화면"
      style={{ padding: 'var(--page-px)' }}
    >
      <div style={{ maxWidth: 'var(--chat-max-w)' }}>
        {/* Logo */}
        <div className="mb-1">
          <span
            style={{
              fontFamily:    v.fontMono,
              fontSize:      '22px',
              color:         v.textBright,
              letterSpacing: '0.2em',
              fontWeight:    600,
            }}
          >
            ELYSIA
          </span>
        </div>
        <div className="mb-8">
          <span style={{ fontFamily: v.fontMono, fontSize: '12px', color: v.textDim, letterSpacing: '0.05em' }}>
            v0.11
          </span>
        </div>

        {/* Description */}
        <div className="mb-1">
          <span style={{ fontFamily: v.fontMono, fontSize: '14px', color: v.textMuted }}>
            knowledge agent for youtube channels
          </span>
        </div>
        <div className="mb-10">
          <span style={{ fontFamily: v.fontMono, fontSize: '14px', color: v.textDim }}>
            currently indexed:{' '}
            <span style={{ color: v.textMuted }}>sv.developer (47 videos)</span>
          </span>
        </div>

        {/* Divider */}
        <div aria-hidden="true" className="mb-10" style={{ height: '1px', backgroundColor: v.border }} />

        {/* Sample queries */}
        <div className="mb-4">
          <span style={{ fontFamily: v.fontMono, fontSize: '12px', color: v.textDim, letterSpacing: '0.05em' }}>
            try asking:
          </span>
        </div>

        <ul className="space-y-1" role="list" aria-label="예시 질문">
          {SAMPLES.map((query) => (
            <li key={query} role="listitem">
              <SampleQuery query={query} onClick={() => onSampleClick(query)} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function SampleQuery({ query, onClick }: { query: string; onClick: () => void }) {
  const btnRef   = useRef<HTMLButtonElement>(null)
  const arrowRef = useRef<HTMLSpanElement>(null)
  const textRef  = useRef<HTMLSpanElement>(null)

  function enter() {
    if (!btnRef.current)   return
    btnRef.current.style.backgroundColor = v.surface
    if (arrowRef.current)  arrowRef.current.style.transform  = 'translateX(4px)'
    if (textRef.current)   textRef.current.style.color       = v.textBright
  }
  function leave() {
    if (!btnRef.current)   return
    btnRef.current.style.backgroundColor = ''
    if (arrowRef.current)  arrowRef.current.style.transform  = ''
    if (textRef.current)   textRef.current.style.color       = v.textMuted
  }
  function press() {
    if (btnRef.current) btnRef.current.style.transform = 'translateY(1px)'
  }
  function release() {
    if (btnRef.current) btnRef.current.style.transform = ''
  }

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={onClick}
      onMouseEnter={enter}
      onMouseLeave={leave}
      onMouseDown={press}
      onMouseUp={release}
      className="flex items-start gap-3 w-full text-left"
      aria-label={`예시 질문: ${query}`}
      style={{
        padding:         '7px 10px',
        margin:          '0 -10px',
        borderRadius:    '2px',
        background:      'none',
        border:          'none',
        transition:      `background-color var(--dur) var(--ease-out), transform 60ms ease`,
        width:           'calc(100% + 20px)',
      }}
    >
      <span
        ref={arrowRef}
        aria-hidden="true"
        style={{
          fontFamily: v.fontMono,
          fontSize:   '14px',
          color:      v.accent,
          flexShrink: 0,
          lineHeight: '1.6',
          userSelect: 'none',
          transition: `transform var(--dur) var(--ease-out)`,
        }}
      >
        →
      </span>
      <span
        ref={textRef}
        style={{
          fontFamily: v.fontMono,
          fontSize:   '14px',
          color:      v.textMuted,
          lineHeight: '1.6',
          transition: `color var(--dur) var(--ease-out)`,
        }}
      >
        {query}
      </span>
    </button>
  )
}

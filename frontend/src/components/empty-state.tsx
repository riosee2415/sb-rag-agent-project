'use client'

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
              fontFamily: v.fontMono,
              fontSize: '20px',
              color: v.text,
              letterSpacing: '-0.02em',
              fontWeight: 600,
            }}
          >
            ELYSIA
          </span>
        </div>
        <div className="mb-8">
          <span
            style={{
              fontFamily: v.fontMono,
              fontSize: '11px',
              color: v.textDim,
              letterSpacing: '0.05em',
            }}
          >
            v0.11
          </span>
        </div>

        {/* Description */}
        <div className="mb-1">
          <span
            style={{
              fontFamily: v.fontMono,
              fontSize: '13px',
              color: v.textMuted,
            }}
          >
            knowledge agent for youtube channels
          </span>
        </div>
        <div className="mb-10">
          <span
            style={{
              fontFamily: v.fontMono,
              fontSize: '13px',
              color: v.textDim,
            }}
          >
            currently indexed:{' '}
            <span style={{ color: v.textMuted }}>sv.developer (47 videos)</span>
          </span>
        </div>

        {/* Divider */}
        <div
          aria-hidden="true"
          className="mb-10"
          style={{ height: '1px', backgroundColor: v.border }}
        />

        {/* Sample queries */}
        <div className="mb-4">
          <span
            style={{
              fontFamily: v.fontMono,
              fontSize: '11px',
              color: v.textDim,
              letterSpacing: '0.05em',
            }}
          >
            try asking:
          </span>
        </div>

        <ul className="space-y-2" role="list" aria-label="예시 질문">
          {SAMPLES.map((query) => (
            <li key={query} role="listitem">
              <button
                type="button"
                onClick={() => onSampleClick(query)}
                className="flex items-start gap-3 w-full text-left group"
                aria-label={`예시 질문: ${query}`}
              >
                <span
                  aria-hidden="true"
                  style={{
                    fontFamily: v.fontMono,
                    fontSize: '13px',
                    color: v.accent,
                    flexShrink: 0,
                    lineHeight: '1.6',
                    userSelect: 'none',
                  }}
                >
                  →
                </span>
                <span
                  className="transition-colors duration-[180ms]"
                  style={{
                    fontFamily: v.fontMono,
                    fontSize: '13px',
                    color: v.textMuted,
                    lineHeight: '1.6',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = v.text
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = v.textMuted
                  }}
                >
                  {query}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import type { SourceItem } from '@/types/api'
import { SourcesList } from '@/components/sources-list'
import { Spinner } from '@/components/spinner'
import { v } from '@/lib/design-tokens'

export interface ChatMessageProps {
  id:                  string
  role:                'user' | 'assistant'
  content:             string
  sources?:            SourceItem[] | null
  created_at:          string
  isLoading?:          boolean
  isStreaming?:        boolean
  streamingStartedAt?: number
  onRetry?:            () => void
  onStop?:             () => void
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('ko-KR', {
      hour:   '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  } catch {
    return '--:--:--'
  }
}

function ElapsedTimer({
  isStreaming,
  isLoading,
}: {
  isStreaming?:        boolean
  isLoading?:         boolean
  streamingStartedAt?: number
}) {
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    if (isStreaming || isLoading) {
      if (!startRef.current) startRef.current = Date.now()
      timerRef.current = setInterval(() => {
        setElapsed(Date.now() - startRef.current!)
      }, 100)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isStreaming, isLoading])

  if (!isStreaming && !isLoading && elapsed === 0) return null

  return (
    <span
      style={{ fontFamily: v.fontMono, fontSize: '10px', color: v.textDim }}
      aria-live="polite"
      aria-label={`응답 시간 ${(elapsed / 1000).toFixed(1)}초`}
    >
      {(elapsed / 1000).toFixed(1)}s
    </span>
  )
}

export function ChatMessage({
  role,
  content,
  sources,
  created_at,
  isLoading,
  isStreaming,
  streamingStartedAt,
  onRetry,
  onStop,
}: ChatMessageProps) {
  const isUser   = role === 'user'
  const isActive = isLoading || isStreaming
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('클립보드 복사 실패')
    }
  }, [content])

  const label = isUser ? 'USER' : 'ELYSIA'
  const time  = formatTime(created_at)

  return (
    <article
      style={{ marginBottom: '32px' }}
      aria-label={`${isUser ? '사용자' : 'Elysia'} 메시지`}
    >
      {/* ── Label row ─────────────────────────────────────────────── */}
      <div className="msg-label flex items-baseline justify-between mb-2">
        <span
          style={{
            fontFamily:    v.fontMono,
            fontSize:      '11px',
            letterSpacing: '0.05em',
            color:         isUser ? v.accent : v.textMuted,
            fontWeight:    isUser ? 600 : 400,
          }}
        >
          [{label}]
        </span>

        <div className="flex items-center gap-3">
          {!isUser && (
            <ElapsedTimer
              isStreaming={isStreaming}
              isLoading={isLoading}
              streamingStartedAt={streamingStartedAt}
            />
          )}

          {/* Stop button — streaming only */}
          {!isUser && isStreaming && onStop && (
            <button
              type="button"
              onClick={onStop}
              style={{
                fontFamily:    v.fontMono,
                fontSize:      '10px',
                color:         v.textMuted,
                background:    'none',
                border:        'none',
                padding:       0,
                letterSpacing: '0.03em',
                transition:    `color var(--dur) var(--ease-out)`,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = v.accent }}
              onMouseLeave={(e) => { e.currentTarget.style.color = v.textMuted }}
              aria-label="스트리밍 중단"
            >
              [stop ⏹]
            </button>
          )}

          {/* Timestamp — done state only */}
          {!isActive && (
            <span
              style={{ fontFamily: v.fontMono, fontSize: '11px', color: v.textDim }}
              aria-label={`전송 시간 ${time}`}
            >
              {time}
            </span>
          )}
        </div>
      </div>

      {/* ── Separator ─────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        className="msg-hr mb-3"
        style={{ height: '1px', backgroundColor: v.border }}
      />

      {/* ── Content ───────────────────────────────────────────────── */}
      <div
        className="msg-body"
        role={isUser ? undefined : 'log'}
        aria-live={isUser ? undefined : 'polite'}
        aria-atomic="false"
      >
        {/* Waiting for first byte: show spinner */}
        {isLoading && !content ? (
          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
            <Spinner size={14} />
          </span>
        ) : (
          <p
            className="whitespace-pre-wrap break-words"
            style={{
              fontSize:      '14px',
              color:         isUser ? v.textBright : v.text,
              lineHeight:    isUser ? '1.65' : '1.7',
              letterSpacing: '-0.01em',
            }}
          >
            {content}
            {/* Small spinner at end of content while streaming */}
            {isStreaming && content && (
              <span
                style={{ display: 'inline-flex', alignItems: 'center', marginLeft: '6px', verticalAlign: 'middle' }}
              >
                <Spinner size={11} />
              </span>
            )}
          </p>
        )}
      </div>

      {/* ── Sources ───────────────────────────────────────────────── */}
      {!isActive && !isUser && sources && sources.length > 0 && (
        <div className="mt-6">
          <SourcesList sources={sources} />
        </div>
      )}

      {/* ── Action row (fades in after done) ──────────────────────── */}
      {!isActive && !isUser && (
        <div
          className="actions-fade flex items-center gap-4 mt-4"
          role="toolbar"
          aria-label="메시지 액션"
        >
          <ActionButton label={copied ? 'copied' : 'copy'} onClick={handleCopy} />
          {onRetry && <ActionButton label="retry" onClick={onRetry} />}
          <ActionButton label="↑ helpful" onClick={() => {}} />
        </div>
      )}
    </article>
  )
}

function ActionButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontFamily:    v.fontMono,
        fontSize:      '11px',
        color:         v.textDim,
        letterSpacing: '0.02em',
        background:    'none',
        border:        'none',
        padding:       0,
        transition:    `color var(--dur) var(--ease-out)`,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = v.accent }}
      onMouseLeave={(e) => { e.currentTarget.style.color = v.textDim }}
    >
      [{label}]
    </button>
  )
}

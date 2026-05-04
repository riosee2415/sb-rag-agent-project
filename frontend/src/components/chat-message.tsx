'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import type { SourceItem } from '@/types/api'
import { SourcesList } from '@/components/sources-list'
import { v } from '@/lib/design-tokens'

export interface ChatMessageProps {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: SourceItem[] | null
  created_at: string
  isLoading?: boolean
  onRetry?: () => void
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  } catch {
    return '--:--:--'
  }
}

const ACTION_HOVER_ENTER = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.currentTarget.style.color = 'var(--el-accent)'
}
const ACTION_HOVER_LEAVE = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.currentTarget.style.color = 'var(--el-text-dim)'
}

export function ChatMessage({
  role,
  content,
  sources,
  created_at,
  isLoading,
  onRetry,
}: ChatMessageProps) {
  const isUser = role === 'user'
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
  const time = formatTime(created_at)

  return (
    <article
      className="msg-enter"
      style={{ marginBottom: '32px' }}
      aria-label={`${isUser ? '사용자' : 'Elysia'} 메시지`}
    >
      {/* ── Label row ─────────────────────────────────────────────── */}
      <div className="flex items-baseline justify-between mb-2">
        <span
          style={{
            fontFamily: v.fontMono,
            fontSize: '11px',
            letterSpacing: '0.05em',
            color: isUser ? v.accent : v.textMuted,
            fontWeight: isUser ? 600 : 400,
          }}
        >
          [{label}]
        </span>
        <span
          style={{
            fontFamily: v.fontMono,
            fontSize: '11px',
            color: v.textDim,
          }}
          aria-label={`전송 시간 ${time}`}
        >
          {time}
        </span>
      </div>

      {/* ── Separator ─────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        className="mb-3"
        style={{ height: '1px', backgroundColor: v.border }}
      />

      {/* ── Content ───────────────────────────────────────────────── */}
      {isLoading ? (
        <span
          className="cursor-blink"
          aria-live="polite"
          aria-label="응답을 생성하고 있습니다"
        >
          ▊
        </span>
      ) : (
        <p
          className="whitespace-pre-wrap break-words"
          style={{
            fontSize: '14px',
            color: v.text,
            lineHeight: '1.75',
          }}
        >
          {content}
        </p>
      )}

      {/* ── Sources ───────────────────────────────────────────────── */}
      {!isLoading && !isUser && sources && sources.length > 0 && (
        <div className="mt-6">
          <SourcesList sources={sources} />
        </div>
      )}

      {/* ── AI action row ─────────────────────────────────────────── */}
      {!isLoading && !isUser && (
        <div
          className="flex items-center gap-4 mt-4"
          role="toolbar"
          aria-label="메시지 액션"
        >
          <ActionButton
            label={copied ? 'copied' : 'copy'}
            onClick={handleCopy}
            onMouseEnter={ACTION_HOVER_ENTER}
            onMouseLeave={ACTION_HOVER_LEAVE}
          />
          {onRetry && (
            <ActionButton
              label="retry"
              onClick={onRetry}
              onMouseEnter={ACTION_HOVER_ENTER}
              onMouseLeave={ACTION_HOVER_LEAVE}
            />
          )}
          <ActionButton
            label="↑ helpful"
            onClick={() => {}}
            onMouseEnter={ACTION_HOVER_ENTER}
            onMouseLeave={ACTION_HOVER_LEAVE}
          />
        </div>
      )}
    </article>
  )
}

interface ActionButtonProps {
  label: string
  onClick: () => void
  onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => void
  onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => void
}

function ActionButton({ label, onClick, onMouseEnter, onMouseLeave }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="transition-colors duration-[180ms]"
      style={{
        fontFamily: v.fontMono,
        fontSize: '11px',
        color: v.textDim,
        letterSpacing: '0.02em',
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
      }}
    >
      [{label}]
    </button>
  )
}

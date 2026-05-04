'use client'

import {
  useRef,
  useState,
  useCallback,
  type KeyboardEvent,
  type CSSProperties,
} from 'react'
import { v } from '@/lib/design-tokens'

interface ChatInputProps {
  onSend: (query: string) => void
  isLoading: boolean
  style?: CSSProperties
}

const SHORTCUTS = [
  { key: '⌘ K', label: 'new chat' },
  { key: '⌘ /', label: 'shortcuts' },
  { key: '↵', label: 'send' },
] as const

export function ChatInput({ onSend, isLoading, style }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isFocused, setIsFocused] = useState(false)

  const autoResize = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`
  }, [])

  const handleSend = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    const val = el.value.trim()
    if (!val || isLoading) return
    onSend(val)
    el.value = ''
    el.style.height = 'auto'
  }, [onSend, isLoading])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  return (
    <div style={style} role="region" aria-label="메시지 입력">
      {/* Input wrapper */}
      <div
        className="input-wrapper flex items-end gap-3 border transition-colors duration-[180ms]"
        style={{
          borderColor: isFocused ? v.accent : v.border,
          borderRadius: '2px',
          backgroundColor: v.surface,
          padding: '12px 14px',
        }}
      >
        <textarea
          ref={textareaRef}
          onInput={autoResize}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={isLoading}
          rows={1}
          className="flex-1"
          style={{
            fontFamily: v.fontMono,
            fontSize: '13px',
            color: v.text,
            lineHeight: '1.6',
            minHeight: '20px',
            maxHeight: '180px',
            overflowY: 'auto',
          }}
          placeholder="ask anything about sv.developer's videos"
          aria-label="메시지 입력창"
          aria-multiline="true"
          aria-disabled={isLoading}
        />

        {/* Send indicator */}
        <button
          type="button"
          onClick={handleSend}
          disabled={isLoading}
          className="flex-shrink-0 transition-colors duration-[180ms] leading-none"
          style={{
            fontFamily: v.fontMono,
            fontSize: '13px',
            color: isLoading ? v.textDim : v.textMuted,
            background: 'none',
            border: 'none',
            padding: '2px 0',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            lineHeight: 1,
          }}
          onMouseEnter={(e) => {
            if (!isLoading) e.currentTarget.style.color = v.accent
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = isLoading ? v.textDim : v.textMuted
          }}
          aria-label="메시지 전송"
        >
          {isLoading ? <span className="cursor-blink">▊</span> : '↵'}
        </button>
      </div>

      {/* Shortcut hints */}
      <div
        className="flex items-center gap-5 mt-2 px-1"
        aria-label="키보드 단축키 안내"
        role="note"
      >
        {SHORTCUTS.map(({ key, label }) => (
          <div
            key={key}
            className="flex items-center gap-1.5"
            style={{
              fontFamily: v.fontMono,
              fontSize: '11px',
              color: v.textDim,
            }}
          >
            <span aria-hidden="true">{key}</span>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

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
  onSend:    (query: string) => void
  isLoading: boolean
  style?:    CSSProperties
}

const SHORTCUTS = [
  { key: '⌘ K', label: 'new chat' },
  { key: '⌘ /', label: 'shortcuts' },
  { key: '↵',   label: 'send' },
] as const

export function ChatInput({ onSend, isLoading, style }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

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

  const borderColor = isFocused ? v.accent : isHovered ? v.borderBright : v.border
  const boxShadow   = isFocused ? v.glowAccent : 'none'

  return (
    <div style={style} role="region" aria-label="메시지 입력">
      <div
        className="input-wrapper flex items-end gap-3 border"
        style={{
          borderColor,
          borderRadius:    '2px',
          backgroundColor: isLoading ? v.surface : v.surfaceHover,
          padding:         '12px 14px',
          boxShadow,
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
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
            fontSize:   '14px',
            color:      isLoading ? v.textDim : v.text,
            lineHeight: '1.6',
            minHeight:  '20px',
            maxHeight:  '180px',
            overflowY:  'auto',
            opacity:    isLoading ? 0.5 : 1,
            transition: `color var(--dur) var(--ease-out), opacity var(--dur) var(--ease-out)`,
          }}
          placeholder={isLoading ? 'elysia is thinking...' : "ask anything about sv.developer's videos"}
          aria-label="메시지 입력창"
          aria-multiline="true"
          aria-disabled={isLoading}
        />

        {/* Send indicator — dimmed while loading, interactive when idle */}
        <button
          type="button"
          onClick={handleSend}
          disabled={isLoading}
          style={{
            fontFamily: v.fontMono,
            fontSize:   '14px',
            color:      isLoading ? v.textDim : v.textMuted,
            background: 'none',
            border:     'none',
            padding:    '2px 0',
            lineHeight: 1,
            opacity:    isLoading ? 0.4 : 1,
            transition: `color var(--dur) var(--ease-out), opacity var(--dur) var(--ease-out)`,
          }}
          onMouseEnter={(e) => {
            if (!isLoading) e.currentTarget.style.color = v.accent
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = isLoading ? v.textDim : v.textMuted
          }}
          aria-label="메시지 전송"
        >
          ↵
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
            style={{ fontFamily: v.fontMono, fontSize: '12px', color: v.textDim }}
          >
            <span aria-hidden="true">{key}</span>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

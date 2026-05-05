'use client'

import { useEffect, useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useChatStore } from '@/stores/chatStore'
import { useConversations } from '@/hooks/useConversations'
import { v } from '@/lib/design-tokens'

function useUserCount() {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/users/count')
      .then((r) => r.json())
      .then((d: { count: number }) => setCount(d.count))
      .catch(() => setCount(null))
  }, [])

  return count
}

export function Sidebar() {
  const { user } = useAuthStore()
  const { conversationsRefreshTrigger, activeConversationId } = useChatStore()
  const { conversations, loadConversations, selectConversation, newConversation, removeConversation } =
    useConversations()
  const userCount = useUserCount()

  useEffect(() => {
    if (user) loadConversations()
  }, [user, loadConversations, conversationsRefreshTrigger])

  return (
    <aside
      className="sidebar-enter hidden lg:flex flex-col flex-shrink-0 h-[100dvh] overflow-hidden"
      style={{
        width:           'var(--sidebar-w)',
        borderRight:     `1px solid ${v.border}`,
        backgroundColor: v.surface,
      }}
      aria-label="탐색 사이드바"
    >
      {/* ── Header ────────────────────────────────────────────────── */}
      <div
        style={{
          padding:      '20px 16px 16px',
          borderBottom: `1px solid ${v.border}`,
        }}
      >
        {/* Logo + version */}
        <div className="flex items-baseline gap-2 mb-2">
          <span
            style={{
              fontFamily:    v.fontMono,
              fontSize:      '13px',
              letterSpacing: '0.2em',
              fontWeight:    600,
              color:         v.textBright,
            }}
          >
            ELYSIA
          </span>
          <span style={{ fontFamily: v.fontMono, fontSize: '11px', color: v.textDim }}>
            v0.11
          </span>
        </div>

        {/* User count */}
        <div
          style={{
            fontFamily:    v.fontMono,
            fontSize:      '10px',
            color:         v.textDim,
            letterSpacing: '0.02em',
          }}
          aria-live="polite"
          aria-label={`현재 플랫폼 이용자 ${userCount ?? 0}명`}
        >
          현재 플랫폼 이용자 :{' '}
          {userCount === null ? (
            <span style={{ opacity: 0.4 }}>—</span>
          ) : (
            <span style={{ color: v.textMuted }}>{userCount.toLocaleString()}명</span>
          )}
        </div>
      </div>

      {/* ── New Chat ──────────────────────────────────────────────── */}
      <div style={{ borderBottom: `1px solid ${v.border}` }}>
        <NewChatButton onClick={newConversation} />
      </div>

      {/* ── Conversation List ──────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto py-2">
        {!user ? (
          <KeyboardHints />
        ) : conversations.length === 0 ? (
          <EmptyChatList />
        ) : (
          conversations.map((conv) => (
            <ConversationRow
              key={conv.id}
              id={conv.id}
              title={conv.title}
              isActive={conv.id === activeConversationId}
              onSelect={() => selectConversation(conv.id)}
              onDelete={() => removeConversation(conv.id)}
            />
          ))
        )}
      </div>

      {/* ── Owner Footer ──────────────────────────────────────────── */}
      <OwnerInfo />
    </aside>
  )
}

/* ── Sub-components ─────────────────────────────────────────────────────── */

function NewChatButton({ onClick }: { onClick: () => void }) {
  const labelRef = useRef<HTMLSpanElement>(null)

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2 cursor-pointer"
      style={{
        padding:       '11px 16px',
        fontFamily:    v.fontMono,
        fontSize:      '11px',
        letterSpacing: '0.05em',
        color:         v.textMuted,
        background:    'none',
        border:        'none',
        textAlign:     'left',
        transition:    `color var(--dur) var(--ease-out), background-color var(--dur) var(--ease-out)`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = v.surfaceElevated
        e.currentTarget.style.color           = v.textBright
        if (labelRef.current) labelRef.current.style.transform = 'translateX(1px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = ''
        e.currentTarget.style.color           = v.textMuted
        if (labelRef.current) labelRef.current.style.transform = ''
      }}
      aria-label="새 대화 시작"
    >
      <span style={{ fontSize: '12px', lineHeight: 1, flexShrink: 0 }}>+</span>
      <span
        ref={labelRef}
        style={{ transition: `transform 180ms var(--ease-out)` }}
      >
        NEW
      </span>
    </button>
  )
}

function KeyboardHints() {
  const hints = [
    { key: '⌘ K', label: 'new chat' },
    { key: '⌘ /', label: 'shortcuts' },
  ]
  return (
    <div style={{ padding: '20px 16px' }} role="note" aria-label="키보드 단축키">
      <div className="space-y-3">
        {hints.map(({ key, label }) => (
          <div
            key={key}
            className="flex items-center gap-3"
            style={{ fontFamily: v.fontMono, fontSize: '11px', color: v.textDim, cursor: 'default' }}
          >
            <span
              style={{
                padding:     '2px 6px',
                border:      `1px solid ${v.border}`,
                borderRadius:'1px',
                fontSize:    '10px',
              }}
            >
              {key}
            </span>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyChatList() {
  return (
    <div style={{ padding: '20px 16px' }}>
      <span style={{ fontFamily: v.fontMono, fontSize: '11px', color: v.textDim }}>
        no conversations yet
      </span>
    </div>
  )
}

interface ConversationRowProps {
  id:       string
  title:    string
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
}

function ConversationRow({ title, isActive, onSelect, onDelete }: ConversationRowProps) {
  const rowRef = useRef<HTMLDivElement>(null)

  function enter() {
    if (!rowRef.current) return
    rowRef.current.style.backgroundColor = v.surfaceElevated
    if (!isActive) rowRef.current.style.borderLeftColor = v.border
    rowRef.current.querySelector<HTMLSpanElement>('.conv-title')!.style.color = v.textBright
  }
  function leave() {
    if (!rowRef.current) return
    if (!isActive) {
      rowRef.current.style.backgroundColor = ''
      rowRef.current.style.borderLeftColor = 'transparent'
      rowRef.current.querySelector<HTMLSpanElement>('.conv-title')!.style.color = v.textMuted
    }
  }

  return (
    <div
      ref={rowRef}
      className="group relative flex items-center"
      style={{
        borderLeft:        `2px solid ${isActive ? v.accent : 'transparent'}`,
        backgroundColor:   isActive ? v.surfaceElevated : undefined,
        transition:        `border-color var(--dur) var(--ease-out), background-color var(--dur) var(--ease-out)`,
      }}
      onMouseEnter={enter}
      onMouseLeave={leave}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex-1 text-left overflow-hidden cursor-pointer"
        style={{
          padding:    '10px 12px',
          fontFamily: v.fontSans,
          fontSize:   '13px',
          background: 'none',
          border:     'none',
        }}
      >
        <span
          className="conv-title block truncate"
          title={title}
          style={{
            color:      isActive ? v.textBright : v.textMuted,
            transition: `color var(--dur) var(--ease-out)`,
          }}
        >
          {title}
        </span>
      </button>

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDelete() }}
        className="opacity-0 group-hover:opacity-100 cursor-pointer"
        style={{
          color:      v.textDim,
          background: 'none',
          border:     'none',
          padding:    '8px 10px 8px 4px',
          flexShrink: 0,
          transition: `opacity var(--dur) var(--ease-out), color var(--dur) var(--ease-out)`,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444' }}
        onMouseLeave={(e) => { e.currentTarget.style.color = v.textDim }}
        aria-label={`"${title}" 대화 삭제`}
      >
        <Trash2 size={11} strokeWidth={1.5} aria-hidden="true" />
      </button>
    </div>
  )
}

function OwnerInfo() {
  return (
    <div
      style={{ borderTop: `1px solid ${v.border}`, padding: '16px' }}
      role="contentinfo"
      aria-label="소프트웨어 소유주 정보"
    >
      <div
        style={{
          fontFamily:    v.fontMono,
          fontSize:      '11px',
          letterSpacing: '0.15em',
          color:         v.textDim,
          marginBottom:  '6px',
        }}
      >
        AI ENGINEER
      </div>
      <div
        style={{
          fontFamily:   v.fontMono,
          fontSize:     '13px',
          color:        v.textBright,
          marginBottom: '4px',
          fontWeight:   500,
        }}
      >
        UPU
      </div>
      <a
        href="mailto:upustream@gmail.com"
        className="cursor-pointer"
        style={{
          fontFamily:     v.fontMono,
          fontSize:       '11px',
          color:          v.textMuted,
          textDecoration: 'none',
          display:        'block',
          transition:     `color var(--dur) var(--ease-out)`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color           = v.accent
          e.currentTarget.style.textDecoration  = 'underline'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color           = v.textMuted
          e.currentTarget.style.textDecoration  = 'none'
        }}
      >
        upustream@gmail.com
      </a>
    </div>
  )
}

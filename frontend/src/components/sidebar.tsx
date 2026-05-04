'use client'

import { useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useChatStore } from '@/stores/chatStore'
import { useConversations } from '@/hooks/useConversations'
import { v } from '@/lib/design-tokens'

export function Sidebar() {
  const { user } = useAuthStore()
  const { conversationsRefreshTrigger, activeConversationId } = useChatStore()
  const { conversations, loadConversations, selectConversation, newConversation, removeConversation } =
    useConversations()

  useEffect(() => {
    if (user) loadConversations()
  }, [user, loadConversations, conversationsRefreshTrigger])

  return (
    <aside
      className="hidden lg:flex flex-col flex-shrink-0 h-[100dvh] overflow-hidden"
      style={{
        width: 'var(--sidebar-w)',
        borderRight: `1px solid ${v.border}`,
        backgroundColor: v.surface,
      }}
      aria-label="탐색 사이드바"
    >
      {/* ── Header: Logo + version ────────────────────────────────── */}
      <div
        style={{
          padding: '20px 16px 16px',
          borderBottom: `1px solid ${v.border}`,
        }}
      >
        <div className="flex items-baseline gap-2">
          <span
            style={{
              fontFamily: v.fontMono,
              fontSize: '13px',
              letterSpacing: '0.15em',
              fontWeight: 600,
              color: v.text,
            }}
          >
            ELYSIA
          </span>
          <span
            style={{
              fontFamily: v.fontMono,
              fontSize: '11px',
              color: v.textDim,
            }}
          >
            v0.11
          </span>
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
          conversations.map((conv) => {
            const isActive = conv.id === activeConversationId
            return (
              <ConversationRow
                key={conv.id}
                id={conv.id}
                title={conv.title}
                isActive={isActive}
                onSelect={() => selectConversation(conv.id)}
                onDelete={() => removeConversation(conv.id)}
              />
            )
          })
        )}
      </div>

      {/* ── Owner Footer ──────────────────────────────────────────── */}
      <OwnerInfo />
    </aside>
  )
}

/* ── Sub-components ─────────────────────────────────────────────────────── */

function NewChatButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2 cursor-pointer transition-colors duration-[180ms]"
      style={{
        padding: '11px 16px',
        fontFamily: v.fontMono,
        fontSize: '11px',
        letterSpacing: '0.05em',
        color: v.textMuted,
        background: 'none',
        border: 'none',
        textAlign: 'left',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = v.surfaceHover
        e.currentTarget.style.color = v.accent
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = ''
        e.currentTarget.style.color = v.textMuted
      }}
      aria-label="새 대화 시작"
    >
      <Plus size={11} strokeWidth={1.5} aria-hidden="true" />
      <span>NEW</span>
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
            style={{
              fontFamily: v.fontMono,
              fontSize: '11px',
              color: v.textDim,
              cursor: 'default',
            }}
          >
            <span
              style={{
                padding: '2px 6px',
                border: `1px solid ${v.border}`,
                borderRadius: '1px',
                fontSize: '10px',
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
      <span
        style={{
          fontFamily: v.fontMono,
          fontSize: '11px',
          color: v.textDim,
        }}
      >
        no conversations yet
      </span>
    </div>
  )
}

interface ConversationRowProps {
  id: string
  title: string
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
}

function ConversationRow({ title, isActive, onSelect, onDelete }: ConversationRowProps) {
  return (
    <div
      className="group relative flex items-center transition-colors duration-[180ms]"
      style={{
        backgroundColor: isActive ? v.surfaceHover : undefined,
        borderLeft: isActive ? `2px solid ${v.accent}` : '2px solid transparent',
      }}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex-1 text-left overflow-hidden cursor-pointer transition-colors duration-[180ms]"
        style={{
          padding: '10px 12px',
          fontFamily: v.fontSans,
          fontSize: '13px',
          color: isActive ? v.text : v.textMuted,
          background: 'none',
          border: 'none',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.parentElement!.style.backgroundColor = v.surfaceHover
        }}
        onMouseLeave={(e) => {
          if (!isActive) e.currentTarget.parentElement!.style.backgroundColor = ''
        }}
      >
        <span className="block truncate" title={title}>
          {title}
        </span>
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        className="opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity duration-[180ms]"
        style={{
          color: v.textDim,
          background: 'none',
          border: 'none',
          padding: '8px 10px 8px 4px',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#ef4444'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = v.textDim
        }}
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
      style={{
        borderTop: `1px solid ${v.border}`,
        padding: '16px',
      }}
      role="contentinfo"
      aria-label="소프트웨어 소유주 정보"
    >
      {/* Label */}
      <div
        style={{
          fontFamily: v.fontMono,
          fontSize: '11px',
          letterSpacing: '0.15em',
          color: v.textDim,
          marginBottom: '6px',
        }}
      >
        AI ENGINEER
      </div>

      {/* Name */}
      <div
        style={{
          fontFamily: v.fontMono,
          fontSize: '13px',
          color: v.text,
          marginBottom: '4px',
          fontWeight: 500,
        }}
      >
        UPU
      </div>

      {/* Email */}
      <a
        href="mailto:upustream@gmail.com"
        className="cursor-pointer transition-colors duration-[180ms]"
        style={{
          fontFamily: v.fontMono,
          fontSize: '11px',
          color: v.textMuted,
          textDecoration: 'none',
          display: 'block',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = v.accent
          e.currentTarget.style.textDecoration = 'underline'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = v.textMuted
          e.currentTarget.style.textDecoration = 'none'
        }}
      >
        upustream@gmail.com
      </a>
    </div>
  )
}

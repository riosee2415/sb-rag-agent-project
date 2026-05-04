'use client'

import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useChatStore } from '@/stores/chatStore'
import { useChat } from '@/hooks/useChat'
import { Sidebar } from '@/components/sidebar'
import { ChatMessage } from '@/components/chat-message'
import { ChatInput } from '@/components/chat-input'
import { EmptyState } from '@/components/empty-state'
import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton'
import { createClient } from '@/lib/supabase/client'
import { v } from '@/lib/design-tokens'
import type { User } from '@supabase/supabase-js'

export function ChatPageClient() {
  const { initialize, user, isLoaded } = useAuthStore()
  const { messages } = useChatStore()
  const { sendMessage, isLoading } = useChat()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const cleanup = initialize()
    return cleanup
  }, [initialize])

  useEffect(() => {
    if (!bottomRef.current) return
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    bottomRef.current.scrollIntoView({
      behavior: prefersReduced ? 'instant' : 'smooth',
    })
  }, [messages])

  const hasMessages = messages.length > 0

  return (
    <div
      className="flex h-[100dvh] overflow-hidden"
      style={{ backgroundColor: v.bg }}
    >
      {/* ── Left Sidebar ─────────────────────────────────────────── */}
      <Sidebar />

      {/* ── Main Content ─────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* ── Top Bar: 사용자 정보 ────────────────────────────────── */}
        {isLoaded && user && <TopBar user={user} />}

        {/* ── Scrollable area ─────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {!hasMessages ? (
            <div className="h-full flex items-start pt-16">
              <EmptyState onSampleClick={user ? sendMessage : () => {}} />
            </div>
          ) : (
            <div
              style={{
                paddingTop: '40px',
                paddingBottom: '24px',
                paddingLeft: 'var(--page-px)',
                paddingRight: 'var(--page-px)',
              }}
            >
              <div style={{ maxWidth: 'var(--chat-max-w)' }}>
                {messages.map((msg, idx) => (
                  <ChatMessage
                    key={msg.id}
                    id={msg.id}
                    role={msg.role}
                    content={msg.content}
                    sources={msg.sources}
                    created_at={msg.created_at}
                    isLoading={msg.isLoading}
                    onRetry={
                      msg.role === 'assistant' && !msg.isLoading
                        ? () => {
                            const prevMsg = messages[idx - 1]
                            if (prevMsg?.role === 'user') sendMessage(prevMsg.content)
                          }
                        : undefined
                    }
                  />
                ))}
                <div ref={bottomRef} aria-hidden="true" />
              </div>
            </div>
          )}
        </div>

        {/* ── Input area: 로그인 필수 ───────────────────────────── */}
        <div
          style={{
            borderTop: `1px solid ${v.border}`,
            backgroundColor: v.bg,
            padding: `16px var(--page-px) 24px`,
          }}
        >
          {isLoaded && (
            user ? (
              <ChatInput
                onSend={sendMessage}
                isLoading={isLoading}
                style={{ maxWidth: 'var(--chat-max-w)' }}
              />
            ) : (
              <LoginPrompt />
            )
          )}
        </div>
      </div>
    </div>
  )
}

/* ── TopBar ─────────────────────────────────────────────────────────────── */

function TopBar({ user }: { user: User }) {
  const email = user.email ?? ''
  const name =
    (user.user_metadata?.full_name as string | undefined) ??
    email.split('@')[0].toUpperCase()
  const initials = name.slice(0, 2).toUpperCase()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
  }

  return (
    <div
      className="flex items-center justify-end gap-4 flex-shrink-0"
      style={{
        borderBottom: `1px solid ${v.border}`,
        padding: '10px var(--page-px)',
        backgroundColor: v.bg,
      }}
      role="banner"
      aria-label="사용자 정보"
    >
      {/* Initials */}
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: '20px',
          height: '20px',
          border: `1px solid ${v.border}`,
          backgroundColor: v.surfaceHover,
          fontFamily: v.fontMono,
          fontSize: '10px',
          color: v.textMuted,
          userSelect: 'none',
        }}
        aria-hidden="true"
      >
        {initials}
      </div>

      {/* Email */}
      <span
        style={{
          fontFamily: v.fontMono,
          fontSize: '11px',
          color: v.textDim,
        }}
      >
        {email}
      </span>

      {/* Sign out */}
      <button
        type="button"
        onClick={handleSignOut}
        className="cursor-pointer transition-colors duration-[180ms]"
        style={{
          fontFamily: v.fontMono,
          fontSize: '11px',
          color: v.textDim,
          background: 'none',
          border: 'none',
          padding: 0,
          letterSpacing: '0.02em',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = v.text
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = v.textDim
        }}
        aria-label="로그아웃"
      >
        [sign out]
      </button>
    </div>
  )
}

/* ── LoginPrompt ────────────────────────────────────────────────────────── */

function LoginPrompt() {
  return (
    <div
      style={{ maxWidth: 'var(--chat-max-w)' }}
      className="flex items-center gap-4"
    >
      <span
        style={{
          fontFamily: v.fontMono,
          fontSize: '11px',
          color: v.textDim,
          letterSpacing: '0.02em',
        }}
      >
        로그인 후 질문할 수 있습니다
      </span>
      <GoogleLoginButton />
    </div>
  )
}

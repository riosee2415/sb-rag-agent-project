'use client'

import { useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { useChatStore } from '@/stores/chatStore'
import { streamChat, type StreamResult } from '@/lib/streaming'

export function useChat() {
  const {
    addMessage,
    appendToLastMessage,
    finalizeLastMessage,
    updateLastMessage,
    setLoading,
    isLoading,
    activeConversationId,
    setActiveConversation,
    triggerConversationsRefresh,
  } = useChatStore()

  const pendingRef = useRef(false)
  const streamRef  = useRef<StreamResult | null>(null)

  const sendMessage = useCallback(
    (query: string) => {
      if (!query.trim() || pendingRef.current) return
      pendingRef.current = true
      setLoading(true)

      addMessage({
        id:         crypto.randomUUID(),
        role:       'user',
        content:    query,
        created_at: new Date().toISOString(),
      })

      addMessage({
        id:         crypto.randomUUID(),
        role:       'assistant',
        content:    '',
        created_at: new Date().toISOString(),
        isLoading:  true,
      })

      const session = streamChat(
        {
          query,
          conversation_id: activeConversationId ?? undefined,
          include_history:  true,
        },
        {
          onText(chunk) {
            appendToLastMessage(chunk)
          },
          onMeta(meta) {
            finalizeLastMessage(meta.sources)
            if (meta.conversation_id && !activeConversationId) {
              setActiveConversation(meta.conversation_id)
              triggerConversationsRefresh()
            }
          },
          onDone() {
            /* Make sure message is finalized even if onMeta didn't fire
               (e.g., user stopped the stream early). */
            finalizeLastMessage(null)
            setLoading(false)
            pendingRef.current = false
            streamRef.current  = null
          },
          onError(err) {
            updateLastMessage('오류가 발생했습니다. 잠시 후 다시 시도해주세요.', null)
            toast.error(err.message)
            setLoading(false)
            pendingRef.current = false
            streamRef.current  = null
          },
        },
      )

      streamRef.current = session
    },
    [
      addMessage,
      appendToLastMessage,
      finalizeLastMessage,
      updateLastMessage,
      setLoading,
      activeConversationId,
      setActiveConversation,
      triggerConversationsRefresh,
    ],
  )

  const stopStreaming = useCallback(() => {
    streamRef.current?.stop()
    streamRef.current = null
  }, [])

  return { sendMessage, stopStreaming, isLoading }
}

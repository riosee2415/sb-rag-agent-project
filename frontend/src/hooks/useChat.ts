'use client'

import { useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { useChatStore } from '@/stores/chatStore'
import { sendChatMessage } from '@/app/actions/chat'
import type { RAGResponse } from '@/types/api'

export function useChat() {
  const {
    addMessage,
    updateLastMessage,
    setLoading,
    isLoading,
    activeConversationId,
    setActiveConversation,
    triggerConversationsRefresh,
  } = useChatStore()
  const pendingRef = useRef(false)

  const sendMessage = useCallback(
    async (query: string) => {
      if (!query.trim() || pendingRef.current) return
      pendingRef.current = true
      setLoading(true)

      const userMsg = {
        id: crypto.randomUUID(),
        role: 'user' as const,
        content: query,
        created_at: new Date().toISOString(),
      }
      addMessage(userMsg)

      const loadingMsg = {
        id: crypto.randomUUID(),
        role: 'assistant' as const,
        content: '',
        created_at: new Date().toISOString(),
        isLoading: true,
      }
      addMessage(loadingMsg)

      try {
        const result = await sendChatMessage(query, activeConversationId ?? undefined)
        if ('error' in result) {
          if (result.code === 'TIMEOUT') {
            updateLastMessage('응답 시간이 초과되었습니다. 다시 시도해주세요.', null)
          } else {
            updateLastMessage('오류가 발생했습니다. 잠시 후 다시 시도해주세요.', null)
          }
          toast.error(result.error)
        } else {
          const ragResult = result as RAGResponse
          updateLastMessage(ragResult.answer, ragResult.sources)
          // 백엔드가 새 conversation을 생성한 경우 ID 동기화 + 사이드바 갱신
          if (ragResult.conversation_id && !activeConversationId) {
            setActiveConversation(String(ragResult.conversation_id))
            triggerConversationsRefresh()
          }
        }
      } catch (err: unknown) {
        updateLastMessage('네트워크 오류가 발생했습니다.', null)
        toast.error(String(err))
      } finally {
        setLoading(false)
        pendingRef.current = false
      }
    },
    [addMessage, updateLastMessage, setLoading, activeConversationId, setActiveConversation, triggerConversationsRefresh]
  )

  return { sendMessage, isLoading }
}

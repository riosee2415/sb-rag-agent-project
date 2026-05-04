'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import {
  getConversations,
  createConversation,
  deleteConversation,
  getMessages,
} from '@/app/actions/conversations'
import { useChatStore } from '@/stores/chatStore'
import type { ConversationItem, MessageItem } from '@/types/api'

export function useConversations() {
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { setMessages, setActiveConversation, clearMessages } = useChatStore()

  const loadConversations = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await getConversations()
      if ('error' in res) {
        toast.error(res.error)
        return
      }
      setConversations(res.conversations)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const selectConversation = useCallback(
    async (id: string) => {
      setActiveConversation(id)
      setIsLoading(true)
      try {
        const res = await getMessages(id)
        if ('error' in res) {
          toast.error(res.error)
          return
        }
        setMessages(res.messages as MessageItem[])
      } finally {
        setIsLoading(false)
      }
    },
    [setActiveConversation, setMessages]
  )

  const newConversation = useCallback(async () => {
    clearMessages()
    setActiveConversation(null)
  }, [clearMessages, setActiveConversation])

  const removeConversation = useCallback(
    async (id: string) => {
      setIsLoading(true)
      try {
        const res = await deleteConversation(id)
        if ('error' in res) {
          toast.error(res.error)
          return
        }
        setConversations((prev) => prev.filter((c) => c.id !== id))
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  const startConversation = useCallback(
    async (title?: string, deviceHint?: string): Promise<ConversationItem | null> => {
      const res = await createConversation(title, deviceHint)
      if ('error' in res) {
        toast.error(res.error)
        return null
      }
      setConversations((prev) => [res, ...prev])
      setActiveConversation(res.id)
      return res
    },
    [setActiveConversation]
  )

  return {
    conversations,
    isLoading,
    loadConversations,
    selectConversation,
    newConversation,
    removeConversation,
    startConversation,
  }
}

'use client'

import { useEffect, useRef } from 'react'
import { useChatStore } from '@/stores/chatStore'
import { ChatMessage } from './ChatMessage'

export function ChatContainer() {
  const { messages } = useChatStore()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-3xl space-y-6">
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            id={msg.id}
            role={msg.role}
            content={msg.content}
            sources={msg.sources}
            isLoading={msg.isLoading}
            created_at={msg.created_at}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

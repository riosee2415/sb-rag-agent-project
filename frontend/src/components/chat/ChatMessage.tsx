'use client'

import { motion } from 'motion/react'
import { Sparkles } from 'lucide-react'
import { messageVariants } from '@/app/animations'
import { TypingIndicator } from './TypingIndicator'
import { SourceCard } from './SourceCard'
import type { SourceItem } from '@/types/api'

interface ChatMessageProps {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: SourceItem[] | null
  isLoading?: boolean
  created_at: string
}

export function ChatMessage({ role, content, sources, isLoading }: ChatMessageProps) {
  const isUser = role === 'user'

  return (
    <motion.div
      className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
      variants={messageVariants}
      initial="hidden"
      animate="visible"
      data-testid={isUser ? 'user-message' : 'ai-message'}
    >
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7C3AED] to-[#C084FC] shadow-[0_0_12px_rgba(124,58,237,0.3)]">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
      )}

      <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div
          className={
            isUser
              ? 'rounded-2xl rounded-tr-sm bg-gradient-to-br from-[#7C3AED] to-[#8B5CF6] px-4 py-2.5 text-sm text-white shadow-[0_0_16px_rgba(124,58,237,0.2)]'
              : 'rounded-2xl rounded-tl-sm border border-[#1C1C3A] bg-[#0D0D1A] px-4 py-2.5 text-sm text-[#EDE9FE]'
          }
        >
          {isLoading ? (
            <TypingIndicator />
          ) : (
            <p className="whitespace-pre-wrap break-words leading-relaxed">{content}</p>
          )}
        </div>

        {!isUser && !isLoading && sources && sources.length > 0 && (
          <SourceCard sources={sources} />
        )}
      </div>

      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#13132A] border border-[#1C1C3A] text-xs font-medium text-[#A78BFA]">
          나
        </div>
      )}
    </motion.div>
  )
}

'use client'

import { useRef, useState } from 'react'
import { motion } from 'motion/react'
import { SendHorizonal, Loader2 } from 'lucide-react'
import { useChat } from '@/hooks/useChat'

export function ChatInput() {
  const { sendMessage, isLoading } = useChat()
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleInput = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`
  }

  const handleSubmit = async () => {
    const trimmed = value.trim()
    if (!trimmed || isLoading) return
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    await sendMessage(trimmed)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSubmit()
    }
  }

  const canSubmit = !isLoading && value.trim().length > 0

  return (
    <div className="sticky bottom-0 z-10 border-t border-[#1C1C3A] bg-[#07070F]/80 backdrop-blur-xl px-4 py-3">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-end gap-2 rounded-xl border border-[#1C1C3A] bg-[#0D0D1A] px-4 py-3 focus-within:border-[#7C3AED] focus-within:shadow-[0_0_0_3px_rgba(124,58,237,0.25)] transition-all">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="sv.developer 영상에 대해 질문하세요..."
            aria-label="메시지 입력"
            rows={1}
            disabled={isLoading}
            className="flex-1 resize-none bg-transparent text-sm text-[#EDE9FE] placeholder-[#6B7280] outline-none disabled:opacity-50 leading-relaxed max-h-[180px]"
          />
          <motion.button
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            whileHover={canSubmit ? { scale: 1.1 } : {}}
            whileTap={canSubmit ? { scale: 0.9 } : {}}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            className="cursor-pointer flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#8B5CF6] text-white transition-all hover:shadow-[0_0_12px_rgba(124,58,237,0.4)] disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="전송"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <SendHorizonal className="h-4 w-4" />
            )}
          </motion.button>
        </div>
        <p className="mt-1.5 text-center text-xs text-[#374151]">
          Enter로 전송, Shift+Enter로 줄바꿈
        </p>
      </div>
    </div>
  )
}

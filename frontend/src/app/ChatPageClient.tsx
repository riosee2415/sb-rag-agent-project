'use client'

import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Sparkles } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useChatStore } from '@/stores/chatStore'
import { ConversationSidebar } from '@/components/sidebar/ConversationSidebar'
import { ChatContainer } from '@/components/chat/ChatContainer'
import { ChatInput } from '@/components/chat/ChatInput'

function OnboardingCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="flex flex-1 flex-col items-center justify-center px-4 py-12"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#C084FC] shadow-[0_0_32px_rgba(124,58,237,0.3)] mb-6">
        <Sparkles className="h-8 w-8 text-white" />
      </div>
      <h1 className="text-2xl font-bold text-[#EDE9FE] mb-2 text-center">
        SV Dev RAG Agent
      </h1>
      <p className="text-sm text-[#6B7280] text-center max-w-sm mb-8">
        sv.developer 유튜브 채널의 모든 영상을 AI로 검색하세요.
        타임스탬프와 함께 정확한 출처를 제공합니다.
      </p>
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.1 } }}
      >
        {[
          '최근 영상에서 다룬 주제는?',
          '클로드 코드 어떻게 시작하나요?',
          '하네스 엔지니어링이란?',
          '바이브코딩 처음 시작하는 법',
        ].map((suggestion) => (
          <motion.button
            key={suggestion}
            whileHover={{ scale: 1.02, x: 3 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="cursor-pointer rounded-lg border border-[#1C1C3A] bg-[#0D0D1A] px-4 py-3 text-left text-xs text-[#A78BFA] hover:border-purple-600/40 hover:bg-[#16163A] transition-all"
          >
            {suggestion}
          </motion.button>
        ))}
      </motion.div>
    </motion.div>
  )
}

export function ChatPageClient() {
  const { initialize } = useAuthStore()
  const { messages } = useChatStore()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  useEffect(() => {
    const unsubscribe = initialize()
    return unsubscribe
  }, [initialize])

  const showOnboarding = messages.length === 0

  return (
    <>
      <ConversationSidebar
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      <div className="flex flex-col flex-1 pt-16 lg:pl-64 overflow-hidden">
        {showOnboarding ? (
          <>
            <OnboardingCard />
            <ChatInput />
          </>
        ) : (
          <>
            <ChatContainer />
            <ChatInput />
          </>
        )}
      </div>
    </>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useChatStore } from '@/stores/chatStore'
import { ConversationSidebar } from '@/components/sidebar/ConversationSidebar'
import { ChatContainer } from '@/components/chat/ChatContainer'
import { ChatInput } from '@/components/chat/ChatInput'
import { OnboardingCard } from '@/components/chat/OnboardingCard'
import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton'

function LoginPrompt() {
  return (
    <div className="sticky bottom-0 z-10 border-t border-[#1C1C3A] bg-[#07070F]/80 backdrop-blur-xl px-4 py-4">
      <div className="mx-auto max-w-3xl flex flex-col items-center gap-2.5">
        <p className="text-sm text-[#6B7280]">질문하려면 Google 로그인이 필요해요</p>
        <GoogleLoginButton />
      </div>
    </div>
  )
}

export function ChatPageClient() {
  const { initialize, user, isLoaded } = useAuthStore()
  const { messages } = useChatStore()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  useEffect(() => {
    const unsubscribe = initialize()
    return unsubscribe
  }, [initialize])

  const showOnboarding = messages.length === 0
  const inputArea = isLoaded
    ? user
      ? <ChatInput />
      : <LoginPrompt />
    : null

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
            {inputArea}
          </>
        ) : (
          <>
            <ChatContainer />
            {inputArea}
          </>
        )}
      </div>
    </>
  )
}

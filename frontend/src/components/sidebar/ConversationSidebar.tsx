'use client'

import { useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { PlusCircle, X } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useChatStore } from '@/stores/chatStore'
import { useConversations } from '@/hooks/useConversations'
import { ConversationItem } from './ConversationItem'
import { ElysiaLogo } from '@/components/ui/ElysiaLogo'
import { sidebarContainerVariants } from '@/app/animations'

interface ConversationSidebarProps {
  mobileOpen: boolean
  onMobileClose: () => void
}

export function ConversationSidebar({ mobileOpen, onMobileClose }: ConversationSidebarProps) {
  const { user } = useAuthStore()
  const { activeConversationId, conversationsRefreshTrigger } = useChatStore()
  const { conversations, isLoading, loadConversations, selectConversation, newConversation, removeConversation } =
    useConversations()

  useEffect(() => {
    if (user) {
      void loadConversations()
    }
  }, [user, loadConversations])

  // 채팅에서 새 대화가 생성될 때 목록 갱신
  useEffect(() => {
    if (user && conversationsRefreshTrigger > 0) {
      void loadConversations()
    }
  }, [user, conversationsRefreshTrigger, loadConversations])

  const SidebarContent = (
    <motion.div
      className="flex h-full flex-col"
      variants={sidebarContainerVariants}
      initial="hidden"
      animate="visible"
      data-testid="conversation-sidebar"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1C1C3A]">
        <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">대화 목록</span>
        <button
          onClick={onMobileClose}
          className="cursor-pointer lg:hidden flex h-6 w-6 items-center justify-center rounded text-[#6B7280] hover:text-[#EDE9FE] transition-colors"
          aria-label="닫기"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 min-h-0">
        <button
          onClick={() => void newConversation()}
          className="cursor-pointer flex w-full items-center gap-2 rounded-lg border border-dashed border-[#1C1C3A] px-3 py-2 text-xs text-[#6B7280] hover:border-purple-600/40 hover:text-[#A78BFA] hover:bg-[#16163A] transition-all"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          새 대화
        </button>

        {!user && (
          <p className="px-3 py-4 text-xs text-center text-[#374151]">
            로그인하면 대화 이력을 저장할 수 있어요
          </p>
        )}

        {user && isLoading && (
          <div className="space-y-1 px-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 rounded-lg shimmer" />
            ))}
          </div>
        )}

        {user && !isLoading && conversations.length === 0 && (
          <p className="px-3 py-4 text-xs text-center text-[#374151]">대화 이력이 없습니다</p>
        )}

        {user &&
          conversations.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              isActive={activeConversationId === conv.id}
              onSelect={(id) => void selectConversation(id)}
              onDelete={(id) => void removeConversation(id)}
            />
          ))}
      </div>

      {/* 소프트웨어 정보 */}
      <div className="shrink-0 border-t border-[#1C1C3A] px-4 py-3 flex flex-col items-start gap-1.5">
        <ElysiaLogo width={176} glow />
        <span className="text-[10px] text-white/40 tracking-wide">v0.11 · AI엔지니어 UPU</span>
      </div>
    </motion.div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-16 bottom-0 w-64 flex-col border-r border-[#1C1C3A] bg-[#09091A] z-20">
        {SidebarContent}
      </aside>

      {/* Mobile bottom sheet */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onMobileClose}
            />
            <motion.aside
              className="fixed bottom-0 left-0 right-0 z-50 max-h-[70vh] rounded-t-2xl border-t border-[#1C1C3A] bg-[#09091A] lg:hidden"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              {SidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

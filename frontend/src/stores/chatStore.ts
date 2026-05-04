import { create } from 'zustand'
import type { MessageItem, SourceItem } from '@/types/api'

interface LocalMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: SourceItem[] | null
  created_at: string
  isLoading?: boolean
}

interface ChatStore {
  messages: LocalMessage[]
  isLoading: boolean
  activeConversationId: string | null
  conversationsRefreshTrigger: number
  addMessage: (msg: LocalMessage) => void
  setMessages: (msgs: MessageItem[]) => void
  updateLastMessage: (content: string, sources?: SourceItem[] | null) => void
  setLoading: (v: boolean) => void
  setActiveConversation: (id: string | null) => void
  clearMessages: () => void
  triggerConversationsRefresh: () => void
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  isLoading: false,
  activeConversationId: null,
  conversationsRefreshTrigger: 0,
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setMessages: (msgs) =>
    set({ messages: msgs.map((m) => ({ ...m, isLoading: false })) }),
  updateLastMessage: (content, sources) =>
    set((s) => {
      const msgs = [...s.messages]
      const last = msgs[msgs.length - 1]
      if (last) msgs[msgs.length - 1] = { ...last, content, sources, isLoading: false }
      return { messages: msgs }
    }),
  setLoading: (v) => set({ isLoading: v }),
  setActiveConversation: (id) => set({ activeConversationId: id }),
  clearMessages: () => set({ messages: [] }),
  triggerConversationsRefresh: () =>
    set((s) => ({ conversationsRefreshTrigger: s.conversationsRefreshTrigger + 1 })),
}))

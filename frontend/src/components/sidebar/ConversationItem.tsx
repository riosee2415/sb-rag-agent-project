'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { MessageSquare, Trash2 } from 'lucide-react'
import { sidebarItemVariants } from '@/app/animations'
import type { ConversationItem as ConversationItemType } from '@/types/api'

interface ConversationItemProps {
  conversation: ConversationItemType
  isActive: boolean
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}

export function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onDelete,
}: ConversationItemProps) {
  const [hovered, setHovered] = useState(false)

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(conversation.id)
  }

  return (
    <motion.div
      className={`group relative flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
        isActive
          ? 'bg-[#13132A] border border-[#7C3AED]/40 text-[#EDE9FE]'
          : 'text-[#A78BFA] hover:bg-[#16163A] border border-transparent'
      }`}
      variants={sidebarItemVariants}
      onClick={() => onSelect(conversation.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <MessageSquare className="h-3.5 w-3.5 shrink-0" />
      <span className="flex-1 truncate text-xs">{conversation.title || '새 대화'}</span>
      {hovered && (
        <button
          onClick={handleDelete}
          className="cursor-pointer flex h-5 w-5 items-center justify-center rounded text-[#6B7280] hover:text-[#EF4444] transition-colors"
          aria-label="대화 삭제"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}
    </motion.div>
  )
}

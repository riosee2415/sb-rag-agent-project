'use client'

import { motion } from 'motion/react'
import { Video, Clock, ExternalLink } from 'lucide-react'
import { sourceContainerVariants, sourceCardVariants } from '@/app/animations'
import type { SourceItem } from '@/types/api'

interface SourceCardProps {
  sources: SourceItem[]
}

export function SourceCard({ sources }: SourceCardProps) {
  if (!sources.length) return null

  return (
    <motion.div
      className="mt-3 space-y-2"
      variants={sourceContainerVariants}
      initial="hidden"
      animate="visible"
    >
      <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wider">출처</p>
      {sources.map((source, idx) => (
        <motion.div
          key={idx}
          className="rounded-lg border border-[#1C1C3A] bg-[#0D0D1A] p-3 hover:border-purple-600/40 hover:shadow-[0_0_12px_rgba(124,58,237,0.15)] transition-all"
          variants={sourceCardVariants}
          data-testid="source-card"
        >
          <div className="flex items-start gap-2">
            <Video className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[#7C3AED]" />
            <p className="text-xs font-medium text-[#EDE9FE] line-clamp-1">{source.video_title}</p>
          </div>
          <p className="mt-1.5 text-xs text-[#6B7280] line-clamp-2">{source.excerpt}</p>
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-[#A78BFA]">
              <Clock className="h-3 w-3" />
              <span>{source.timestamp_label}</span>
            </div>
            <a
              href={source.timestamp_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-[#7C3AED] hover:text-[#C084FC] transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              보기
            </a>
          </div>
        </motion.div>
      ))}
    </motion.div>
  )
}

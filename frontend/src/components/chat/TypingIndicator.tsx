'use client'

import { motion } from 'motion/react'
import { dotVariants } from '@/app/animations'

export function TypingIndicator() {
  return (
    <div
      className="flex items-center gap-1 px-1 py-1"
      data-testid="typing-indicator"
      aria-label="응답 생성 중"
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block h-2 w-2 rounded-full bg-[#A78BFA]"
          variants={dotVariants}
          initial="initial"
          animate="animate"
          style={{ animationDelay: `${i * 0.15}s` }}
          transition={{ delay: i * 0.15 }}
        />
      ))}
    </div>
  )
}

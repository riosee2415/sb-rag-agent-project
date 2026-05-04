'use client'

import { motion } from 'motion/react'

export function AuroraBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <motion.div
        className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle, #7C3AED 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
        animate={{
          x: [0, 60, -30, 0],
          y: [0, -40, 60, 0],
          scale: [1, 1.15, 0.9, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className="absolute top-1/2 -right-40 h-[500px] w-[500px] rounded-full opacity-15"
        style={{
          background: 'radial-gradient(circle, #C084FC 0%, transparent 70%)',
          filter: 'blur(100px)',
        }}
        animate={{
          x: [0, -50, 30, 0],
          y: [0, 50, -60, 0],
          scale: [1, 0.9, 1.1, 1],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 3,
        }}
      />
      <motion.div
        className="absolute bottom-0 left-1/3 h-[400px] w-[400px] rounded-full opacity-10"
        style={{
          background: 'radial-gradient(circle, #8B5CF6 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
        animate={{
          x: [0, 40, -60, 0],
          y: [0, -30, 20, 0],
          scale: [1, 1.2, 0.85, 1],
        }}
        transition={{
          duration: 26,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 6,
        }}
      />
    </div>
  )
}

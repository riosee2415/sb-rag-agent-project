'use client'

import { motion } from 'motion/react'
import { Sparkles, MessageCircle } from 'lucide-react'
import { springHeavy, staggerContainer, staggerItem, pulseGlow } from '@/app/animations'
import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton'
import { useChat } from '@/hooks/useChat'

const SAMPLE_QUERIES = [
  '클로드 코드 처음 설치하고 세팅하는 방법은?',
  '하네스 엔지니어링이 프롬프트 엔지니어링과 다른 점은?',
  'AI-Native 개발자란 무엇인가요?',
  '바이브코딩으로 SaaS 만드는 방법 알려줘',
]

export function OnboardingCard() {
  const { sendMessage: submit } = useChat()

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-8">
      {/* Background blur glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="size-96 rounded-full bg-[#7C3AED]/10 blur-[80px]" aria-hidden="true" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={springHeavy}
        className="relative z-10 w-full max-w-md"
      >
        {/* Gradient border card */}
        <div className="p-[1px] rounded-2xl bg-gradient-to-br from-[#7C3AED]/40 via-[#1C1C3A] to-[#C084FC]/20">
          <div className="bg-[#0D0D1A] rounded-2xl p-8 flex flex-col items-center gap-6">
            {/* Logo */}
            <motion.div
              animate={{
                rotate: [0, 5, -5, 0],
                boxShadow: pulseGlow.animate.boxShadow,
              }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="size-16 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#C084FC] flex items-center justify-center shadow-[0_0_24px_rgba(124,58,237,0.25)]"
            >
              <Sparkles className="size-8 text-white" aria-hidden="true" />
            </motion.div>

            <div className="text-center">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-[#7C3AED] to-[#C084FC] bg-clip-text text-transparent">
                SV Dev RAG
              </h1>
              <p className="text-sm text-[#6B7280] mt-2">
                영상 콘텐츠를 AI로 빠르게 검색하세요
              </p>
            </div>

            {/* Sample queries */}
            <motion.div
              className="w-full flex flex-col gap-2"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {SAMPLE_QUERIES.map((query, i) => (
                <motion.button
                  key={i}
                  type="button"
                  onClick={() => submit(query)}
                  variants={staggerItem}
                  whileHover={{ scale: 1.02, x: 4 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  className="cursor-pointer w-full text-left text-xs text-[#A78BFA] bg-[#13132A] border border-[#1C1C3A] rounded-lg px-3 py-2 hover:bg-[#16163A] hover:border-[#7C3AED]/40 transition-colors flex items-center gap-2"
                >
                  <MessageCircle className="size-3 flex-shrink-0" aria-hidden="true" />
                  {query}
                </motion.button>
              ))}
            </motion.div>

            <div className="w-full flex flex-col gap-3">
              <GoogleLoginButton />
              <motion.button
                type="button"
                onClick={() => submit('안녕하세요! SV Dev RAG에 대해 소개해주세요.')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="cursor-pointer w-full text-sm text-[#6B7280] hover:text-[#A78BFA] transition-colors py-2"
              >
                로그인 없이 시작하기
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

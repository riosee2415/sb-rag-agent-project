'use client'

import { motion, AnimatePresence } from 'motion/react'
import { Sparkles, X } from 'lucide-react'
import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton'

interface LoginConfirmDialogProps {
  open: boolean
  onClose: () => void
}

export function LoginConfirmDialog({ open, onClose }: LoginConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Dialog */}
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none">
            <motion.div
              className="pointer-events-auto w-full max-w-sm"
              initial={{ opacity: 0, scale: 0.88, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 24 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            >
              {/* Gradient border */}
              <div className="p-[1px] rounded-2xl bg-gradient-to-br from-[#7C3AED]/70 via-[#1C1C3A] to-[#C084FC]/40 shadow-[0_0_40px_rgba(124,58,237,0.25)]">
                <div className="relative bg-[#0D0D1A] rounded-2xl p-7 flex flex-col items-center gap-6">

                  {/* Close */}
                  <button
                    onClick={onClose}
                    className="cursor-pointer absolute top-4 right-4 flex h-7 w-7 items-center justify-center rounded-lg text-[#4B5563] hover:text-[#EDE9FE] hover:bg-[#1C1C3A] transition-all"
                    aria-label="닫기"
                  >
                    <X className="size-4" />
                  </button>

                  {/* Icon */}
                  <motion.div
                    animate={{ boxShadow: ['0 0 0px rgba(124,58,237,0)', '0 0 24px rgba(124,58,237,0.5)', '0 0 0px rgba(124,58,237,0)'] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="size-14 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#C084FC] flex items-center justify-center"
                  >
                    <Sparkles className="size-7 text-white" />
                  </motion.div>

                  {/* Text */}
                  <div className="text-center flex flex-col gap-2">
                    <h2 className="text-lg font-bold text-[#EDE9FE]">로그인이 필요해요</h2>
                    <p className="text-sm text-[#6B7280] leading-relaxed">
                      영상 검색 기능은 로그인 후<br />이용하실 수 있어요.
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="w-full flex flex-col gap-3">
                    <GoogleLoginButton />
                    <button
                      onClick={onClose}
                      className="cursor-pointer w-full text-sm text-[#4B5563] hover:text-[#A78BFA] transition-colors py-1.5"
                    >
                      괜찮아요, 나중에 할게요
                    </button>
                  </div>

                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

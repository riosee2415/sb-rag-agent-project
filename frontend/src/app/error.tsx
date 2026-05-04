'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#07070F] px-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#EF4444]/30 bg-[#EF4444]/10 mb-6">
        <AlertTriangle className="h-7 w-7 text-[#EF4444]" />
      </div>
      <h2 className="text-lg font-semibold text-[#EDE9FE] mb-2">오류가 발생했습니다</h2>
      <p className="text-sm text-[#6B7280] text-center max-w-sm mb-6">
        {error.message || '예기치 않은 오류가 발생했습니다. 다시 시도해주세요.'}
      </p>
      <button
        onClick={reset}
        className="rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#8B5CF6] px-4 py-2 text-sm font-medium text-white hover:shadow-[0_0_16px_rgba(124,58,237,0.4)] transition-all"
      >
        다시 시도
      </button>
    </div>
  )
}

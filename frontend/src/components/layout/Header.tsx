import { getStatus } from '@/app/actions/chat'
import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton'
import { UserMenu } from '@/components/auth/UserMenu'
import { createClient } from '@/lib/supabase/server'
import { ElysiaLogo } from '@/components/ui/ElysiaLogo'
import type { StatusResponse } from '@/types/api'

export async function Header() {
  const [statusResult, supabase] = await Promise.all([getStatus(), createClient()])

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const statusOk = !('error' in statusResult)
  const totalVideos = statusOk ? (statusResult as StatusResponse).total_videos : null

  return (
    <header className="fixed top-0 left-0 right-0 z-30 h-16 border-b border-[#1C1C3A] bg-[#07070F]/80 backdrop-blur-xl">
      <div className="flex h-full items-center justify-between px-4 lg:px-6">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <ElysiaLogo width={192} />
          <span className="text-[9px] text-[#4B5563] tracking-widest hidden sm:block">v0.11</span>
        </div>

        {/* Center — video count */}
        {totalVideos !== null && (
          <div className="flex items-center gap-2 text-xs text-[#6B7280]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]" />
            </span>
            <span>
              영상 <span className="text-[#A78BFA] font-medium">{totalVideos}</span>개 인덱싱됨
            </span>
          </div>
        )}

        {/* Right — auth */}
        <div className="flex items-center gap-2">
          {user ? <UserMenu /> : <GoogleLoginButton />}
        </div>
      </div>
    </header>
  )
}

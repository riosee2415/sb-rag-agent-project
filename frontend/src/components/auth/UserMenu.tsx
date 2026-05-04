'use client'

import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { createClient } from '@/lib/supabase/client'
import { LogOut, ChevronDown } from 'lucide-react'

export function UserMenu() {
  const { user, clearAuth } = useAuthStore()
  const [open, setOpen] = useState(false)

  if (!user) return null

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    clearAuth()
    setOpen(false)
  }

  const rawAvatar = user.user_metadata?.avatar_url
  const avatarUrl = typeof rawAvatar === 'string' ? rawAvatar : undefined
  const email = user.email ?? ''
  const rawName = user.user_metadata?.full_name
  const name = typeof rawName === 'string' ? rawName : email.split('@')[0]

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="cursor-pointer flex items-center gap-2 rounded-lg border border-[#1C1C3A] px-2 py-1.5 text-sm text-[#EDE9FE] hover:border-purple-600/50 hover:bg-[#16163A] transition-all"
        aria-expanded={open}
        aria-haspopup="true"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={name} className="h-6 w-6 rounded-full" />
        ) : (
          <div className="h-6 w-6 rounded-full bg-purple-600 flex items-center justify-center text-xs font-medium">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="hidden sm:block max-w-[120px] truncate">{name}</span>
        <ChevronDown className="h-3 w-3 text-[#6B7280]" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 top-full mt-1 z-20 min-w-[180px] rounded-lg border border-[#1C1C3A] bg-[#0D0D1A] py-1 shadow-lg shadow-black/50">
            <div className="px-3 py-2 border-b border-[#1C1C3A]">
              <p className="text-xs font-medium text-[#EDE9FE] truncate">{name}</p>
              <p className="text-xs text-[#6B7280] truncate">{email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="cursor-pointer flex w-full items-center gap-2 px-3 py-2 text-sm text-[#A78BFA] hover:bg-[#16163A] transition-colors"
            >
              <LogOut className="h-4 w-4" />
              로그아웃
            </button>
          </div>
        </>
      )}
    </div>
  )
}

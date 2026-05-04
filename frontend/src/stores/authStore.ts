import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

interface AuthStore {
  user: User | null
  session: Session | null
  isLoaded: boolean
  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  setLoaded: (v: boolean) => void
  clearAuth: () => void
  initialize: () => () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  session: null,
  isLoaded: false,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setLoaded: (v) => set({ isLoaded: v }),
  clearAuth: () => set({ user: null, session: null }),
  initialize: () => {
    const supabase = createClient()

    supabase.auth.getSession().then(({ data: { session } }) => {
      set({ session, user: session?.user ?? null, isLoaded: true })
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null, isLoaded: true })
    })

    return () => subscription.unsubscribe()
  },
}))

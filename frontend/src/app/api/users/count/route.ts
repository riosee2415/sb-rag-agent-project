import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

/* Cache the count for 60 s — avoids hammering the admin API on every render */
export const revalidate = 60

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !key) {
      return NextResponse.json({ count: 0 })
    }

    const admin = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    /* perPage: 1 is enough — the response includes a `total` field */
    const { data, error } = await admin.auth.admin.listUsers({ perPage: 1, page: 1 })

    if (error) return NextResponse.json({ count: 0 })

    const count = (data as { total?: number }).total ?? data.users.length
    return NextResponse.json({ count })
  } catch {
    return NextResponse.json({ count: 0 })
  }
}

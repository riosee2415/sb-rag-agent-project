import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { RAGResponseSchema } from '@/types/api'

export const runtime = 'nodejs'
export const maxDuration = 45

export const META_SENTINEL = '\x00META\x00'
export const END_SENTINEL   = '\x00END\x00'

export async function POST(req: Request) {
  const backendUrl = process.env.BACKEND_URL
  if (!backendUrl) {
    return NextResponse.json({ error: 'BACKEND_URL not configured' }, { status: 500 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  const headers: Record<string, string> = {
    'Content-Type':  'application/json',
    'X-API-Secret':  process.env.API_SHARED_SECRET ?? '',
  }
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }

  const ac = new AbortController()
  const timeout = setTimeout(() => ac.abort(), 30_000)

  let backendRes: Response
  try {
    backendRes = await fetch(`${backendUrl}/api/v1/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query:           body.query,
        conversation_id: body.conversation_id,
        include_history: body.include_history ?? true,
      }),
      signal: ac.signal,
    })
    clearTimeout(timeout)
  } catch (err) {
    clearTimeout(timeout)
    const msg = err instanceof Error ? err.message : 'Backend unreachable'
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  if (!backendRes.ok) {
    return NextResponse.json(
      { error: `Backend error: ${backendRes.status}` },
      { status: backendRes.status },
    )
  }

  const raw: unknown = await backendRes.json()
  const parsed = RAGResponseSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid backend response' }, { status: 502 })
  }

  const { answer, sources, conversation_id } = parsed.data

  /* Stream the answer then append a metadata sentinel so the client can
     attach sources without a second round-trip. */
  const encoder = new TextEncoder()
  const metaPayload = JSON.stringify({ sources, conversation_id })

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(answer))
      controller.enqueue(encoder.encode(`${META_SENTINEL}${metaPayload}${END_SENTINEL}`))
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':           'text/plain; charset=utf-8',
      'Cache-Control':          'no-cache, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

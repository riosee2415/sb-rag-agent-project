'use server'

import { createClient } from '@/lib/supabase/server'
import {
  RAGResponseSchema,
  VideosResponseSchema,
  StatusResponseSchema,
} from '@/types/api'
import type { RAGResponse, ErrorResponse, VideosResponse, StatusResponse } from '@/types/api'

function getBackendHeaders(jwt?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-API-Secret': process.env.API_SHARED_SECRET ?? '',
  }
  if (!process.env.API_SHARED_SECRET) {
    console.error('API_SHARED_SECRET not configured')
  }
  if (jwt) headers['Authorization'] = `Bearer ${jwt}`
  return headers
}

export async function sendChatMessage(
  query: string,
  conversationId?: string,
  includeHistory: boolean = true
): Promise<RAGResponse | ErrorResponse> {
  const backendUrl = process.env.BACKEND_URL
  if (!backendUrl) return { error: 'BACKEND_URL not configured', code: 'CONFIG_ERROR' }

  try {
    const supabase = await createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)

    const res = await fetch(`${backendUrl}/api/v1/chat`, {
      method: 'POST',
      headers: getBackendHeaders(session?.access_token),
      body: JSON.stringify({
        query,
        conversation_id: conversationId,
        include_history: includeHistory,
      }),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) return { error: `Backend error: ${res.status}`, code: 'BACKEND_ERROR' }
    const data: unknown = await res.json()
    const parsed = RAGResponseSchema.safeParse(data)
    if (!parsed.success) return { error: 'Invalid response from backend', code: 'PARSE_ERROR' }
    return parsed.data
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { error: '응답 시간이 초과되었습니다 (30초)', code: 'TIMEOUT' }
    }
    return { error: String(err), code: 'NETWORK_ERROR' }
  }
}

export async function getVideos(): Promise<VideosResponse | ErrorResponse> {
  const backendUrl = process.env.BACKEND_URL
  if (!backendUrl) return { error: 'BACKEND_URL not configured', code: 'CONFIG_ERROR' }
  try {
    const res = await fetch(`${backendUrl}/api/v1/videos`, {
      method: 'POST',
      headers: getBackendHeaders(),
      body: JSON.stringify({}),
    })
    if (!res.ok) return { error: `Backend error: ${res.status}`, code: 'BACKEND_ERROR' }
    const data: unknown = await res.json()
    const parsed = VideosResponseSchema.safeParse(data)
    if (!parsed.success) return { error: 'Invalid response from backend', code: 'PARSE_ERROR' }
    return parsed.data
  } catch (err: unknown) {
    return { error: String(err), code: 'NETWORK_ERROR' }
  }
}

export async function getStatus(): Promise<StatusResponse | ErrorResponse> {
  const backendUrl = process.env.BACKEND_URL
  if (!backendUrl) return { error: 'BACKEND_URL not configured', code: 'CONFIG_ERROR' }
  try {
    const res = await fetch(`${backendUrl}/api/v1/status`, {
      method: 'POST',
      headers: getBackendHeaders(),
      body: JSON.stringify({}),
    })
    if (!res.ok) return { error: `Backend error: ${res.status}`, code: 'BACKEND_ERROR' }
    const data: unknown = await res.json()
    const parsed = StatusResponseSchema.safeParse(data)
    if (!parsed.success) return { error: 'Invalid response from backend', code: 'PARSE_ERROR' }
    return parsed.data
  } catch (err: unknown) {
    return { error: String(err), code: 'NETWORK_ERROR' }
  }
}

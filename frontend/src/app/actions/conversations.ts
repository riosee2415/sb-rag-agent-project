'use server'

import { createClient } from '@/lib/supabase/server'
import {
  ConversationItemSchema,
  ConversationListResponseSchema,
  MessagesResponseSchema,
} from '@/types/api'
import type {
  ConversationItem,
  ConversationListResponse,
  MessagesResponse,
  ErrorResponse,
} from '@/types/api'

async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')
  return {
    'Content-Type': 'application/json',
    'X-API-Secret': process.env.API_SHARED_SECRET ?? '',
    Authorization: `Bearer ${session.access_token}`,
  }
}

export async function getConversations(): Promise<ConversationListResponse | ErrorResponse> {
  const backendUrl = process.env.BACKEND_URL
  if (!backendUrl) return { error: 'BACKEND_URL not configured', code: 'CONFIG_ERROR' }
  try {
    const headers = await getAuthHeaders()
    const res = await fetch(`${backendUrl}/api/v1/conversations/list`, {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    })
    if (!res.ok) return { error: `Backend error: ${res.status}`, code: 'BACKEND_ERROR' }
    const data: unknown = await res.json()
    const parsed = ConversationListResponseSchema.safeParse(data)
    if (!parsed.success) return { error: 'Invalid response from backend', code: 'PARSE_ERROR' }
    return parsed.data
  } catch (err: unknown) {
    return { error: String(err), code: 'NETWORK_ERROR' }
  }
}

export async function createConversation(
  title?: string,
  deviceHint?: string
): Promise<ConversationItem | ErrorResponse> {
  const backendUrl = process.env.BACKEND_URL
  if (!backendUrl) return { error: 'BACKEND_URL not configured', code: 'CONFIG_ERROR' }
  try {
    const headers = await getAuthHeaders()
    const res = await fetch(`${backendUrl}/api/v1/conversations`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ title, device_hint: deviceHint }),
    })
    if (!res.ok) return { error: `Backend error: ${res.status}`, code: 'BACKEND_ERROR' }
    const data: unknown = await res.json()
    const parsed = ConversationItemSchema.safeParse(data)
    if (!parsed.success) return { error: 'Invalid response from backend', code: 'PARSE_ERROR' }
    return parsed.data
  } catch (err: unknown) {
    return { error: String(err), code: 'NETWORK_ERROR' }
  }
}

export async function getMessages(
  conversationId: string
): Promise<MessagesResponse | ErrorResponse> {
  const backendUrl = process.env.BACKEND_URL
  if (!backendUrl) return { error: 'BACKEND_URL not configured', code: 'CONFIG_ERROR' }
  try {
    const headers = await getAuthHeaders()
    const res = await fetch(`${backendUrl}/api/v1/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    })
    if (!res.ok) return { error: `Backend error: ${res.status}`, code: 'BACKEND_ERROR' }
    const data: unknown = await res.json()
    const parsed = MessagesResponseSchema.safeParse(data)
    if (!parsed.success) return { error: 'Invalid response from backend', code: 'PARSE_ERROR' }
    return parsed.data
  } catch (err: unknown) {
    return { error: String(err), code: 'NETWORK_ERROR' }
  }
}

export async function deleteConversation(
  conversationId: string
): Promise<{ success: boolean } | ErrorResponse> {
  const backendUrl = process.env.BACKEND_URL
  if (!backendUrl) return { error: 'BACKEND_URL not configured', code: 'CONFIG_ERROR' }
  try {
    const headers = await getAuthHeaders()
    const res = await fetch(`${backendUrl}/api/v1/conversations/${conversationId}`, {
      method: 'DELETE',
      headers,
    })
    if (res.status === 204) return { success: true }
    return { error: `Backend error: ${res.status}`, code: 'BACKEND_ERROR' }
  } catch (err: unknown) {
    return { error: String(err), code: 'NETWORK_ERROR' }
  }
}

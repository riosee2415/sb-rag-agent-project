import { z } from 'zod'

// ── Zod Schemas ──────────────────────────────────────────────────────────────

export const SourceItemSchema = z.object({
  video_title: z.string(),
  timestamp_label: z.string(),
  timestamp_url: z.string(),
  excerpt: z.string(),
})

export const RAGResponseSchema = z.object({
  answer: z.string(),
  sources: z.array(SourceItemSchema),
  confidence: z.number(),
  conversation_id: z.string().optional(),
  cached: z.boolean(),
})

export const VideoItemSchema = z.object({
  video_id: z.string(),
  title: z.string(),
  duration_sec: z.number().nullable(),
  published_at: z.string().nullable(),
  status: z.string(),
})

export const VideosResponseSchema = z.object({
  videos: z.array(VideoItemSchema),
  total: z.number(),
})

export const ConversationItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  device_hint: z.string().nullable(),
  updated_at: z.string(),
})

export const ConversationListResponseSchema = z.object({
  conversations: z.array(ConversationItemSchema),
})

export const MessageItemSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  sources: z.array(SourceItemSchema).nullable().optional(),
  created_at: z.string(),
})

export const MessagesResponseSchema = z.object({
  messages: z.array(MessageItemSchema),
})

export const StatusResponseSchema = z.object({
  total_videos: z.number(),
  done: z.number(),
  pending: z.number(),
  error: z.number(),
  last_updated: z.string().nullable(),
})

// ── TypeScript Types (inferred from Zod) ─────────────────────────────────────

export type SourceItem = z.infer<typeof SourceItemSchema>
export type RAGResponse = z.infer<typeof RAGResponseSchema>
export type VideoItem = z.infer<typeof VideoItemSchema>
export type VideosResponse = z.infer<typeof VideosResponseSchema>
export type ConversationItem = z.infer<typeof ConversationItemSchema>
export type ConversationListResponse = z.infer<typeof ConversationListResponseSchema>
export type MessageItem = z.infer<typeof MessageItemSchema>
export type MessagesResponse = z.infer<typeof MessagesResponseSchema>
export type StatusResponse = z.infer<typeof StatusResponseSchema>

export interface ErrorResponse {
  error: string
  code?: string
}

export type ChatResult = RAGResponse | ErrorResponse

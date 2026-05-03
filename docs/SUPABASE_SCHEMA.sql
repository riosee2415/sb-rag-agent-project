-- =====================================================
-- SV Dev RAG Agent — Supabase Schema
-- Supabase SQL Editor에서 순서대로 실행
-- =====================================================

-- 1. videos 테이블
CREATE TABLE IF NOT EXISTS public.videos (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id     TEXT        UNIQUE NOT NULL,
  title        TEXT        NOT NULL,
  duration_sec INTEGER,
  published_at TIMESTAMPTZ,
  status       TEXT        DEFAULT 'pending'
                           CHECK (status IN ('pending', 'processing', 'done', 'error')),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 2. chunks 테이블 (Pinecone 벡터와 1:1 매핑)
CREATE TABLE IF NOT EXISTS public.chunks (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id    TEXT    NOT NULL REFERENCES public.videos(video_id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  text        TEXT    NOT NULL,
  start_sec   FLOAT,
  end_sec     FLOAT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(video_id, chunk_index)
);

-- 3. conversations 테이블 (로그인 사용자 대화 이력)
CREATE TABLE IF NOT EXISTS public.conversations (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL,
  title       TEXT,
  device_hint TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 4. messages 테이블
CREATE TABLE IF NOT EXISTS public.messages (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID        NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role            TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
  content         TEXT        NOT NULL,
  sources         JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 인덱스
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_conversations_user_id     ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at  ON public.conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id  ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at       ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chunks_video_id           ON public.chunks(video_id);
CREATE INDEX IF NOT EXISTS idx_videos_status             ON public.videos(status);

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================

-- conversations: 본인 데이터만 접근
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations_owner_all" ON public.conversations
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- messages: 본인 conversations의 메시지만 접근
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_owner_all" ON public.messages
  FOR ALL
  USING (
    conversation_id IN (
      SELECT id FROM public.conversations WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM public.conversations WHERE user_id = auth.uid()
    )
  );

-- videos/chunks: 공개 읽기 (서비스 키로만 쓰기)
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "videos_public_read" ON public.videos
  FOR SELECT USING (true);

CREATE POLICY "chunks_public_read" ON public.chunks
  FOR SELECT USING (true);

-- =====================================================
-- updated_at 자동 갱신 트리거
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

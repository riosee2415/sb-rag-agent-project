# 시스템 아키텍처 — v2

## 1. 전체 데이터 흐름

### 1.1 수집 파이프라인

```
[YouTube @sv.developer 채널]
        ↓  YouTube Data API v3 (영상 목록)
        ↓  yt-dlp (오디오 다운로드 .mp3)
[OpenAI Whisper API — verbose_json]
        ↓  단어 단위 타임스탬프 포함 트랜스크립트
[Korean Sentence Chunker (kss + tiktoken)]
        ↓  chunk_size, overlap ← chunk_config.json (RAGAS 자동 최적화 결과)
[청크 배열]  {text, start_sec, end_sec, video_id, title, chunk_index}
        ↓  text-embedding-3-small (1536d)
        ↓
┌─────────────────────────────────────────────────┐
│  Pinecone Serverless (벡터 검색)                 │
│  id: "{video_id}__{chunk_index}"                │
│  metadata: video_id, title, url, start/end_sec  │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│  Supabase Postgres (원본 + 메타데이터)            │
│  videos / chunks / conversations / messages     │
└─────────────────────────────────────────────────┘
```

### 1.2 RetrievalQA 체인 (쿼리 경로)

```
[사용자 질문]
        ↓  POST /api/v1/chat  {query, conversation_id?}
        │  ├─ X-API-Secret 헤더 검증
        │  └─ Supabase JWT 검증 (선택적, 대화 이력 저장 시 필수)

[Redis 캐시 확인]  HIT → 즉시 반환  MISS → 체인 실행

Step 1 — 쿼리 재작성 (GPT-4o-mini)
        ↓  구어체 / 오타 / 모호한 표현 → 검색 최적화 쿼리

Step 2 — Dense Retrieval
        ↓  text-embedding-3-small으로 재작성 쿼리 임베딩
        ↓  Pinecone similarity search (top-10, cosine)

Step 3 — Reranking (Cohere Rerank)
        ↓  top-10 → top-5 (cross-encoder 기반 정교한 관련도 재정렬)

Step 4 — 컨텍스트 조립
        ↓  대화 히스토리 (최근 4턴)
        ↓  리랭킹된 청크 5개
        ↓  시스템 프롬프트 (출처 형식, 답변 룰)

Step 5 — GPT-4o + Function Calling
        ↓  Tools: search_video_content / get_video_info / generate_timestamp_url

[RAGResponse]  {answer, sources[], confidence, conversation_id}
        ↓
[Redis 캐시 저장 — TTL 1시간]
        ↓
[Supabase messages 저장 (로그인 시)]
        ↓
[Next.js — 소스 카드 + 스트리밍 렌더링]
```

---

## 2. 청크 자동 최적화 파이프라인 (RAGAS 루프)

```
[황금 데이터셋 준비]  golden_qa.json (Q&A 20쌍, 수동 작성)
        ↓
[테스트 그리드]
  chunk_sizes = [256, 512, 768, 1024]
  overlaps    = [0, 50, 100, 150]
  → 16개 조합

[각 조합마다]
  1. 샘플 영상 3개 재청킹 + 재임베딩 (임시 Pinecone 네임스페이스)
  2. 황금 Q&A 20개 쿼리 실행
  3. RAGAS 평가
     - Faithfulness         (답변 ↔ 컨텍스트 일관성)
     - AnswerRelevancy       (답변 ↔ 질문 관련도)
     - ContextPrecision      (검색 청크 정확도)
     - ContextRecall         (필요 정보 포함 여부)
  4. 가중 평균 스코어 계산

[최적 조합 선택 → chunk_config.json 저장]
  {
    "chunk_size": 512,
    "overlap": 100,
    "ragas_score": 0.87,
    "evaluated_at": "2026-05-03T..."
  }
```

**실행 명령**: `python backend/scripts/chunk_optimizer.py`  
**소요 시간**: 약 20~40분 (16조합 × 샘플 3영상)  
**결과**: `backend/chunk_config.json` 자동 생성

---

## 3. 디렉토리 구조

### 3.1 백엔드

```
backend/
├── app/
│   ├── core/
│   │   ├── config.py               ← Settings (신규 env vars)        [수정]
│   │   ├── dependencies.py         ← API Secret + JWT 미들웨어        [수정]
│   │   └── scheduler.py            ← APScheduler 자정 크론            [신규]
│   ├── routers/
│   │   ├── chat.py                 ← POST /chat, GET /videos          [신규]
│   │   ├── ingest.py               ← POST /ingest, GET /status        [신규]
│   │   └── conversations.py        ← CRUD /conversations              [신규]
│   ├── services/
│   │   ├── youtube_service.py      ← 채널 크롤링, yt-dlp              [신규]
│   │   ├── transcription_service.py← Whisper STT                      [신규]
│   │   ├── chunking_service.py     ← kss + chunk_config.json 적용    [신규]
│   │   ├── embedding_service.py    ← text-embedding-3-small           [신규]
│   │   ├── pinecone_service.py     ← upsert / query                   [신규]
│   │   ├── rerank_service.py       ← Cohere Rerank top-10→5           [신규]
│   │   ├── rag_service.py          ← RetrievalQA 5단계 체인            [신규]
│   │   └── cache_service.py        ← Redis 쿼리 캐싱                  [신규]
│   ├── workers/
│   │   └── ingestion_worker.py     ← ARQ 비동기 수집 작업             [신규]
│   ├── db/
│   │   ├── client.py               ← Supabase 클라이언트              [기존]
│   │   └── queries/
│   │       ├── videos.py           ← videos / chunks CRUD             [신규]
│   │       └── conversations.py    ← conversations / messages CRUD    [신규]
│   ├── schemas/
│   │   └── api.py                  ← 전체 Pydantic 모델               [수정]
│   └── main.py                     ← 라우터 등록, lifespan            [수정]
├── scripts/
│   ├── cli_test.py                 ← CLI 테스트 도구                  [신규]
│   └── chunk_optimizer.py          ← RAGAS 자동 최적화                [신규]
└── chunk_config.json               ← 최적화 결과 (자동 생성)           [신규]
```

### 3.2 프론트엔드

```
frontend/src/
├── app/
│   ├── layout.tsx                  ← 글로벌 다크 테마 + Supabase Provider [수정]
│   ├── page.tsx                    ← 챗봇 원페이지                    [수정]
│   └── auth/
│       └── callback/route.ts       ← Google OAuth 콜백 처리           [신규]
├── components/
│   ├── auth/
│   │   ├── GoogleLoginButton.tsx   ← Google 로그인 버튼               [신규]
│   │   └── UserMenu.tsx            ← 로그인 후 사용자 메뉴             [신규]
│   ├── chat/
│   │   ├── ChatContainer.tsx       ← 메시지 스크롤 영역               [신규]
│   │   ├── ChatMessage.tsx         ← 사용자/AI 메시지 버블            [신규]
│   │   ├── SourceCard.tsx          ← 출처 카드 (타임스탬프 링크)       [신규]
│   │   ├── ChatInput.tsx           ← 글래스모피즘 입력창              [신규]
│   │   └── TypingIndicator.tsx     ← 3도트 로딩 애니메이션            [신규]
│   ├── sidebar/
│   │   ├── ConversationSidebar.tsx ← 대화 이력 목록 (로그인 시)       [신규]
│   │   └── ConversationItem.tsx    ← 개별 대화 항목                   [신규]
│   └── layout/
│       └── Header.tsx              ← 로고 + 수집 현황 + 로그인 버튼   [신규]
├── lib/
│   └── supabase/
│       ├── client.ts               ← 브라우저 Supabase 클라이언트     [신규]
│       └── server.ts               ← 서버 Supabase 클라이언트        [신규]
├── stores/
│   ├── chatStore.ts                ← 채팅 메시지 상태 (Zustand)       [신규]
│   └── authStore.ts                ← 로그인 상태 (Zustand)            [신규]
├── hooks/
│   ├── useChat.ts                  ← API 호출 + 스트리밍 훅           [신규]
│   └── useConversations.ts         ← 대화 이력 훅                     [신규]
└── types/
    └── api.ts                      ← 전체 타입 정의                   [수정]
```

---

## 4. Supabase 테이블 스키마

```sql
-- 영상 메타데이터
CREATE TABLE videos (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id       TEXT        UNIQUE NOT NULL,
  title          TEXT        NOT NULL,
  channel        TEXT        NOT NULL DEFAULT 'sv.developer',
  duration_sec   INTEGER,
  published_at   TIMESTAMPTZ,
  transcript_raw JSONB,                         -- [{text, start, end}]
  processed_at   TIMESTAMPTZ,
  status         TEXT        DEFAULT 'pending'  -- pending/processing/done/error
);

-- 청크 원본
CREATE TABLE chunks (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id     TEXT    REFERENCES videos(video_id) ON DELETE CASCADE,
  chunk_index  INTEGER NOT NULL,
  text         TEXT    NOT NULL,
  start_sec    FLOAT,
  end_sec      FLOAT,
  pinecone_id  TEXT,
  chunk_size   INTEGER,                         -- 생성 시 사용된 chunk_size
  overlap      INTEGER,                         -- 생성 시 사용된 overlap
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 대화 세션
CREATE TABLE conversations (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID    REFERENCES auth.users(id) ON DELETE CASCADE,
  title        TEXT    DEFAULT '새 대화',
  device_hint  TEXT,                            -- user-agent 기반 디바이스 식별
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 메시지
CREATE TABLE messages (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID    REFERENCES conversations(id) ON DELETE CASCADE,
  role            TEXT    NOT NULL CHECK (role IN ('user', 'assistant')),
  content         TEXT    NOT NULL,
  sources         JSONB,                        -- RAGResponse.sources[]
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 정책 (Row Level Security)
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users own conversations"
  ON conversations FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users own messages"
  ON messages FOR ALL
  USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = auth.uid()
    )
  );
```

---

## 5. Pinecone 벡터 레코드 스키마

```json
{
  "id": "{video_id}__{chunk_index}",
  "values": [0.023, -0.187, "...1536차원"],
  "metadata": {
    "video_id":    "dQw4w9WgXcQ",
    "title":       "하네스 세팅하기",
    "channel":     "sv.developer",
    "start_sec":   792,
    "end_sec":     855,
    "youtube_url": "https://youtu.be/dQw4w9WgXcQ?t=792",
    "text":        "하네스는 CI/CD 자동화 도구로..."
  }
}
```

---

## 6. API 스키마 (Pydantic / TypeScript 공유)

```python
# backend/app/schemas/api.py

class ChatRequest(BaseModel):
    query: str
    conversation_id: UUID | None = None
    include_history: bool = True

class SourceItem(BaseModel):
    video_title: str
    timestamp_label: str          # "13분 12초"
    timestamp_url: str            # "https://youtu.be/...?t=792"
    excerpt: str

class RAGResponse(BaseModel):
    answer: str
    sources: list[SourceItem]
    confidence: float
    conversation_id: UUID | None
    cached: bool = False

class VideoItem(BaseModel):
    video_id: str
    title: str
    duration_sec: int | None
    published_at: datetime | None
    status: str

class ConversationItem(BaseModel):
    id: UUID
    title: str
    device_hint: str | None
    updated_at: datetime

class MessageItem(BaseModel):
    id: UUID
    role: str
    content: str
    sources: list[SourceItem] | None
    created_at: datetime
```

---

## 7. Function Calling 도구

| 도구명 | 입력 | 반환 |
|--------|------|------|
| `search_video_content` | `query: str`, `top_k: int = 10` | 청크 목록 (Pinecone → Cohere Rerank) |
| `get_video_info` | `video_id: str` | 영상 메타데이터 |
| `generate_timestamp_url` | `video_id: str`, `seconds: float` | `https://youtu.be/{id}?t={int(s)}` |

---

## 8. 인증 이중 구조

```
┌─────────────────────────────────────────────────────┐
│  Layer 1: X-API-Secret 헤더                         │
│  모든 /api/v1/* 엔드포인트에 적용                    │
│  FE 서버 액션에서만 삽입 (클라이언트 노출 금지)       │
└─────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────┐
│  Layer 2: Supabase JWT (Bearer)                     │
│  /conversations/* 엔드포인트 — 로그인 필수           │
│  /chat — 선택적 (비로그인도 사용 가능, 이력 미저장)  │
└─────────────────────────────────────────────────────┘
```

---

## 9. 배포 구조

| 컴포넌트 | 플랫폼 | Git 브랜치 |
|----------|--------|-----------|
| Frontend | Vercel (HTTPS) | `web` |
| Backend | AWS EC2 (HTTP, IP 직접) | `ai` |
| Redis | Upstash Serverless | — |
| Pinecone | 클라우드 Serverless | — |
| Supabase | 클라우드 (Auth + DB) | — |

---

## 10. HTTPS/HTTP 혼합 통신 — Mixed Content 해결 패턴

### 문제
Vercel은 HTTPS 강제. AWS EC2는 IP 직접 통신(HTTP). 브라우저는 HTTPS 페이지에서 HTTP 요청을 차단(Mixed Content Error).

### 해결: Next.js Server Action 프록시

```
❌  Browser → http://EC2-IP:8000/api  (Mixed Content, 차단)

✅  Browser (HTTPS)
       ↓  Next.js Server Action (Vercel)
    Vercel Server → http://EC2-IP:8000/api  (서버 간 통신, 허용)
       ↓
    Browser (결과 반환)
```

### 구현 패턴

```typescript
// frontend/src/app/actions/chat.ts
'use server'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'

export async function sendChatMessage(query: string, conversationId?: string) {
  // BACKEND_URL은 서버 env만 — NEXT_PUBLIC_ 금지
  const backendUrl = process.env.BACKEND_URL
  if (!backendUrl) throw new Error('BACKEND_URL not configured')

  // Supabase 세션에서 JWT 추출 (로그인 시)
  const supabase = createServerClient(cookies())
  const { data: { session } } = await supabase.auth.getSession()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-API-Secret': process.env.API_SHARED_SECRET!,
  }
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }

  const res = await fetch(`${backendUrl}/api/v1/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, conversation_id: conversationId }),
  })

  if (!res.ok) throw new Error(`Backend error: ${res.status}`)
  return res.json()
}
```

### EC2 CORS 설정

```python
# backend/app/main.py
# CORS_ORIGINS env = "https://your-app.vercel.app"
# 서버 간 통신이므로 CORS가 직접 차단하지는 않지만
# 브라우저 preflight 요청에 대비해 설정 필수

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,   # env에서 Vercel URL 로드
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### EC2 서버 실행 요건

```bash
# 1. 0.0.0.0 바인딩 (외부 접속 필수)
uvicorn app.main:app --host 0.0.0.0 --port 8000

# 2. EC2 보안 그룹: 포트 8000 인바운드 오픈
# 3. PM2로 프로세스 유지
pm2 start "uvicorn app.main:app --host 0.0.0.0 --port 8000" --name sv-rag-be
```

<div align="center">

```
 ███████╗██╗   ██╗    ██████╗ ███████╗██╗   ██╗    ██████╗  █████╗  ██████╗
 ██╔════╝██║   ██║    ██╔══██╗██╔════╝██║   ██║    ██╔══██╗██╔══██╗██╔════╝
 ███████╗██║   ██║    ██║  ██║█████╗  ██║   ██║    ██████╔╝███████║██║  ███╗
 ╚════██║╚██╗ ██╔╝    ██║  ██║██╔══╝  ╚██╗ ██╔╝    ██╔══██╗██╔══██║██║   ██║
 ███████║ ╚████╔╝     ██████╔╝███████╗ ╚████╔╝     ██║  ██║██║  ██║╚██████╔╝
 ╚══════╝  ╚═══╝      ╚═════╝ ╚══════╝  ╚═══╝      ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝
                                                                   A G E N T
```

### **@sv.developer 유튜브 채널의 모든 지식을 AI가 출처와 함께 답변합니다**

<br/>

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org/)

[![Supabase](https://img.shields.io/badge/Supabase-Auth+DB-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Pinecone](https://img.shields.io/badge/Pinecone-Vector_DB-70B5F9?style=for-the-badge&logo=pinecone&logoColor=black)](https://pinecone.io/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com/)
[![Redis](https://img.shields.io/badge/Redis-Cache-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)

[![Vercel](https://img.shields.io/badge/FE-Vercel-black?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)
[![AWS EC2](https://img.shields.io/badge/BE-AWS_EC2-FF9900?style=for-the-badge&logo=amazon-aws&logoColor=white)](https://aws.amazon.com/ec2/)
[![License](https://img.shields.io/badge/License-MIT-purple?style=for-the-badge)](./LICENSE)

<br/>

> ✨ **"하네스가 뭐지?"** → *"XXXXX 영상 13분 12초에서, 하네스는 CI/CD 자동화 도구로..."*
>
> 출처(영상 제목 + 타임스탬프)가 명확한 고품질 RAG 답변 · 로그인 기반 멀티디바이스 대화 이력

</div>

---

## 📌 목차

- [✨ 주요 기능](#-주요-기능)
- [🏗 시스템 아키텍처](#-시스템-아키텍처)
- [🔬 RAG 파이프라인](#-rag-파이프라인)
- [🎨 UI 디자인](#-ui-디자인)
- [🛠 기술 스택](#-기술-스택)
- [📁 프로젝트 구조](#-프로젝트-구조)
- [⚙️ 환경 설정](#️-환경-설정)
- [🚀 로컬 실행](#-로컬-실행)
- [🧪 테스트](#-테스트)
- [☁️ 배포](#️-배포)
- [📊 API 명세](#-api-명세)

---

## ✨ 주요 기능

<table>
<tr>
<td width="50%">

### 🤖 AI 기반 RAG 답변
- **GPT-4o** 기반 5단계 RetrievalQA 체인
- 쿼리 자동 재작성 → Dense Retrieval → **Cohere Rerank** → 답변 생성
- **출처 인용**: 영상 제목 + 분:초 + YouTube 타임스탬프 URL
- 응답 캐싱 (Redis TTL 1시간, 캐시 히트 시 **500ms** 이내)

</td>
<td width="50%">

### 📡 자동 데이터 수집 파이프라인
- **YouTube Data API v3** 채널 전체 영상 자동 수집
- **OpenAI Whisper** STT + 단어 단위 타임스탬프 추출
- **kss** 한국어 문장 경계 인식 청킹
- 매일 자정(KST) **APScheduler** 자동 신규 영상 수집

</td>
</tr>
<tr>
<td width="50%">

### 🔬 RAGAS 청크 자동 최적화
- chunk_size × overlap **16개 조합** 자동 그리드 서치
- **Faithfulness / AnswerRelevancy / ContextPrecision / ContextRecall** 4개 지표 자동 측정
- 최적 파라미터 자동 선정 → `chunk_config.json` 기록
- 목표: **Faithfulness ≥ 0.85**

</td>
<td width="50%">

### 🔐 인증 & 대화 이력
- **Supabase Auth Google OAuth** 1클릭 로그인
- 모든 디바이스에서 대화 이력 **실시간 동기화**
- 비로그인 상태에서도 로컬 세션 채팅 가능
- **X-API-Secret + Supabase JWT** 이중 인증 구조

</td>
</tr>
</table>

---

## 🏗 시스템 아키텍처

```
┌──────────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                              │
│   Next.js 15 + TypeScript · Framer Motion · Glassmorphism UI        │
│   Vercel (HTTPS) ────────────────────────────────────────────────── │
│         │  Server Action (프록시)  ← Mixed Content 해결              │
└─────────┼────────────────────────────────────────────────────────────┘
          │ HTTP (서버 간 통신)
          ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    BACKEND (AWS EC2)                                  │
│   FastAPI · Python 3.11 · Pydantic v2 · ARQ Workers · Loguru        │
│                                                                      │
│   ┌──────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │
│   │  /chat   │  │  /ingest     │  │ /conversations│  │  /videos  │  │
│   │  POST    │  │  POST        │  │  CRUD         │  │  GET      │  │
│   └────┬─────┘  └──────┬───────┘  └──────────────┘  └───────────┘  │
│        │               │                                             │
│   ┌────▼───────────────▼─────────────────────────────────────────┐  │
│   │                  Service Layer                               │  │
│   │  rag_service · youtube_service · transcription_service       │  │
│   │  chunking_service · embedding_service · pinecone_service     │  │
│   │  rerank_service · cache_service                              │  │
│   └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────-─┘
          │               │               │               │
          ▼               ▼               ▼               ▼
   ┌─────────────┐ ┌───────────┐ ┌──────────────┐ ┌───────────────┐
   │  Pinecone   │ │  Redis    │ │  Supabase    │ │  OpenAI API   │
   │  Serverless │ │  Upstash  │ │  Postgres    │ │  GPT-4o       │
   │  1536d Vec  │ │  TTL 1hr  │ │  + Auth +RLS │ │  Whisper      │
   └─────────────┘ └───────────┘ └──────────────┘ └───────────────┘
```

---

## 🔬 RAG 파이프라인

### 데이터 수집 흐름

```
YouTube @sv.developer 채널
         │
         │  YouTube Data API v3 (영상 목록)
         │  yt-dlp (오디오 .mp3 추출)
         ▼
OpenAI Whisper API (verbose_json)
         │  단어 단위 타임스탬프 포함 트랜스크립트
         ▼
Korean Sentence Chunker (kss + tiktoken)
         │  chunk_size & overlap ← chunk_config.json (RAGAS 최적화 결과)
         ▼
text-embedding-3-small (1536차원)
         │
    ┌────┴────┐
    ▼         ▼
Pinecone    Supabase
(벡터 검색)  (원본 메타데이터)
```

### 쿼리 처리 체인 (5단계)

| 단계 | 처리 | 모델/도구 |
|:----:|------|---------|
| **Step 1** | 쿼리 재작성 — 구어체·오타·모호 표현 최적화 | GPT-4o-mini |
| **Step 2** | Dense Retrieval — 코사인 유사도 top-10 검색 | Pinecone + text-embedding-3-small |
| **Step 3** | Reranking — top-10 → top-5 교차 인코더 재정렬 | Cohere Rerank |
| **Step 4** | 컨텍스트 조립 — 대화 히스토리(4턴) + 청크 5개 | — |
| **Step 5** | 구조화 답변 생성 — Function Calling으로 타임스탬프 URL 생성 | GPT-4o |

### RAGAS 청크 최적화

```
황금 데이터셋 (Golden Q&A 20개)
         │
         ▼
chunk_sizes = [256, 512, 768, 1024]
overlaps    = [  0,  50, 100,  150]
         → 16개 조합 자동 그리드 서치
         │
         ▼
각 조합: 샘플 영상 3개 재청킹 + 재임베딩 → 20개 쿼리 실행
         │
         ▼
RAGAS 평가 (Faithfulness · AnswerRelevancy · ContextPrecision · ContextRecall)
         │
         ▼
최적 조합 → chunk_config.json 자동 저장
```

```bash
# 실행 (소요 시간: 약 20~40분)
python backend/scripts/chunk_optimizer.py
```

---

## 🎨 UI 디자인

> **테마**: Deep Space Purple — `#07070F` 베이스 · 보라 에너지
>
> **핵심 기법**: Glassmorphism + Gradient Border + Noise Texture + Aurora Mesh + Spring Physics

### 색상 팔레트

```
Background    ████ #07070F   Surface  ████ #0D0D1A   Elevated  ████ #13132A
Purple 600    ████ #7C3AED   Purple 400 ████ #A78BFA   Purple 300 ████ #C084FC
Text Primary  ████ #EDE9FE   Muted    ████ #6B7280   Success    ████ #10B981
```

### 반응형 레이아웃

| 구간 | 사이드바 | 채팅 너비 | 소스 카드 |
|:----:|---------|----------|:-------:|
| `< 640px` 모바일 | Bottom Sheet | 100% | 1열 |
| `640~1024px` 태블릿 | 숨김 + 헤더 버튼 | 640px | 2열 |
| `> 1024px` 데스크탑 | 고정 w-64 | 720px | 2열 |

---

## 🛠 기술 스택

<table>
<tr>
<th>레이어</th>
<th>라이브러리 / 서비스</th>
<th>역할</th>
</tr>
<tr>
<td><b>Frontend</b></td>
<td>

`Next.js 15` `TypeScript strict` `Tailwind CSS v4`  
`Framer Motion` `Zustand` `shadcn/ui`  
`Supabase Auth Client`

</td>
<td>채팅 UI · 인증 · 상태 관리</td>
</tr>
<tr>
<td><b>Backend</b></td>
<td>

`FastAPI` `Python 3.11` `Pydantic v2`  
`supabase-py` `python-jose` `slowapi`  
`ARQ` `Loguru` `Sentry`

</td>
<td>API 서버 · 인증 · 비동기 작업</td>
</tr>
<tr>
<td><b>AI / ML</b></td>
<td>

`OpenAI GPT-4o` `Whisper API` `text-embedding-3-small`  
`Cohere Rerank` `kss` `tiktoken` `RAGAS`

</td>
<td>STT · 임베딩 · RAG 체인</td>
</tr>
<tr>
<td><b>Database</b></td>
<td>

`Supabase Postgres` `Supabase Auth` `Pinecone Serverless`  
`Redis (Upstash)`

</td>
<td>관계형 DB · 벡터 DB · 캐시</td>
</tr>
<tr>
<td><b>DevOps</b></td>
<td>

`Vercel` (FE) · `AWS EC2` (BE)  
`Ruff` · `mypy --strict` · `pytest` · `vitest`  
`ESLint` · `tsc --noEmit`

</td>
<td>배포 · 코드 품질 · 테스트</td>
</tr>
</table>

---

## 📁 프로젝트 구조

```
sb-rag-agent-project/
├── 📂 frontend/                    # Next.js 15 (branch: web)
│   └── src/
│       ├── app/
│       │   ├── layout.tsx          # 다크 테마 + Aurora + Noise
│       │   ├── page.tsx            # 챗봇 원페이지
│       │   └── auth/callback/      # Google OAuth 콜백
│       ├── components/
│       │   ├── chat/               # ChatMessage · SourceCard · ChatInput · TypingIndicator
│       │   ├── sidebar/            # ConversationSidebar · ConversationItem
│       │   ├── auth/               # GoogleLoginButton · UserMenu
│       │   └── layout/             # Header
│       ├── lib/supabase/           # 클라이언트 / 서버 Supabase 인스턴스
│       ├── stores/                 # Zustand — chatStore · authStore
│       ├── hooks/                  # useChat · useConversations
│       └── types/api.ts            # 공유 타입 (BE Pydantic과 동기화)
│
├── 📂 backend/                     # FastAPI (branch: ai)
│   └── app/
│       ├── core/                   # config · security · dependencies · scheduler
│       ├── routers/                # chat · ingest · conversations
│       ├── services/               # rag · youtube · transcription · chunking
│       │                           # embedding · pinecone · rerank · cache
│       ├── workers/                # ARQ 비동기 수집 작업
│       ├── db/                     # Supabase 클라이언트 + 쿼리 헬퍼
│       └── schemas/api.py          # Pydantic 모델 (FE 타입과 동기화)
│
├── 📂 docs/                        # 기획 문서
│   ├── PRD.md                      # 요구사항 정의서
│   ├── ARCHITECTURE.md             # 시스템 아키텍처
│   ├── UI_GUIDE.md                 # UI 컴포넌트 명세 (v3)
│   ├── ADR.md                      # 아키텍처 결정 기록
│   └── SUPABASE_SCHEMA.sql         # DB 스키마
│
├── 📂 scripts/                     # 유틸리티 스크립트
└── CLAUDE.md                       # AI 에이전트 오케스트레이션 규칙
```

---

## ⚙️ 환경 설정

### Backend — `backend/.env`

| 변수명 | 용도 | 획득처 |
|--------|------|--------|
| `OPENAI_API_KEY` | Whisper STT · 임베딩 · GPT-4o | [platform.openai.com](https://platform.openai.com) |
| `PINECONE_API_KEY` | 벡터 DB | [app.pinecone.io](https://app.pinecone.io) |
| `PINECONE_INDEX_NAME` | Pinecone 인덱스명 | Pinecone 콘솔에서 직접 생성 |
| `YOUTUBE_API_KEY` | 채널 영상 목록 수집 | [console.cloud.google.com](https://console.cloud.google.com) |
| `COHERE_API_KEY` | Rerank API | [dashboard.cohere.com](https://dashboard.cohere.com) |
| `SUPABASE_URL` | Supabase 프로젝트 URL | Supabase 대시보드 |
| `SUPABASE_SERVICE_KEY` | 서비스 롤 키 | Supabase 대시보드 |
| `SUPABASE_JWT_SECRET` | JWT 검증 | Supabase 대시보드 |
| `REDIS_URL` | 응답 캐싱 | Upstash or Railway |
| `API_SHARED_SECRET` | FE↔BE 인증 키 | 직접 생성 (랜덤 문자열) |

### Frontend — `frontend/.env.local`

| 변수명 | 용도 | 노출 여부 |
|--------|------|:--------:|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Auth 클라이언트 | 공개 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 공개 키 | 공개 |
| `BACKEND_URL` | EC2 백엔드 HTTP URL | **서버 전용** |
| `API_SHARED_SECRET` | Server Action → BE 인증 키 | **서버 전용** |

> ⚠️ `BACKEND_URL`과 `API_SHARED_SECRET`은 절대 `NEXT_PUBLIC_` 접두사를 붙이지 마세요.

---

## 🚀 로컬 실행

### 사전 요구사항

```
Node.js 20+   Python 3.11+   Redis (로컬 또는 Upstash)
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # 환경변수 입력
npm run dev                         # http://localhost:3000
```

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate           # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                # 환경변수 입력
uvicorn app.main:app --reload       # http://localhost:8000
```

### 데이터 수집 (최초 1회)

```bash
# 1. RAGAS 청크 최적화 (20~40분 소요)
python backend/scripts/chunk_optimizer.py

# 2. 채널 전체 영상 수집 트리거
curl -X POST http://localhost:8000/api/v1/ingest \
     -H "X-API-Secret: $API_SHARED_SECRET"

# 3. 수집 현황 확인
curl http://localhost:8000/api/v1/status \
     -H "X-API-Secret: $API_SHARED_SECRET"
```

---

## 🧪 테스트

### CI Gate (순서 보장)

```
Gate 1 — Lint         eslint --max-warnings 0  │  ruff check
Gate 2 — Type Check   tsc --noEmit             │  mypy --strict
Gate 3 — Unit Tests   vitest run               │  pytest --tb=short
Gate 4 — Build        next build               │  —
```

### 커맨드

```bash
# Frontend
cd frontend
npm run lint          # ESLint
npm run type-check    # tsc --noEmit
npm run test          # vitest run

# Backend
cd backend
ruff check app tests                                              # Lint
mypy app --strict                                                 # Type check
pytest --tb=short --cov=app --cov-report=term-missing \
       --cov-fail-under=80                                        # Tests
```

---

## ☁️ 배포

```
┌─────────────────────────────────────────────────────┐
│  Frontend  →  Vercel (HTTPS)   branch: web           │
│  Backend   →  AWS EC2 (HTTP)   branch: ai            │
│                                                     │
│  Redis     →  Upstash Serverless                    │
│  Pinecone  →  Pinecone Serverless Cloud             │
│  Supabase  →  Supabase Cloud (Auth + DB)            │
└─────────────────────────────────────────────────────┘
```

### Mixed Content 해결 — Next.js Server Action 프록시

브라우저(HTTPS) → Vercel Server Action → EC2(HTTP)
직접 브라우저에서 HTTP 백엔드를 호출하지 않아 Mixed Content 오류를 방지합니다.

### EC2 실행

```bash
# PM2로 프로세스 유지
pm2 start "uvicorn app.main:app --host 0.0.0.0 --port 8000" --name sv-rag-be

# EC2 보안 그룹: 포트 8000 인바운드 오픈 필수
```

---

## 📊 API 명세

| 메서드 | 경로 | 기능 | 인증 |
|:------:|------|------|:----:|
| `POST` | `/api/v1/chat` | RAG 채팅 쿼리 | 선택적 JWT |
| `GET` | `/api/v1/videos` | 수집된 영상 목록 | API Secret |
| `POST` | `/api/v1/ingest` | 수동 수집 트리거 | API Secret |
| `GET` | `/api/v1/status` | 수집 현황 | API Secret |
| `GET` | `/api/v1/conversations` | 대화 목록 | JWT 필수 |
| `POST` | `/api/v1/conversations` | 대화 생성 | JWT 필수 |
| `GET` | `/api/v1/conversations/{id}/messages` | 메시지 목록 | JWT 필수 |
| `DELETE` | `/api/v1/conversations/{id}` | 대화 삭제 | JWT 필수 |

### 채팅 요청/응답 스키마

```typescript
// POST /api/v1/chat
interface ChatRequest {
  query: string;
  conversation_id?: string;
  include_history?: boolean;   // default: true
}

interface RAGResponse {
  answer: string;
  sources: {
    video_title: string;
    timestamp_label: string;   // "13분 12초"
    timestamp_url: string;     // "https://youtu.be/...?t=792"
    excerpt: string;
  }[];
  confidence: number;
  conversation_id: string | null;
  cached: boolean;
}
```

---

<div align="center">

**Built with ♥ by [shyoon](https://github.com/riosee2415)**

*Powered by GPT-4o · Pinecone · Supabase · Vercel*

</div>

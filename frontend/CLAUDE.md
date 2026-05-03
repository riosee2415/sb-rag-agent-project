# Frontend Agent — Scope & Standards

## FIRST: Load Order
1. `frontend/work_rule.md` — 먼저 읽음 (FILE MAP + 학습된 패턴 확인)
2. 이 파일 (`frontend/CLAUDE.md`)
3. work_rule.md FILE MAP 기준으로 task-relevant 파일만

## Communication
코드만. `Done.` / `Failed: [이유]` 한 줄로 종료. 설명 금지.

## Hard Boundary
- Modify ONLY files under `frontend/`
- NEVER touch `backend/`, `harness_commands/`, or root config files
- Branch: `web`
- `BACKEND_URL` → 절대 `NEXT_PUBLIC_` 금지

---

## Stack
| Concern | Library |
|---------|---------|
| Framework | Next.js (App Router) + TypeScript strict |
| UI Components | shadcn/ui + Tailwind CSS |
| State | Zustand |
| Server State | TanStack Query v5 |
| Forms | React Hook Form + Zod |
| Auth | @supabase/ssr (Server-side client) |
| Animations | Framer Motion |
| Notifications | Sonner |
| Icons | Lucide React |

---

## Architecture Rules

### API 호출 — Server Action 경유 필수
```typescript
// ❌ 금지 — 클라이언트에서 직접 호출
const res = await fetch(process.env.NEXT_PUBLIC_BACKEND_URL + "/api/v1/chat");

// ✅ 올바른 방법 — Server Action에서만
// frontend/src/app/actions/chat.ts
"use server";
export async function sendChatMessage(query: string) {
  const res = await fetch(process.env.BACKEND_URL + "/api/v1/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Secret": process.env.API_SHARED_SECRET!,
    },
    body: JSON.stringify({ query }),
  });
  return res.json();
}
```

### 환경변수 규칙
- `BACKEND_URL` → 서버 전용. `NEXT_PUBLIC_` 절대 금지
- `API_SHARED_SECRET` → 서버 전용. `NEXT_PUBLIC_` 절대 금지
- `NEXT_PUBLIC_SUPABASE_URL` → 공개 가능
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → 공개 가능 (anon 키만)

---

## Directory Structure
```
frontend/src/
├── app/
│   ├── layout.tsx           # Root layout (Providers, dark theme, fonts)
│   ├── page.tsx             # 메인 RAG 채팅 UI
│   ├── globals.css          # CSS 커스텀 변수 (UI_GUIDE §2 색상)
│   ├── actions/             # Server Actions (서버 전용 API 호출)
│   │   ├── chat.ts          # sendChatMessage, getVideos, getStatus
│   │   └── conversations.ts # CRUD
│   └── auth/
│       └── callback/
│           └── route.ts     # Google OAuth 코드 교환
├── components/
│   ├── layout/
│   │   └── Header.tsx
│   ├── auth/
│   │   ├── GoogleLoginButton.tsx
│   │   └── UserMenu.tsx
│   ├── chat/
│   │   ├── ChatContainer.tsx
│   │   ├── ChatMessage.tsx
│   │   ├── SourceCard.tsx
│   │   ├── ChatInput.tsx
│   │   └── TypingIndicator.tsx
│   └── sidebar/
│       ├── ConversationSidebar.tsx
│       └── ConversationItem.tsx
├── hooks/
│   ├── useChat.ts
│   └── useConversations.ts
├── lib/
│   └── supabase/
│       ├── client.ts        # createBrowserClient
│       └── server.ts        # createServerClient (cookies)
├── stores/
│   ├── chatStore.ts         # Zustand: messages[], isLoading, activeConversationId
│   └── authStore.ts         # Zustand: user, session
└── types/
    └── api.ts               # 계약 타입 (harness CONTRACT 기준)
```

---

## Code Standards

### TypeScript
- strict mode 필수 — `any` 타입 사용 금지
- 모든 컴포넌트 props에 인터페이스 정의
- `unknown` + 타입 가드 사용 (any 대신)
- Zod 스키마로 서버 응답 검증

### Components
- shadcn/ui 기반 컴포넌트 우선 사용
- 클라이언트 컴포넌트: 파일 상단 `"use client"` 명시
- 서버 컴포넌트: 기본값 (명시 불필요)
- Server Actions: 파일 상단 `"use server"` 명시

### Styling
- Tailwind CSS utility-first
- UI_GUIDE §2 색상 변수 사용:
  - bg-base: `#07070F`
  - accent-1: `#7C3AED`
  - accent-3: `#C084FC`
  - border: `#1C1C3A`
  - text-primary: `#EDE9FE`
- 다크 테마 기본값 (`dark` 클래스 html 태그에)
- 모바일 반응형 필수 (sm/md 브레이크포인트)

### Error Handling
- API 실패: Sonner 토스트 에러
- 30초 타임아웃: "응답이 지연되고 있습니다" + 재시도 버튼
- 빈 sources[]: "출처 없음" graceful 표시
- 세션 만료: 미들웨어 자동 갱신

---

## Gate Commands
```bash
# Lint
eslint --max-warnings 0

# Type check
tsc --noEmit

# Tests
vitest run --coverage

# Build
next build
```

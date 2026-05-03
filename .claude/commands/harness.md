# /harness — SV Dev RAG Agent 풀스택 오케스트레이터

**완전 자율 실행. 명확한 질문 없음. 모든 결정 자율.**

## 실행 형태

```
/harness              → docs/ 기획 전체 기준으로 프로젝트 전체 구현
/harness <기능명>     → 특정 기능만 구현 (기획 컨텍스트는 동일하게 로드)
```

---

## Pre-Flight — 컨텍스트 로딩 (실행 전 필수)

실행 시작 즉시 아래 파일들을 **모두** 읽는다. 순서 중요.

```
1. work_rule.md             (토큰 최적화 룰)
2. CLAUDE.md                (루트 오케스트레이션 룰)
3. docs/PRD.md              (기능 요구사항 전체)
4. docs/ARCHITECTURE.md     (시스템 아키텍처)
5. docs/ADR.md              (아키텍처 결정 기록)
6. docs/UI_GUIDE.md         (UI 컴포넌트 명세)
7. docs/NEED_ENV.md         (환경변수 + HTTPS/HTTP 주의사항)
8. frontend/CLAUDE.md       (프론트엔드 룰)
9. backend/CLAUDE.md        (백엔드 룰)
```

읽은 후 구현 범위를 내부적으로 결정한다. 출력 없음.

---

## Phase 0 — 선결 조건 검사

### 0.1 chunk_config.json 체크

```
backend/chunk_config.json 존재?
  YES → Phase 1로 진행
  NO  → 사용자에게 알림:
        "chunk_config.json이 없습니다.
         RAGAS 청크 최적화를 먼저 실행하세요:
         cd backend && python scripts/chunk_optimizer.py
         완료 후 /harness를 다시 실행하세요."
        → 중단
```

chunk_optimizer.py가 없으면 Phase 1에서 BE 에이전트가 먼저 생성.
그 후 사용자가 실행할 수 있도록 안내.

### 0.2 배포 환경 주의사항 내부 확정

아래 사항을 구현 내내 준수:

- FE는 Vercel HTTPS, BE는 AWS EC2 HTTP
- 모든 FE API 호출은 Server Action 경유 (클라이언트 직접 HTTP 호출 금지)
- `BACKEND_URL`은 절대 `NEXT_PUBLIC_` 금지
- BE `CORS_ORIGINS`에는 Vercel HTTPS URL

### 0.3 불변 API 정책 선언 (구현 전 내부 확정)

아래 정책은 이 세션의 **모든 에이전트**에게 예외 없이 적용된다.
위반 시 해당 에이전트 출력은 즉시 거부하고 재실행.

- **GET 엔드포인트 금지**: 모든 조회 포함 POST 사용. GET은 body를 지원하지 않으므로
  X-API-Secret을 안전하게 전달할 수 없다.
- **verify_api_secret() 선행 필수**: 모든 엔드포인트(JWT 엔드포인트 포함)에서
  X-API-Secret 검증이 JWT 검증보다 먼저 실행되어야 한다. 누락 시 즉시 403.
- **docs/API.md 업데이트 의무**: BE 라우터를 신규 생성하거나 수정할 때마다
  docs/API.md를 동시에 업데이트한다. 완료 보고서에 업데이트 여부 명시 필수.

---

## Phase 1 — API 계약 정의

두 에이전트에게 주입할 계약을 먼저 확정한다.

```
CONTRACT v1
===========
Base URL (BE):  http://{EC2_IP}:{PORT}  (서버 액션에서만 접근)
Prefix:         /api/v1/

Endpoints:
  POST /api/v1/chat
    Request:  { query: str, conversation_id?: UUID, include_history?: bool }
    Response: { answer: str, sources: SourceItem[], confidence: float,
                conversation_id?: UUID, cached: bool }
    Auth: X-API-Secret (필수) + Authorization Bearer (선택, 이력 저장 시)

  POST /api/v1/videos
    Request:  {} (body 불필요)
    Response: { videos: VideoItem[], total: int }
    Auth: X-API-Secret (필수)

  POST /api/v1/ingest
    Response: { job_id: str, status: str }
    Auth: X-API-Secret (필수)

  POST /api/v1/status
    Request:  {} (body 불필요)
    Response: { total_videos: int, done: int, pending: int, error: int,
                last_updated: datetime }
    Auth: X-API-Secret (필수)

  POST /api/v1/conversations/list
    Request:  {} (body 불필요)
    Response: { conversations: ConversationItem[] }
    Auth: X-API-Secret (필수) + JWT (필수)

  POST /api/v1/conversations
    Request:  { title?: str, device_hint?: str }
    Response: ConversationItem
    Auth: X-API-Secret (필수) + JWT (필수)

  POST /api/v1/conversations/{id}/messages
    Request:  {} (body 불필요)
    Response: { messages: MessageItem[] }
    Auth: X-API-Secret (필수) + JWT (필수)

  DELETE /api/v1/conversations/{id}
    Response: 204 No Content
    Auth: X-API-Secret (필수) + JWT (필수)

Shared Types:
  SourceItem { video_title, timestamp_label, timestamp_url, excerpt }
  VideoItem  { video_id, title, duration_sec, published_at, status }
  ConversationItem { id, title, device_hint, updated_at }
  MessageItem { id, role, content, sources?, created_at }
```

이 계약을 Phase 2 두 에이전트 모두에게 그대로 주입.

---

## Phase 2 — 병렬 구현

**단일 Agent 호출에서 두 서브에이전트를 동시에 실행.**

### 2.1 Backend Sub-Agent

```
subagent_type: "general-purpose"
isolation: "worktree"
prompt: |
  === 절대 규칙 ===
  - 오직 backend/ 아래 파일만 작성/수정
  - 설명 없이 코드만. 마지막에 "Done." 또는 "Failed: [이유]"
  - GET 엔드포인트 생성 금지 — 모든 데이터 조회 포함 POST 사용
  - 모든 라우터 함수 첫 번째 Depends: verify_api_secret (JWT 엔드포인트도 예외 없음)

  === 읽어야 할 파일 ===
  1. backend/CLAUDE.md
  2. backend/work_rule.md
  3. docs/ARCHITECTURE.md (섹션 1~7)
  4. docs/ADR.md

  === 구현 목록 (우선순위 순) ===

  [1] 환경변수 & 설정
    - backend/app/core/config.py: OPENAI_API_KEY, PINECONE_API_KEY,
      PINECONE_INDEX_NAME, YOUTUBE_API_KEY, COHERE_API_KEY,
      API_SHARED_SECRET, SUPABASE_URL, SUPABASE_SERVICE_KEY,
      SUPABASE_JWT_SECRET, REDIS_URL, ENVIRONMENT, CORS_ORIGINS, HOST, PORT
    - 없는 변수: Optional로 선언, 없으면 경고 로그 + 기능 skip (crash 금지)
    - backend/.env.example 최신화

  [2] 인증 미들웨어 (backend/app/core/dependencies.py)
    - verify_api_secret(): X-API-Secret 헤더 검증 → 불일치/누락 403
      FastAPI Depends()로 선언. 모든 라우터에 첫 번째 의존성으로 주입.
      적용 방식: router = APIRouter(dependencies=[Depends(verify_api_secret)])
    - get_current_user(): Supabase JWT Bearer 검증 → Optional[User]
    - require_user(): 로그인 필수 엔드포인트용 → 없으면 401
      주의: require_user도 verify_api_secret 이후에 실행되어야 함 (순서 보장)

  [3] 서비스 레이어 (backend/app/services/)
    - youtube_service.py: YouTube Data API로 채널 영상 목록, yt-dlp 오디오 다운로드
    - transcription_service.py: Whisper API verbose_json, 25MB 초과 시 분할 처리
    - chunking_service.py: kss + tiktoken, chunk_config.json에서 파라미터 로드
      (없으면 기본값 chunk_size=512 overlap=100), 한국어 문장 경계 우선
    - embedding_service.py: text-embedding-3-small, 배치 처리
    - pinecone_service.py: upsert/query, 시작 시 인덱스 존재 확인 후 없으면 에러 로그
    - rerank_service.py: Cohere Rerank, API key 없으면 입력 그대로 반환
    - rag_service.py: 5단계 체인 (쿼리재작성→검색→리랭킹→컨텍스트조립→GPT-4o)
      Function Calling 도구: search_video_content, get_video_info, generate_timestamp_url
      대화 히스토리: conversations.py에서 최근 4턴 로드
    - cache_service.py: Redis 캐싱, REDIS_URL 없으면 no-op fallback

  [4] DB 쿼리 (backend/app/db/queries/)
    - videos.py: videos/chunks CRUD
    - conversations.py: conversations/messages CRUD

  [5] 라우터 (backend/app/routers/)
    - chat.py: POST /api/v1/chat, POST /api/v1/videos
    - ingest.py: POST /api/v1/ingest, POST /api/v1/status
    - conversations.py: POST /list, POST / (생성), POST /{id}/messages, DELETE /{id}
      모든 라우터 파일: router = APIRouter(dependencies=[Depends(verify_api_secret)])

  [11] docs/API.md 생성/업데이트
    - [5] 라우터 구현 완료 직후 실행
    - docs/API.md에 아래 형식으로 전체 엔드포인트 문서화:

      # API Reference — SV Dev RAG Agent
      Base URL: http://{EC2_IP}:{PORT}/api/v1
      Authentication: 모든 엔드포인트 X-API-Secret 헤더 필수

      각 엔드포인트마다:
        ### POST /api/v1/{path}
        **Headers (Required)**
        - `X-API-Secret: {value}` — 백엔드 접근 인증
        **Headers (Conditional)**
        - `Authorization: Bearer {jwt}` — 해당 엔드포인트만
        **Request Body**
        | Field | Type | Required | Description |
        |-------|------|----------|-------------|
        **Response 200**
        | Field | Type | Description |
        |-------|------|-------------|
        **Status Codes**
        - 200: 성공
        - 403: X-API-Secret 누락 또는 불일치
        - 401: JWT 없음 (JWT 필수 엔드포인트)
        - 422: 요청 유효성 오류
        - 503: 외부 서비스 오류
    - 파일 없으면 신규 생성, 있으면 전체 덮어쓰기
    - 완료 시 출력에 "docs/API.md updated" 포함

  [6] 스케줄러 (backend/app/core/scheduler.py)
    - APScheduler, 매일 KST 자정, FastAPI lifespan에 통합

  [7] 워커 (backend/app/workers/ingestion_worker.py)
    - 수집 파이프라인 전체 비동기 실행

  [8] 스크립트
    - backend/scripts/cli_test.py: CLI RAG 테스트
    - backend/scripts/chunk_optimizer.py: RAGAS 최적화 루프

  [9] 스키마 (backend/app/schemas/api.py)
    - 계약 섹션의 모든 Pydantic 모델

  [10] main.py
    - 라우터 등록, lifespan(scheduler), 0.0.0.0 바인딩
    - CORS: CORS_ORIGINS env var에서 로드, 없으면 ["*"] + 경고

  === API 계약 (위반 금지) ===
  [Phase 1에서 확정한 CONTRACT 전체 붙여넣기]

  === 에러 처리 필수 ===
  - 모든 외부 API 호출: try/except + 구체적 에러 메시지 + HTTPException
  - OpenAI rate limit: exponential backoff 3회 retry
  - Whisper 타임아웃: 25분 제한, 초과 시 504 + 메시지
  - Pinecone 인덱스 없음: 시작 시 체크, 없으면 로그 경고 (서비스 중단 안 함)
  - Redis 연결 실패: 경고 로그 + 캐시 bypass (서비스 중단 안 함)
  - Supabase 연결 실패: 503 반환
  - 환경변수 누락: 시작 시 WARNING 로그 (필수 변수 없으면 ERROR + 종료)

  === 완료 시 출력 ===
  생성/수정 파일 목록, pytest 결과 요약, docs/API.md 업데이트 여부
```

### 2.2 Frontend Sub-Agent

```
subagent_type: "general-purpose"
isolation: "worktree"
prompt: |
  === 절대 규칙 ===
  - 오직 frontend/ 아래 파일만 작성/수정
  - BACKEND_URL을 절대 NEXT_PUBLIC_으로 설정하지 마라
  - 모든 백엔드 API 호출은 Server Action 경유 (클라이언트 직접 fetch 금지)
  - 설명 없이 코드만. 마지막에 "Done." 또는 "Failed: [이유]"

  === 읽어야 할 파일 ===
  1. frontend/CLAUDE.md
  2. frontend/work_rule.md
  3. docs/UI_GUIDE.md
  4. docs/NEED_ENV.md (HTTPS/HTTP 섹션 중요)

  === 구현 목록 (우선순위 순) ===

  [1] Server Actions (frontend/src/app/actions/)
    - chat.ts: sendChatMessage(), getVideos(), getStatus()
      → BACKEND_URL + API_SHARED_SECRET은 서버 env에서만 읽음
      → 반환 타입: RAGResponse | ErrorResponse
    - conversations.ts: createConversation(), getConversations(),
      getMessages(), deleteConversation()
      → Supabase JWT를 Authorization 헤더에 포함

  [2] Supabase 설정 (frontend/src/lib/supabase/)
    - client.ts: 브라우저 Supabase 클라이언트 (createBrowserClient)
    - server.ts: 서버 Supabase 클라이언트 (createServerClient)
    - middleware.ts: 세션 자동 갱신

  [3] Google OAuth (frontend/src/app/auth/callback/route.ts)
    - 코드 교환 처리 후 / 리다이렉트

  [4] 상태 관리
    - stores/chatStore.ts: Zustand — messages[], isLoading, activeConversationId
    - stores/authStore.ts: Zustand — user, session

  [5] 레이아웃 (frontend/src/app/layout.tsx)
    - Supabase Provider, next-themes dark 기본값
    - 퍼플 ambient glow 배경 (UI_GUIDE §5)

  [6] 컴포넌트 (UI_GUIDE 명세 기준으로 구현)
    - layout/Header.tsx: 로고, live 인디케이터, UserMenu/GoogleLoginButton
    - auth/GoogleLoginButton.tsx: Supabase signInWithOAuth
    - auth/UserMenu.tsx: 아바타 드롭다운, 로그아웃
    - chat/ChatContainer.tsx: 스크롤 영역, 자동 스크롤 하단
    - chat/ChatMessage.tsx: 사용자/AI 버블, Framer Motion 등장
    - chat/SourceCard.tsx: 출처 카드, 타임스탬프 링크, hover 글로우
    - chat/ChatInput.tsx: 글래스모피즘, Server Action 연결
    - chat/TypingIndicator.tsx: 3도트 bounce
    - sidebar/ConversationSidebar.tsx: 대화 이력 (로그인 시만 표시)
    - sidebar/ConversationItem.tsx: 개별 항목

  [7] 온보딩 (page.tsx)
    - 첫 방문 (메시지 없음): 온보딩 카드 (UI_GUIDE §4.7)
    - 로그인 / 비로그인 분기 처리

  [8] 타입 (frontend/src/types/api.ts)
    - 계약의 모든 타입 (RAGResponse, SourceItem 등)

  [9] 훅
    - hooks/useChat.ts: Server Action 호출, 로딩 상태
    - hooks/useConversations.ts: 대화 이력 로드

  [10] 에러 처리
    - 백엔드 응답 실패: sonner 토스트 에러 표시
    - 로딩 타임아웃 30초: "응답이 지연되고 있습니다" + 재시도 버튼
    - Supabase 세션 만료: 자동 갱신 (미들웨어)
    - 빈 검색 결과: "관련 내용을 찾지 못했습니다" UI

  === API 계약 (위반 금지) ===
  [Phase 1에서 확정한 CONTRACT 전체 붙여넣기]

  === 색상 (UI_GUIDE §2 기준) ===
  bg-base: #07070F, accent-1: #7C3AED, accent-3: #C084FC
  border: #1C1C3A, text-primary: #EDE9FE

  === 완료 시 출력 ===
  생성/수정 파일 목록, vitest 결과 요약
```

---

## Phase 3 — 독립 리뷰 (자기편향 방지)

Phase 2 완료 후, **이전 컨텍스트 없이** 리뷰 에이전트 2개를 병렬 실행.
에이전트는 구현을 모르는 상태에서 코드만 읽고 판단.

### 리뷰 에이전트 공통 프롬프트

```
subagent_type: "general-purpose"
(worktree 없음 — 읽기 전용)
prompt: |
  당신은 독립 시니어 코드 리뷰어입니다.
  이전 구현 과정을 알지 못합니다. 코드만 읽고 판단합니다.

  다음 체크리스트를 각 항목마다 PASS/FAIL로 평가하세요.
  하나라도 FAIL이면 최종 판정은 REJECTED.

  === 공통 체크리스트 ===
  [ ] 타입 안전성: TS no-any, Python mypy --strict 준수
  [ ] 에러 핸들링: bare except 없음, 모든 외부 호출 try/except
  [ ] 시크릿 노출: 하드코딩 URL/키/토큰 없음
  [ ] API 계약 준수: 요청/응답 스키마 일치
  [ ] 테스트 존재: 모든 새 엔드포인트/컴포넌트에 테스트
  [ ] Conventional Commit 형식 준수

  === Backend 추가 체크리스트 ===
  [ ] GET 엔드포인트 없음 (POST 또는 DELETE만 허용)
  [ ] 모든 엔드포인트 verify_api_secret() 의존성 존재 (JWT 엔드포인트 포함)
  [ ] CORS_ORIGINS env에서 로드 (하드코딩 없음)
  [ ] HOST=0.0.0.0 (EC2 배포 대응)
  [ ] 환경변수 없을 때 graceful degradation (crash 없음)
  [ ] Supabase RLS 쿼리 — service_key 사용 시 명시적 user_id 필터
  [ ] 외부 API (OpenAI/Pinecone/Cohere) retry 로직 존재
  [ ] Whisper 파일 크기 제한 처리 (25MB)
  [ ] 비동기 I/O — 모든 DB/HTTP 호출 await
  [ ] N+1 쿼리 없음
  [ ] docs/API.md 존재하고 모든 엔드포인트 포함

  === Frontend 추가 체크리스트 ===
  [ ] BACKEND_URL에 NEXT_PUBLIC_ 접두사 없음
  [ ] 백엔드 직접 fetch 없음 (Server Action 100% 경유)
  [ ] 클라이언트 번들에 API_SHARED_SECRET 없음
  [ ] 모든 비동기 작업 로딩 상태 존재
  [ ] 에러 바운더리 / 에러 토스트 존재
  [ ] 모바일 반응형 (sm/md 브레이크포인트)
  [ ] Supabase 세션 갱신 미들웨어 존재

  APPROVED 또는 REJECTED + 실패 항목 + 파일명 + 줄번호 + 수정 방법 출력.
```

### 리뷰 루프

```
APPROVED     → Phase 4 진행
REJECTED     → 해당 에이전트(BE or FE)를 reviewer 출력과 함께 재실행
               최대 3회 재시도
               3회 모두 REJECTED → 중단 + 사용자에게 리뷰 결과 전달
```

---

## Phase 4 — 엣지 & 에러 테스트 에이전트

Phase 3 통과 후, **독립 테스트 에이전트** 실행.

```
subagent_type: "general-purpose"
prompt: |
  당신은 QA 엔지니어입니다. 구현 배경 없이 코드와 테스트를 읽고
  아래 엣지 케이스를 직접 테스트 / 코드 분석하세요.

  === Backend 엣지 케이스 검증 ===
  [ ] 환경변수 전체 없을 때: 서버 실행은 되고 경고만 출력되는가
  [ ] OPENAI_API_KEY만 없을 때: /chat 호출 → 503 반환하는가
  [ ] 빈 쿼리 문자열 POST /chat → 422 반환하는가
  [ ] 매우 긴 쿼리 (1000자) → 처리되는가 vs 400 반환하는가
  [ ] conversation_id가 존재하지 않는 UUID → 404 반환하는가
  [ ] X-API-Secret 헤더 없음 → 403 반환하는가
  [ ] X-API-Secret 틀린 값 → 403 반환하는가
  [ ] POST /api/v1/videos → body 없이 호출해도 200 반환하는가
  [ ] POST /api/v1/status → body 없이 호출해도 200 반환하는가
  [ ] JWT 필수 엔드포인트(conversations) — X-API-Secret 없으면 403 반환하는가
        (JWT가 있어도 X-API-Secret 없으면 403이어야 함)
  [ ] POST /ingest 두 번 연속 → 중복 실행 방지 로직 있는가
  [ ] Pinecone 쿼리 결과 0개 → 빈 sources[]로 graceful 응답하는가
  [ ] Redis 연결 끊김 → 서비스 계속 동작하는가 (캐시 bypass)
  [ ] 한국어 특수문자 쿼리 ("하네스😀???") → 처리되는가

  === Frontend 엣지 케이스 검증 ===
  [ ] BACKEND_URL env 없을 때 → Server Action에서 명확한 에러 메시지
  [ ] API 응답 5초 초과 → 타임아웃 표시 + 재시도 버튼 있는가
  [ ] sources[] 빈 배열 → "출처 없음" graceful 표시
  [ ] 매우 긴 답변 (3000자) → 스크롤 가능한가
  [ ] 빠른 연속 전송 (디바운스) → 중복 요청 방지
  [ ] 로그인 → 로그아웃 → 로그인 순서 → 상태 초기화 정상
  [ ] 모바일 뷰포트 (375px) → 레이아웃 깨짐 없음
  [ ] 키보드 오픈 (모바일) → 입력창 가려짐 없음
  [ ] sources가 null일 때 → SourceCard 렌더링 오류 없음

  === 테스트 실행 ===
  cd backend && pytest --tb=short -q
  cd frontend && vitest run --reporter=verbose

  각 케이스마다: PASS / FAIL / SKIP(코드 분석 불가) 기록
  FAIL 항목은 파일명 + 줄번호 + 수정 방법 포함.

  최종 출력: "TESTS PASS" 또는 "TESTS FAIL: [목록]"
```

TESTS FAIL → 해당 레이어 에이전트 재실행 (최대 2회)

---

## Phase 5 — 보안 점검 에이전트

```
subagent_type: "general-purpose"
prompt: |
  보안 전문가로서 아래를 점검하세요.

  [ ] 하드코딩된 시크릿, API 키, 비밀번호 없음
  [ ] NEXT_PUBLIC_로 노출된 민감 변수 없음
  [ ] SQL Injection: Supabase 쿼리에 raw string concat 없음
  [ ] XSS: dangerouslySetInnerHTML 사용 시 sanitize 존재
  [ ] CORS: 와일드카드 * 허용 → 경고 (프로덕션에서 특정 URL 지정 권장)
  [ ] 인증 없는 관리자 엔드포인트 없음 (ingest, status는 API Secret 필수)
  [ ] 파일 업로드 없음 (ytdlp는 서버 내부 — 경로 traversal 위험 없음 확인)
  [ ] Rate limiting 존재 (slowapi 또는 유사 미들웨어)
  [ ] RLS 정책: conversations/messages 타 사용자 접근 불가 확인

  PASS / WARN / FAIL 분류하여 출력.
  FAIL 있으면 수정 후 Phase 6 진행.
```

---

## Phase 6 — CI 게이트

```
레이어별 게이트 순서 (하나라도 실패 시 중단 + 재수정 루프)

Frontend (web 브랜치):
  Gate 1: eslint --max-warnings 0
  Gate 2: tsc --noEmit
  Gate 3: vitest run --coverage (커버리지 70% 이상)
  Gate 4: next build

Backend (ai 브랜치):
  Gate 1: ruff check
  Gate 2: mypy --strict
  Gate 3: pytest --cov --cov-fail-under=70 --tb=short

모든 게이트 통과 시:
  git add -p (관련 파일만)
  git commit -m "feat(frontend): [주요 변경 1줄 요약]"  → web 브랜치
  git commit -m "feat(backend): [주요 변경 1줄 요약]"   → ai 브랜치
  git push origin web
  git push origin ai
```

게이트 실패 → 실패한 레이어 에이전트에게 게이트 출력 전달 → 재수정  
최대 3회. 3회 후에도 실패 → 중단 + 전체 게이트 결과 사용자에게 보고.

---

## Phase 6.5 — 브라우저 시각 테스트 (Playwright)

CI 게이트 통과 후 실제 브라우저에서 UI를 직접 확인한다.

### 사전 조건

```
backend/.env     — 존재해야 함 (없으면 SKIP 안내 후 Phase 7 진행)
frontend/.env.local — NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY 최소 존재
```

### 실행 순서

```
subagent_type: "general-purpose"
prompt: |
  === 브라우저 시각 테스트 ===

  아래 순서대로 서버를 기동하고 Playwright로 UI를 검증한다.
  모든 커맨드는 프로젝트 루트에서 실행.

  [1] 백엔드 기동 (Docker Compose)
    cd backend
    docker-compose up -d --build

    헬스체크 대기 (최대 60초):
    until curl -sf http://localhost:8000/health; do sleep 2; done
    실패 시: "Backend health check timeout — SKIP visual tests" 출력 후 종료

  [2] 프론트엔드 기동
    cd frontend
    npm run dev &
    FE_PID=$!

    기동 대기 (최대 30초):
    until curl -sf http://localhost:3000; do sleep 2; done
    실패 시: kill $FE_PID; "Frontend start timeout — SKIP visual tests" 후 종료

  [3] Playwright 설치 확인
    cd frontend
    npx playwright install --with-deps chromium 2>/dev/null || true

  [4] E2E 테스트 실행
    cd frontend
    npx playwright test tests/e2e/visual.spec.ts \
      --reporter=list \
      --screenshot=on \
      --timeout=30000

  [5] 스크린샷 확인
    스크린샷 저장 경로: frontend/test-results/

    아래 항목을 스크린샷에서 직접 확인:
    [ ] 온보딩 카드 — 퍼플 그라디언트 배경 위 중앙 배치
    [ ] 헤더 — 로고 좌측, 영상 카운터/Live 인디케이터 우측
    [ ] 채팅 입력창 — 글래스모피즘, 하단 고정
    [ ] 모바일(375px) — 레이아웃 단일 컬럼, 입력창 가려짐 없음
    [ ] 소스 카드 — 타임스탬프 링크, hover 글로우 효과

    각 항목: PASS / FAIL / SKIP(화면 로드 실패)

  [6] 정리
    cd frontend && kill $FE_PID 2>/dev/null || true
    cd backend && docker-compose down

  === 출력 형식 ===
  VISUAL TESTS PASS  (모든 항목 PASS)
  VISUAL TESTS WARN: [FAIL 항목 목록]  (비기능적 시각 이슈)
  VISUAL TESTS SKIP: [이유]  (서버 기동 실패)

  WARN은 Phase 7로 진행 (비차단).
  FAIL이 기능 결함(링크 깨짐, 입력 불가 등)이면 → 해당 FE 에이전트 재실행.
```

---

## Phase 7 — Work Rule 자동 업데이트

```
subagent_type: "general-purpose"
(worktree 없음)
prompt: |
  /update-work-rules 실행.

  완료된 작업:
  - 구현 내용: [Phase 0에서 결정한 범위]
  - FE 변경 파일: [Phase 2 FE 에이전트 출력]
  - BE 변경 파일: [Phase 2 BE 에이전트 출력]
  - 리뷰 반복 횟수: [Phase 3 결과]
  - 반복 실패 패턴: [있으면 기록]
  - 엣지 케이스 FAIL 항목: [Phase 4 결과]

  출력: "Updated: [파일] [+N lines]"
```

---

## Phase 8 — 완료 보고

```
HARNESS COMPLETE
================
구현:
  • [기능 1 — 1줄]
  • [기능 2 — 1줄]

게이트:
  Frontend: lint ✓ | types ✓ | tests ✓ (coverage: X%) | build ✓
  Backend:  lint ✓ | types ✓ | tests ✓ (coverage: X%)
  Visual:   [PASS / WARN: 항목 / SKIP: 이유]

문서:
  docs/API.md: [업데이트됨 / 누락 — BE 에이전트 재실행 필요]

커밋:
  web ← feat(frontend): <subject>
  ai  ← feat(backend): <subject>

⚠️ 배포 후 필수 확인:
  1. EC2 CORS_ORIGINS에 Vercel URL 입력 (.env 업데이트)
  2. docs/NEED_ENV.md 배포 전 체크리스트 완료
  3. Vercel 환경변수 패널에 server-side vars 등록
     (BACKEND_URL, API_SHARED_SECRET — NEXT_PUBLIC_ 아님)
  4. docs/API.md가 최신 상태인지 확인
```

---

## 전역 불변 규칙 (절대 위반 금지)

1. `harness_commands/` — 절대 접근 금지
2. BE 에이전트 → `frontend/` 수정 금지 / FE 에이전트 → `backend/` 수정 금지
3. 리뷰 skip 금지 (변경이 아무리 작아도)
4. CI 게이트 실패 bypass 금지 (`--no-verify` 등)
5. `BACKEND_URL` → `NEXT_PUBLIC_` 절대 금지
6. 클라이언트 코드에서 EC2 HTTP 직접 fetch 금지
7. 구현 에이전트는 worktree isolation 필수
8. 리뷰/테스트/보안 에이전트는 이전 컨텍스트 없이 독립 실행
9. GET 엔드포인트 금지 — 모든 조회 포함 POST 사용. GET은 body 미지원으로 `X-API-Secret` 안전 전달 불가.
10. 모든 엔드포인트 `verify_api_secret()` 의존성 선행 필수 — JWT 엔드포인트 포함. X-API-Secret 누락/불일치 시 JWT 검증 없이 즉시 403.
11. BE 라우터 신규 생성 또는 수정 시 `docs/API.md` 동시 업데이트 필수 — 누락 시 Phase 8 완료 보고 불가.

# 프로젝트 요구사항 정의서 (PRD)
## SV Dev RAG Agent — v2

---

### 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 서비스명 | SV Dev RAG Agent |
| 목적 | @sv.developer 유튜브 채널 영상 내용을 AI가 검색·답변 |
| 핵심 가치 | 출처(영상제목 + 타임스탬프)가 명확한 고품질 답변, 로그인 기반 멀티디바이스 대화 이력 |
| 구현 방식 | `/harness` 명령 1회로 FE·BE 병렬 구현 완료 |

---

### 2. 사용자 스토리

| # | 스토리 |
|---|--------|
| US-01 | 개발자가 "하네스가 뭐지?"를 입력하면 "XXXXX 영상 13분 12초에 보면, ~~" 형태로 타임스탬프 출처와 함께 답변을 받는다 |
| US-02 | 소스 카드를 클릭하면 YouTube 영상의 해당 시간으로 바로 이동한다 |
| US-03 | Google 계정으로 1클릭 로그인하면 모든 디바이스에서 대화 이력이 동기화된다 |
| US-04 | 이전 대화를 불러와 맥락을 유지한 채 연속 질문을 이어갈 수 있다 |
| US-05 | 비로그인 상태에서도 채팅은 가능하나 이력은 로컬 세션에만 유지된다 |

---

### 3. 기능 요구사항

#### 3.1 데이터 수집 파이프라인

| ID | 기능 | 우선순위 |
|----|------|---------|
| F-01 | YouTube 채널(@sv.developer) 전체 영상 초기 일괄 수집 | P0 |
| F-02 | 매일 자정(KST) 신규 영상 자동 수집 크론 | P0 |
| F-03 | OpenAI Whisper API(`whisper-1`)로 STT + 단어 단위 타임스탬프 추출 | P0 |
| F-04 | 한국어 문장 경계(kss) 인식 청킹 | P0 |
| F-05 | text-embedding-3-small(1536d) 임베딩 생성 | P0 |
| F-06 | Pinecone에 메타데이터 포함 벡터 저장 | P0 |
| F-07 | Supabase에 영상·청크 원본 메타데이터 보관 | P0 |
| F-08 | 수집 진행률 실시간 추적 (pending/processing/done/error) | P1 |

#### 3.2 청크 자동 최적화 (RAGAS 루프)

| ID | 기능 | 우선순위 |
|----|------|---------|
| F-09 | 황금 데이터셋(Golden Q&A 20개) 준비 스크립트 | P0 |
| F-10 | 청크 크기×오버랩 4×4 그리드(16조합) 자동 테스트 | P0 |
| F-11 | RAGAS 4개 지표(Faithfulness / AnswerRelevancy / ContextPrecision / ContextRecall) 자동 측정 | P0 |
| F-12 | 최적 파라미터 자동 선정 후 `chunk_config.json` 기록 | P0 |
| F-13 | 결과 리포트 출력 (Markdown 표 형태) | P1 |

#### 3.3 RetrievalQA 체인

| ID | 기능 | 우선순위 |
|----|------|---------|
| F-14 | Step 1 — 쿼리 재작성 (GPT-4o-mini로 검색 최적화) | P1 |
| F-15 | Step 2 — Pinecone dense retrieval (top-10) | P0 |
| F-16 | Step 3 — Cohere Rerank로 top-10 → top-5 압축 | P1 |
| F-17 | Step 4 — 대화 히스토리 컨텍스트 삽입 (멀티턴) | P0 |
| F-18 | Step 5 — GPT-4o Function Calling으로 구조화 답변 생성 | P0 |
| F-19 | 출처 인용: 영상제목 + 분:초 + 타임스탬프 URL | P0 |
| F-20 | 구조화 답변 폼(RAGResponse) 반환 | P0 |
| F-21 | CLI 테스트 스크립트 (`scripts/cli_test.py`) | P0 |

#### 3.4 인증 및 대화 이력

| ID | 기능 | 우선순위 |
|----|------|---------|
| F-22 | Supabase Auth Google OAuth 로그인/로그아웃 | P0 |
| F-23 | 로그인 사용자 대화 이력 Supabase 저장 | P0 |
| F-24 | 멀티디바이스 대화 동기화 (conversations 테이블) | P0 |
| F-25 | 디바이스별 세션 식별 (device fingerprint) | P1 |
| F-26 | 비로그인 시 로컬 세션 임시 이력 유지 | P1 |
| F-27 | 대화 삭제 / 이름 변경 | P2 |

#### 3.5 API 엔드포인트

| ID | 메서드/경로 | 기능 | Auth |
|----|-----------|------|------|
| F-28 | POST /api/v1/chat | 채팅 쿼리 (RetrievalQA) | 선택적 (JWT) |
| F-29 | GET /api/v1/videos | 수집된 영상 목록 | API Secret |
| F-30 | POST /api/v1/ingest | 수동 수집 트리거 | API Secret |
| F-31 | GET /api/v1/status | 수집 현황 | API Secret |
| F-32 | GET /api/v1/conversations | 사용자 대화 목록 | JWT 필수 |
| F-33 | POST /api/v1/conversations | 대화 생성 | JWT 필수 |
| F-34 | GET /api/v1/conversations/{id}/messages | 메시지 목록 | JWT 필수 |
| F-35 | DELETE /api/v1/conversations/{id} | 대화 삭제 | JWT 필수 |

#### 3.6 프론트엔드

| ID | 기능 | 우선순위 |
|----|------|---------|
| F-36 | 원페이지 챗봇 UI (블랙+퍼플 다크테마) | P0 |
| F-37 | Google 로그인 버튼 (헤더 우측) | P0 |
| F-38 | 좌측 대화 이력 사이드바 (로그인 시 표시) | P0 |
| F-39 | 타임스탬프 링크 포함 소스 카드 컴포넌트 | P0 |
| F-40 | 스트리밍 응답 표시 (Server-Sent Events) | P1 |
| F-41 | 모바일 반응형 (사이드바 bottom sheet로 전환) | P0 |
| F-42 | 퍼플 글로우 + 글래스모피즘 애니메이션 | P0 |

---

### 4. 비기능 요구사항

| 항목 | 기준 |
|------|------|
| STT 처리 속도 | 영상 1시간 기준 5~10분 허용 |
| 채팅 응답 시간 | 5초 이내 (캐시 히트 시 500ms) |
| 청크 최적화 | RAGAS 자동 루프 → Faithfulness ≥ 0.85 목표 |
| 배포 분리 | FE(Vercel HTTPS) / BE(AWS EC2 HTTP, IP직접) — Mixed Content 해결: Server Action 프록시 |
| 인증 | Supabase JWT (로그인) + X-API-Secret (시스템) 이중 구조 |
| 캐싱 | Redis — 동일 쿼리 1시간 캐시 |

---

### 5. /harness 호환 구현 계획

```
Phase 0 — 청크 최적화 (사전 작업, 비병렬)
  └─ scripts/chunk_optimizer.py 실행 → chunk_config.json 생성

Phase 1 — API 계약 정의
  └─ backend/app/schemas/api.py  ↔  frontend/src/types/api.ts

Phase 2 — 병렬 구현 (FE Agent ‖ BE Agent)
  ├─ BE: 수집 파이프라인 + RetrievalQA 체인 + 인증 + 대화 이력 API
  └─ FE: 챗봇 UI + 소스 카드 + 사이드바 + Google 로그인

Phase 3 — 리뷰 에이전트 (체크리스트)

Phase 4 — CI Gate (ruff→mypy→pytest | eslint→tsc→vitest→build)
  └─ 통과 시 feat(backend/frontend): ~~~ 커밋
```

---

### 6. 필요 환경변수

> **⚠ 없어도 코드는 "변수 없음" 경고 후 계속 진행됩니다.**

#### 백엔드 (.env)

| 변수명 | 용도 | 획득처 |
|--------|------|--------|
| `OPENAI_API_KEY` | Whisper STT + 임베딩 + GPT-4o | platform.openai.com |
| `PINECONE_API_KEY` | 벡터 DB | app.pinecone.io |
| `PINECONE_INDEX_NAME` | Pinecone 인덱스명 (직접 생성) | Pinecone 콘솔 |
| `YOUTUBE_API_KEY` | YouTube Data API v3 | console.cloud.google.com |
| `COHERE_API_KEY` | Rerank API (리랭킹 품질 향상) | dashboard.cohere.com |
| `API_SHARED_SECRET` | 시스템 간 인증 키 | 직접 생성 |
| `SUPABASE_URL` | 메타데이터 + 인증 DB | 기존 |
| `SUPABASE_SERVICE_KEY` | Supabase 서비스 롤 | 기존 |
| `SUPABASE_JWT_SECRET` | JWT 검증 | 기존 |
| `REDIS_URL` | 응답 캐싱 | Upstash or Railway Redis |

#### 프론트엔드 (.env.local)

| 변수명 | 용도 |
|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Auth 클라이언트 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 공개 키 |
| `BACKEND_URL` | EC2 백엔드 HTTP URL — **서버 전용, NEXT_PUBLIC_ 절대 금지** | `http://1.2.3.4:8000` |
| `API_SHARED_SECRET` | Server Action → BE 인증키 — **서버 전용** | — |

---

### 7. 범위 외 (Out of Scope)

- 다른 YouTube 채널 지원
- 영상 번역
- 영상 플레이어 임베드 (링크 이동만)
- 소셜 로그인 이외 인증 방식 (이메일/패스워드 등)

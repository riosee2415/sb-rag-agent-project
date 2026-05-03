# 아키텍처 결정 기록 (ADR) — v2

---

## ADR-001: 벡터 DB — Pinecone 선택

- **상태**: 확정
- **결정**: Pinecone Serverless
- **이유**: 사용자 명시 요청. 관리형 서비스(인덱스 유지보수 불필요). ANN 최적화.
- **트레이드오프**: 별도 서비스 비용. Supabase 단일화 불가(메타데이터↔벡터 이원화).
- **향후**: 영상 수 적을 경우 Supabase pgvector 단일화 가능

---

## ADR-002: STT — OpenAI Whisper API

- **상태**: 확정
- **결정**: `whisper-1` API, `response_format="verbose_json"` (단어 단위 타임스탬프)
- **이유**: GPU 불필요. 한국어 품질 우수. 빠른 개발.
- **비용**: $0.006/분 (영상 1시간 = $0.36)
- **트레이드오프**: API 의존성. 장기 비용 누적 가능.

---

## ADR-003: 한국어 청킹 — RAGAS 자동 최적화 루프

- **상태**: 확정 (최적값은 실행 시 결정)
- **결정**: RAGAS 루프로 최적 파라미터 자동 탐색, `chunk_config.json`에 저장
- **배경**: 최적 청크 크기는 데이터 특성에 따라 다름. 고정값 지정 시 품질 보장 불가.
- **테스트 그리드**

  ```
  chunk_sizes = [256, 512, 768, 1024]  (토큰 단위)
  overlaps    = [0, 50, 100, 150]
  → 16개 조합 × 황금 Q&A 20쌍 = 320회 평가
  ```

- **평가 지표 (RAGAS)**

  | 지표 | 의미 | 목표 |
  |------|------|------|
  | Faithfulness | 답변이 컨텍스트와 모순 없는가 | ≥ 0.85 |
  | AnswerRelevancy | 답변이 질문에 얼마나 관련 있는가 | ≥ 0.80 |
  | ContextPrecision | 검색된 청크가 얼마나 정확한가 | ≥ 0.75 |
  | ContextRecall | 필요한 정보가 검색에 포함됐는가 | ≥ 0.75 |

- **실행**: `python backend/scripts/chunk_optimizer.py`
- **한국어 처리**: kss(Korean Sentence Splitter)로 문장 경계 존중

---

## ADR-004: LLM — GPT-4o + GPT-4o-mini 이중 구성

- **상태**: 확정
- **결정**
  - 쿼리 재작성: `gpt-4o-mini` (저렴, 빠름)
  - 답변 생성: `gpt-4o` (Function Calling + 구조화 출력)
- **이유**: Anthropic은 임베딩 모델 없음 → OpenAI 생태계 통일이 합리적
- **트레이드오프**: OpenAI 의존도 집중
- **향후**: Claude 3.5 Sonnet 교체 시 프론트 `@ai-sdk/anthropic` 활용 가능

---

## ADR-005: 리랭킹 — Cohere Rerank

- **상태**: 확정
- **결정**: Cohere Rerank API (`rerank-multilingual-v3.0`)
- **배경**: Pinecone dense retrieval만으로는 한국어 어휘 변형에 취약
- **이유**
  - Cross-encoder 기반 정교한 관련도 재정렬
  - 한국어 멀티링구얼 모델 지원
  - top-10 → top-5 압축으로 LLM 컨텍스트 품질 향상
- **비용**: $0.001 / 1000 쿼리 (무시할 수준)
- **트레이드오프**: API 추가 의존성. Cohere 없을 시 단순 top-5 fallback 사용.

---

## ADR-006: 인증 — Supabase Auth (Google OAuth) + API Secret 이중 구조

- **상태**: 확정
- **결정**
  - 사용자 인증: Supabase Auth Google OAuth
  - 시스템 인증: X-API-Secret 헤더 (FE 서버 액션 → BE)
- **이유**
  - Google OAuth: 로그인 구현 최소화, Supabase RLS와 자연스럽게 통합
  - API Secret: 클라이언트 사이드 직접 BE 호출 차단 (Next.js Server Action 경유 강제)
- **보안 고려**
  - `API_SHARED_SECRET`은 서버 전용 env (`NEXT_PUBLIC_` 금지)
  - Next.js Server Action에서만 헤더 삽입
  - Supabase RLS로 사용자 데이터 행 단위 격리

---

## ADR-007: 대화 이력 저장 — Supabase (멀티디바이스)

- **상태**: 확정
- **결정**: Supabase `conversations` + `messages` 테이블, RLS 적용
- **이유**
  - user_id 기반으로 어느 디바이스에서든 동기화
  - `device_hint` 컬럼으로 디바이스 구분 가능
  - RLS로 타 사용자 데이터 완전 격리
- **비로그인 처리**: Zustand 로컬 상태 + sessionStorage (새로고침 시 유지)

---

## ADR-008: 스케줄러 — APScheduler

- **상태**: 확정
- **결정**: APScheduler (FastAPI lifespan 내 통합)
- **이유**: 자정 크론 1개 → Redis 의존성 추가가 오버엔지니어링
- **트레이드오프**: 다중 인스턴스 배포 시 중복 실행 가능
- **향후**: 영상 수 급증 시 ARQ(pyproject에 포함) + Redis 마이그레이션

---

## ADR-009: Redis 캐싱 — 쿼리 응답 캐싱

- **상태**: 확정
- **결정**: Redis (Upstash Serverless 권장), TTL 1시간
- **이유**
  - 동일 질문 반복 시 Pinecone/GPT 비용 절감
  - 응답 시간 5초 → 500ms 미만으로 단축
- **키 전략**: `chat:{sha256(normalized_query)}`
- **트레이드오프**: 영상 신규 추가 시 캐시 스테일 가능성 → 수집 완료 시 캐시 전체 무효화

---

## ADR-010: 추가 백엔드 의존성

```toml
[project.dependencies]
openai = ">=1.0.0"                     # Whisper + 임베딩 + GPT-4o
pinecone = ">=3.0.0"                   # 벡터 DB
yt-dlp = ">=2024.0.0"                  # YouTube 오디오
kss = ">=4.0.0"                        # 한국어 문장 분리
apscheduler = ">=3.10.0"               # 자정 크론
aiofiles = ">=23.0.0"                  # 비동기 파일 I/O
google-api-python-client = ">=2.0.0"   # YouTube Data API v3
pytz = ">=2024.0"                      # 타임존 KST
tiktoken = ">=0.7.0"                   # 토큰 카운팅
cohere = ">=5.0.0"                     # Rerank API
redis = ">=5.0.0"                      # 응답 캐싱
ragas = ">=0.1.0"                      # 청크 최적화 평가
datasets = ">=2.0.0"                   # RAGAS 데이터셋 포맷
```

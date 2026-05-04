# Backend 개발 가이드

## 1. 환경 변수 설정

`.env.example`을 복사해서 `.env` 생성:

```bash
cp .env.example .env
```

`.env` 필수 항목 채우기:

| 변수 | 설명 | 발급처 |
|------|------|--------|
| `OPENAI_API_KEY` | Whisper(전사) + GPT-4o(답변) + 임베딩 | platform.openai.com |
| `PINECONE_API_KEY` | 벡터 DB 접근 | app.pinecone.io |
| `PINECONE_INDEX_NAME` | 인덱스 이름 (기본값: `sv-dev-rag`) | Pinecone 대시보드에서 생성 |
| `YOUTUBE_API_KEY` | 채널 영상 목록 조회 | console.cloud.google.com |
| `API_SHARED_SECRET` | FE↔BE 간 X-API-Secret 인증 | 임의 문자열 32자 이상 |
| `SUPABASE_URL` | DB URL | supabase.com 프로젝트 Settings |
| `SUPABASE_SERVICE_KEY` | 서버 전용 service_role 키 | Supabase Settings > API |
| `SUPABASE_JWT_SECRET` | JWT 검증 시크릿 | Supabase Settings > API |

선택 항목:

| 변수 | 설명 |
|------|------|
| `COHERE_API_KEY` | 리랭킹 (없으면 리랭킹 skip, 검색 결과 그대로 반환) |
| `REDIS_URL` | 캐시 + ARQ 작업 큐 (없으면 in-process fallback) |

---

## 2. 개발 모드 실행 — 방법 A: Docker Compose (권장)

Docker가 설치되어 있어야 합니다.

```bash
# backend/ 디렉토리에서 실행
cd backend

# 빌드 + 기동 (처음 또는 코드 변경 시)
docker compose up --build

# 백그라운드 실행
docker compose up -d --build

# 로그 실시간 확인
docker compose logs -f api

# 중지
docker compose down
```

서버 확인:
```bash
curl http://localhost:8000/health
# {"status":"ok"}
```

Swagger UI: http://localhost:8000/docs

> **참고**: `docker-compose.yml`이 `--reload` 플래그로 uvicorn을 실행하므로,
> 코드 변경 시 자동 재시작됩니다.

---

## 3. 개발 모드 실행 — 방법 B: 로컬 직접 실행

Python 3.11 이상 필요.

### 3-1. 가상환경 생성 및 진입 (처음 한 번만)

**PowerShell 기준 — 아래 순서대로 그대로 실행:**

```powershell
# 1. backend 폴더로 이동
cd C:\Users\Computer\Desktop\research\sb-rag-agent-project\backend

# 2. 가상환경 생성 (.venv 폴더가 생성됨)
python -m venv .venv

# 3. 가상환경 활성화
.\.venv\Scripts\Activate.ps1
```

활성화되면 터미널 앞에 `(.venv)` 표시가 붙습니다:
```
(.venv) PS C:\...\backend>
```

> **PowerShell 실행 정책 오류가 나는 경우** (`이 시스템에서 스크립트를 실행할 수 없습니다`):
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```
> 이후 다시 `.\.venv\Scripts\Activate.ps1` 실행

```powershell
# 4. 의존성 설치 (운영 + 개발 도구, 처음 한 번만)
pip install -e ".[dev]"
```

### 3-1-b. 두 번째 실행부터 (가상환경 재진입)

터미널을 새로 열 때마다 아래 두 줄만 실행:

```powershell
cd C:\Users\Computer\Desktop\research\sb-rag-agent-project\backend
.\.venv\Scripts\Activate.ps1
```

### 3-2. Redis 실행 (별도 터미널 또는 Docker)

Redis는 캐시 및 작업 큐에 사용됩니다. 없으면 in-process fallback으로 동작하지만, ARQ 작업 큐 기능은 비활성화됩니다.

```bash
# Docker로 Redis만 실행
docker run -d -p 6379:6379 --name redis redis:7-alpine

# 또는 docker-compose로 Redis만
docker compose up -d redis
```

`.env`에 추가:
```
REDIS_URL=redis://localhost:6379
```

### 3-3. 서버 실행

```bash
cd backend

# 개발 모드 (hot-reload)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# 또는 Python 모듈로
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

서버 확인:
```bash
curl http://localhost:8000/health
```

---

## 4. Pinecone 인덱스 생성

**임베딩 전에 인덱스를 먼저 만들어야 합니다.**
코드에서 자동 생성하지 않으니 대시보드에서 직접 생성하세요.

### 4-1. Pinecone 대시보드에서 생성

1. [app.pinecone.io](https://app.pinecone.io) 로그인
2. `Create Index` 클릭
3. 설정:

| 항목 | 값 |
|------|----|
| Index name | `sv-dev-rag` (`.env`의 `PINECONE_INDEX_NAME`과 일치) |
| Dimensions | `1536` (text-embedding-3-small 차원 수) |
| Metric | `cosine` |
| Pod type | Serverless (AWS us-east-1 권장, 무료 티어 가능) |

4. `Create Index` 클릭 후 상태가 `Ready`가 될 때까지 대기 (약 1~2분)

### 4-2. 생성 확인

```bash
# 서버 실행 중일 때 로그에서 확인
# "Pinecone index 'sv-dev-rag' connected" 메시지가 보이면 정상
```

또는 Python으로 직접 확인:

```python
from pinecone import Pinecone
pc = Pinecone(api_key="your-api-key")
print([idx.name for idx in pc.list_indexes()])
```

---

## 5. 벡터 임베딩 실행 (인제스트 파이프라인)

인제스트 파이프라인은 다음 순서로 자동 실행됩니다:

```
YouTube 채널(@sv.developer)
  → 영상 목록 조회
  → 오디오 다운로드 (yt-dlp)
  → Whisper API 전사
  → 텍스트 청킹 (한국어 kss + tiktoken)
  → OpenAI text-embedding-3-small 임베딩
  → Pinecone upsert
  → Supabase chunks 저장
```

### 5-1. API로 인제스트 트리거 (서버 실행 중)

```bash
curl -X POST http://localhost:8000/api/v1/ingest \
  -H "X-API-Secret: your-api-shared-secret"
```

응답:
```json
{"job_id": "uuid", "status": "started"}
```

진행 상태 확인:
```bash
curl -X POST http://localhost:8000/api/v1/status \
  -H "X-API-Secret: your-api-shared-secret"
```

응답:
```json
{
  "total_videos": 12,
  "done": 8,
  "pending": 3,
  "error": 1,
  "last_updated": "2026-05-03T12:00:00"
}
```

### 5-2. Swagger UI로 인제스트 (GUI)

1. http://localhost:8000/docs 접속
2. `POST /api/v1/ingest` 클릭
3. `Authorize` 버튼 → `X-API-Secret` 입력
4. `Try it out` → `Execute`

### 5-3. 로그로 진행 상황 모니터링

```bash
# Docker Compose 사용 시
docker compose logs -f api

# 직접 실행 시
# 터미널에 직접 출력됩니다
```

정상 진행 로그 예시:
```
INFO | ingest_channel started
INFO | Fetching videos from @sv.developer...
INFO | Processing video: abc123 - "영상 제목"
INFO | Transcription complete: 3821 chars
INFO | Chunking: 12 chunks created
INFO | Embedding batch: 12 vectors
INFO | Pinecone upsert: 12 records
INFO | Supabase chunks saved
INFO | Ingestion complete for video: abc123
INFO | ingest_channel finished
```

### 5-4. 특정 영상만 수동 임베딩 (고급)

개별 영상 직접 처리가 필요한 경우 Python 스크립트로 실행:

```bash
cd backend

# 가상환경 활성화 후
python -c "
import asyncio
from app.workers.ingestion_worker import ingest_channel

asyncio.run(ingest_channel(None))
"
```

---

## 6. RAG 쿼리 테스트

임베딩 완료 후 RAG 답변 테스트:

```bash
cd backend

# CLI 테스트 도구
python scripts/cli_test.py --query "FastAPI에서 의존성 주입은 어떻게 하나요?"

# 대화 이어가기
python scripts/cli_test.py \
  --query "예시 코드도 보여줘" \
  --conversation-id "uuid-from-previous-response"
```

또는 API로 직접:

```bash
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Secret: your-api-shared-secret" \
  -d '{"query": "FastAPI에서 의존성 주입은 어떻게 하나요?"}'
```

---

## 7. 테스트 실행

```bash
cd backend

# 전체 테스트
pytest --tb=short

# 커버리지 포함
pytest --tb=short --cov=app --cov-report=term-missing

# 특정 파일만
pytest tests/test_rag_service.py -v
```

---

## 8. 코드 품질 검사

```bash
cd backend

# Lint
ruff check app tests

# 자동 수정
ruff check --fix app tests

# 타입 검사
mypy app --strict
```

---

## 9. 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| `Pinecone index 'sv-dev-rag' does not exist` | 인덱스 미생성 | 4번 섹션에서 인덱스 생성 |
| `OPENAI_API_KEY is not set` | `.env` 누락 | `.env` 파일 확인 |
| `Redis connection test failed` | Redis 미실행 | `docker run -d -p 6379:6379 redis:7-alpine` |
| `Audio download failed` | yt-dlp 미설치 또는 ffmpeg 없음 | `pip install yt-dlp` + ffmpeg 설치 |
| `Whisper API timeout` | 영상 길이 초과 25분 | 자동 분할 처리 (로그 확인) |
| 403 Forbidden | X-API-Secret 불일치 | `.env`의 `API_SHARED_SECRET` 확인 |

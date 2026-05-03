# 환경변수 설정 가이드 (NEED_ENV)

---

## ⚠️ HTTPS/HTTP 통신 문제 — 필독

### 배포 구조

```
Frontend:  Vercel  (HTTPS — 강제)
Backend:   AWS EC2 (HTTP  — IP 직접 통신, 도메인 없음)
```

### 문제

브라우저는 HTTPS 페이지에서 HTTP 리소스를 직접 요청하면 **Mixed Content 오류**로 차단.

```
❌  Client Browser → http://1.2.3.4:8000/api/v1/chat  (차단됨)
```

### 해결 — Next.js Server Action 프록시

모든 백엔드 호출은 **Vercel 서버 사이드(Server Action)를 경유**해야 함.
클라이언트 코드에서 백엔드를 직접 fetch하는 코드는 **절대 작성 금지**.

```
✅  Client → Vercel Server Action (HTTPS) → http://1.2.3.4:8000 (서버↔서버, 허용)
```

### 코드 규칙

```typescript
// ❌ 금지 — 클라이언트에서 직접 호출
const res = await fetch(process.env.NEXT_PUBLIC_BACKEND_URL + "/api/v1/chat");

// ✅ 올바른 방법 — Server Action 경유
// app/actions/chat.ts  (서버 전용)
("use server");
export async function sendChatMessage(query: string) {
  const res = await fetch(process.env.BACKEND_URL + "/api/v1/chat", {
    method: "POST",
    headers: { "X-API-Secret": process.env.API_SHARED_SECRET! },
    body: JSON.stringify({ query }),
  });
  return res.json();
}
```

---

## Backend 환경변수 (backend/.env)

### 필수 — 없으면 서비스 불가

| 변수명                 | 설명                                        | 획득 방법                              |
| ---------------------- | ------------------------------------------- | -------------------------------------- |
| `OPENAI_API_KEY`       | GPT-4o 답변 + text-embedding-3-small 임베딩 | platform.openai.com → API Keys         |
| `PINECONE_API_KEY`     | 벡터 검색 DB                                | app.pinecone.io → API Keys             |
| `PINECONE_INDEX_NAME`  | 사용할 인덱스명 (아래 생성 방법 참고)       | Pinecone 콘솔                          |
| `YOUTUBE_API_KEY`      | YouTube Data API v3 채널 영상 목록          | console.cloud.google.com               |
| `API_SHARED_SECRET`    | FE↔BE 통신 인증키 (아래 생성 방법 참고)     | 직접 생성                              |
| `SUPABASE_URL`         | Supabase 프로젝트 URL                       | Supabase → Settings → API              |
| `SUPABASE_SERVICE_KEY` | service_role 키 (RLS 우회, 서버 전용)       | Supabase → Settings → API              |
| `SUPABASE_JWT_SECRET`  | JWT 서명 검증                               | Supabase → Settings → API → JWT Secret |

### 선택 — 없으면 기능 저하 (서비스는 계속 동작)

| 변수명           | 없을 때 동작                              | 획득 방법               |
| ---------------- | ----------------------------------------- | ----------------------- |
| `COHERE_API_KEY` | 리랭킹 skip → Pinecone top-5 그대로 반환  | dashboard.cohere.com    |
| `REDIS_URL`      | 캐싱 없음 → 매 요청마다 Pinecone+GPT 호출 | Upstash Redis 무료 플랜 |

### 배포 설정

| 변수명         | 값                            | 설명                            |
| -------------- | ----------------------------- | ------------------------------- |
| `ENVIRONMENT`  | `production`                  | —                               |
| `CORS_ORIGINS` | `https://your-app.vercel.app` | ⚠️ Vercel HTTPS URL 정확히 입력 |
| `HOST`         | `0.0.0.0`                     | EC2 외부 접속 허용 (필수)       |
| `PORT`         | `8000`                        | EC2 보안그룹 오픈 포트와 일치   |

---

## Backend .env 예시 파일

```dotenv
# === 필수 ===
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxx
PINECONE_API_KEY=pcsk_xxxxxxxxxxxxxxxx
PINECONE_INDEX_NAME=sv-dev-rag
YOUTUBE_API_KEY=AIzaSyxxxxxxxxxxxxxxxx
API_SHARED_SECRET=zK9mP2xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_JWT_SECRET=your-jwt-secret-from-supabase

# === 선택 ===
COHERE_API_KEY=HaFxxxxxxxxxxxxxxxx
REDIS_URL=redis://default:xxxxxxxx@your-upstash.upstash.io:6379

# === 배포 ===
ENVIRONMENT=production
CORS_ORIGINS=https://your-app.vercel.app
HOST=0.0.0.0
PORT=8000
```

---

## Frontend 환경변수 (frontend/.env.local)

### 공개 변수 (클라이언트 번들 포함 — 보안 무관 값만)

| 변수명                          | 설명                         | 예시                      |
| ------------------------------- | ---------------------------- | ------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase 클라이언트 Auth URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon 공개 키        | `eyJhbGci...`             |

### 서버 전용 변수 ⚠️ NEXT*PUBLIC* 절대 금지

| 변수명              | 설명                                              | 예시                  |
| ------------------- | ------------------------------------------------- | --------------------- |
| `BACKEND_URL`       | EC2 백엔드 HTTP URL. **Server Action에서만 사용** | `http://1.2.3.4:8000` |
| `API_SHARED_SECRET` | BE 인증키. **백엔드와 동일 값 설정**              | `zK9mP2...`           |

---

## Frontend .env.local 예시 파일

```dotenv
# === 공개 (클라이언트) ===
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# === 서버 전용 (절대 NEXT_PUBLIC_ 금지) ===
BACKEND_URL=http://localhost:8000
API_SHARED_SECRET=zK9mP2xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 환경변수 생성 방법

### API_SHARED_SECRET 생성

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
# 예: zK9mP2cXvR8nQsLjYeA5dFgHwT1uBkIoMpE4rV6yN3qCsW7xZ0tU
```

### Pinecone 인덱스 생성

1. app.pinecone.io → Create Index
2. Name: `sv-dev-rag` (또는 원하는 이름)
3. Dimensions: **1536** (text-embedding-3-small)
4. Metric: **cosine**
5. Cloud: AWS / Region: us-east-1 (Serverless)

---

## AWS EC2 서버 설정

```bash
# 1. EC2 보안 그룹 인바운드 규칙
#    TCP 8000 → 0.0.0.0/0
#    TCP 22   → 관리자 IP만

# 2. 백엔드 서버 실행 (0.0.0.0 바인딩 필수)
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000

# 3. 프로세스 유지 (PM2 권장)
npm install -g pm2
pm2 start "uvicorn app.main:app --host 0.0.0.0 --port 8000" --name sv-rag-be
pm2 save
pm2 startup
```

---

## Supabase Google OAuth 설정

1. **Supabase** → Authentication → Providers → Google → Enable
2. **Google Cloud Console** → Credentials → OAuth 2.0 Client ID 생성
   - Authorized redirect URIs:
     - `https://xxxxxxxx.supabase.co/auth/v1/callback`
     - `https://your-app.vercel.app/auth/callback` (Vercel 배포 후 추가)
3. Client ID / Client Secret → Supabase Provider 설정에 입력
4. **Next.js** `app/auth/callback/route.ts` 에서 코드 교환 처리

---

## 배포 전 체크리스트

```
Backend (EC2)
  [ ] CORS_ORIGINS에 Vercel URL 정확히 입력 (https:// 포함)
  [ ] HOST=0.0.0.0 설정
  [ ] EC2 보안그룹 PORT 오픈
  [ ] Pinecone 인덱스 생성 완료 (dimension: 1536)
  [ ] Supabase Google OAuth Redirect URI 등록

Frontend (Vercel)
  [ ] BACKEND_URL에 NEXT_PUBLIC_ 접두사 없음
  [ ] API_SHARED_SECRET 백엔드와 동일 값
  [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY (anon 키, service 키 아님)
  [ ] Vercel 환경변수 패널에 전부 등록

공통
  [ ] API_SHARED_SECRET 프론트/백 동일한 값
  [ ] Supabase URL 앞뒤 공백 없음
```

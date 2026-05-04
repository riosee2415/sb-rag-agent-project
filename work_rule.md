# Work Rules — Root Token Optimization Index
<!-- Auto-managed by harness Phase 4. NEVER edit manually. Last: 2026-05-03 -->

## TOKEN PROTOCOL (최우선 규칙)
- 설명 금지. 코드·변경 결과만 출력. 마지막에 "Done." 또는 "Failed: [이유]" 한 줄만.
- 작업 시작 전: work_rule.md 먼저, 그 다음 CLAUDE.md, 그 다음 task-relevant 파일만.
- 디렉토리 전체 스캔 금지. 아래 FILE MAP 기준으로만 탐색.
- 같은 내용 반복 로드 금지. 이미 로드한 파일 재확인 금지.

## SKIP ALWAYS (절대 로드 금지)
```
harness_commands/  test-reports/  .test-results/
node_modules/      .next/         .venv/
__pycache__/       *.pyc          .pytest_cache/
.ruff_cache/       .mypy_cache/   coverage/
storybook-static/  playwright-report/
```

## LOAD ALWAYS (모든 작업 공통)
```
work_rule.md        ← 이 파일 (먼저 읽음)
CLAUDE.md           ← 루트 오케스트레이션 규칙
```

## FILE MAP (task scope → load targets)
| 작업 유형 | 로드 대상 |
|-----------|-----------|
| 전체 기획/설계 | CLAUDE.md, work_rule.md |
| FE + BE 모두 | frontend/CLAUDE.md, frontend/work_rule.md, backend/CLAUDE.md, backend/work_rule.md |
| 프론트만 | frontend/CLAUDE.md, frontend/work_rule.md |
| 백엔드만 | backend/CLAUDE.md, backend/work_rule.md |
| 계약 정의 | frontend/src/types/api.ts, backend/app/schemas/api.py |
| API 문서 | docs/API.md |
| 환경/설정 | .gitignore, .mcp.json (있을 경우) |
| RAG 서비스 | backend/app/services/rag_service.py, backend/app/services/pinecone_service.py |
| 수집 파이프라인 | backend/app/workers/ingestion_worker.py, backend/app/services/youtube_service.py, backend/app/services/transcription_service.py |

## LEARNED PATTERNS
<!-- harness가 각 작업 후 여기에 1줄씩 추가. 오래된 항목은 자동 pruning. -->
- [2026-05-03] BE 라우터 수정 시 docs/API.md 동시 업데이트 필수 → 누락 시 Phase 8 차단
- [2026-05-03] ai 브랜치: backend/만, web 브랜치: frontend/만 — 혼용 금지
- [2026-05-03] Supabase JWT + X-API-Secret 이중 인증: verify_api_secret() 항상 첫 번째 Depends
- [2026-05-04] Next.js 16: middleware.ts 컨벤션 deprecated → proxy.ts 사용. 함수명도 proxy()여야 함. 둘 다 있으면 앱 빌드 불가.
- [2026-05-04] .env 값에 +, /, = 포함 시 반드시 따옴표로 감싸야 dotenv 파싱 안전 (특히 SUPABASE_JWT_SECRET)
- [2026-05-04] 신규 Supabase 프로젝트(sb_publishable_ 키 형식)는 RS256 JWT 발급 → HS256만 허용하면 "alg not allowed" 오류. 해결: 앱 시작 시 JWKS 로드 후 alg별 분기 검증 (dependencies.py load_jwks)

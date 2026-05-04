import type { Projections } from '@/types/promptwatch'

export const MOCK_PROJECTIONS: Projections = {
  projectedQueries: [
    { rank: 1, query: '이 채널에서 RAG 평가 방법 다뤘어?',         confidence: 82 },
    { rank: 2, query: '최근 에이전트 프레임워크 비교 영상은?',       confidence: 74 },
    { rank: 3, query: 'Anthropic Claude API 사용법 영상 있어?',     confidence: 68 },
    { rank: 4, query: '임베딩 모델 선택 기준 알려줘',                confidence: 61 },
    { rank: 5, query: '프롬프트 캐싱 실전 예제 요약해줘',            confidence: 53 },
  ],
  projectedKeywords: [
    { rank: 1, keyword: 'agent framework',  growthRate: 47 },
    { rank: 2, keyword: 'rag evaluation',   growthRate: 31 },
    { rank: 3, keyword: 'embedding model',  growthRate: 24 },
    { rank: 4, keyword: 'vector database',  growthRate: 18 },
    { rank: 5, keyword: 'prompt caching',   growthRate: 12 },
  ],
  generatedAt: new Date().toISOString(),
}

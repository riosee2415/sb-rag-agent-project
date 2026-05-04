import type { PeriodAnalytics, PromptStat } from '@/types/promptwatch'

const TOPICS = [
  'RAG 구현',
  '에이전트 프레임워크',
  '임베딩 모델',
  '프롬프트 엔지니어링',
  'LLM 평가',
  '벡터 데이터베이스',
  'Anthropic API',
  '파인튜닝',
]

// Deterministic LCG — reproducible across renders
function makeLcg(s: number) {
  let state = s >>> 0
  return () => {
    state = Math.imul(state, 1664525) + 1013904223 >>> 0
    return state / 0x100000000
  }
}

function generateStats(days: number, lcgSeed: number): PromptStat[] {
  const rng = makeLcg(lcgSeed)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return Array.from({ length: days }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (days - 1 - i))
    const date = d.toISOString().slice(0, 10)

    const dow = d.getDay()
    const isWeekend = dow === 0 || dow === 6

    // Realistic pattern: weekday peak, weekend dip, slight growth trend
    const base = 44
    const trend = 1 + 0.018 * (i / 7)
    const dayFactor = isWeekend ? 0.5 : (dow === 1 ? 1.15 : dow === 5 ? 0.88 : 1.0)
    const spike = rng() > 0.92 ? 1.55 : 1.0
    const noise = 0.8 + rng() * 0.42

    const queryCount = Math.max(Math.round(base * trend * dayFactor * spike * noise), 4)
    const topTopic = TOPICS[Math.floor(rng() * TOPICS.length)]
    const avgResponseTime = +(1.4 + rng() * 1.6).toFixed(1)

    return { date, queryCount, topTopic, avgResponseTime }
  })
}

function makeSummary(stats: PromptStat[]): PeriodAnalytics['summary'] {
  const totalQueries = stats.reduce((s, d) => s + d.queryCount, 0)
  const peak = stats.reduce((m, d) => (d.queryCount > m.queryCount ? d : m), stats[0])
  const avgPerDay = Math.round(totalQueries / stats.length)

  const topicMap: Record<string, number> = {}
  for (const s of stats) topicMap[s.topTopic] = (topicMap[s.topTopic] ?? 0) + s.queryCount
  const topTopic = Object.entries(topicMap).sort((a, b) => b[1] - a[1])[0][0]

  return { totalQueries, peakDate: peak.date, avgPerDay, topTopic }
}

const CONFIGS: Array<{ period: PeriodAnalytics['period']; days: number; seed: number }> = [
  { period: '3d',  days: 3,  seed: 42   },
  { period: '7d',  days: 7,  seed: 99   },
  { period: '30d', days: 30, seed: 777  },
  { period: '3m',  days: 90, seed: 1234 },
]

export const MOCK_ANALYTICS: PeriodAnalytics[] = CONFIGS.map(({ period, days, seed }) => {
  const stats = generateStats(days, seed)
  return { period, stats, summary: makeSummary(stats) }
})

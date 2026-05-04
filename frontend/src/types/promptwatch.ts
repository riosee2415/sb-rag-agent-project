export interface PromptStat {
  date: string          // YYYY-MM-DD
  queryCount: number
  topTopic: string
  avgResponseTime: number  // seconds
}

export interface PeriodAnalytics {
  period: '3d' | '7d' | '30d' | '3m'
  stats: PromptStat[]
  summary: {
    totalQueries: number
    peakDate: string
    avgPerDay: number
    topTopic: string
  }
}

export interface ProjectedQuery {
  rank: number
  query: string
  confidence: number    // 0–100
}

export interface ProjectedKeyword {
  rank: number
  keyword: string
  growthRate: number    // percentage
}

export interface Projections {
  projectedQueries: ProjectedQuery[]    // length 5
  projectedKeywords: ProjectedKeyword[] // length 5
  generatedAt: string                   // ISO timestamp
}

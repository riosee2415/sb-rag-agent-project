import type { PeriodAnalytics, Projections } from '@/types/promptwatch'

export function buildCsv(analytics: PeriodAnalytics[], proj: Projections): string {
  const rows: string[] = []

  rows.push('STATISTICS')
  rows.push('period,date,query_count,top_topic,avg_response_time')
  for (const pa of analytics) {
    for (const s of pa.stats) {
      rows.push([pa.period, s.date, s.queryCount, `"${s.topTopic}"`, s.avgResponseTime].join(','))
    }
  }

  rows.push('')
  rows.push('PROJECTED QUERIES')
  rows.push('rank,projected_query,confidence')
  for (const q of proj.projectedQueries) {
    rows.push([q.rank, `"${q.query}"`, q.confidence].join(','))
  }

  rows.push('')
  rows.push('PROJECTED KEYWORDS')
  rows.push('rank,keyword,growth_rate')
  for (const k of proj.projectedKeywords) {
    rows.push([k.rank, `"${k.keyword}"`, k.growthRate].join(','))
  }

  return rows.join('\n')
}

/** Returns size in KB string */
export function downloadCsv(csv: string): string {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  a.href = url
  a.download = `promptwatch_${date}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  return (blob.size / 1024).toFixed(1)
}

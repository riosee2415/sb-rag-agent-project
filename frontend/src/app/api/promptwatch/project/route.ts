import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { MOCK_ANALYTICS } from '@/lib/promptwatch/mock-data'
import { MOCK_PROJECTIONS } from '@/lib/promptwatch/mock-projections'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

const ProjectionsSchema = z.object({
  projectedQueries: z.array(z.object({
    rank: z.number(),
    query: z.string(),
    confidence: z.number().min(0).max(100),
  })).length(5),
  projectedKeywords: z.array(z.object({
    rank: z.number(),
    keyword: z.string(),
    growthRate: z.number().min(0),
  })).length(5),
})

function buildProjectionPrompt(): string {
  const topTopics = MOCK_ANALYTICS.flatMap(pa => pa.stats.map(s => s.topTopic))
  const topicFreq: Record<string, number> = {}
  for (const t of topTopics) topicFreq[t] = (topicFreq[t] ?? 0) + 1
  const sorted = Object.entries(topicFreq).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const s7 = MOCK_ANALYTICS.find(a => a.period === '7d')?.summary
  const s30 = MOCK_ANALYTICS.find(a => a.period === '30d')?.summary

  return `You are an AI YouTube channel analytics assistant.

Channel context: AI/ML education (RAG, agents, embeddings, LLMs, vector databases).
Recent top topics (by frequency): ${sorted.map(([k, v]) => `${k}(${v})`).join(', ')}
7-day avg queries/day: ${s7?.avgPerDay ?? 'N/A'}
30-day avg queries/day: ${s30?.avgPerDay ?? 'N/A'}

Generate 5 projected user queries (in Korean) that are likely to be asked in the next 7 days,
with confidence scores (0–100).

Generate 5 projected trending keywords (in English, 2-3 words each) with growth rate percentages.

Base your projections on the topic frequency data and general AI/ML trends.`
}

export async function POST() {
  try {
    const { object } = await generateObject({
      model: anthropic('claude-haiku-4-5-20251001'),
      schema: ProjectionsSchema,
      prompt: buildProjectionPrompt(),
      temperature: 0.8,
    })

    const result = {
      ...object,
      generatedAt: new Date().toISOString(),
    }

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({
      ...MOCK_PROJECTIONS,
      generatedAt: new Date().toISOString(),
    })
  }
}

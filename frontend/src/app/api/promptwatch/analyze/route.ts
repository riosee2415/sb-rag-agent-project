import { streamText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { MOCK_ANALYTICS } from '@/lib/promptwatch/mock-data'

export const runtime = 'nodejs'
export const maxDuration = 60

function buildAnalysisPrompt(): string {
  const summary = MOCK_ANALYTICS.map(pa => {
    const s = pa.summary
    return `[${pa.period}] total=${s.totalQueries} avg/day=${s.avgPerDay} peak=${s.peakDate} top="${s.topTopic}"`
  }).join('\n')

  return `You are a YouTube channel analytics assistant analyzing user query patterns for an AI/ML education channel.

Data summary:
${summary}

In 3-4 concise sentences (Korean), analyze:
1. Overall query trend and growth pattern
2. Most popular topic area and why it might be trending
3. A brief actionable insight for the channel creator

Be specific, data-driven, and direct. No headers, no bullet points — flowing prose only.`
}

export async function POST() {
  const result = streamText({
    model: anthropic('claude-haiku-4-5-20251001'),
    prompt: buildAnalysisPrompt(),
    maxOutputTokens: 300,
    temperature: 0.7,
  })

  return result.toTextStreamResponse()
}

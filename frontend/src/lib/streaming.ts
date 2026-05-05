import type { SourceItem } from '@/types/api'

const META_SENTINEL = '\x00META\x00'
const END_SENTINEL   = '\x00END\x00'

/* Characters rendered per tick (12 ms ≈ 83 fps).
   4 chars × 83 fps ≈ 330 chars/s — natural reading pace for Korean + English. */
const CHARS_PER_TICK = 4
const TICK_MS        = 12

export interface StreamMeta {
  sources:         SourceItem[] | null
  conversation_id?: string
}

export interface StreamCallbacks {
  onText:  (chunk: string) => void
  onMeta:  (meta: StreamMeta) => void
  onDone:  () => void
  onError: (err: Error) => void
}

export interface StreamResult {
  stop: () => void
}

/**
 * Fetch /api/chat with streaming, then render the answer text character-by-
 * character at ~83 fps to create a natural typing effect.
 *
 * Format produced by the API route:
 *   <answer text>\x00META\x00<JSON>\x00END\x00
 */
export function streamChat(
  body: {
    query:            string
    conversation_id?: string | null
    include_history?: boolean
  },
  callbacks: StreamCallbacks,
): StreamResult {
  const { onText, onMeta, onDone, onError } = callbacks

  const ac      = new AbortController()
  let displayBuf = ''
  let fetchDone  = false
  let stopped    = false
  let timer: ReturnType<typeof setInterval> | null = null

  function cleanup() {
    if (timer !== null) {
      clearInterval(timer)
      timer = null
    }
  }

  function flushTick() {
    /* If buffer is empty, check whether fetch is done. */
    if (!displayBuf.length) {
      if (fetchDone) {
        cleanup()
        if (!stopped) onDone()
      }
      return
    }

    /* Detect the metadata sentinel — flush text before it, parse meta. */
    const metaIdx = displayBuf.indexOf(META_SENTINEL)
    if (metaIdx >= 0) {
      if (metaIdx > 0) onText(displayBuf.slice(0, metaIdx))

      const rest   = displayBuf.slice(metaIdx + META_SENTINEL.length)
      const endIdx = rest.indexOf(END_SENTINEL)

      if (endIdx >= 0) {
        try {
          const meta = JSON.parse(rest.slice(0, endIdx)) as StreamMeta
          onMeta({ sources: meta.sources ?? null, conversation_id: meta.conversation_id })
        } catch {}
        displayBuf = rest.slice(endIdx + END_SENTINEL.length)
      } else {
        displayBuf = ''
      }
      return
    }

    /* Normal display: emit up to CHARS_PER_TICK characters per tick. */
    const n = Math.min(CHARS_PER_TICK, displayBuf.length)
    onText(displayBuf.slice(0, n))
    displayBuf = displayBuf.slice(n)
  }

  /* Start the display loop before the fetch so the first byte shows instantly. */
  timer = setInterval(flushTick, TICK_MS)

  /* Fetch runs concurrently; data lands in displayBuf as it arrives. */
  ;(async () => {
    try {
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
        signal:  ac.signal,
      })

      if (!res.ok) {
        const txt = await res.text().catch(() => `HTTP ${res.status}`)
        throw new Error(txt)
      }
      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const dec    = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        displayBuf += dec.decode(value, { stream: true })
      }

      fetchDone = true
      /* flushTick will see fetchDone and call onDone once the buffer empties. */
    } catch (err) {
      cleanup()
      if (err instanceof Error) {
        if (err.name !== 'AbortError') onError(err)
        /* AbortError means stop() was called; onDone already dispatched. */
      }
    }
  })()

  return {
    stop() {
      stopped = true
      ac.abort()
      cleanup()
      /* Call onDone on next tick so callers that synchronously check state
         still see isStreaming=true before the update lands. */
      setTimeout(onDone, 0)
    },
  }
}

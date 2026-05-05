import type { SourceItem } from '@/types/api'

const META_SENTINEL = '\x00META\x00'
const END_SENTINEL   = '\x00END\x00'

const CHARS_PER_TICK = 4   // characters rendered per tick
const TICK_MS        = 12  // ~83 fps

export interface StreamMeta {
  sources:          SourceItem[] | null
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

export function streamChat(
  body: {
    query:            string
    conversation_id?: string | null
    include_history?: boolean
  },
  callbacks: StreamCallbacks,
): StreamResult {
  const { onText, onMeta, onDone, onError } = callbacks

  const ac       = new AbortController()
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
    /* Buffer empty — check if fetch is also done */
    if (!displayBuf.length) {
      if (fetchDone) {
        cleanup()
        if (!stopped) onDone()
      }
      return
    }

    const metaIdx = displayBuf.indexOf(META_SENTINEL)

    if (metaIdx >= 0) {
      if (metaIdx > 0) {
        /* Text still exists before the sentinel.
           Display it CHARS_PER_TICK chars at a time so the animation is visible.
           Do NOT flush everything at once — that was the streaming bug. */
        const n = Math.min(CHARS_PER_TICK, metaIdx)
        onText(displayBuf.slice(0, n))
        displayBuf = displayBuf.slice(n)
        return
      }

      /* Sentinel is at position 0: all preceding text has been displayed.
         Now parse and emit the metadata. */
      const rest   = displayBuf.slice(META_SENTINEL.length)
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

    /* Normal path: no sentinel in sight — display CHARS_PER_TICK chars */
    const n = Math.min(CHARS_PER_TICK, displayBuf.length)
    onText(displayBuf.slice(0, n))
    displayBuf = displayBuf.slice(n)
  }

  timer = setInterval(flushTick, TICK_MS)

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
      /* flushTick will call onDone once the display buffer is emptied */
    } catch (err) {
      cleanup()
      if (err instanceof Error) {
        if (err.name !== 'AbortError') onError(err)
      }
    }
  })()

  return {
    stop() {
      stopped = true
      ac.abort()
      cleanup()
      setTimeout(onDone, 0)
    },
  }
}

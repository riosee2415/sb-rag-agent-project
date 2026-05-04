export const tokens = {
  colors: {
    bg: '#0a0a0a',
    surface: '#141414',
    surfaceHover: '#1c1c1c',
    border: '#262626',
    borderStrong: '#333333',
    text: '#ededed',
    textMuted: '#888888',
    textDim: '#555555',
    accent: '#c4f542',
    accentDim: 'rgba(196, 245, 66, 0.125)',
  },
  font: {
    sans: "'Pretendard Variable', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
    mono: "var(--font-jbm, 'JetBrains Mono'), 'Cascadia Code', Consolas, monospace",
  },
  fontSize: {
    xs: '11px',
    sm: '13px',
    base: '14px',
    lg: '16px',
    xl: '20px',
    '2xl': '28px',
  },
  letterSpacing: {
    mono: '0.05em',
    label: '0.15em',
    body: '-0.01em',
  },
  layout: {
    sidebarWidth: '240px',
    chatMaxWidth: '720px',
    pagePx: '48px',
    msgGap: '32px',
  },
  motion: {
    duration: '180ms',
    msgDuration: '200ms',
    ease: 'cubic-bezier(0.16, 1, 0.3, 1)',
  },
  radius: {
    none: '0',
    sm: '1px',
    default: '2px',
  },
} as const

export type Tokens = typeof tokens

/* CSS var accessor helpers */
export const v = {
  bg: 'var(--bg)',
  surface: 'var(--surface)',
  surfaceHover: 'var(--surface-hover)',
  border: 'var(--el-border)',
  borderStrong: 'var(--el-border-strong)',
  text: 'var(--el-text)',
  textMuted: 'var(--el-text-muted)',
  textDim: 'var(--el-text-dim)',
  accent: 'var(--el-accent)',
  accentDim: 'var(--el-accent-dim)',
  fontSans: 'var(--font-sans)',
  fontMono: 'var(--font-mono)',
} as const

export const tokens = {
  colors: {
    bg:             '#0a0a0a',
    surface:        '#141414',
    surfaceHover:   '#1c1c1c',
    surfaceElevated:'#1f1f1f',
    surfaceBright:  '#2a2a2a',
    border:         '#262626',
    borderStrong:   '#333333',
    borderBright:   '#404040',
    textBright:     '#ffffff',
    text:           '#ededed',
    textMuted:      '#b0b0b0',
    textDim:        '#808080',
    accent:         '#c4f542',
    accentDim:      'rgba(196, 245, 66, 0.125)',
  },
  font: {
    sans: "'Pretendard Variable', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
    mono: "var(--font-jbm, 'JetBrains Mono'), 'Cascadia Code', Consolas, monospace",
  },
  fontSize: {
    xs:   '12px',
    sm:   '14px',
    base: '15px',
    lg:   '17px',
    xl:   '22px',
    '2xl':'30px',
  },
  letterSpacing: {
    mono:  '0.05em',
    label: '0.15em',
    body:  '-0.01em',
  },
  layout: {
    sidebarWidth: '240px',
    chatMaxWidth: '720px',
    pagePx:       '48px',
    msgGap:       '32px',
  },
  motion: {
    duration:    '180ms',
    msgDuration: '200ms',
    ease:        'cubic-bezier(0.16, 1, 0.3, 1)',
  },
  radius: {
    none:    '0',
    sm:      '1px',
    default: '2px',
  },
} as const

export type Tokens = typeof tokens

/* CSS var accessor helpers */
export const v = {
  bg:              'var(--bg)',
  surface:         'var(--surface)',
  surfaceHover:    'var(--surface-hover)',
  surfaceElevated: 'var(--surface-elevated)',
  surfaceBright:   'var(--surface-bright)',
  border:          'var(--el-border)',
  borderStrong:    'var(--el-border-strong)',
  borderBright:    'var(--border-bright)',
  textBright:      'var(--text-bright)',
  text:            'var(--el-text)',
  textMuted:       'var(--el-text-muted)',
  textDim:         'var(--el-text-dim)',
  accent:          'var(--el-accent)',
  accentDim:       'var(--el-accent-dim)',
  glowAccent:      'var(--glow-accent)',
  glowBright:      'var(--glow-bright)',
  fontSans:        'var(--font-sans)',
  fontMono:        'var(--font-mono)',
} as const

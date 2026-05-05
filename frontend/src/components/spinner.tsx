import { v } from '@/lib/design-tokens'

interface SpinnerProps {
  size?:  number
  color?: string
}

export function Spinner({ size = 14, color }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="로딩 중"
      style={{
        display:         'inline-block',
        width:           size,
        height:          size,
        border:          `1.5px solid ${v.border}`,
        borderTopColor:  color ?? v.textMuted,
        borderRadius:    '50%',
        animation:       'spin 0.7s linear infinite',
        flexShrink:      0,
        verticalAlign:   'middle',
      }}
    />
  )
}

interface ElysiaLogoProps {
  width?: number
  glow?: boolean
  className?: string
}

export function ElysiaLogo({ width = 100, glow = false, className }: ElysiaLogoProps) {
  return (
    <img
      src="/Elisia_logo.png"
      alt="엘리시아"
      draggable={false}
      style={{
        display: 'block',
        width,
        height: 'auto',
        filter: glow
          ? 'drop-shadow(0 0 8px rgba(167,139,250,0.7)) drop-shadow(0 0 20px rgba(124,58,237,0.4))'
          : undefined,
      }}
      className={className}
    />
  )
}

import type { Metadata } from 'next'
import { JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { Toaster } from 'sonner'

const jbm = JetBrains_Mono({
  subsets:  ['latin'],
  variable: '--font-jbm',
  display:  'swap',
  weight:   ['400', '500', '600'],
})

export const metadata: Metadata = {
  title:       'Elysia',
  description: '실밸개발자 유튜브 채널 knowledge agent · v0.11',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`dark ${jbm.variable}`}>
      <body>
        {children}
        <Toaster
          richColors
          position="top-right"
          theme="dark"
          toastOptions={{
            style: {
              background:   'var(--surface)',
              border:       '1px solid var(--el-border)',
              color:        'var(--el-text)',
              fontFamily:   'var(--font-mono)',
              fontSize:     '13px',
              borderRadius: '2px',
              boxShadow:    'none',
            },
          }}
        />
        <Analytics />
      </body>
    </html>
  )
}

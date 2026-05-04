import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'
import { AuroraBackground } from '@/components/ui/AuroraBackground'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '엘리시아 (Elysia)',
  description: '실밸개발자 유튜브 영상을 AI로 검색하세요 · by AI엔지니어 UPU',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="dark">
      <body
        className={`${inter.className} bg-[#07070F] text-[#EDE9FE] min-h-[100dvh] overflow-x-hidden`}
      >
        <AuroraBackground />
        {/* 노이즈 텍스처 오버레이 */}
        <div
          className="pointer-events-none fixed inset-0 z-50 opacity-[0.025]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
            backgroundSize: '128px 128px',
          }}
          aria-hidden="true"
        />
        {children}
        <Toaster richColors position="top-right" theme="dark" />
      </body>
    </html>
  )
}

import { Header } from '@/components/layout/Header'
import { ChatPageClient } from './ChatPageClient'

export default function HomePage() {
  return (
    <div className="flex flex-col h-[100dvh] bg-[#07070F] relative">
      <Header />
      <ChatPageClient />
    </div>
  )
}

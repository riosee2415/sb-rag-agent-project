import { PromptWatchHeader } from '@/components/promptwatch/header'
import { AnalysisSummary } from '@/components/promptwatch/analysis-summary'
import { ChartGrid } from '@/components/promptwatch/chart-grid'
import { ProjectionsPanel } from '@/components/promptwatch/projections-panel'
import { v } from '@/lib/design-tokens'

export default function PromptWatchPage() {
  return (
    <div
      className="flex flex-col h-[100dvh] overflow-hidden"
      style={{ backgroundColor: v.bg, color: v.text }}
    >
      <PromptWatchHeader />
      <AnalysisSummary />

      {/* Main content: chart grid (65%) + projections panel (35%) */}
      <div className="flex flex-1 min-h-0">
        {/* Left: 2×2 chart grid */}
        <div className="flex-[65] min-w-0">
          <ChartGrid />
        </div>

        {/* Right: projections */}
        <div className="flex-[35] min-w-0">
          <ProjectionsPanel />
        </div>
      </div>
    </div>
  )
}

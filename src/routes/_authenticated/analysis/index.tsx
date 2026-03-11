import { createFileRoute } from '@tanstack/react-router'
import { TradingAnalysis } from '@/features/analysis'

export const Route = createFileRoute('/_authenticated/analysis/')({
  component: TradingAnalysis,
})

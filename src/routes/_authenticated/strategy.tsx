import { createFileRoute } from '@tanstack/react-router'
import { StrategyDashboard } from '@/features/strategy'

export const Route = createFileRoute('/_authenticated/strategy')({
  component: StrategyDashboard,
})

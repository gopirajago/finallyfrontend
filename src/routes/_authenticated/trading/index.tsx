import { createFileRoute } from '@tanstack/react-router'
import { TradingPlatform } from '@/features/trading'

export const Route = createFileRoute('/_authenticated/trading/')({
  component: TradingPlatform,
})

import { createFileRoute } from '@tanstack/react-router'
import { PnlPage } from '@/features/pnl'

export const Route = createFileRoute('/_authenticated/pnl/')({
  component: PnlPage,
})

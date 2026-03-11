import { createFileRoute } from '@tanstack/react-router'
import { Portfolio } from '@/features/portfolio'

export const Route = createFileRoute('/_authenticated/portfolio/')({
  component: Portfolio,
})

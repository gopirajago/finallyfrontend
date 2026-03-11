import { createFileRoute } from '@tanstack/react-router'
import { Options } from '@/features/options'

export const Route = createFileRoute('/_authenticated/options/')({
  component: Options,
})

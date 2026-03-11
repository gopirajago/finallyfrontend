import { createFileRoute } from '@tanstack/react-router'
import { SettingsClaude } from '@/features/settings/claude'

export const Route = createFileRoute('/_authenticated/settings/claude')({
  component: SettingsClaude,
})

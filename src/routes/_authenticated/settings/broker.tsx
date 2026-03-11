import { createFileRoute } from '@tanstack/react-router'
import { SettingsBroker } from '@/features/settings/broker'

export const Route = createFileRoute('/_authenticated/settings/broker')({
  component: SettingsBroker,
})

import { apiClient } from './api-client'

export interface ClaudeSettings {
  id: number
  user_id: number
  api_key: string | null
  model: string
  updated_at: string
}

export const CLAUDE_MODELS = [
  'claude-opus-4-5',
  'claude-sonnet-4-5',
  'claude-haiku-4-5',
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022',
  'claude-3-opus-20240229',
]

export const claudeApi = {
  getSettings: async (): Promise<ClaudeSettings | null> => {
    const res = await apiClient.get<ClaudeSettings | null>('/claude')
    return res.data
  },

  saveSettings: async (payload: {
    api_key?: string
    model?: string
  }): Promise<ClaudeSettings> => {
    const res = await apiClient.put<ClaudeSettings>('/claude', payload)
    return res.data
  },

  verifyKey: async (): Promise<{ valid: boolean; model: string }> => {
    const res = await apiClient.post<{ valid: boolean; model: string }>('/claude/verify')
    return res.data
  },
}

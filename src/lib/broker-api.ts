import { apiClient } from './api-client'

export interface BrokerSettings {
  id: number
  user_id: number
  broker: string
  api_key: string | null
  api_secret: string | null
  access_token: string | null
  token_generated_at: string | null
  updated_at: string
}

export interface GenerateTokenResponse {
  access_token: string
  token_generated_at: string
}

export const brokerApi = {
  getSettings: async (): Promise<BrokerSettings | null> => {
    const res = await apiClient.get<BrokerSettings | null>('/broker')
    return res.data
  },

  saveSettings: async (payload: {
    api_key?: string
    api_secret?: string
  }): Promise<BrokerSettings> => {
    const res = await apiClient.put<BrokerSettings>('/broker', payload)
    return res.data
  },

  generateToken: async (): Promise<GenerateTokenResponse> => {
    const res = await apiClient.post<GenerateTokenResponse>(
      '/broker/generate-token'
    )
    return res.data
  },
}

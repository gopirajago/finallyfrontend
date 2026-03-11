import { apiClient } from './api-client'
import type { AuthUser } from '@/stores/auth-store'

export interface LoginResponse {
  access_token: string
  refresh_token: string
  token_type: string
  user: AuthUser
}

export interface RegisterPayload {
  email: string
  username: string
  password: string
  full_name?: string
}

export const authApi = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const form = new URLSearchParams()
    form.append('username', username)
    form.append('password', password)
    const { data } = await apiClient.post<LoginResponse>('/auth/login', form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    return data
  },

  register: async (payload: RegisterPayload): Promise<AuthUser> => {
    const { data } = await apiClient.post<AuthUser>('/auth/register', payload)
    return data
  },

  logout: async (refreshToken: string): Promise<void> => {
    await apiClient.post('/auth/logout', { refresh_token: refreshToken })
  },

  forgotPassword: async (email: string): Promise<{ message: string; debug_reset_token?: string }> => {
    const { data } = await apiClient.post('/auth/forgot-password', { email })
    return data
  },

  resetPassword: async (token: string, new_password: string): Promise<{ message: string }> => {
    const { data } = await apiClient.post('/auth/reset-password', { token, new_password })
    return data
  },

  getMe: async (): Promise<AuthUser> => {
    const { data } = await apiClient.get<AuthUser>('/auth/me')
    return data
  },
}

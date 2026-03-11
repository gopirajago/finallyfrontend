import { apiClient } from './api-client'
import type { AuthUser } from '@/stores/auth-store'

export interface ApiUser extends AuthUser {
  updated_at: string
}

export interface CreateUserPayload {
  email: string
  username: string
  password: string
  full_name?: string
  is_superuser?: boolean
}

export interface UpdateUserPayload {
  email?: string
  username?: string
  full_name?: string
  is_active?: boolean
  is_superuser?: boolean
  password?: string
}

export const usersApi = {
  list: async (skip = 0, limit = 100): Promise<ApiUser[]> => {
    const { data } = await apiClient.get<ApiUser[]>('/users/', { params: { skip, limit } })
    return data
  },

  get: async (id: number): Promise<ApiUser> => {
    const { data } = await apiClient.get<ApiUser>(`/users/${id}`)
    return data
  },

  create: async (payload: CreateUserPayload): Promise<ApiUser> => {
    const { data } = await apiClient.post<ApiUser>('/users/', payload)
    return data
  },

  update: async (id: number, payload: UpdateUserPayload): Promise<ApiUser> => {
    const { data } = await apiClient.patch<ApiUser>(`/users/${id}`, payload)
    return data
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/users/${id}`)
  },

  updateMe: async (payload: UpdateUserPayload): Promise<ApiUser> => {
    const { data } = await apiClient.patch<ApiUser>('/users/me', payload)
    return data
  },
}

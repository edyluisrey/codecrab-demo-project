import type { AuthToken, User, UserCreate } from '../types'
import { apiClient } from './client'

export const authApi = {
  async login(email: string, password: string): Promise<AuthToken> {
    const form = new URLSearchParams({ username: email, password })
    const { data } = await apiClient.post<AuthToken>('/auth/login', form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    return data
  },

  async register(payload: UserCreate): Promise<User> {
    const { data } = await apiClient.post<User>('/auth/register', payload)
    return data
  },

  async me(): Promise<User> {
    const { data } = await apiClient.get<User>('/auth/me', { silent: true })
    return data
  },
}

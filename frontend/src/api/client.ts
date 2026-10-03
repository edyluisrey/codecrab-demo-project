import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'

import type { ApiError, ApiErrorBody } from '../types'
import { emitLogout, emitToast } from './events'
import { tokenStorage } from './token'

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Suppress the global error toast for this request. */
    silent?: boolean
  }
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStorage.get()
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

function extractMessage(body: ApiErrorBody | undefined, fallback: string): string {
  if (!body) return fallback
  if (typeof body.detail === 'string') return body.detail
  if (Array.isArray(body.detail) && body.detail.length > 0) {
    return body.detail.map((d) => d.msg).join('; ')
  }
  return fallback
}

export function toApiError(error: unknown): ApiError {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    const status = error.response?.status ?? null
    return {
      status,
      code: error.response?.data?.code ?? (status === null ? 'network_error' : 'http_error'),
      message: extractMessage(
        error.response?.data,
        status === null ? 'Unable to reach the server' : error.message,
      ),
    }
  }
  return { status: null, code: 'unknown_error', message: 'An unexpected error occurred' }
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    if (axios.isCancel(error)) {
      return Promise.reject({ status: null, code: 'cancelled', message: 'Request cancelled' } satisfies ApiError)
    }

    const apiError = toApiError(error)

    if (apiError.status === 401 && tokenStorage.get()) {
      tokenStorage.clear()
      emitLogout()
      emitToast('Your session has expired. Please sign in again.', 'error')
    } else if (!error.config?.silent) {
      emitToast(apiError.message, 'error')
    }

    return Promise.reject(apiError)
  },
)

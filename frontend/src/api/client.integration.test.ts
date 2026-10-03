import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { server } from '../test/server'
import { apiClient } from './client'
import { LOGOUT_EVENT, TOAST_EVENT, type ToastPayload } from './events'
import { tokenStorage } from './token'

const toasts: ToastPayload[] = []
const recordToast = (event: Event) => toasts.push((event as CustomEvent<ToastPayload>).detail)

beforeEach(() => {
  toasts.length = 0
  window.addEventListener(TOAST_EVENT, recordToast)
})

afterEach(() => {
  window.removeEventListener(TOAST_EVENT, recordToast)
})

describe('apiClient request interceptor', () => {
  it('sends the stored JWT as a bearer token', async () => {
    let authHeader: string | null = null
    server.use(
      http.get('*/api/v1/ping', ({ request }) => {
        authHeader = request.headers.get('Authorization')
        return HttpResponse.json({ ok: true })
      }),
    )
    tokenStorage.set('abc123')

    await apiClient.get('/ping')

    expect(authHeader).toBe('Bearer abc123')
  })

  it('omits the Authorization header when signed out', async () => {
    let authHeader: string | null = 'unset'
    server.use(
      http.get('*/api/v1/ping', ({ request }) => {
        authHeader = request.headers.get('Authorization')
        return HttpResponse.json({ ok: true })
      }),
    )

    await apiClient.get('/ping')

    expect(authHeader).toBeNull()
  })
})

describe('apiClient response interceptor', () => {
  it('rejects with a normalized ApiError and shows an error toast', async () => {
    server.use(
      http.get('*/api/v1/fail', () =>
        HttpResponse.json({ detail: 'Insufficient stock', code: 'insufficient_stock' }, { status: 400 }),
      ),
    )

    await expect(apiClient.get('/fail')).rejects.toEqual({
      status: 400,
      code: 'insufficient_stock',
      message: 'Insufficient stock',
    })
    expect(toasts).toEqual([{ message: 'Insufficient stock', variant: 'error' }])
  })

  it('does not toast when the request is marked silent', async () => {
    server.use(
      http.get('*/api/v1/fail', () => HttpResponse.json({ detail: 'nope', code: 'x' }, { status: 500 })),
    )

    await expect(apiClient.get('/fail', { silent: true })).rejects.toMatchObject({ status: 500 })
    expect(toasts).toEqual([])
  })

  it('clears the session and emits logout on 401 when a token exists', async () => {
    server.use(
      http.get('*/api/v1/private', () =>
        HttpResponse.json({ detail: 'Could not validate credentials', code: 'unauthorized' }, { status: 401 }),
      ),
    )
    const onLogout = vi.fn()
    window.addEventListener(LOGOUT_EVENT, onLogout)
    tokenStorage.set('expired')

    await expect(apiClient.get('/private')).rejects.toMatchObject({ status: 401 })

    window.removeEventListener(LOGOUT_EVENT, onLogout)
    expect(tokenStorage.get()).toBeNull()
    expect(onLogout).toHaveBeenCalledOnce()
    expect(toasts).toEqual([
      { message: 'Your session has expired. Please sign in again.', variant: 'error' },
    ])
  })

  it('treats 401 without a token as a normal error (e.g. bad login)', async () => {
    server.use(
      http.post('*/api/v1/auth/login', () =>
        HttpResponse.json({ detail: 'Incorrect email or password', code: 'invalid_credentials' }, { status: 401 }),
      ),
    )
    const onLogout = vi.fn()
    window.addEventListener(LOGOUT_EVENT, onLogout)

    await expect(apiClient.post('/auth/login')).rejects.toMatchObject({ code: 'invalid_credentials' })

    window.removeEventListener(LOGOUT_EVENT, onLogout)
    expect(onLogout).not.toHaveBeenCalled()
    expect(toasts).toEqual([{ message: 'Incorrect email or password', variant: 'error' }])
  })

  it('rejects cancelled requests silently', async () => {
    const controller = new AbortController()
    controller.abort()

    await expect(apiClient.get('/products', { signal: controller.signal })).rejects.toMatchObject({
      code: 'cancelled',
    })
    expect(toasts).toEqual([])
  })
})

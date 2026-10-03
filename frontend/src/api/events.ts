export type ToastVariant = 'success' | 'error' | 'info'

export interface ToastPayload {
  message: string
  variant: ToastVariant
}

export const TOAST_EVENT = 'app:toast'
export const LOGOUT_EVENT = 'auth:logout'

export function emitToast(message: string, variant: ToastVariant = 'info'): void {
  window.dispatchEvent(new CustomEvent<ToastPayload>(TOAST_EVENT, { detail: { message, variant } }))
}

export function emitLogout(): void {
  window.dispatchEvent(new Event(LOGOUT_EVENT))
}

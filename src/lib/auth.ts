import { browser } from '$app/environment'

const STORAGE_KEY = 'auth_email'

export function setAuth(email: string) {
  if (browser) localStorage.setItem(STORAGE_KEY, email)
}

export function getAuthEmail(): string | null {
  if (!browser) return null
  return localStorage.getItem(STORAGE_KEY)
}

export function clearAuth() {
  if (browser) localStorage.removeItem(STORAGE_KEY)
}

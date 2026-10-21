import { expect } from '@playwright/test'

export const API = process.env.E2E_API_URL || 'http://localhost:8800/api'
export const PASSWORD = 'Test#12345'

/** Sign in through the API and seed the tokens, as the login page would. */
export async function signIn(page, username) {
  const res = await page.request.post(`${API}/token/`, { data: { username, password: PASSWORD } })
  expect(res.ok(), `login ${username}`).toBeTruthy()
  const { access, refresh } = await res.json()
  await page.addInitScript(([a, r]) => {
    localStorage.setItem('access_token', a)
    localStorage.setItem('refresh_token', r)
  }, [access, refresh])
  return access
}

/** Collect page errors and failed API calls so a test can assert there were none. */
export function watchErrors(page) {
  const errors = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('response', (r) => {
    if (r.status() >= 400 && r.url().includes('/api/')) errors.push(`${r.status()} ${r.url()}`)
  })
  return errors
}

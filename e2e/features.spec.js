import { test, expect } from '@playwright/test'
import { createHmac } from 'node:crypto'
import { API, PASSWORD, signIn, watchErrors } from './helpers'

const b32decode = (s) => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''
  for (const c of s.replace(/=+$/, '')) bits += alphabet.indexOf(c).toString(2).padStart(5, '0')
  return Buffer.from(bits.match(/.{8}/g).map((b) => parseInt(b, 2)))
}
const totp = (secret, offset = 0) => {
  const counter = Math.floor(Date.now() / 30000) + offset
  const msg = Buffer.alloc(8)
  msg.writeBigUInt64BE(BigInt(counter))
  const h = createHmac('sha1', b32decode(secret)).update(msg).digest()
  const o = h[h.length - 1] & 15
  return String(((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000)).padStart(6, '0')
}
const auth = (token) => ({ Authorization: `Bearer ${token}` })

test('second opinion: link shows a de-identified case, reply reaches the owner, revoke closes it', async ({ page, browser }) => {
  const token = await signIn(page, 'medecin')
  const subs = await (await page.request.get(`${API}/submissions/`, { headers: auth(token) })).json()
  const sub = (subs.results || subs)[0]
  const created = await (await page.request.post(`${API}/submissions/${sub.id}/second-opinion/`, { headers: auth(token), data: { question: 'Chirurgie ou endoscopie ?', days: 3 } })).json()

  const guest = await browser.newPage() // no tokens: a stranger with the link
  await guest.goto(`/second-opinion/${created.token}`)
  await expect(guest.getByText('Chirurgie ou endoscopie ?')).toBeVisible()
  await expect(guest.getByText('Ictère rétentionnel')).toBeVisible()
  await expect(guest.locator('body')).not.toContainText(sub.reference_code)
  await guest.getByLabel(/Votre nom/).fill('Pr Test')
  await guest.getByLabel('Avis').fill('Plutôt endoscopique.')
  await guest.getByRole('button', { name: /Envoyer/ }).click()
  await expect(guest.getByText('Merci, votre avis a été transmis.')).toBeVisible()

  const links = await (await page.request.get(`${API}/submissions/${sub.id}/second-opinion/`, { headers: auth(token) })).json()
  expect(links[0].replies[0].message).toBe('Plutôt endoscopique.')

  await page.request.post(`${API}/second-opinions/${created.id}/revoke/`, { headers: auth(token) })
  await guest.reload()
  await expect(guest.getByRole('heading', { name: /invalide ou expiré/ })).toBeVisible()
})

test('2FA: login asks for a code, accepts a valid one, refuses a wrong one', async ({ page }) => {
  const token = await signIn(page, 'expert')
  const { secret } = await (await page.request.post(`${API}/auth/2fa/setup/`, { headers: auth(token) })).json()
  const enabled = await page.request.post(`${API}/auth/2fa/enable/`, { headers: auth(token), data: { code: totp(secret) } })
  expect(enabled.ok()).toBeTruthy()
  try {
    const fresh = await page.context().browser().newPage()
    await fresh.goto('/login')
    await fresh.getByLabel("Nom d'utilisateur").fill('expert')
    await fresh.getByLabel('Mot de passe').fill(PASSWORD)
    await fresh.getByRole('button', { name: 'Se connecter' }).click()
    const popup = fresh.getByRole('dialog', { name: 'Vérification en deux étapes' })
    await expect(popup).toBeVisible()
    await expect(popup.getByLabel('Chiffre 1')).toBeFocused()
    await fresh.keyboard.type('000000') // the sixth digit submits by itself
    await expect(popup.locator('.tfp-error')).toContainText(/invalide/i)
    await expect(popup.getByLabel('Chiffre 1')).toBeFocused()
    await fresh.keyboard.type(totp(secret, 1)) // next window: the enrolment code is already used
    await expect(fresh).toHaveURL('/')
  } finally {
    // admin unlocks the account so other tests keep working
    const admin = await signIn(page, 'admin')
    const me = await (await page.request.get(`${API}/users/?search=expert`, { headers: auth(admin) })).json()
    const user = (me.results || me).find((u) => u.username === 'expert')
    await page.request.post(`${API}/auth/2fa/reset/${user.id}/`, { headers: auth(admin) })
  }
})

test('decision follow-up: coordinator assigns an action, the owner completes it from the dashboard', async ({ page, browser }) => {
  const errors = watchErrors(page)
  const coord = await signIn(page, 'coord')
  const reports = await (await page.request.get(`${API}/reports/`, { headers: auth(coord) })).json()
  const report = (reports.results || reports)[0]
  const users = await (await page.request.get(`${API}/users/?search=medecin`, { headers: auth(coord) })).json()
  const owner = (users.results || users).find((u) => u.username === 'medecin')
  const created = await page.request.post(`${API}/decision-actions/`, { headers: auth(coord), data: { report: report.id, description: 'Programmer une IRM', owner: owner.id, due_date: '2030-01-01' } })
  expect(created.ok()).toBeTruthy()

  const doc = await browser.newPage()
  await signIn(doc, 'medecin')
  await doc.goto('/', { waitUntil: 'networkidle' })
  const row = doc.locator('.dash-action', { hasText: 'Programmer une IRM' })
  await expect(row).toBeVisible()
  await row.locator('input').click()
  await expect(row).toHaveCount(0)
  expect(errors).toEqual([])
})

test('represent: a case goes back to "À rediscuter" on the next planned meeting', async ({ page }) => {
  const token = await signIn(page, 'medecin')
  const subs = await (await page.request.get(`${API}/submissions/`, { headers: auth(token) })).json()
  const sub = (subs.results || subs)[0]
  const res = await page.request.post(`${API}/submissions/${sub.id}/represent/`, { headers: auth(token) })
  expect(res.ok()).toBeTruthy()
  expect((await res.json()).status).toBe('A_REDISCUTER')
})

test('full-text case search finds clinical content', async ({ page }) => {
  const token = await signIn(page, 'medecin')
  const res = await (await page.request.get(`${API}/submission-search/?q=dilatation biliaires`, { headers: auth(token) })).json()
  expect(res.results.length).toBeGreaterThan(0)
})

import { test, expect } from '@playwright/test'
import { API, PASSWORD, signIn, watchErrors } from './helpers'

test.describe('sign in', () => {
  test('login form signs a doctor in and shows the dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel("Nom d'utilisateur").fill('medecin')
    await page.getByLabel('Mot de passe').fill(PASSWORD)
    await page.getByRole('button', { name: 'Se connecter' }).click()
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Bonjour|Bonsoir/)
  })

  test('wrong password is refused with a message', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel("Nom d'utilisateur").fill('medecin')
    await page.getByLabel('Mot de passe').fill('nope')
    await page.getByRole('button', { name: 'Se connecter' }).click()
    await expect(page.locator('.error')).toBeVisible()
  })

  test('anonymous visitors are sent to the login page', async ({ page }) => {
    await page.goto('/meetings')
    await expect(page).toHaveURL(/\/login/)
  })
})

for (const [user, pages] of Object.entries({
  admin: ['/', '/forms', '/patients', '/meetings', '/reports', '/users', '/analytics', '/audit-logs'],
  coord: ['/', '/meetings', '/meetings/requests', '/analytics'],
  medecin: ['/', '/forms', '/patients', '/meetings', '/reports'],
})) {
  test(`${user}: main pages load without errors, with one h1 and a title`, async ({ page }) => {
    const errors = watchErrors(page)
    await signIn(page, user)
    for (const path of pages) {
      await page.goto(path, { waitUntil: 'networkidle' })
      await expect(page.locator('h1'), path).toHaveCount(1)
      expect(await page.title(), path).not.toBe('')
    }
    expect(errors).toEqual([])
  })
}

test('meetings calendar: toggle, navigate months, open a meeting', async ({ page }) => {
  await signIn(page, 'admin')
  await page.goto('/meetings')
  await page.getByRole('button', { name: /Calendrier/ }).click()
  const title = page.locator('.mcal-title')
  const before = await title.textContent()
  await page.getByRole('button', { name: 'Mois suivant' }).click()
  await expect(title).not.toHaveText(before)
  await page.getByRole('button', { name: 'Aujourd’hui' }).click()
  await expect(title).toHaveText(before)
  await page.locator('.mcal-chip').first().click()
  await expect(page).toHaveURL(/\/meetings\/[0-9a-f-]{36}/)
})

test('agenda order can be changed with the keyboard and persists', async ({ page }) => {
  const token = await signIn(page, 'coord')
  const list = await (await page.request.get(`${API}/meetings/?page_size=50`, { headers: { Authorization: `Bearer ${token}` } })).json()
  const meeting = list.results.find((m) => m.submission_details.length > 1 && m.status !== 'FINISHED')
  await page.goto(`/meetings/${meeting.id}`)
  await page.getByRole('button', { name: 'Ordre de passage' }).click()
  const names = () => page.locator('.agenda-main strong').allInnerTexts()
  const before = await names()
  await page.locator('.agenda-handle').first().focus()
  await page.keyboard.press('Space')
  await page.waitForTimeout(300)
  await page.keyboard.press('ArrowDown')
  await page.waitForTimeout(300)
  await page.keyboard.press('Space')
  await expect.poll(names).not.toEqual(before)
  const after = await names()
  await page.reload()
  await page.getByRole('button', { name: 'Ordre de passage' }).click()
  expect(await names()).toEqual(after)
})

test('command palette opens with Ctrl+K and navigates', async ({ page }) => {
  await signIn(page, 'admin')
  await page.goto('/', { waitUntil: 'networkidle' })
  await page.keyboard.press('Control+k')
  await page.waitForTimeout(500)
  await page.keyboard.type('Réunions')
  await page.waitForTimeout(500)
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/meetings/)
})

test('a coordinator cannot read case content through the API', async ({ page }) => {
  const token = await signIn(page, 'coord')
  const res = await page.request.get(`${API}/submission-search/?q=ict`, { headers: { Authorization: `Bearer ${token}` } })
  expect(res.status()).toBe(403)
})

test('offline banner shows when the network drops', async ({ page }) => {
  await signIn(page, 'medecin')
  page.on('dialog', (d) => { throw new Error(`native dialog: ${d.message()}`) })
  await page.goto('/forms', { waitUntil: 'networkidle' })
  await page.evaluate(() => window.dispatchEvent(new Event('offline')))
  await expect(page.locator('.offline-banner')).toBeVisible()
})

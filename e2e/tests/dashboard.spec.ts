// dashboard.spec.ts — the end-to-end test (#48)
// A real browser opens the real app: React → Vite proxy → FastAPI → Redis/Postgres → a FAKE football-data.org
// (e2e/fake_football_api.py) that replays our recorded responses. Nothing here calls the real football API or Claude.
import { test, expect } from '@playwright/test'

test('the dashboard loads, shows the Premier League table, and switching to the Bundesliga changes it', async ({ page }) => {
  await page.goto('/')                                                     // open the dashboard, like a user would

  const table = page.locator('#standings table')
  await expect(table.locator('tbody tr')).toHaveCount(20)                // the Premier League has 20 teams
  await expect(table).toContainText('Manchester City FC')

  await page.getByRole('button', { name: 'Bundesliga' }).click()         // switch leagues

  await expect(table.locator('tbody tr')).toHaveCount(18)                // the Bundesliga has 18 teams
  await expect(table).toContainText('FC Bayern München')
  await expect(table).not.toContainText('Manchester City FC')            // the Premier League table is gone
})

import { test, expect } from '@playwright/test'

const MOCK_SSE =
  'data: {"stage":"started","runId":"demo-run-001"}\n\n' +
  'data: {"stage":"query_generator","label":"Generated 4 search queries"}\n\n' +
  'data: {"stage":"done","runId":"demo-run-001","post":"# Test Post\\n\\nContent here.","sources":[],"seoMeta":null}\n\n'

test('login page shows heading and demo button', async ({ page }) => {
  await page.goto('/login')
  await expect(page.locator('h1')).toBeVisible()
  await expect(page.locator('button.demo-btn')).toBeVisible()
})

test('demo page shows banner and pre-filled topic', async ({ page }) => {
  await page.goto('/generate?demo')
  await expect(page.locator('[role="status"] .demo-badge')).toBeVisible()
  const topicInput = page.locator('input[type="text"], textarea').first()
  await expect(topicInput).not.toHaveValue('')
})

test('demo mode shows history items in sidebar', async ({ page }) => {
  await page.goto('/generate?demo')
  const historyItems = page.locator('.history-item-btn')
  await expect(historyItems).toHaveCount(2)
  await expect(historyItems.nth(0)).toBeVisible()
  await expect(historyItems.nth(1)).toBeVisible()
})

test('clicking a history item navigates to preview page', async ({ page }) => {
  await page.goto('/generate?demo')
  await page.locator('.history-item-btn').first().click()
  await expect(page).toHaveURL(/\/preview\/demo-history-\d+\?demo/)
  await expect(page.locator('h1, h2').first()).toBeVisible()
})

test('generate with mocked SSE navigates to drafts and shows pipeline', async ({ page }) => {
  await page.route('/api/demo', route => {
    route.fulfill({
      status: 200,
      headers: {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache'
      },
      body: MOCK_SSE
    })
  })

  await page.goto('/generate?demo')
  await page.locator('button.generate-btn').click()

  await expect(page).toHaveURL(/\/drafts\/[0-9a-f-]+\?chat=/, { timeout: 5_000 })
  await expect(page.locator('.sidebar-pipeline').first()).toBeVisible({ timeout: 15_000 })
})

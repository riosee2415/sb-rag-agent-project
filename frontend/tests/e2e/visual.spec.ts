import { test, expect } from '@playwright/test'

test.describe('SV Dev RAG — UI', () => {
  test('onboarding screen renders on first load', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('SV Dev RAG Agent')).toBeVisible()
    // Onboarding suggestion buttons
    await expect(page.getByText('최근 영상에서 다룬 주제는?')).toBeVisible()
  })

  test('chat input is visible and accepts text', async ({ page }) => {
    await page.goto('/')
    const textarea = page.getByPlaceholder('sv.developer 영상에 대해 질문하세요...')
    await expect(textarea).toBeVisible()
    await textarea.fill('Next.js에 대해 알려줘')
    await expect(textarea).toHaveValue('Next.js에 대해 알려줘')
  })

  test('Enter submits the message', async ({ page }) => {
    await page.route('**/api/v1/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          answer: 'Next.js는 React 기반 프레임워크입니다.',
          sources: [],
          confidence: 0.95,
          cached: false,
        }),
      })
    })

    await page.goto('/')
    const textarea = page.getByPlaceholder('sv.developer 영상에 대해 질문하세요...')
    await textarea.fill('Next.js에 대해 알려줘')
    await textarea.press('Enter')

    await expect(page.getByTestId('user-message')).toBeVisible({ timeout: 5000 })
  })

  test('source cards render when sources are present', async ({ page }) => {
    await page.route('**/api/v1/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          answer: 'Next.js 답변입니다.',
          sources: [
            {
              video_title: 'Next.js 강의',
              timestamp_label: '3:45',
              timestamp_url: 'https://youtube.com/watch?v=test&t=225',
              excerpt: 'Next.js App Router 설명',
            },
          ],
          confidence: 0.9,
          cached: false,
        }),
      })
    })

    await page.goto('/')
    const textarea = page.getByPlaceholder('sv.developer 영상에 대해 질문하세요...')
    await textarea.fill('Next.js에 대해 알려줘')
    await textarea.press('Enter')

    await expect(page.getByTestId('source-card')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Next.js 강의')).toBeVisible()
  })

  test('mobile responsive layout at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')
    // Onboarding should still be visible on mobile
    await expect(page.getByText('SV Dev RAG Agent')).toBeVisible()
    // Chat input should be visible
    const textarea = page.getByPlaceholder('sv.developer 영상에 대해 질문하세요...')
    await expect(textarea).toBeVisible()
  })

  test('dark theme is applied', async ({ page }) => {
    await page.goto('/')
    const html = page.locator('html')
    await expect(html).toHaveClass(/dark/)
  })

  test('sidebar is visible on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/')
    await expect(page.getByTestId('conversation-sidebar')).toBeVisible()
  })
})

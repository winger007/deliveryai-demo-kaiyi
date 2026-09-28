import { test, expect, type Page } from '@playwright/test'

/**
 * 多人聊天点菜功能 E2E 验收测试
 *
 * 入口已移至菜单视图右下角（购物车面板 + 协同提示卡片下方）。
 * 本轮变更（feat/multi-user-cart-sync-4q8d）：消息发送时自动校验菜品并加入共享购物车，
 * 移除手动"代为点菜"按钮，聊天面板嵌入 CartPanel compact 模式实时展示购物车。
 *
 * 覆盖 Spec 核心验收点：
 * - 聊天入口仅在菜单视图可见，首页和顶栏不再有入口（REQ-001）
 * - 从菜单视图右下角入口打开聊天点菜面板（REQ-002）
 * - 参与者加入会话 — 由 DemoConsole 模拟（REQ-003）
 * - 参与者发送聊天消息（REQ-004）
 * - 发送菜品消息自动校验：匹配成功加入购物车并提示成功；匹配失败提示"暂时没有这个菜品"（REQ-001）
 * - 聊天面板内嵌入购物车区域，点菜成功后实时展示共享购物车（REQ-002）
 * - 模拟参与者发送匹配菜品消息，自动加入共享购物车（REQ-003）
 * - 不再显示"代为点菜"按钮，消息发送即自动完成校验和加入购物车（REQ-004）
 *
 * 注意：应用状态为内存态，页面刷新（page.goto）会重置全部状态。
 * 需要跨视图操作时在同一页面内通过点击导航，不重新加载页面。
 */

/** 进入菜单视图（从首页绑定桌台 → welcome → menu）。 */
async function enterMenuView(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: /A08/ }).first().click()
  await page.getByRole('button', { name: /进入点餐|Enter/ }).click()
  await expect(page).toHaveURL(/#\/menu$/)
}

/** 从菜单视图右下角打开聊天点菜面板（桌面端）。 */
async function openChatPanel(page: Page) {
  await enterMenuView(page)
  await page.getByRole('button', { name: /多人聊天点菜/ }).first().click()
}

/** 创建聊天会话。 */
async function createSession(page: Page) {
  await openChatPanel(page)
  await page.getByRole('button', { name: /创建会话/ }).click()
}

/** 在菜单视图中打开聊天面板（不重新导航）。 */
async function openChatFromMenu(page: Page) {
  await page.getByRole('button', { name: /多人聊天点菜/ }).first().click()
}

/** 打开 DemoConsole 面板。 */
async function openDemoConsole(page: Page) {
  await page.getByRole('button', { name: /演示控制台|Demo Console/ }).click()
}

/** 聊天面板内购物车区域定位器（有菜品时标题为"本桌购物车"）。 */
function dialogCartWithItems(page: Page) {
  return page.getByRole('dialog').locator('section', { hasText: '本桌购物车' })
}

test.describe('多人聊天点菜 - E2E 验收测试', () => {

  // ──────────────────────────────────────────────
  // REQ-001: 移除首页和顶栏聊天入口
  // ──────────────────────────────────────────────
  test('REQ-001: 首页不再显示多人聊天点菜入口', async ({ page }) => {
    await page.goto('/')
    const entryCard = page.getByRole('button', { name: /多人聊天点菜/ })
    await expect(entryCard).toHaveCount(0)
  })

  test('REQ-001: 首页桌台选择区域不受影响', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: /A08/ }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /D03/ }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /快速进入|Quick/ })).toBeVisible()
  })

  // ──────────────────────────────────────────────
  // REQ-002: 菜单视图右下角聊天点菜入口
  // ──────────────────────────────────────────────
  test('REQ-002: 菜单视图桌面端右下角可见聊天点菜入口', async ({ page }) => {
    await enterMenuView(page)
    const entryCard = page.getByRole('button', { name: /多人聊天点菜/ }).first()
    await expect(entryCard).toBeVisible()
  })

  test('REQ-002: 点击入口卡片后展示多人聊天点菜会话界面', async ({ page }) => {
    await openChatPanel(page)
    await expect(page.getByText('多人聊天点菜').first()).toBeVisible()
    await expect(page.getByRole('button', { name: /创建会话/ })).toBeVisible()
  })

  // ──────────────────────────────────────────────
  // REQ-002: 创建点菜会话
  // ──────────────────────────────────────────────
  test('REQ-002: 发起者点击创建会话后展示聊天点菜会话界面', async ({ page }) => {
    await createSession(page)
    await expect(page.getByText('参与者', { exact: true })).toBeVisible()
    await expect(page.getByText(/暂无消息/)).toBeVisible()
  })

  test('REQ-002: 参与者列表初始包含发起者本人', async ({ page }) => {
    await createSession(page)
    await expect(page.getByText('姚乾', { exact: true })).toBeVisible()
    await expect(page.getByText(/发起者/)).toBeVisible()
  })

  // ──────────────────────────────────────────────
  // REQ-002: 聊天面板内嵌入购物车区域（空态）
  // ──────────────────────────────────────────────
  test('REQ-002: 创建会话后聊天面板内嵌入购物车区域可见（空态）', async ({ page }) => {
    await createSession(page)
    // 聊天面板内嵌入 CartPanel，购物车为空时显示空态标题
    await expect(page.getByRole('dialog').getByText('这一锅，还差点心动')).toBeVisible()
  })

  // ──────────────────────────────────────────────
  // REQ-001: 发送匹配菜品消息自动加入购物车并提示成功
  // ──────────────────────────────────────────────
  test('REQ-001: 发起者发送匹配菜品消息自动加入购物车并提示成功', async ({ page }) => {
    await createSession(page)
    const input = page.getByPlaceholder(/输入想吃的菜品/)
    await input.fill('鲜虾滑')
    const sendButton = page.locator('button:has(svg.lucide-send)')
    await sendButton.click()

    // 聊天面板内嵌入购物车区域显示新加入的菜品
    await expect(dialogCartWithItems(page)).toBeVisible()
    await expect(dialogCartWithItems(page).getByText('鲜虾滑', { exact: true })).toBeVisible()

    // 关闭聊天面板后，顶部提示条显示点菜成功消息
    await page.keyboard.press('Escape')
    await expect(page.getByText(/已将.*鲜虾滑.*加入购物车/)).toBeVisible()
  })

  // ──────────────────────────────────────────────
  // REQ-001: 发送不匹配菜品消息提示"暂时没有这个菜品"
  // ──────────────────────────────────────────────
  test('REQ-001: 发起者发送不匹配菜品消息提示暂时没有这个菜品', async ({ page }) => {
    await createSession(page)
    const input = page.getByPlaceholder(/输入想吃的菜品/)
    // "麻辣牛肉"不在菜单中（菜单中为"琥珀嫩牛肉"），按子串匹配规则不匹配
    await input.fill('麻辣牛肉')
    const sendButton = page.locator('button:has(svg.lucide-send)')
    await sendButton.click()

    // 购物车仍为空态（未加入任何菜品）
    await expect(page.getByRole('dialog').getByText('这一锅，还差点心动')).toBeVisible()

    // 关闭聊天面板后，顶部提示条显示"暂时没有这个菜品"
    await page.keyboard.press('Escape')
    await expect(page.getByText('暂时没有这个菜品')).toBeVisible()
  })

  // ──────────────────────────────────────────────
  // REQ-002: 点菜成功后聊天面板内购物车显示菜品详情（名称、点菜人）
  // ──────────────────────────────────────────────
  test('REQ-002: 点菜成功后聊天面板内购物车显示菜品名称和点菜人', async ({ page }) => {
    await createSession(page)
    const input = page.getByPlaceholder(/输入想吃的菜品/)
    await input.fill('手工宽粉')
    const sendButton = page.locator('button:has(svg.lucide-send)')
    await sendButton.click()

    // 购物车区域显示菜品名称
    await expect(dialogCartWithItems(page).getByText('手工宽粉', { exact: true })).toBeVisible()
    // 购物车区域显示点菜人（发起者"姚乾 点了"）
    await expect(dialogCartWithItems(page).getByText(/姚乾.*点了/)).toBeVisible()
  })

  // ──────────────────────────────────────────────
  // REQ-003: 模拟参与者发送匹配菜品消息自动加入共享购物车
  // ──────────────────────────────────────────────
  test('REQ-003: 模拟参与者发送匹配菜品消息自动加入共享购物车', async ({ page }) => {
    await createSession(page)
    // 关闭聊天面板，打开 DemoConsole 模拟参与者加入
    await page.keyboard.press('Escape')
    await openDemoConsole(page)
    await page.getByRole('button', { name: /模拟参与者加入/ }).click()

    // DemoConsole 随机发送 5 条模板之一；其中「帮我点一份麻辣牛肉」不匹配任何菜品
    // 其余 4 条各含一个真实菜品名。反复发送直到出现一条可匹配的参与者消息。
    const messageToDish: Record<string, string> = {
      '想要一份鲜虾滑': '鲜虾滑',
      '加一份手工宽粉': '手工宽粉',
      '帮我点一份脆嫩毛肚': '脆嫩毛肚',
      '想喝柠檬青桔饮': '柠檬青桔饮',
    }
    const matchingMessages = Object.keys(messageToDish)
    let matchedDish: string | undefined
    for (let attempt = 0; attempt < 8 && !matchedDish; attempt++) {
      await page.getByRole('button', { name: /模拟参与者发消息/ }).click()
      await page.keyboard.press('Escape')
      await openChatFromMenu(page)
      const messageTexts = await page.locator('p.text-sm.leading-5').allTextContents()
      const targetMessage = messageTexts.find((t) => matchingMessages.includes(t))
      if (targetMessage) {
        matchedDish = messageToDish[targetMessage]
      }
      if (!matchedDish) await page.keyboard.press('Escape')
    }
    expect(matchedDish).toBeTruthy()

    // 模拟参与者发送的匹配菜品自动加入共享购物车
    await expect(dialogCartWithItems(page)).toBeVisible()
    await expect(dialogCartWithItems(page).getByText(matchedDish!, { exact: true })).toBeVisible()
    // 购物车中显示点菜人为模拟参与者（林溪 点了）
    await expect(dialogCartWithItems(page).getByText(/林溪.*点了/)).toBeVisible()
  })

  // ──────────────────────────────────────────────
  // REQ-003 & REQ-006: 参与者加入会话（DemoConsole 模拟）
  // ──────────────────────────────────────────────
  test('REQ-003/006: 通过 DemoConsole 触发参与者加入会话', async ({ page }) => {
    await createSession(page)
    // 关闭聊天面板，打开 DemoConsole
    await page.keyboard.press('Escape')
    await openDemoConsole(page)
    await page.getByRole('button', { name: /模拟参与者加入/ }).click()
    await page.keyboard.press('Escape')
    // 重新打开聊天面板
    await openChatFromMenu(page)
    await expect(page.getByText('林溪', { exact: true })).toBeVisible()
    await expect(page.getByRole('dialog').getByText(/林溪.*已加入会话/)).toBeVisible()
  })

  // ──────────────────────────────────────────────
  // REQ-004 & REQ-006: 参与者发送聊天消息
  // ──────────────────────────────────────────────
  test('REQ-004/006: 通过 DemoConsole 触发参与者发送代点菜消息', async ({ page }) => {
    await createSession(page)
    await page.keyboard.press('Escape')
    await openDemoConsole(page)
    await page.getByRole('button', { name: /模拟参与者加入/ }).click()
    await page.getByRole('button', { name: /模拟参与者发消息/ }).click()
    await page.keyboard.press('Escape')
    await openChatFromMenu(page)
    const knownMessages = [
      '帮我点一份麻辣牛肉',
      '想要一份鲜虾滑',
      '加一份手工宽粉',
      '帮我点一份脆嫩毛肚',
      '想喝柠檬青桔饮',
    ]
    const messageLocator = page.locator('p.text-sm.leading-5')
    const messageTexts = await messageLocator.allTextContents()
    const hasKnownMessage = messageTexts.some((t) => knownMessages.includes(t))
    expect(hasKnownMessage).toBeTruthy()
  })

  // ──────────────────────────────────────────────
  // REQ-004: 聊天面板不再显示"代为点菜"按钮
  // ──────────────────────────────────────────────
  test('REQ-004: 聊天面板不再显示代为点菜按钮（消息发送即自动处理）', async ({ page }) => {
    await createSession(page)
    // 模拟参与者加入并发送消息
    await page.keyboard.press('Escape')
    await openDemoConsole(page)
    await page.getByRole('button', { name: /模拟参与者加入/ }).click()
    await page.getByRole('button', { name: /模拟参与者发消息/ }).click()
    await page.keyboard.press('Escape')
    await openChatFromMenu(page)
    // 聊天面板中不应存在"代为点菜"按钮
    await expect(page.getByRole('button', { name: /代为点菜/ })).toHaveCount(0)
    // 也不应存在"已代点"状态标记
    await expect(page.getByText('已代点')).toHaveCount(0)
  })

  // ──────────────────────────────────────────────
  // 边界约束: 空消息不可发送
  // ──────────────────────────────────────────────
  test('边界约束: 空消息不可发送', async ({ page }) => {
    await createSession(page)
    const input = page.getByPlaceholder(/输入想吃的菜品/)
    await expect(input).toBeVisible()
    const sendButton = page.locator('button:has(svg.lucide-send)')
    await expect(sendButton).toBeDisabled()
  })

  // ──────────────────────────────────────────────
  // 兼容性: 现有 hash 路由无回归
  // ──────────────────────────────────────────────
  test('兼容性: 创建聊天会话后不影响菜单视图 hash 路由', async ({ page }) => {
    await createSession(page)
    await page.keyboard.press('Escape')
    await expect(page).toHaveURL(/#\/menu$/)
  })
})

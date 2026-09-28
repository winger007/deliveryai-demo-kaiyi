import { test, expect, type Page } from '@playwright/test'

/**
 * 多人聊天点菜功能 E2E 验收测试
 *
 * 入口已移至菜单视图右下角（购物车面板 + 协同提示卡片下方）。
 * 覆盖 Spec REQ-001 ~ REQ-005 的核心验收点：
 * - 聊天入口仅在菜单视图可见，首页和顶栏不再有入口（REQ-001）
 * - 从菜单视图右下角入口打开聊天点菜面板（REQ-002）
 * - 参与者加入会话 — 由 DemoConsole 模拟（REQ-003）
 * - 参与者发送聊天消息请求代点菜（REQ-004）
 * - 发起者处理代点菜请求，菜品自动匹配并加入购物车（REQ-005）
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
  // REQ-004 & REQ-006: 参与者发送聊天消息请求代点菜
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
  // REQ-004 & REQ-005: 发起者处理代点菜请求，菜品自动匹配并加入购物车
  // ──────────────────────────────────────────────
  test('REQ-005: 发起者可看到请求消息并点击代为点菜', async ({ page }) => {
    await createSession(page)
    await page.keyboard.press('Escape')
    await openDemoConsole(page)
    await page.getByRole('button', { name: /模拟参与者加入/ }).click()
    await page.getByRole('button', { name: /模拟参与者发消息/ }).click()
    await page.keyboard.press('Escape')
    await openChatFromMenu(page)
    const orderForBtn = page.getByRole('button', { name: /代为点菜/ })
    await expect(orderForBtn.first()).toBeVisible()
    await orderForBtn.first().click()
    await expect(page.getByText(/已代点/).first()).toBeVisible()
  })

  test('REQ-005: 点击代为点菜后真实菜品加入购物车', async ({ page }) => {
    await createSession(page)
    await page.keyboard.press('Escape')
    await openDemoConsole(page)
    await page.getByRole('button', { name: /模拟参与者加入/ }).click()
    await page.getByRole('button', { name: /模拟参与者发消息/ }).click()
    await page.keyboard.press('Escape')
    await openChatFromMenu(page)
    // 记录消息内容
    const messageLocator = page.locator('p.text-sm.leading-5')
    const messageTexts = await messageLocator.allTextContents()
    const knownMessages = [
      '帮我点一份麻辣牛肉',
      '想要一份鲜虾滑',
      '加一份手工宽粉',
      '帮我点一份脆嫩毛肚',
      '想喝柠檬青桔饮',
    ]
    const sentMessage = messageTexts.find((t) => knownMessages.includes(t))
    expect(sentMessage).toBeTruthy()
    // 点击代为点菜
    await page.getByRole('button', { name: /代为点菜/ }).first().click()
    // 关闭聊天面板
    await page.keyboard.press('Escape')
    // 切换到移动端视口，使底部浮动「查看购物车」按钮可见（lg:hidden）
    await page.setViewportSize({ width: 390, height: 844 })
    // 点击浮动购物车按钮打开购物车面板
    await page.getByRole('button', { name: /查看购物车|View Cart/ }).click()
    // 购物车中应包含匹配到的真实菜品（而非消息原文）
    // 预设消息模板与菜品名称的对应关系：
    //   "帮我点一份麻辣牛肉" → 琥珀嫩牛肉
    //   "想要一份鲜虾滑" → 鲜虾滑
    //   "加一份手工宽粉" → 手工宽粉
    //   "帮我点一份脆嫩毛肚" → 脆嫩毛肚
    //   "想喝柠檬青桔饮" → 柠檬青桔饮
    const knownDishes = [
      '琥珀嫩牛肉',
      '鲜虾滑',
      '手工宽粉',
      '脆嫩毛肚',
      '柠檬青桔饮',
    ]
    const cartDialog = page.getByRole('dialog')
    const foundDish = knownDishes.find((dish) => {
      // Check if the dish name appears as text in the dialog
      return cartDialog.locator(`text=${dish}`).count() > 0
    })
    expect(foundDish).toBeTruthy()
  })

  test('REQ-005: 已处理的消息不可重复操作', async ({ page }) => {
    await createSession(page)
    await page.keyboard.press('Escape')
    await openDemoConsole(page)
    await page.getByRole('button', { name: /模拟参与者加入/ }).click()
    await page.getByRole('button', { name: /模拟参与者发消息/ }).click()
    await page.keyboard.press('Escape')
    await openChatFromMenu(page)
    await page.getByRole('button', { name: /代为点菜/ }).first().click()
    await expect(page.getByText(/已代点/).first()).toBeVisible()
    const remainingOrderForBtns = await page.getByRole('button', { name: /代为点菜/ }).count()
    expect(remainingOrderForBtns).toBe(0)
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

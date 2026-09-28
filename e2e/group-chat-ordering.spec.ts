import { test, expect, type Page } from '@playwright/test'

/**
 * 首页多人聊天点菜功能 E2E 验收测试
 *
 * 覆盖 Spec REQ-001 ~ REQ-006 的核心验收点：
 * - 首页可见多人聊天点菜入口（REQ-001）
 * - 创建点菜会话（REQ-002）
 * - 参与者加入会话 — 由 DemoConsole 模拟（REQ-003）
 * - 参与者发送聊天消息请求代点菜（REQ-004）
 * - 发起者查看并处理代点菜请求（REQ-005）
 * - DemoConsole 支持模拟参与者（REQ-006）
 *
 * 注意：应用状态为内存态，页面刷新（page.goto）会重置全部状态。
 * 需要跨视图操作时在同一页面内通过点击导航，不重新加载页面。
 */

/** 打开首页聊天点菜面板。 */
async function openChatPanel(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: /多人聊天点菜/ }).first().click()
}

/** 创建聊天会话。 */
async function createSession(page: Page) {
  await openChatPanel(page)
  await page.getByRole('button', { name: /创建会话/ }).click()
}

/**
 * 创建聊天会话后，从首页（不刷新页面）绑定桌台并进入菜单视图。
 * 这样内存态中的聊天会话得以保留。
 */
async function createSessionAndEnterMenu(page: Page) {
  await createSession(page)
  // 关闭聊天面板，回到首页
  await page.keyboard.press('Escape')
  // 点击桌台 A08 绑定（home → welcome），不刷新页面
  await page.getByRole('button', { name: /A08/ }).first().click()
  // welcome → menu
  await page.getByRole('button', { name: /进入点餐|Enter/ }).click()
}

/** 打开顶栏的聊天面板（在主布局中，非 HomeView）。 */
async function openTopBarChat(page: Page) {
  await page.getByRole('button', { name: /多人聊天点菜|Group Chat Ordering/ }).click()
}

/** 打开 DemoConsole 面板。 */
async function openDemoConsole(page: Page) {
  await page.getByRole('button', { name: /演示控制台|Demo Console/ }).click()
}

test.describe('首页多人聊天点菜 - E2E 验收测试', () => {

  // ──────────────────────────────────────────────
  // REQ-001: 首页多人聊天点菜入口
  // ──────────────────────────────────────────────
  test('REQ-001: 首页可见多人聊天点菜入口卡片', async ({ page }) => {
    await page.goto('/')
    const entryCard = page.getByRole('button', { name: /多人聊天点菜/ }).first()
    await expect(entryCard).toBeVisible()
  })

  test('REQ-001: 点击入口卡片后展示多人聊天点菜会话界面', async ({ page }) => {
    await openChatPanel(page)
    // 面板标题可见
    await expect(page.getByText('多人聊天点菜').first()).toBeVisible()
    // 未创建会话时应显示创建会话区域
    await expect(page.getByRole('button', { name: /创建会话/ })).toBeVisible()
  })

  test('REQ-001: 首页桌台选择区域不受影响', async ({ page }) => {
    await page.goto('/')
    // 桌台选择按钮仍可见
    await expect(page.getByRole('button', { name: /A08/ }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /D03/ }).first()).toBeVisible()
    // 快速进入按钮仍可见
    await expect(page.getByRole('button', { name: /快速进入|Quick/ })).toBeVisible()
  })

  // ──────────────────────────────────────────────
  // REQ-002: 创建点菜会话
  // ──────────────────────────────────────────────
  test('REQ-002: 发起者点击创建会话后展示聊天点菜会话界面', async ({ page }) => {
    await createSession(page)
    // 会话界面应包含参与者区域（精确匹配 "参与者" 标签）
    await expect(page.getByText('参与者', { exact: true })).toBeVisible()
    // 聊天消息区域可见
    await expect(page.getByText(/暂无消息/)).toBeVisible()
  })

  test('REQ-002: 参与者列表初始包含发起者本人', async ({ page }) => {
    await createSession(page)
    // 发起者名称「姚乾」应在参与者列表中（精确匹配 span 标签）
    await expect(page.getByText('姚乾', { exact: true })).toBeVisible()
    // 发起者标签可见
    await expect(page.getByText(/发起者/)).toBeVisible()
  })

  test('REQ-002: 会话创建后发起者可点击进入点餐', async ({ page }) => {
    await createSession(page)
    await page.getByRole('button', { name: /进入点餐/ }).click()
    // 应跳转到 menu 视图
    await expect(page).toHaveURL(/#\/menu$/)
    // 菜单页锅底标题可见
    await expect(page.getByRole('heading', { name: '鎏金番茄鸳鸯锅' })).toBeVisible()
  })

  // ──────────────────────────────────────────────
  // REQ-003 & REQ-006: 参与者加入会话（DemoConsole 模拟）
  // ──────────────────────────────────────────────
  test('REQ-003/006: 通过 DemoConsole 触发参与者加入会话', async ({ page }) => {
    // 创建会话并进入菜单视图（不刷新页面，保留内存态）
    await createSessionAndEnterMenu(page)
    // 打开 DemoConsole
    await openDemoConsole(page)
    // 模拟参与者加入
    await page.getByRole('button', { name: /模拟参与者加入/ }).click()
    // 关闭 DemoConsole
    await page.keyboard.press('Escape')
    // 重新打开聊天面板验证参与者已加入
    await openTopBarChat(page)
    // 模拟参与者名称（林溪）应在参与者列表中可见（精确匹配 span）
    await expect(page.getByText('林溪', { exact: true })).toBeVisible()
    // 应显示「林溪 已加入会话」系统消息
    // 应在聊天面板内显示「林溪 已加入会话」系统消息（排除 toast）
    await expect(page.getByRole('dialog').getByText(/林溪.*已加入会话/)).toBeVisible()
  })

  // ──────────────────────────────────────────────
  // REQ-004 & REQ-006: 参与者发送聊天消息请求代点菜
  // ──────────────────────────────────────────────
  test('REQ-004/006: 通过 DemoConsole 触发参与者发送代点菜消息', async ({ page }) => {
    // 创建会话并进入菜单视图
    await createSessionAndEnterMenu(page)
    // 打开 DemoConsole
    await openDemoConsole(page)
    // 模拟参与者加入
    await page.getByRole('button', { name: /模拟参与者加入/ }).click()
    // 模拟参与者发消息
    await page.getByRole('button', { name: /模拟参与者发消息/ }).click()
    // 关闭 DemoConsole 打开聊天面板
    await page.keyboard.press('Escape')
    await openTopBarChat(page)
    // 消息区域应出现模拟参与者发送的消息（内容为预设模板之一）
    const knownMessages = [
      '帮我点一份麻辣牛肉',
      '想要一份鲜虾滑',
      '加一份手工宽粉',
      '帮我点一份脆嫩毛肚',
      '想喝柠檬青桔饮',
    ]
    // 至少有一条模拟消息可见
    const messageLocator = page.locator('p.text-sm.leading-5')
    const messageTexts = await messageLocator.allTextContents()
    const hasKnownMessage = messageTexts.some((t) => knownMessages.includes(t))
    expect(hasKnownMessage).toBeTruthy()
  })

  // ──────────────────────────────────────────────
  // REQ-005: 发起者查看并处理代点菜请求
  // ──────────────────────────────────────────────
  test('REQ-005: 发起者可看到请求消息并点击代为点菜', async ({ page }) => {
    // 创建会话并进入菜单视图
    await createSessionAndEnterMenu(page)
    // 打开 DemoConsole 模拟参与者加入并发消息
    await openDemoConsole(page)
    await page.getByRole('button', { name: /模拟参与者加入/ }).click()
    await page.getByRole('button', { name: /模拟参与者发消息/ }).click()
    await page.keyboard.press('Escape')
    // 打开聊天面板
    await openTopBarChat(page)
    // 应可见「代为点菜」操作按钮
    const orderForBtn = page.getByRole('button', { name: /代为点菜/ })
    await expect(orderForBtn.first()).toBeVisible()
    // 点击代为点菜
    await orderForBtn.first().click()
    // 消息应标记为已处理 — 显示「已代点」标签
    await expect(page.getByText(/已代点/).first()).toBeVisible()
  })

  test('REQ-005: 点击代为点菜后菜品加入购物车', async ({ page }) => {
    // 创建会话并进入菜单视图
    await createSessionAndEnterMenu(page)
    // 打开 DemoConsole 模拟参与者加入并发消息
    await openDemoConsole(page)
    await page.getByRole('button', { name: /模拟参与者加入/ }).click()
    await page.getByRole('button', { name: /模拟参与者发消息/ }).click()
    await page.keyboard.press('Escape')
    // 打开聊天面板
    await openTopBarChat(page)
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
    // 购物车中应包含该菜品
    // 购物车中应包含该菜品（限定在购物车对话框内，排除 toast 和外部元素）
    await expect(page.getByRole('dialog').getByText(sentMessage!)).toBeVisible()
  })

  test('REQ-005: 已处理的消息不可重复操作', async ({ page }) => {
    // 创建会话并进入菜单视图
    await createSessionAndEnterMenu(page)
    // 打开 DemoConsole 模拟参与者加入并发消息
    await openDemoConsole(page)
    await page.getByRole('button', { name: /模拟参与者加入/ }).click()
    await page.getByRole('button', { name: /模拟参与者发消息/ }).click()
    await page.keyboard.press('Escape')
    // 打开聊天面板
    await openTopBarChat(page)
    // 点击代为点菜
    await page.getByRole('button', { name: /代为点菜/ }).first().click()
    // 该消息旁不再显示「代为点菜」按钮，应显示「已代点」
    await expect(page.getByText(/已代点/).first()).toBeVisible()
    // 验证「代为点菜」按钮数量减少（已处理的消息不再有该按钮）
    const remainingOrderForBtns = await page.getByRole('button', { name: /代为点菜/ }).count()
    // 只发了一条消息且已处理，不应再有「代为点菜」按钮
    expect(remainingOrderForBtns).toBe(0)
  })

  // ──────────────────────────────────────────────
  // 边界约束: 空消息不可发送
  // ──────────────────────────────────────────────
  test('边界约束: 空消息不可发送', async ({ page }) => {
    await createSession(page)
    // 输入框存在
    const input = page.getByPlaceholder(/输入想吃的菜品/)
    await expect(input).toBeVisible()
    // 发送按钮（icon-only，含 Send 图标）应 disabled
    const sendButton = page.locator('button:has(svg.lucide-send)')
    await expect(sendButton).toBeDisabled()
  })

  // ──────────────────────────────────────────────
  // 兼容性: 现有 hash 路由无回归
  // ──────────────────────────────────────────────
  test('兼容性: 创建聊天会话后不影响首页 hash 路由', async ({ page }) => {
    await createSession(page)
    // 关闭面板
    await page.keyboard.press('Escape')
    // 仍在首页
    await expect(page).toHaveURL(/#\/home$/)
  })
})

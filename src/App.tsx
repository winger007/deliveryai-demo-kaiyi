import { useCallback, useEffect, useReducer, useState } from 'react'
import i18next from 'i18next'
import { useTranslation } from 'react-i18next'
import { ClipboardList, ConciergeBell, LayoutDashboard, Menu as MenuIcon, ShoppingBasket } from 'lucide-react'
import { CheckoutView } from '@/components/CheckoutView'
import { DemoConsole } from '@/components/DemoConsole'
import { GroupChatPanel } from '@/components/GroupChatPanel'
import { HomeView } from '@/components/HomeView'
import { WelcomeView } from '@/components/WelcomeView'
import { CartPanel } from '@/components/CartPanel'
import { MenuView } from '@/components/MenuView'
import { OrderView } from '@/components/OrderView'
import { ServiceSheet } from '@/components/ServiceSheet'
import { TopBar } from '@/components/TopBar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useElderlyMode } from '@/hooks/useElderlyMode'
import { initialViewFromHash, useViewRoute } from '@/hooks/useViewRoute'
import { orderReducer, initialState } from '@/state/orderReducer'
import { products } from '@/data/menu'
import { uid, money } from '@/lib/utils'
import type { AppState, ViewName } from '@/types'

const HOST_NAME = '姚乾'
const SIM_PARTICIPANT_NAMES = ['林溪', '陈默', '周逸', '苏然']
const SIM_MESSAGE_TEMPLATES_ZH = [
  '帮我点一份麻辣牛肉',
  '想要一份鲜虾滑',
  '加一份手工宽粉',
  '帮我点一份脆嫩毛肚',
  '想喝柠檬青桔饮',
]
const SIM_MESSAGE_TEMPLATES_EN = [
  'Please order me some spicy beef',
  'I want a portion of shrimp paste',
  'Add some handmade wide noodles',
  'Get me some beef tripe',
  'I want a lemon calamansi drink',
]

function createInitialState(): AppState {
  const search = new URLSearchParams(window.location.search)
  const requestedView = initialViewFromHash()

  // preview=menu：预置一桌带购物车的点餐态，供设计/截图预览
  if (search.get('preview') === 'menu') {
    const product = products[2]
    const spec = [i18next.t('menu.option.full'), i18next.t('menu.option.original')].join(' · ')
    return {
      ...initialState,
      table: 'A08',
      view: 'menu',
      cart: [{ uid: 'preview-item', productId: product.id, name: i18next.t(product.name), price: product.price, quantity: 1, image: product.image, spec, orderedBy: HOST_NAME }],
      lastMessage: initialState.lastMessage,
    }
  }

  // 深链接：直接以 #/welcome 等地址打开时，先绑定示例桌台再进入对应视图；
  // home 无需桌台，其余流程视图（welcome/menu/order/checkout）需要桌台上下文。
  if (requestedView && requestedView !== 'home') {
    return { ...initialState, table: 'A08', view: requestedView }
  }

  return initialState
}

export default function App() {
  const { t, i18n } = useTranslation()
  const [state, dispatch] = useReducer(orderReducer, undefined, createInitialState)
  const { enabled: elderly, toggle: toggleElderly } = useElderlyMode()
  const [serviceOpen, setServiceOpen] = useState(false)
  const [consoleOpen, setConsoleOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [simJoinIndex, setSimJoinIndex] = useState(0)
  const cartTotal = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const waitingServices = state.services.filter((service) => service.status === 'waiting').length

  // 视图 ↔ URL hash 双向同步；未绑定桌台时只有 home 可达，其余地址回落到 home
  const canView = useCallback((view: ViewName) => view === 'home' || !!state.table, [state.table])
  const navigate = useCallback((view: ViewName) => dispatch({ type: 'SET_VIEW', view }), [])
  useViewRoute(state.view, { onNavigate: navigate, canView })

  useEffect(() => {
    document.documentElement.lang = i18n.language === 'zh' ? 'zh-CN' : 'en'
    document.title = t('common.title')
    const metaDesc = document.querySelector('meta[name="description"]')
    if (metaDesc) metaDesc.setAttribute('content', t('common.meta_desc'))
    try {
      localStorage.setItem('i18nextLng', i18n.language)
    } catch {
      // localStorage 不可用时降级为内存态，不报错不阻塞
    }
  }, [i18n.language, t])

  const changeView = (view: ViewName) => dispatch({ type: 'SET_VIEW', view })
  const submitOrder = () => {
    dispatch({ type: 'SUBMIT_ORDER' })
    setCartOpen(false)
  }
  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'zh' ? 'en' : 'zh')
  }
  const handleToggleElderly = () => {
    toggleElderly()
    dispatch({ type: 'SET_MESSAGE', message: elderly ? '已切换为常规模式' : '已切换为老人模式' })
  }

  // 聊天会话回调
  const handleCreateSession = (sessionName: string) => {
    dispatch({ type: 'CREATE_CHAT_SESSION', sessionName, hostName: HOST_NAME })
  }
  const handleEnterOrdering = () => {
    // 绑定桌台后进入菜单页，不中断聊天会话状态
    if (!state.table) {
      dispatch({ type: 'BIND_TABLE', table: 'A08' })
    }
    dispatch({ type: 'SET_VIEW', view: 'menu' })
    setChatOpen(false)
  }
  const handleSendMessage = (content: string) => {
    if (!state.chatSession) return
    const host = state.chatSession.participants.find((p) => p.isHost)
    if (!host) return
    dispatch({ type: 'SEND_CHAT_MESSAGE', senderId: host.id, senderName: host.name, content })
  }
  const handleSimulateJoin = () => {
    if (!state.chatSession) return
    const name = SIM_PARTICIPANT_NAMES[simJoinIndex % SIM_PARTICIPANT_NAMES.length]
    dispatch({ type: 'JOIN_CHAT_SESSION', participant: { id: uid(), name } })
    setSimJoinIndex((i) => i + 1)
  }
  const handleSimulateMessage = () => {
    if (!state.chatSession) return
    // 找一个非 host 的参与者发消息
    const nonHosts = state.chatSession.participants.filter((p) => !p.isHost)
    if (nonHosts.length === 0) return
    const sender = nonHosts[nonHosts.length - 1] // 最近加入的参与者
    const templates = i18n.language === 'zh' ? SIM_MESSAGE_TEMPLATES_ZH : SIM_MESSAGE_TEMPLATES_EN
    const content = templates[Math.floor(Math.random() * templates.length)]
    dispatch({ type: 'SEND_CHAT_MESSAGE', senderId: sender.id, senderName: sender.name, content })
  }

  // 聊天面板共享渲染（HomeView 和主布局都能打开）
  const chatPanel = (
    <GroupChatPanel
      open={chatOpen}
      session={state.chatSession}
      onOpenChange={setChatOpen}
      onCreateSession={handleCreateSession}
      onEnterOrdering={handleEnterOrdering}
      onHandleRequest={(messageId) => dispatch({ type: 'HANDLE_CHAT_REQUEST', messageId })}
      onSendMessage={handleSendMessage}
    />
  )

  if (state.view === 'home' || !state.table) {
    return (
      <>
        <HomeView onBind={(table) => dispatch({ type: 'BIND_TABLE', table })} onOpenChat={() => setChatOpen(true)} />
        {chatPanel}
      </>
    )
  }

  if (state.view === 'welcome') {
    return <WelcomeView table={state.table!} onEnter={() => dispatch({ type: 'SET_VIEW', view: 'menu' })} />
  }

  return (
    <div className="min-h-screen bg-rice-100 paper-noise">
      <TopBar
        table={state.table}
        view={state.view}
        serviceCount={waitingServices}
        language={i18n.language}
        elderly={elderly}
        onToggleLanguage={toggleLanguage}
        onToggleElderly={handleToggleElderly}
        onView={changeView}
        onService={() => setServiceOpen(true)}
        onConsole={() => setConsoleOpen(true)}
        onChat={() => setChatOpen(true)}
      />

      {state.view === 'menu' && (
        <main className="mx-auto grid max-w-7xl gap-6 px-4 py-5 pb-28 lg:grid-cols-3 lg:px-6 lg:py-7 lg:pb-8">
          <div className="lg:col-span-2">
            <MenuView diners={state.diners} soldOut={state.soldOut} onAdd={(item) => dispatch({ type: 'ADD_CART', item })} />
          </div>
          <aside className="hidden lg:block">
            <div className="sticky top-28">
              <CartPanel items={state.cart} onQuantity={(uid, delta) => dispatch({ type: 'CHANGE_QTY', uid, delta })} onSubmit={submitOrder} />
              <div className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-100/70 p-4 text-sm text-charcoal-700">
                <p className="font-bold">{t('common.collab_title')}</p>
                <p className="mt-1 leading-6 text-charcoal-500">{t('common.collab_desc')}</p>
              </div>
            </div>
          </aside>
        </main>
      )}

      {state.view === 'order' && (
        <OrderView
          items={state.orderItems}
          stage={state.orderStage}
          onAddMore={() => changeView('menu')}
          onCancel={(uid) => dispatch({ type: 'REQUEST_CANCEL', uid })}
          onCheckout={() => changeView('checkout')}
        />
      )}

      {state.view === 'checkout' && (
        <CheckoutView items={state.orderItems} paid={state.paid} onPay={() => dispatch({ type: 'PAY' })} onBack={() => changeView('order')} />
      )}

      <ServiceSheet open={serviceOpen} requests={state.services} onOpenChange={setServiceOpen} onCall={(service) => dispatch({ type: 'CALL_SERVICE', service })} />
      <DemoConsole
        open={consoleOpen}
        table={state.table}
        stage={state.orderStage}
        soldOut={state.soldOut}
        services={state.services}
        chatSession={state.chatSession}
        onOpenChange={setConsoleOpen}
        onStage={(stage) => dispatch({ type: 'SET_STAGE', stage })}
        onSoldOut={(productId) => dispatch({ type: 'TOGGLE_SOLD_OUT', productId })}
        onRespond={() => dispatch({ type: 'RESPOND_SERVICES' })}
        onReset={() => { dispatch({ type: 'RESET' }); setConsoleOpen(false) }}
        onSimulateJoin={handleSimulateJoin}
        onSimulateMessage={handleSimulateMessage}
      />
      {chatPanel}

      <Dialog open={cartOpen} onOpenChange={setCartOpen}>
        <DialogContent title={t('cart.dialog_title')}>
          <div className="mt-5"><CartPanel compact items={state.cart} onQuantity={(uid, delta) => dispatch({ type: 'CHANGE_QTY', uid, delta })} onSubmit={submitOrder} /></div>
        </DialogContent>
      </Dialog>

      <div className="fixed bottom-20 left-1/2 z-30 -translate-x-1/2 lg:hidden">
        {state.view === 'menu' && state.cart.length > 0 && (
          <Button onClick={() => setCartOpen(true)} className="h-12 rounded-full px-5 shadow-float">
            <span className="relative"><ShoppingBasket size={19} /><span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-xs text-charcoal-900">{state.cart.length}</span></span>
            {t('common.view_cart')} · {money(cartTotal)}
          </Button>
        )}
      </div>

      <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-30 grid grid-cols-4 border-t border-charcoal-900/5 bg-white/95 px-2 pt-2 backdrop-blur lg:hidden">
        <MobileNav active={state.view === 'menu'} icon={MenuIcon} label={t('common.nav_menu')} onClick={() => changeView('menu')} />
        <MobileNav active={state.view === 'order'} icon={ClipboardList} label={t('common.nav_order')} onClick={() => changeView('order')} />
        <MobileNav active={serviceOpen} icon={ConciergeBell} label={t('common.nav_service')} badge={waitingServices} onClick={() => setServiceOpen(true)} />
        <MobileNav active={consoleOpen} icon={LayoutDashboard} label={t('common.nav_demo')} onClick={() => setConsoleOpen(true)} />
      </nav>

      <div className="pointer-events-none fixed left-1/2 top-24 z-40 -translate-x-1/2 rounded-full bg-charcoal-900/90 px-4 py-2 text-xs font-semibold text-white shadow-float">
        {state.lastMessage}
      </div>
    </div>
  )
}

function MobileNav({ active, icon: Icon, label, badge, onClick }: { active: boolean; icon: typeof MenuIcon; label: string; badge?: number; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`relative flex flex-col items-center gap-1 rounded-xl py-2 text-xs font-semibold transition ${active ? 'bg-chili-50 text-chili-500' : 'text-charcoal-500'}`}>
      <Icon size={20} />{label}{badge ? <span className="absolute right-4 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-chili-500 px-1 text-white">{badge}</span> : null}
    </button>
  )
}

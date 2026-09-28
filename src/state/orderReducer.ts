import i18next from 'i18next'
import { uid } from '@/lib/utils'
import { products } from '@/data/menu'
import type { AppAction, AppState } from '@/types'

export const initialState: AppState = {
  view: 'home',
  table: null,
  diners: ['姚乾', '林溪', '陈默'],
  cart: [],
  orderItems: [],
  orderStage: 'submitted',
  soldOut: ['p8'],
  services: [],
  paid: false,
  lastMessage: i18next.t('message.welcome'),
  chatSession: null,
}

const stageMessages: Record<string, string> = {
  submitted: 'message.stage_submitted',
  accepted: 'message.stage_accepted',
  cooking: 'message.stage_cooking',
  served: 'message.stage_served',
}

const localeForLanguage = (lang: string) => (lang === 'en' ? 'en-US' : 'zh-CN')

function nowTime(): string {
  return new Date().toLocaleTimeString(localeForLanguage(i18next.language), { hour: '2-digit', minute: '2-digit' })
}

export function orderReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'BIND_TABLE':
      return { ...state, table: action.table, view: 'welcome', lastMessage: i18next.t('message.bind_table', { table: action.table }) }
    case 'SET_VIEW':
      return { ...state, view: action.view }
    case 'ADD_CART': {
      const same = state.cart.find((item) => item.productId === action.item.productId && item.spec === action.item.spec && item.orderedBy === action.item.orderedBy)
      const cart = same
        ? state.cart.map((item) => item.uid === same.uid ? { ...item, quantity: item.quantity + 1 } : item)
        : [...state.cart, action.item]
      return { ...state, cart, lastMessage: i18next.t('message.add_cart', { name: action.item.orderedBy, dish: action.item.name }) }
    }
    case 'CHANGE_QTY': {
      const cart = state.cart
        .map((item) => item.uid === action.uid ? { ...item, quantity: item.quantity + action.delta } : item)
        .filter((item) => item.quantity > 0)
      return { ...state, cart }
    }
    case 'SUBMIT_ORDER': {
      if (!state.cart.length) return state
      const additions = state.cart.map((item) => ({ ...item, stage: 'submitted' as const }))
      return {
        ...state,
        orderItems: [...state.orderItems, ...additions],
        cart: [],
        orderStage: 'submitted',
        view: 'order',
        lastMessage: state.orderItems.length ? i18next.t('message.order_additional') : i18next.t('message.order_submitted'),
      }
    }
    case 'SET_STAGE':
      return {
        ...state,
        orderStage: action.stage,
        orderItems: state.orderItems.map((item) => ({ ...item, stage: action.stage })),
        lastMessage: i18next.t(stageMessages[action.stage]),
      }
    case 'TOGGLE_SOLD_OUT':
      return {
        ...state,
        soldOut: state.soldOut.includes(action.productId)
          ? state.soldOut.filter((id) => id !== action.productId)
          : [...state.soldOut, action.productId],
        lastMessage: i18next.t('message.soldout_updated'),
      }
    case 'CALL_SERVICE': {
      const serviceName = i18next.t(`${action.service}.name`)
      return {
        ...state,
        services: [...state.services, { id: uid(), type: serviceName, createdAt: nowTime(), status: 'waiting' }],
        lastMessage: i18next.t('message.service_called', { service: serviceName }),
      }
    }
    case 'RESPOND_SERVICES':
      return { ...state, services: state.services.map((service) => ({ ...service, status: 'responded' })), lastMessage: i18next.t('message.service_responded') }
    case 'REQUEST_CANCEL':
      return {
        ...state,
        orderItems: state.orderItems.map((item) => item.uid === action.uid ? { ...item, cancelState: 'requested' } : item),
        lastMessage: i18next.t('message.cancel_requested'),
      }
    case 'PAY':
      return { ...state, paid: true, lastMessage: i18next.t('message.paid') }
    case 'RESET':
      return { ...initialState, lastMessage: i18next.t('message.reset') }
    case 'SET_MESSAGE':
      return { ...state, lastMessage: action.message }
    case 'CREATE_CHAT_SESSION': {
      const hostId = uid()
      return {
        ...state,
        chatSession: {
          id: uid(),
          name: action.sessionName,
          hostId,
          hostName: action.hostName,
          participants: [{ id: hostId, name: action.hostName, isHost: true }],
          messages: [],
          active: true,
        },
        lastMessage: i18next.t('chat.session_created'),
      }
    }
    case 'JOIN_CHAT_SESSION': {
      if (!state.chatSession) return state
      const participant = { id: action.participant.id, name: action.participant.name, isHost: false }
      const systemMessage = {
        id: uid(),
        senderId: action.participant.id,
        senderName: action.participant.name,
        content: i18next.t('chat.joined', { name: action.participant.name }),
        timestamp: nowTime(),
        type: 'system' as const,
      }
      return {
        ...state,
        chatSession: {
          ...state.chatSession,
          participants: [...state.chatSession.participants, participant],
          messages: [...state.chatSession.messages, systemMessage],
        },
        lastMessage: i18next.t('chat.joined', { name: action.participant.name }),
      }
    }
    case 'SEND_CHAT_MESSAGE': {
      if (!state.chatSession) return state
      if (!action.content.trim()) return state
      const message = {
        id: uid(),
        senderId: action.senderId,
        senderName: action.senderName,
        content: action.content.trim().slice(0, 200),
        timestamp: nowTime(),
        type: 'text' as const,
        handled: false,
      }
      return {
        ...state,
        chatSession: {
          ...state.chatSession,
          messages: [...state.chatSession.messages, message],
        },
      }
    }
    case 'HANDLE_CHAT_REQUEST': {
      if (!state.chatSession) return state
      const message = state.chatSession.messages.find((m) => m.id === action.messageId)
      if (!message || message.handled) return state
      // 用消息文本匹配菜单中的真实菜品（不区分大小写的子串匹配，取第一个）
      const msgLower = message.content.toLowerCase()
      const matchedProduct = products.find((p) => i18next.t(p.name).toLowerCase().includes(msgLower) || msgLower.includes(i18next.t(p.name).toLowerCase()))
      // 无论匹配成功与否，消息都标记为已处理，避免重复操作
      const updatedMessages = state.chatSession.messages.map((m) => m.id === action.messageId ? { ...m, handled: true } : m)
      if (!matchedProduct) {
        return {
          ...state,
          chatSession: { ...state.chatSession, messages: updatedMessages },
          lastMessage: i18next.t('chat.no_match'),
        }
      }
      // 以默认规格加入购物车（与 MenuView openSpec / addSelected 逻辑一致）
      const portion = matchedProduct.options?.portion?.[1] || matchedProduct.options?.portion?.[0] || ''
      const flavor = matchedProduct.options?.flavor?.[0] || ''
      const spicy = matchedProduct.options?.spicy?.[0] || ''
      const portionFactor = portion === 'menu.option.half' ? 0.58 : 1
      const specParts = [portion, flavor, spicy].filter(Boolean).map((key) => i18next.t(key))
      const spec = specParts.join(' · ') || i18next.t('menu.standard')
      const cartItem = {
        uid: uid(),
        productId: matchedProduct.id,
        name: i18next.t(matchedProduct.name),
        price: Math.round(matchedProduct.price * portionFactor),
        quantity: 1,
        image: matchedProduct.image,
        spec,
        orderedBy: message.senderName,
      }
      // 复用 ADD_CART 合并逻辑：同 productId + spec + orderedBy 数量 +1，否则新增
      const same = state.cart.find((item) => item.productId === cartItem.productId && item.spec === cartItem.spec && item.orderedBy === cartItem.orderedBy)
      const cart = same
        ? state.cart.map((item) => item.uid === same.uid ? { ...item, quantity: item.quantity + 1 } : item)
        : [...state.cart, cartItem]
      return {
        ...state,
        cart,
        chatSession: { ...state.chatSession, messages: updatedMessages },
        lastMessage: i18next.t('chat.order_added', { dish: i18next.t(matchedProduct.name) }),
      }
    }
    case 'CLOSE_CHAT_SESSION':
      return { ...state, chatSession: null }
    default:
      return state
  }
}

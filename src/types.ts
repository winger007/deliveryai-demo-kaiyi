export type OrderStage = 'submitted' | 'accepted' | 'cooking' | 'served'
export type ViewName = 'home' | 'welcome' | 'menu' | 'order' | 'checkout'

export interface Product {
  id: string
  name: string
  description: string
  category: string
  price: number
  image: string
  badge?: string
  orderedCount?: number
  options?: {
    portion?: string[]
    flavor?: string[]
    spicy?: string[]
  }
}

export interface CartItem {
  uid: string
  productId: string
  name: string
  price: number
  quantity: number
  image: string
  spec: string
  orderedBy: string
}

export interface OrderItem extends CartItem {
  stage: OrderStage
  cancelState?: 'requested' | 'approved'
}

export interface ServiceRequest {
  id: string
  type: string
  createdAt: string
  status: 'waiting' | 'responded'
}

export interface ChatParticipant {
  id: string
  name: string
  isHost: boolean
}

export interface ChatMessage {
  id: string
  senderId: string
  senderName: string
  content: string
  timestamp: string
  type: 'text' | 'system'
  handled?: boolean
}

export interface ChatSession {
  id: string
  name: string
  hostId: string
  hostName: string
  participants: ChatParticipant[]
  messages: ChatMessage[]
  active: boolean
}

export interface AppState {
  view: ViewName
  table: string | null
  diners: string[]
  cart: CartItem[]
  orderItems: OrderItem[]
  orderStage: OrderStage
  soldOut: string[]
  services: ServiceRequest[]
  paid: boolean
  lastMessage: string
  chatSession: ChatSession | null
}

export type AppAction =
  | { type: 'BIND_TABLE'; table: string }
  | { type: 'SET_VIEW'; view: ViewName }
  | { type: 'ADD_CART'; item: CartItem }
  | { type: 'CHANGE_QTY'; uid: string; delta: number }
  | { type: 'SUBMIT_ORDER' }
  | { type: 'SET_STAGE'; stage: OrderStage }
  | { type: 'TOGGLE_SOLD_OUT'; productId: string }
  | { type: 'CALL_SERVICE'; service: string }
  | { type: 'RESPOND_SERVICES' }
  | { type: 'REQUEST_CANCEL'; uid: string }
  | { type: 'PAY' }
  | { type: 'RESET' }
  | { type: 'SET_MESSAGE'; message: string }
  | { type: 'CREATE_CHAT_SESSION'; sessionName: string; hostName: string }
  | { type: 'JOIN_CHAT_SESSION'; participant: { id: string; name: string } }
  | { type: 'SEND_CHAT_MESSAGE'; senderId: string; senderName: string; content: string }
  | { type: 'HANDLE_CHAT_REQUEST'; messageId: string }
  | { type: 'CLOSE_CHAT_SESSION' }

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, ChefHat, MessageSquare, Send, ShoppingBasket, UserPlus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import type { ChatSession } from '@/types'

interface GroupChatPanelProps {
  open: boolean
  session: ChatSession | null
  onOpenChange: (open: boolean) => void
  onCreateSession: (sessionName: string) => void
  onEnterOrdering: () => void
  onHandleRequest: (messageId: string) => void
  onSendMessage: (content: string) => void
}

export function GroupChatPanel({
  open,
  session,
  onOpenChange,
  onCreateSession,
  onEnterOrdering,
  onHandleRequest,
  onSendMessage,
}: GroupChatPanelProps) {
  const { t } = useTranslation()
  const [sessionName, setSessionName] = useState(t('chat.session_name_default'))
  const [message, setMessage] = useState('')

  const handleCreate = () => {
    onCreateSession(sessionName.trim() || t('chat.session_name_default'))
  }

  const handleSend = () => {
    if (!message.trim()) return
    onSendMessage(message)
    setMessage('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={t('chat.panel_title')} className="md:max-w-2xl">
        {!session ? (
          /* 创建会话 */
          <div className="mt-5">
            <p className="text-sm leading-6 text-charcoal-500">{t('chat.no_session_desc')}</p>
            <div className="mt-5 rounded-2xl bg-white p-4 shadow-sm">
              <label className="mb-2 block text-sm font-bold text-charcoal-900">{t('chat.session_name_label')}</label>
              <input
                type="text"
                value={sessionName}
                maxLength={20}
                onChange={(e) => setSessionName(e.target.value)}
                className="w-full rounded-xl border border-charcoal-900/10 bg-rice-50 px-4 py-3 text-sm font-medium text-charcoal-900 outline-none transition focus:border-chili-500"
                placeholder={t('chat.session_name_default')}
              />
              <Button onClick={handleCreate} className="mt-4 w-full">
                <UserPlus size={17} />
                {t('chat.create_session')}
              </Button>
            </div>
          </div>
        ) : (
          /* 会话进行中 */
          <div className="mt-4 flex flex-col gap-4" style={{ maxHeight: '60vh' }}>
            {/* 会话信息 + 参与者列表 */}
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-chili-50 text-chili-500">
                    <MessageSquare size={16} />
                  </span>
                  <div>
                    <p className="font-bold text-charcoal-900">{session.name}</p>
                    <p className="text-xs text-charcoal-500">
                      {t('chat.host_label')}: {session.hostName}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={onEnterOrdering}>
                  <ShoppingBasket size={15} />
                  {t('chat.enter_ordering')}
                </Button>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Users size={14} className="text-charcoal-500" />
                <span className="text-xs font-bold text-charcoal-500">{t('chat.participants')}</span>
                <div className="flex flex-wrap gap-2">
                  {session.participants.map((p) => (
                    <span
                      key={p.id}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        p.isHost ? 'bg-chili-50 text-chili-600' : 'bg-rice-100 text-charcoal-700'
                      }`}
                    >
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* 聊天消息区域 */}
            <div className="flex-1 overflow-y-auto rounded-2xl bg-rice-50 p-4">
              {session.messages.length === 0 ? (
                <p className="py-8 text-center text-sm text-charcoal-500">{t('chat.messages_empty')}</p>
              ) : (
                <div className="space-y-3">
                  {session.messages.map((msg) =>
                    msg.type === 'system' ? (
                      <div key={msg.id} className="flex items-center justify-center">
                        <span className="rounded-full bg-rice-200 px-3 py-1 text-xs text-charcoal-500">
                          {msg.content}
                        </span>
                      </div>
                    ) : (
                      <div key={msg.id} className={`flex ${msg.senderId === session.hostId ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[75%] rounded-2xl p-3 shadow-sm ${
                            msg.senderId === session.hostId
                              ? 'rounded-br-sm bg-chili-500 text-white'
                              : 'rounded-bl-sm bg-white text-charcoal-900'
                          } ${msg.handled ? 'opacity-50' : ''}`}
                        >
                          <div className="mb-1 flex items-center gap-2 text-xs opacity-70">
                            <span className="font-bold">{msg.senderName}</span>
                            <span>{msg.timestamp}</span>
                          </div>
                          <p className="text-sm leading-5">{msg.content}</p>
                          {msg.senderId !== session.hostId && (
                            <div className="mt-2">
                              {msg.handled ? (
                                <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-600">
                                  <Check size={13} />
                                  {t('chat.handled')}
                                </span>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => onHandleRequest(msg.id)}
                                  className="h-8"
                                >
                                  <ChefHat size={14} />
                                  {t('chat.order_for')}
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>

            {/* 消息输入区域（发起者也可发消息） */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={message}
                maxLength={200}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                className="flex-1 rounded-xl border border-charcoal-900/10 bg-white px-4 py-3 text-sm font-medium text-charcoal-900 outline-none transition focus:border-chili-500"
                placeholder={t('chat.message_placeholder')}
              />
              <Button onClick={handleSend} disabled={!message.trim()} size="icon">
                <Send size={18} />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

<template>
  <div class="card h-100 d-flex flex-column overflow-hidden">
    <div
      class="card-body flex-grow-1 overflow-auto p-3"
      ref="chatBody"
      @scroll.passive="onChatScroll"
    >
      <div v-if="historyBusy" class="text-center py-2">
        <div class="spinner-border spinner-border-sm text-primary" role="status">
          <span class="visually-hidden">Загрузка...</span>
        </div>
      </div>
      <div v-if="noMoreHistory && messages.length" class="text-center text-muted small mb-3">
        — начало истории —
      </div>
      <div v-if="!messages || messages.length === 0" class="text-center text-muted py-5">
        <i class="bi bi-chat-dots display-1 text-primary opacity-25"></i>
        <p class="mt-3 fs-5">Сообщений пока нет</p>
        <p class="text-muted small">Будьте первым, кто напишет в чат!</p>
      </div>
      <TransitionGroup v-else name="message" tag="div" @enter="onEnter" @leave="onLeave">
        <div v-for="(message, index) in messages" :key="message.messageId" class="mb-3">
          <div v-if="showDaySeparator(message, index)" class="d-flex justify-content-center my-3">
            <span class="badge bg-body-tertiary text-secondary fw-normal">{{ dayLabel(message.sentAt) }}</span>
          </div>
          <div :class="['d-flex', isCurrentUser(message.memberId) ? 'justify-content-end' : 'justify-content-start']">
            <div class="w-75">
              <div :class="[
                'p-3 position-relative',
                isCurrentUser(message.memberId)
                  ? 'bg-primary text-white ms-auto rounded-3'
                  : 'bg-body-tertiary rounded-3'
              ]">
                <div v-if="deletingMessageId === message.messageId" class="text-center py-3">
                  <p class="mb-2">Удалить сообщение?</p>
                  <div class="d-flex gap-2 justify-content-center">
                    <button @click="confirmDeleteMessage" class="btn btn-sm btn-danger">
                      <i class="bi bi-trash me-1"></i>Удалить
                    </button>
                    <button @click="deletingMessageId = null" class="btn btn-sm btn-secondary">Отмена</button>
                  </div>
                </div>
                <template v-else>
                  <div class="d-flex justify-content-between align-items-center mb-1">
                    <strong :class="isCurrentUser(message.memberId) ? 'text-white' : 'text-primary'">
                      <i class="bi bi-person-circle me-1"></i>
                      {{ getMemberName(message.memberId) }}
                    </strong>
                    <div class="d-flex align-items-center gap-2">
                      <small
                        :class="isCurrentUser(message.memberId) ? 'text-white-50' : 'text-muted'"
                        :title="formatFullDate(message.sentAt)"
                      >
                        {{ formatDate(message.sentAt) }}
                        <span v-if="isEdited(message)" class="ms-1">(изм.)</span>
                      </small>
                      <button
                        class="btn btn-sm btn-link p-0"
                        :class="isCurrentUser(message.memberId) ? 'text-white' : 'text-muted'"
                        @click="toggleReactionPicker(message)"
                        title="Реакция"
                      >
                        <i class="bi bi-emoji-smile"></i>
                      </button>
                      <div v-if="isCurrentUser(message.memberId)" class="dropdown" style="overflow: visible">
                        <button
                          class="btn btn-sm btn-link p-0 text-white"
                          data-bs-toggle="dropdown"
                          aria-expanded="false"
                        >
                          <i class="bi bi-three-dots-vertical"></i>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end" style="z-index: 9999">
                          <li>
                            <button class="dropdown-item" @click="startEdit(message)">
                              <i class="bi bi-pencil me-2"></i>Редактировать
                            </button>
                          </li>
                          <li>
                            <button class="dropdown-item text-danger" @click="deletingMessageId = message.messageId">
                              <i class="bi bi-trash me-2"></i>Удалить
                            </button>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div v-if="editingMessageId === message.messageId" class="mb-2">
                    <textarea
                      v-model="editMessageText"
                      class="form-control form-control-sm mb-2"
                      rows="2"
                    ></textarea>
                    <div class="d-flex gap-2">
                      <button @click="saveEditMessage(message.messageId)" class="btn btn-sm btn-light">Сохранить</button>
                      <button @click="cancelEdit" class="btn btn-sm btn-outline-light">Отмена</button>
                    </div>
                  </div>
                  <p v-else class="mb-1">{{ parseSmileys(message.content) }}</p>

                  <div v-if="reactionPickerId === message.messageId" class="d-flex flex-wrap gap-1 mt-2">
                    <button
                      v-for="emoji in REACTION_EMOJIS"
                      :key="emoji"
                      class="btn btn-sm btn-light border py-0 px-2"
                      @click="sendReaction(message, emoji)"
                    >{{ emoji }}</button>
                  </div>

                  <div v-if="message.reactions && message.reactions.length" class="d-flex flex-wrap gap-1 mt-2">
                    <span
                      v-for="group in groupedReactions(message)"
                      :key="group.emoji"
                      class="badge bg-white text-dark"
                      :title="group.members.join(', ')"
                    >
                      {{ group.emoji }} {{ group.count }}
                    </span>
                  </div>
                </template>
              </div>

              <div v-if="isCurrentUser(message.memberId)" class="d-flex justify-content-end mt-1">
                <small
                  class="text-muted"
                  style="cursor: pointer"
                  @click="readInfoId = readInfoId === message.messageId ? null : message.messageId"
                >
                  <i class="bi bi-check2-all me-1"></i>Прочитали: {{ readersOf(message).length }}
                </small>
              </div>
              <div
                v-if="isCurrentUser(message.memberId) && readInfoId === message.messageId"
                class="mt-2 p-2 small border rounded bg-body-tertiary"
              >
                <div v-if="readersOf(message).length === 0" class="text-muted">Ещё никто не прочитал</div>
                <div v-for="reader in readersOf(message)" :key="reader.memberId" class="text-muted">
                  {{ getMemberName(reader.memberId || '') }} — {{ formatReadAt(reader.readAt) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </TransitionGroup>
    </div>
    <div class="card-footer bg-body-tertiary border-top">
      <div class="input-group">
        <input
          v-model="newMessage"
          type="text"
          class="form-control"
          placeholder="Введите сообщение..."
          @keyup.enter="sendMessage"
        />
        <button @click="sendMessage" :disabled="!newMessage.trim()" class="btn btn-primary d-flex align-items-center gap-1">
          <i class="bi bi-send-fill"></i>
          Отправить
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, onActivated, onDeactivated, watch, nextTick } from 'vue'
import { useMotion } from '@vueuse/motion'
import useFamilyStore from '@/stores/familyStore'
import { rsocketService } from '@/services/rsocket'
import {
  type CreateMessageRequest,
  type EditMessageRequest,
  type DeleteMessageRequest,
  type ReactMessageRequest,
  type ViewMessageRequest,
  type MessageRequest,
  type ChatResponse,
  type MessageDto,
  type MessageRead,
  ChatOperationType
} from '@/types/chat'

const PAGE_SIZE = 20
const MONTH_MS = 31 * 24 * 60 * 60 * 1000
const MAX_MONTHS_BACK = 12

const SMILEYS: Record<string, string> = {
  ":'(": '😢',
  ':-)': '🙂',
  ':)': '🙂',
  ':-(': '🙁',
  ':(': '🙁',
  ':-D': '😄',
  ':D': '😄',
  ';-)': '😉',
  ';)': '😉',
  ':-P': '😛',
  ':P': '😛',
  ':-O': '😮',
  ':O': '😮',
  ':*': '😘',
  '<3': '❤️'
}
const SMILEY_KEYS = Object.keys(SMILEYS).sort((a, b) => b.length - a.length)

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '👎']

const parseSmileys = (text: string): string => {
  let result = text
  for (const key of SMILEY_KEYS) {
    if (result.includes(key)) {
      result = result.split(key).join(SMILEYS[key])
    }
  }
  return result
}

const familyStore = useFamilyStore()
const newMessage = ref('')
const chatBody = ref<HTMLElement>()
const editingMessageId = ref<string | null>(null)
const editMessageText = ref('')
const deletingMessageId = ref<string | null>(null)
const reactionPickerId = ref<string | null>(null)
const readInfoId = ref<string | null>(null)

let subscription: any = null
let connectedFamilyId: string | null = null
let connectToken = 0
let suppressAnimation = false

const historyBusy = ref(false)
const noMoreHistory = ref(false)
let historyFamilyId: string | null = null
let historyWindowStart = 0
let historyWindowEnd = 0
let historyPage = 0

const activeFamilyTab = computed(() => familyStore.activeFamilyTab)
const messages = computed(() => {
  const tab = activeFamilyTab.value
  return tab ? familyStore.messages[tab] || [] : []
})

const scrollToBottom = () => {
  nextTick(() => {
    if (chatBody.value) {
      chatBody.value.scrollTop = chatBody.value.scrollHeight
    }
  })
}

const isNearBottom = () => {
  const body = chatBody.value
  if (!body) return true
  return body.scrollHeight - body.scrollTop - body.clientHeight < 120
}

const onEnter = (el: Element, done: () => void) => {
  if (suppressAnimation) {
    done()
    return
  }
  const motion = useMotion(el as HTMLElement, {
    initial: { opacity: 0, y: 50, scale: 0.8 },
    enter: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } },
  })
  done()
}

const onLeave = (el: Element, done: () => void) => {
  const motion = useMotion(el as HTMLElement, {
    leave: { opacity: 0, x: 100, scale: 0.5, transition: { duration: 300 } },
  })
  setTimeout(done, 300)
}

const myMemberId = (): string | null => {
  const activeFamilyId = familyStore.activeFamilyTab
  if (!activeFamilyId) return null
  const profile = familyStore.profiles[activeFamilyId] as any
  return profile?.member?.id ?? null
}

const isCurrentUser = (memberId: string) => {
  return memberId === myMemberId()
}

const getMemberName = (memberId: string) => {
  const memberInfo = familyStore.membersInfo[memberId]
  if (!memberInfo) return 'Неизвестный енот'
  const firstName = memberInfo.firstname || 'Неизвестный'
  const lastName = memberInfo.lastname || 'енот'
  return `${firstName} ${lastName}`
}

const isEdited = (message: MessageDto) => {
  if (!message.updatedAt || !message.sentAt) return false
  const updated = new Date(message.updatedAt).getTime()
  const sent = new Date(message.sentAt).getTime()
  return Math.abs(updated - sent) > 1000
}

const readersOf = (message: MessageDto): MessageRead[] => {
  const myId = myMemberId()
  return (message.reads || []).filter(r => r.memberId && r.memberId !== myId)
}

const groupedReactions = (message: MessageDto) => {
  const groups = new Map<string, { emoji: string; count: number; members: string[] }>()
  for (const reaction of message.reactions || []) {
    const emoji = parseSmileys(reaction.reaction || '')
    if (!emoji) continue
    const group = groups.get(emoji) || { emoji, count: 0, members: [] }
    group.count += 1
    if (reaction.memberId) group.members.push(getMemberName(reaction.memberId))
    groups.set(emoji, group)
  }
  return [...groups.values()]
}

const startEdit = (message: MessageDto) => {
  editingMessageId.value = message.messageId
  editMessageText.value = message.content
}

const cancelEdit = () => {
  editingMessageId.value = null
  editMessageText.value = ''
}

const toggleReactionPicker = (message: MessageDto) => {
  reactionPickerId.value = reactionPickerId.value === message.messageId ? null : message.messageId
  readInfoId.value = null
}

const saveEditMessage = async (messageId: string) => {
  if (!editMessageText.value.trim() || !activeFamilyTab.value) return

  try {
    const request: EditMessageRequest = {
      familyId: activeFamilyTab.value,
      messageId,
      content: editMessageText.value.trim()
    }
    await rsocketService.fireAndForget('api.family.chat.edit', request)
    cancelEdit()
    scrollToBottom()
  } catch (error) {
    console.error('Ошибка редактирования сообщения:', error)
  }
}

const confirmDeleteMessage = async () => {
  if (!deletingMessageId.value || !activeFamilyTab.value) return

  try {
    const request: DeleteMessageRequest = {
      familyId: activeFamilyTab.value,
      messageId: deletingMessageId.value
    }
    await rsocketService.fireAndForget('api.family.chat.delete', request)

    deletingMessageId.value = null
    scrollToBottom()
  } catch (error) {
    console.error('Ошибка удаления сообщения:', error)
  }
}

const sendMessage = async () => {
  if (!newMessage.value.trim() || !activeFamilyTab.value) return

  try {
    const request: CreateMessageRequest = {
      content: newMessage.value.trim(),
      familyId: activeFamilyTab.value,
      replyToId: null
    }
    await rsocketService.fireAndForget('api.family.chat.send', request)
    newMessage.value = ''
    scrollToBottom()
  } catch (error) {
    console.error('Ошибка отправки сообщения:', error)
  }
}

const sendReaction = async (message: MessageDto, reaction: string) => {
  reactionPickerId.value = null
  if (!activeFamilyTab.value) return

  try {
    const request: ReactMessageRequest = {
      messageId: message.messageId,
      reaction,
      familyId: activeFamilyTab.value
    }
    await rsocketService.fireAndForget('api.family.chat.react', request)
  } catch (error) {
    console.error('Ошибка отправки реакции:', error)
  }
}

const markMessagesAsRead = (list: MessageDto[]) => {
  const familyId = activeFamilyTab.value
  const myId = myMemberId()
  if (!familyId || !myId) return

  for (const message of list) {
    if (message.memberId === myId) continue
    if (message.reads?.some(r => r.memberId === myId)) continue
    const request: ViewMessageRequest = {
      familyId,
      messageId: message.messageId
    }
    rsocketService.fireAndForget('api.family.chat.view', request).catch(() => {})
  }
}

const fetchMessagesPage = async (familyId: string, start: number, end: number, page: number): Promise<MessageDto[]> => {
  const request: MessageRequest = {
    page,
    size: PAGE_SIZE,
    startDate: new Date(start).toISOString(),
    endDate: new Date(end).toISOString()
  }
  const response = await rsocketService.requestResponse(`api.family.chat.${familyId}.messages`, request)
  const list = Array.isArray(response) ? response : response ? [response] : []
  return (list as MessageDto[]).filter(m => m && m.messageId)
}

const ensureScrollable = async () => {
  await nextTick()
  const body = chatBody.value
  if (!body) return
  if (body.scrollHeight <= body.clientHeight + 40 && !noMoreHistory.value && messages.value.length) {
    await loadOlderMessages()
  }
}

const prependAndRestore = async (familyId: string, page: MessageDto[], body: HTMLElement | undefined, previousTop: number, previousHeight: number) => {
  suppressAnimation = true
  familyStore.prependMessages(familyId, page.reverse())
  markMessagesAsRead(page)
  await nextTick()
  if (body) {
    body.scrollTop = previousTop + (body.scrollHeight - previousHeight)
  }
  suppressAnimation = false
}

const loadChatHistory = async () => {
  const familyId = activeFamilyTab.value
  if (!familyId || (historyBusy.value && historyFamilyId === familyId)) return
  historyBusy.value = true
  historyFamilyId = familyId
  try {
    let end = Date.now()
    for (let attempt = 0; attempt < MAX_MONTHS_BACK; attempt++) {
      const start = end - MONTH_MS
      const page = await fetchMessagesPage(familyId, start, end, 0)
      if (page.length > 0) {
        historyWindowStart = start
        historyWindowEnd = end
        historyPage = 0
        noMoreHistory.value = false
        familyStore.loadMessages(familyId, page.reverse())
        if (familyStore.activeFamilyTab === familyId) {
          scrollToBottom()
        }
        markMessagesAsRead(page)
        await ensureScrollable()
        return
      }
      end = start
    }
    noMoreHistory.value = true
    familyStore.loadMessages(familyId, [])
  } catch (error) {
    console.error('Ошибка загрузки истории:', error)
  } finally {
    if (historyFamilyId === familyId) {
      historyBusy.value = false
    }
  }
}

const loadOlderMessages = async () => {
  const familyId = activeFamilyTab.value
  if (!familyId || historyBusy.value) return
  if (historyFamilyId !== familyId || noMoreHistory.value) return
  historyBusy.value = true
  const body = chatBody.value
  const previousTop = body ? body.scrollTop : 0
  const previousHeight = body ? body.scrollHeight : 0
  try {
    let page = await fetchMessagesPage(familyId, historyWindowStart, historyWindowEnd, historyPage + 1)
    if (page.length > 0) {
      historyPage += 1
      await prependAndRestore(familyId, page, body, previousTop, previousHeight)
      return
    }

    let end = historyWindowStart
    for (let attempt = 0; attempt < MAX_MONTHS_BACK; attempt++) {
      const start = end - MONTH_MS
      page = await fetchMessagesPage(familyId, start, end, 0)
      if (page.length > 0) {
        historyWindowStart = start
        historyWindowEnd = end
        historyPage = 0
        await prependAndRestore(familyId, page, body, previousTop, previousHeight)
        return
      }
      end = start
    }
    noMoreHistory.value = true
  } catch (error) {
    console.error('Ошибка загрузки истории:', error)
  } finally {
    if (historyFamilyId === familyId) {
      historyBusy.value = false
    }
  }
}

const onChatScroll = () => {
  const body = chatBody.value
  if (body && body.scrollTop <= 80) {
    loadOlderMessages()
  }
}

const disconnectFromChatStream = () => {
  if (subscription) {
    subscription.unsubscribe()
    subscription = null
  }
  connectedFamilyId = null
}

const connectToChatStream = () => {
  const familyId = activeFamilyTab.value
  if (!familyId) return

  disconnectFromChatStream()
  connectedFamilyId = familyId
  const token = ++connectToken

  rsocketService.requestStream(`api.family.chat.${familyId}.stream`).then(observable => {
    if (token !== connectToken || connectedFamilyId !== familyId) return
    subscription = observable.subscribe({
      next: (response: ChatResponse) => {
        if (response.operationType === ChatOperationType.NEW_MESSAGE) {
          const incoming: MessageDto = {
            memberId: response.memberId,
            messageId: response.messageId,
            content: response.content,
            replyToId: null,
            reactions: response.reactions,
            reads: response.reads,
            sentAt: response.sentAt,
            updatedAt: response.updatedAt
          }
          familyStore.addMessage(response.familyId, incoming)
          markMessagesAsRead([incoming])
          scrollToBottom()
        } else if (response.operationType === ChatOperationType.EDIT_MESSAGE) {
          familyStore.updateMessage(response.familyId, response.messageId, response.content)
        } else if (response.operationType === ChatOperationType.DELETE_MESSAGE) {
          familyStore.removeMessage(response.familyId, response.messageId)
        } else if (response.operationType === ChatOperationType.REACTION_ON_MESSAGE) {
          if (response.reactions) {
            familyStore.setReactions(response.familyId, response.messageId, response.reactions)
          }
        } else if (response.operationType === ChatOperationType.VIEWED_MESSAGE) {
          if (response.reads) {
            familyStore.setReads(response.familyId, response.messageId, response.reads)
          }
        }
      },
      error: (error: any) => {
        console.error('Chat stream error:', error)
      }
    })
  }).catch(error => {
    console.error('Failed to connect to chat stream:', error)
  })
}

const formatDate = (dateString: string): string => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

const formatFullDate = (dateString: string): string => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatReadAt = (value?: string): string => {
  if (!value) return ''
  const date = new Date(value)
  const sameDay = date.toDateString() === new Date().toDateString()
  return sameDay
    ? date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const dayLabel = (dateString: string): string => {
  const date = new Date(dateString)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const day = new Date(date)
  day.setHours(0, 0, 0, 0)
  const diffDays = Math.round((today.getTime() - day.getTime()) / 86400000)
  if (diffDays === 0) return 'Сегодня'
  if (diffDays === 1) return 'Вчера'
  const sameYear = date.getFullYear() === new Date().getFullYear()
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    ...(sameYear ? {} : { year: 'numeric' })
  })
}

const dayKeyOf = (dateString: string) => new Date(dateString).toDateString()

const showDaySeparator = (message: MessageDto, index: number) => {
  const previous = messages.value[index - 1]
  return index === 0 || !previous || dayKeyOf(message.sentAt) !== dayKeyOf(previous.sentAt)
}

watch(activeFamilyTab, async (newTab) => {
  reactionPickerId.value = null
  readInfoId.value = null
  if (newTab) {
    await loadChatHistory()
    connectToChatStream()
  } else {
    disconnectFromChatStream()
  }
})

watch(messages, () => {
  if (isNearBottom()) {
    scrollToBottom()
  }
}, { deep: true })

onMounted(async () => {
  await loadChatHistory()
  connectToChatStream()
})

onActivated(() => {
  if (!connectedFamilyId && activeFamilyTab.value) {
    loadChatHistory()
    connectToChatStream()
  }
})

onDeactivated(() => {
  disconnectFromChatStream()
})

onUnmounted(() => {
  disconnectFromChatStream()
})
</script>

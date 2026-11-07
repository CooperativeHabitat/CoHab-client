<template>
  <div class="card h-100 d-flex flex-column overflow-hidden">
    <div
      class="card-body flex-grow-1 overflow-auto p-3 chat-scroll"
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
        <div
          v-for="(message, index) in messages"
          :key="message.messageId"
          :class="isLastOfGroup(message, index) ? 'mb-2' : 'mb-1'"
        >
          <div v-if="showDaySeparator(message, index)" class="d-flex justify-content-center my-3">
            <span class="badge border-0 fw-normal small" style="background: #1c2733; color: #7d8e9e;">{{ dayLabel(message.sentAt) }}</span>
          </div>

          <div
            :data-mid="message.messageId"
            :class="['d-flex gap-2', isCurrentUser(message.memberId) ? 'justify-content-end' : 'justify-content-start']"
            @contextmenu.prevent="openMessageMenu($event, message)"
            @touchstart.passive="startLongPress($event, message)"
            @touchend="cancelLongPress"
            @touchmove.passive="cancelLongPress"
          >
            <div
              v-if="!isCurrentUser(message.memberId) && isLastOfGroup(message, index)"
              class="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white flex-shrink-0"
              style="width: 2.2rem; height: 2.2rem; font-size: 0.8rem; background: #5288c1; margin-top: 0.25rem;"
            >{{ memberInitials(message.memberId) }}</div>
            <div
              v-else-if="!isCurrentUser(message.memberId)"
              style="width: 2.2rem; flex-shrink: 0;"
            ></div>

            <div class="d-flex flex-column min-w-0" style="max-width: 80%;">
              <div :class="['p-2 px-3 rounded-3', isCurrentUser(message.memberId) ? 'chat-msg-own' : 'chat-msg-other']">
                <div v-if="deletingMessageId === message.messageId" class="text-center py-2">
                  <p class="mb-2 small">Удалить сообщение?</p>
                  <div class="d-flex gap-2 justify-content-center">
                    <button @click="confirmDeleteMessage" class="btn btn-sm btn-danger py-0 px-2">Удалить</button>
                    <button @click="deletingMessageId = null" class="btn btn-sm btn-secondary py-0 px-2">Отмена</button>
                  </div>
                </div>

                <template v-else>
                  <div
                    v-if="replyTarget(message)"
                    class="rounded-3 px-2 py-1 mb-1"
                    style="background: rgba(0,0,0,0.25); border-left: 3px solid #6ab3f3; cursor: pointer; font-size: 0.8rem; max-width: 100%;"
                    :title="replyTarget(message)!.content"
                    @click="scrollToMessage(message.replyToId!)"
                  >
                    <div class="fw-bold" style="color: #6ab3f3;">{{ getMemberName(replyTarget(message)!.memberId) }}</div>
                    <div class="text-truncate">{{ parseSmileys(replyTarget(message)!.content) }}</div>
                  </div>

                  <div v-if="!isCurrentUser(message.memberId) && isFirstOfGroup(message, index)" class="d-flex align-items-center gap-1 mb-1">
                    <small class="fw-bold" style="color: #6ab3f3;">{{ getMemberName(message.memberId) }}</small>
                  </div>

                  <div v-if="editingMessageId === message.messageId" class="mb-1">
                    <textarea
                      v-model="editMessageText"
                      class="form-control form-control-sm mb-2"
                      rows="2"
                    ></textarea>
                    <div class="d-flex gap-2">
                      <button @click="saveEditMessage(message.messageId)" class="btn btn-sm btn-light py-0 px-2">Сохранить</button>
                      <button @click="cancelEdit" class="btn btn-sm btn-outline-secondary py-0 px-2">Отмена</button>
                    </div>
                  </div>
                  <p v-else class="mb-0" style="word-break: break-word;">
                    {{ parseSmileys(message.content) }}
                    <span
                      class="float-end d-inline-block ms-2"
                      :class="isCurrentUser(message.memberId) ? 'text-white-50' : 'text-muted'"
                      style="font-size: 0.7rem; margin-top: 0.8rem;"
                      :title="formatFullDate(message.sentAt)"
                    >{{ formatDate(message.sentAt) }}<span v-if="isEdited(message)"> (изм.)</span></span>
                  </p>
                </template>
              </div>

              <div
                v-if="groupedReactions(message).length || isCurrentUser(message.memberId)"
                class="d-flex align-items-center gap-2 mt-1 flex-wrap"
                :class="isCurrentUser(message.memberId) ? 'justify-content-end' : 'justify-content-start'"
              >
                <span
                  v-for="group in groupedReactions(message)"
                  :key="group.emoji"
                  class="badge rounded-pill border-0 d-flex align-items-center gap-1"
                  style="background: #1c2733;"
                  :title="group.members.join(', ')"
                >
                  <span>{{ group.emoji }}</span>
                  <small v-if="group.count > 1" style="color: #7d8e9e;">{{ group.count }}</small>
                </span>

                <small
                  v-if="isCurrentUser(message.memberId)"
                  class="text-muted d-flex align-items-center gap-1"
                  style="cursor: pointer; font-size: 0.7rem;"
                  title="Кто прочитал"
                  @click="readInfoId = readInfoId === message.messageId ? null : message.messageId"
                >
                  <i class="bi bi-check2-all" style="font-size: 0.8rem;"></i>{{ readersOf(message).length }}
                </small>
              </div>

              <div
                v-if="isCurrentUser(message.memberId) && readInfoId === message.messageId"
                class="p-2 small rounded-3 mt-1"
                style="background: #17212b; max-width: 100%;"
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

    <div v-if="typingNames.length" class="px-3 py-1 small text-muted border-top" style="background: #17212b;">
      <i class="bi bi-pencil me-1"></i>{{ typingNames.join(', ') }} {{ typingNames.length > 1 ? 'печатают…' : 'печатает…' }}
    </div>

    <div v-if="replyTo" class="d-flex align-items-center gap-2 px-3 py-2 border-top" style="background: #17212b;">
      <i class="bi bi-reply text-primary"></i>
      <div class="flex-grow-1 min-w-0" style="border-left: 3px solid #6ab3f3; padding-left: 0.5rem;">
        <div class="small fw-bold" style="color: #6ab3f3;">{{ getMemberName(replyTo.memberId) }}</div>
        <div class="small text-muted text-truncate">{{ parseSmileys(replyTo.content) }}</div>
      </div>
      <button type="button" class="btn-close btn-close-white" @click="replyTo = null"></button>
    </div>

    <div class="card-footer border-top" style="background: #17212b;">
      <div class="input-group">
        <input
          ref="messageInput"
          v-model="newMessage"
          type="text"
          class="form-control border-0"
          style="background: #232e3c;"
          placeholder="Введите сообщение..."
          @keyup.enter="sendMessage"
          @input="onInputTyping"
        />
        <button @click="sendMessage" :disabled="!newMessage.trim()" class="btn btn-primary d-flex align-items-center">
          <i class="bi bi-send-fill"></i>
        </button>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="menuMessage"
        class="position-fixed top-0 start-0 w-100 h-100"
        style="z-index: 1040;"
        @click="closeMessageMenu"
        @contextmenu.prevent="closeMessageMenu"
      ></div>

      <div
        v-if="menuMessage"
        class="card shadow-lg rounded-3 p-2"
        style="position: fixed; z-index: 1050; width: min(260px, calc(100vw - 24px)); background: #17212b;"
        :style="{ top: menuY + 'px', left: menuX + 'px' }"
      >
        <div class="d-flex flex-wrap gap-1 mb-1">
          <button
            v-for="emoji in REACTION_EMOJIS"
            :key="emoji"
            class="btn btn-sm border-0 py-1 px-2"
            style="background: transparent;"
            @click="sendReaction(menuMessage, emoji); closeMessageMenu()"
          >{{ emoji }}</button>
        </div>
        <template v-if="menuMessage">
          <hr class="my-1" style="border-color: #2f3d4d;">
          <button class="dropdown-item rounded-2 small d-flex align-items-center gap-2" @click="startReply(menuMessage); closeMessageMenu()">
            <i class="bi bi-reply"></i> Ответить
          </button>
        </template>
        <template v-if="menuMessage && isCurrentUser(menuMessage.memberId)">
          <button class="dropdown-item rounded-2 small d-flex align-items-center gap-2" @click="startEdit(menuMessage); closeMessageMenu()">
            <i class="bi bi-pencil"></i> Редактировать
          </button>
          <button class="dropdown-item rounded-2 small d-flex align-items-center gap-2 text-danger" @click="deletingMessageId = menuMessage!.messageId; closeMessageMenu()">
            <i class="bi bi-trash"></i> Удалить
          </button>
        </template>
      </div>
    </Teleport>
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
  '<3': '❤️',
  '=)': '😃',
  ';(': '😢',
  'xD': '😆',
  'XD': '😆'
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
const readInfoId = ref<string | null>(null)
const replyTo = ref<MessageDto | null>(null)
const messageInput = ref<HTMLInputElement>()

const menuMessage = ref<MessageDto | null>(null)
const menuX = ref(0)
const menuY = ref(0)
let longPressTimer: any = null

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

const memberInitials = (memberId: string) => {
  const memberInfo = familyStore.membersInfo[memberId]
  if (!memberInfo) return '?'
  const first = memberInfo.firstname?.[0] || ''
  const last = memberInfo.lastname?.[0] || ''
  return (first + last).toUpperCase() || '?'
}

const isFirstOfGroup = (message: MessageDto, index: number) => {
  const previous = messages.value[index - 1]
  return !previous || previous.memberId !== message.memberId
}

const isLastOfGroup = (message: MessageDto, index: number) => {
  const next = messages.value[index + 1]
  return !next || next.memberId !== message.memberId
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

const messageById = computed(() => {
  const map = new Map<string, MessageDto>()
  for (const m of messages.value) map.set(m.messageId, m)
  return map
})

const replyTarget = (message: MessageDto): MessageDto | null => {
  if (!message.replyToId) return null
  const loaded = messageById.value.get(message.replyToId)
  if (loaded) return loaded
  if (message.replyPreview) {
    return {
      messageId: message.replyToId,
      memberId: message.replyPreview.memberId,
      content: message.replyPreview.content,
      replyToId: null,
      reactions: null,
      reads: null,
      sentAt: '',
      updatedAt: ''
    }
  }
  return null
}

const scrollToMessage = (messageId: string) => {
  const el = chatBody.value?.querySelector(`[data-mid="${messageId}"]`)
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

const typingIds = ref<string[]>([])
const typingTimers: Record<string, any> = {}

const handleTyping = (memberId: string) => {
  if (isCurrentUser(memberId)) return
  if (!typingIds.value.includes(memberId)) {
    typingIds.value = [...typingIds.value, memberId]
  }
  if (typingTimers[memberId]) clearTimeout(typingTimers[memberId])
  typingTimers[memberId] = setTimeout(() => {
    typingIds.value = typingIds.value.filter(id => id !== memberId)
    delete typingTimers[memberId]
  }, 4000)
}

const typingNames = computed(() => typingIds.value.map(id => getMemberName(id)))

const clearTyping = () => {
  Object.keys(typingTimers).forEach(id => {
    clearTimeout(typingTimers[id])
    delete typingTimers[id]
  })
  typingIds.value = []
}

let lastTypingSent = 0

const onInputTyping = () => {
  const now = Date.now()
  if (!activeFamilyTab.value || now - lastTypingSent < 2500) return
  lastTypingSent = now
  rsocketService.fireAndForget('api.family.chat.typing', { familyId: activeFamilyTab.value }).catch(() => {})
}

const startReply = (message: MessageDto) => {
  replyTo.value = message
  nextTick(() => messageInput.value?.focus())
}

const openMessageMenuAt = (clientX: number, clientY: number, message: MessageDto) => {
  const width = 260
  const height = 170
  menuX.value = Math.max(8, Math.min(clientX, window.innerWidth - width - 8))
  menuY.value = Math.max(8, Math.min(clientY, window.innerHeight - height - 8))
  menuMessage.value = message
}

const openMessageMenu = (event: MouseEvent, message: MessageDto) => {
  openMessageMenuAt(event.clientX, event.clientY, message)
}

const startLongPress = (event: TouchEvent, message: MessageDto) => {
  const touch = event.touches[0]
  if (!touch) return
  const x = touch.clientX
  const y = touch.clientY
  cancelLongPress()
  longPressTimer = setTimeout(() => {
    openMessageMenuAt(x, y, message)
  }, 500)
}

const cancelLongPress = () => {
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
}

const closeMessageMenu = () => {
  menuMessage.value = null
  cancelLongPress()
}

const startEdit = (message: MessageDto) => {
  editingMessageId.value = message.messageId
  editMessageText.value = message.content
}

const cancelEdit = () => {
  editingMessageId.value = null
  editMessageText.value = ''
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
      replyToId: replyTo.value?.messageId ?? null
    }
    await rsocketService.fireAndForget('api.family.chat.send', request)
    newMessage.value = ''
    replyTo.value = null
    scrollToBottom()
  } catch (error) {
    console.error('Ошибка отправки сообщения:', error)
  }
}

const sendReaction = async (message: MessageDto, reaction: string) => {
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
            replyToId: response.replyTo?.messageId ?? response.replyToId ?? null,
            reactions: response.reactions,
            reads: response.reads,
            sentAt: response.sentAt,
            updatedAt: response.updatedAt
          }
          if (response.replyTo) {
            incoming.replyPreview = {
              memberId: response.replyTo.memberId,
              content: response.replyTo.content
            }
          }
          familyStore.addMessage(response.familyId, incoming)
          markMessagesAsRead([incoming])
          typingIds.value = typingIds.value.filter(id => id !== response.memberId)
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
        } else if (response.operationType === ChatOperationType.TYPING) {
          handleTyping(response.memberId)
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
  readInfoId.value = null
  replyTo.value = null
  clearTyping()
  closeMessageMenu()
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
  cancelLongPress()
  clearTyping()
})
</script>

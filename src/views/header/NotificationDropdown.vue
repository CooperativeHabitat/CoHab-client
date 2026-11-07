<template>
  <div>
    <button
      class="btn nav-link position-relative"
      aria-expanded="false"
      @click="togglePopup"
    >
      <BellIcon :size="20" :class="notificationStore.unreadCount > 0 ? 'text-warning' : ''" />
      <span
        v-if="notificationStore.unreadCount > 0"
        class="position-absolute translate-middle badge rounded-pill bg-danger"
        style="font-size: 0.7rem; padding: 0.2em 0.4em; top: 10px; right: -2px;"
      >
        {{ notificationStore.unreadCount > 99 ? '99+' : notificationStore.unreadCount }}
      </span>
    </button>

    <Teleport to="body">
      <div
        v-if="popupOpen"
        class="position-fixed top-0 start-0 w-100 h-100"
        style="z-index: 1040;"
        @click="popupOpen = false"
      ></div>

      <div
        v-if="popupOpen"
        class="card shadow-lg rounded-3 overflow-hidden"
        style="position: fixed; top: 64px; right: 16px; width: min(360px, calc(100vw - 24px)); z-index: 1050;"
      >
        <div class="card-header bg-body-tertiary border-bottom d-flex justify-content-between align-items-center py-2">
          <div class="d-flex align-items-center gap-2">
            <i class="bi bi-bell text-primary"></i>
            <h6 class="mb-0">Уведомления</h6>
          </div>
          <button type="button" class="btn-close" @click="popupOpen = false"></button>
        </div>

        <div class="card-body p-2 overflow-auto" style="max-height: 60vh;">
          <div v-if="notificationStore.notifications.length === 0" class="d-flex flex-column align-items-center justify-content-center text-center py-4">
            <div class="rounded-circle d-flex align-items-center justify-content-center bg-primary bg-opacity-10 mb-3" style="width: 3.5rem; height: 3.5rem;">
              <i class="bi bi-bell-slash fs-4 text-primary"></i>
            </div>
            <p class="mb-0 small">Уведомлений нет</p>
          </div>

          <div v-for="notification in notificationStore.notifications"
               :key="notification.createdAt"
               class="card border-0 border-start border-3 border-primary mb-2">
            <div class="card-body p-2">
              <div class="d-flex justify-content-between align-items-baseline gap-2 mb-1">
                <small class="text-primary fw-bold text-truncate">{{ notification.from }}</small>
                <small class="text-muted text-nowrap flex-shrink-0">{{ formatDate(notification.createdAt) }}</small>
              </div>
              <p class="mb-0 small">{{ notification.message }}</p>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { BellIcon } from 'lucide-vue-next'
import { useNotificationStore } from '@/stores/notificationStore'
import { rsocketService } from '@/services/rsocket'
import { playNotificationSound } from '@/services/soundService'
import type { NotificationDto, NotificationRequest } from '@/types/notification'

const notificationStore = useNotificationStore()
const popupOpen = ref(false)
let subscription: any = null

const togglePopup = () => {
  popupOpen.value = !popupOpen.value
  if (popupOpen.value) {
    notificationStore.markAllRead()
  }
}

const formatDate = (dateString: string): string => {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60000) return 'только что'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} мин. назад`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч. назад`

  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const showToast = (notification: NotificationDto) => {
  const toastContainer = document.getElementById('toast-container')
  if (!toastContainer) return

  const toast = document.createElement('div')
  toast.className = 'toast align-items-center border-0'
  toast.style.background = 'rgba(64, 98, 200, 0.95)'
  toast.style.color = 'white'
  toast.setAttribute('role', 'alert')
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        <strong>${notification.from}</strong><br>
        <small>${notification.message}</small>
      </div>
      <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `
  toastContainer.appendChild(toast)

  const bsToast = new (window as any).bootstrap.Toast(toast, { delay: 3000 })
  bsToast.show()

  toast.addEventListener('hidden.bs.toast', () => toast.remove())
}

const loadNotifications = async () => {
  try {
    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const request: NotificationRequest = {
      page: 0,
      size: 20,
      startDate: yesterday.toISOString(),
      endDate: now.toISOString()
    }

    const response = await rsocketService.requestResponse('api.notification.notifications', request)
    const notifications = response?.content || response || []
    notificationStore.loadNotifications(Array.isArray(notifications) ? notifications : [])
  } catch (error) {
    console.error('Ошибка загрузки уведомлений:', error)
  }
}

const connectNotificationStream = () => {
  rsocketService.requestStream('api.notification.stream').then(observable => {
    subscription = observable.subscribe({
      next: (response: NotificationDto) => {
        notificationStore.addNotification(response)
        playNotificationSound()
        showToast(response)
      },
      error: (error: any) => {
        console.error('Notification stream error:', error)
      }
    })
  }).catch(error => {
    console.error('Failed to connect to notification stream:', error)
  })
}

onMounted(() => {
  loadNotifications()
  connectNotificationStream()
})

onUnmounted(() => {
  if (subscription) {
    subscription.unsubscribe()
  }
})
</script>

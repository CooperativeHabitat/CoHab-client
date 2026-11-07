<template>
  <div>
    <button
      ref="profileButton"
      class="btn nav-link"
      title="Профиль"
      aria-expanded="false"
      @click="togglePopup"
    >
      <UserIcon :size="20" />
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
        style="position: fixed; width: min(260px, calc(100vw - 24px)); z-index: 1050;"
        :style="popupStyle"
      >
        <div class="card-body p-2">
          <button
            class="dropdown-item rounded-2 d-flex align-items-center gap-2"
            @click="handleProfileClick"
          >
            <UserIcon :size="16" />
            Профиль
          </button>
          <hr class="my-2" />
          <div class="px-2 pb-1">
            <div class="d-flex align-items-center gap-2 mb-2 small text-muted">
              <ImageIcon :size="14" />
              Фон
            </div>
            <div class="d-flex flex-wrap gap-1">
              <button
                v-for="preset in backgroundStore.presets"
                :key="preset.id"
                class="p-0 rounded-2 overflow-hidden"
                :class="backgroundStore.currentId === preset.id ? 'border border-2 border-primary' : 'border border-secondary'"
                style="width: 52px; height: 32px;"
                :title="preset.id === 'default' ? 'Стандартный фон' : preset.id"
                @click="backgroundStore.setBackground(preset.id)"
              >
                <img
                  v-if="preset.thumb"
                  :src="preset.thumb"
                  style="width: 100%; height: 100%; object-fit: cover;"
                  alt=""
                />
                <span
                  v-else
                  class="d-flex align-items-center justify-content-center w-100 h-100"
                  style="background: #10192a; font-size: 0.65rem; color: #7d8e9e;"
                >Станд.</span>
              </button>
            </div>
          </div>
          <hr class="my-2" />
          <button
            class="dropdown-item rounded-2 d-flex align-items-center gap-2 text-danger"
            @click="handleLogoutClick"
          >
            <LogOutIcon :size="16" />
            Выйти из аккаунта
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { UserIcon, LogOutIcon, ImageIcon } from 'lucide-vue-next'
import { authService } from '@/services/authService.ts'
import router from '@/router'
import useBackgroundStore from '@/stores/backgroundStore'

const backgroundStore = useBackgroundStore()
const popupOpen = ref(false)
const profileButton = ref<HTMLElement>()
const popupStyle = ref<{ top?: string; right?: string }>({})

const togglePopup = () => {
  popupOpen.value = !popupOpen.value
  if (popupOpen.value) {
    const rect = profileButton.value?.getBoundingClientRect()
    if (rect) {
      popupStyle.value = {
        top: Math.round(rect.bottom + 8) + 'px',
        right: Math.max(8, Math.round(window.innerWidth - rect.right)) + 'px'
      }
    }
  }
}

const handleProfileClick = () => {
  popupOpen.value = false
}

const handleLogoutClick = () => {
  popupOpen.value = false
  authService.logout()
  router.push('/login')
}
</script>

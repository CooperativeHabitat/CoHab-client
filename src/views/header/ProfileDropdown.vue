<template>
  <div>
    <button
      class="btn nav-link"
      title="Профиль"
      aria-expanded="false"
      @click="popupOpen = !popupOpen"
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
        style="position: fixed; top: 64px; right: 16px; width: min(260px, calc(100vw - 24px)); z-index: 1050;"
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
import { UserIcon, LogOutIcon } from 'lucide-vue-next'
import { authService } from '@/services/authService.ts'
import router from '@/router'

const popupOpen = ref(false)

const handleProfileClick = () => {
  popupOpen.value = false
}

const handleLogoutClick = () => {
  popupOpen.value = false
  authService.logout()
  router.push('/login')
}
</script>

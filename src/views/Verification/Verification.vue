<template>
  <div class="d-flex flex-column overflow-hidden">
    <main class="flex-grow-1 d-flex p-4 overflow-auto">
      <div class="card shadow text-center p-5 m-auto" style="max-width: 40rem; width: 100%;">
      <div class="d-inline-flex p-3 bg-primary bg-opacity-10 rounded-circle mb-4 text-primary">
        <LockIcon :size="32" />
      </div>
      
      <h3>Попросите администратора подтвердить вашу личность</h3>
      
      <p class="text-muted">Для доступа ко всем функциям системы необходимо подтверждение администратора</p>
      
      <a href="#" class="btn btn-outline-primary d-inline-flex align-items-center gap-2 mt-3">
        Как связаться с администратором?
        <ArrowRightIcon :size="16" />
      </a>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { LockIcon, ArrowRightIcon } from 'lucide-vue-next'
</script>
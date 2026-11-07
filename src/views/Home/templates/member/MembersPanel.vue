<template>
  <div class="card h-100 d-flex flex-column overflow-hidden">
    <div v-if="membersLoading" class="d-flex justify-content-center align-items-center flex-grow-1">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Загрузка участников...</span>
      </div>
    </div>
    
    <template v-else>
      <div class="card-header bg-body-tertiary border-bottom d-flex justify-content-end align-items-center py-2 gap-2">
        <button @click="$emit('invite')" class="btn btn-sm btn-outline-secondary py-0 px-2" title="Пригласить">
          <i class="bi bi-person-plus me-1"></i>Пригласить
        </button>
        <button @click="$emit('settings')" class="btn btn-sm btn-outline-secondary py-0 px-2" title="Настройки">
          <i class="bi bi-gear"></i>
        </button>
      </div>

      <div class="card-body overflow-auto flex-grow-1 p-2">
        <div v-if="members.length === 0" class="d-flex flex-column align-items-center justify-content-center h-100 text-center">
          <div class="rounded-circle d-flex align-items-center justify-content-center bg-primary bg-opacity-10 mb-3" style="width: 4rem; height: 4rem;">
            <i class="bi bi-people fs-3 text-primary"></i>
          </div>
          <p class="mb-0">Нет участников</p>
        </div>
        <div v-else class="d-flex flex-column gap-2">
          <div v-for="member in members" :key="member.value?.id || member.id">
            <FamilyMemberCard 
              :member="member"
              :available-roles="availableRoles"
              @assign-role="$emit('assign-role', $event)"
              @detach-role="$emit('detach-role', $event)" />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { Ref } from 'vue'
import type { Role } from '@/types/family.ts';
import FamilyMemberCard from './FamilyMemberCard.vue'

defineProps<{
  members: any[]
  membersLoading: boolean
  availableRoles: Ref<Role>[]
}>()

defineEmits<{
  settings: []
  invite: []
  'assign-role': [data: { familyId: string; familyMemberId: string; roleName: string }]
  'detach-role': [data: { familyId: string; familyMemberId: string; roleName: string }]
}>()
</script>
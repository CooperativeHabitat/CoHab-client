<template>
  <div :class="['card border-start border-3 mb-2', borderClass]">
    <div class="card-body p-2">
      <div class="d-flex align-items-center gap-2">
        <span :class="['badge', badgeClass]">{{ statusText }}</span>
        <h6 class="mb-0 flex-grow-1 text-truncate">{{ task.value.taskName }}</h6>
        <small
          class="text-muted text-nowrap flex-shrink-0"
          :class="{ 'text-danger fw-bold': isOverdue }"
        >{{ timeLeft }}</small>
      </div>

      <p v-if="task.value.description" class="small text-muted mb-2 mt-1">{{ task.value.description }}</p>

      <div class="progress mb-2" style="height: 3px;">
        <div class="progress-bar" :class="progressBg"
             :style="{ width: deadlineProgress + '%' }"></div>
      </div>

      <div class="d-flex justify-content-between align-items-center gap-2 flex-wrap">
        <div class="d-flex align-items-center gap-1 small text-muted min-w-0">
          <span class="text-truncate" :title="'Автор: ' + personName(task.value.createdBy)">
            <i class="bi bi-person"></i>
            {{ personName(task.value.createdBy) }}
          </span>
          <i class="bi bi-arrow-right-short flex-shrink-0"></i>
          <span class="text-truncate" :title="'Исполнитель: ' + personName(task.value.issuedTo)">
            <i :class="task.value.isMarked ? 'bi bi-person-fill-check' : 'bi bi-person-check'"></i>
            {{ personName(task.value.issuedTo) }}
          </span>
        </div>

        <div class="d-flex align-items-center gap-1 flex-shrink-0">
          <small
            :class="isOverdue ? 'text-danger' : 'text-muted'"
            class="d-flex align-items-center gap-1"
            :title="'Дедлайн: ' + formatDate(task.value.dueDate)"
          >
            <ClockIcon :size="12" />
            {{ formatDate(task.value.dueDate) }}
          </small>
          <button
            v-if="canMarkTask && !task.value.isChecked"
            @click="$emit('mark-task', task, !task.value.isMarked)"
            :class="['btn btn-sm py-0 px-2', task.value.isMarked ? 'btn-primary' : 'btn-outline-primary']"
            :title="task.value.isMarked ? 'Снять отметку выполнения' : 'Отметить выполненной'"
          >
            <i class="bi bi-check2-circle me-1"></i>{{ task.value.isMarked ? 'Отменить' : 'Выполнено' }}
          </button>
          <button
            v-if="canCheckTask"
            @click="$emit('check-task', task, !task.value.isChecked)"
            :class="['btn btn-sm py-0 px-2', task.value.isChecked ? 'btn-success' : 'btn-outline-success']"
            :title="task.value.isChecked ? 'Снять проверку' : 'Проверить задачу'"
          >
            <i class="bi bi-check2-all me-1"></i>{{ task.value.isChecked ? 'Снять проверку' : 'Проверить' }}
          </button>
          <button @click="$emit('edit-task', task)" class="btn btn-outline-secondary btn-sm py-0 px-1" title="Редактировать">
            <EditIcon :size="12" />
          </button>
          <button @click="$emit('delete-task', task)" class="btn btn-outline-danger btn-sm py-0 px-1" title="Удалить">
            <TrashIcon :size="12" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, type Ref } from 'vue'
import { ClockIcon, EditIcon, TrashIcon } from 'lucide-vue-next'
import type { Task, } from '@/types/task'
import type { Member } from '@/types/family'

interface Props {
  task: Ref<Task>
  currentUserId: string
}

const props = defineProps<Props>()
defineEmits<{
  'mark-task': [task: Ref<Task>, isMarked: boolean]
  'check-task': [task: Ref<Task>, isChecked: boolean]
  'edit-task': [task: Ref<Task>]
  'delete-task': [task: Ref<Task>]
}>()

const now = ref(new Date())
onMounted(() => setInterval(() => now.value = new Date(), 60000))

const isOverdue = computed(() => new Date(props.task.value.dueDate) < now.value)
const deadlineProgress = computed(() => {
  const created = new Date(props.task.value.createdDate).getTime()
  const due = new Date(props.task.value.dueDate).getTime()
  const current = now.value.getTime()
  if (current >= due) return 100
  if (current <= created) return 0
  return ((current - created) / (due - created)) * 100
})

const timeLeft = computed(() => {
  const diff = new Date(props.task.value.dueDate).getTime() - now.value.getTime()
  if (diff <= 0) return 'Просрочено'
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  return days > 0 ? `${days} дн. ${hours} ч.` : `${hours} ч.`
})

const canMarkTask = computed(() => props.currentUserId === props.task.value.issuedTo.id)
const canCheckTask = computed(() => props.currentUserId === props.task.value.createdBy.id)

const personName = (person: Member): string => {
  const first = person.personalInfo?.firstname || ''
  const last = person.personalInfo?.lastname || ''
  const name = `${first} ${last}`.trim()
  return name || person.username || '—'
}

const borderClass = computed(() => {
  if (isOverdue.value) return 'border-danger'
  if (props.task.value.isMarked && props.task.value.isChecked) return 'border-success'
  if (props.task.value.isMarked) return 'border-primary'
  return 'border-warning'
})

const badgeClass = computed(() => {
  if (isOverdue.value) return 'text-bg-danger'
  if (props.task.value.isMarked && props.task.value.isChecked) return 'text-bg-success'
  if (props.task.value.isMarked) return 'text-bg-primary'
  return 'text-bg-warning'
})

const progressBg = computed(() => {
  if (deadlineProgress.value <= 20) return 'bg-success'
  if (deadlineProgress.value <= 50) return 'bg-warning'
  return 'bg-danger'
})

const statusText = computed(() => {
  if (isOverdue.value) return 'ПРОСРОЧЕНО'
  if (props.task.value.isMarked && props.task.value.isChecked) return 'ВЫПОЛНЕНО'
  if (props.task.value.isMarked) return 'НА ПРОВЕРКЕ'
  return 'В РАБОТЕ'
})

const formatDate = (date: Date | string) => {
  if (!date) return 'Не указана'
  return new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}
</script>

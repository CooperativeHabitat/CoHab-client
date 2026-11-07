<template>
  <div class="card h-100 d-flex flex-column overflow-hidden">
    <div v-if="tasksLoading" class="d-flex justify-content-center align-items-center flex-grow-1">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Загрузка задач...</span>
      </div>
    </div>

    <template v-else>
      <div class="card-header bg-body-tertiary border-bottom d-flex justify-content-between align-items-center py-2 flex-shrink-0">
        <div class="d-flex align-items-center gap-2">
          <i class="bi bi-list-check text-primary"></i>
          <h6 class="mb-0">Задачи</h6>
          <span class="badge bg-primary">{{ tasks.length }}</span>
        </div>
        <div class="d-flex gap-1">
          <button @click="$emit('refresh')" class="btn btn-sm btn-outline-secondary py-0 px-2" title="Обновить">
            <i class="bi bi-arrow-clockwise"></i>
          </button>
          <button @click="$emit('add-task')" class="btn btn-sm btn-primary py-0 px-2" title="Создать задачу">
            <i class="bi bi-plus-lg"></i>
          </button>
        </div>
      </div>

      <div class="card-body flex-grow-1 overflow-auto p-2">
        <div v-if="tasks.length === 0" class="d-flex flex-column align-items-center justify-content-center h-100 text-center">
          <div class="rounded-circle d-flex align-items-center justify-content-center bg-primary bg-opacity-10 mb-3" style="width: 4rem; height: 4rem;">
            <i class="bi bi-clipboard-check fs-3 text-primary"></i>
          </div>
          <p class="mb-1">Задач пока нет</p>
          <p class="text-muted small mb-3">Создайте первую задачу для семьи</p>
          <button @click="$emit('add-task')" class="btn btn-primary d-flex align-items-center gap-2">
            <i class="bi bi-plus-lg"></i> Создать задачу
          </button>
        </div>
        <div v-else class="d-flex flex-column">
          <TaskComponent
            v-for="task in taskRefs"
            :key="task.value.id"
            :task="task"
            :current-user-id="currentUserId"
            @mark-task="(t, v) => $emit('mark-task', t, v)"
            @check-task="(t, v) => $emit('check-task', t, v)"
            @edit-task="(t) => $emit('edit-task', t)"
            @delete-task="(t) => $emit('delete-task', t)"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import TaskComponent from './TaskComponent.vue'

const props = defineProps<{
  tasks: any[]
  tasksLoading: boolean
  currentUserId: string
}>()

defineEmits<{
  'mark-task': [task: any, value: boolean]
  'check-task': [task: any, value: boolean]
  'edit-task': [task: any]
  'delete-task': [task: any]
  'refresh': []
  'add-task': []
}>()

const taskRefs = computed(() => props.tasks.map(task => ref(task)))
</script>

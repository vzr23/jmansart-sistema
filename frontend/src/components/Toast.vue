<template>
  <teleport to="body">
    <div class="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 items-end">
      <transition-group name="toast">
        <div
          v-for="t in toasts"
          :key="t.id"
          class="flex items-start gap-3 rounded-xl px-4 py-3 shadow-xl max-w-sm text-sm font-medium border"
          :class="{
            'bg-emerald-50 border-emerald-200 text-emerald-800': t.type === 'success',
            'bg-red-50 border-red-200 text-red-800': t.type === 'error',
            'bg-blue-50 border-blue-200 text-blue-800': t.type === 'info',
          }"
        >
          <!-- Icon -->
          <span class="shrink-0 mt-0.5">
            <svg v-if="t.type === 'success'" class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
            <svg v-else-if="t.type === 'error'" class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
            <svg v-else class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"/>
            </svg>
          </span>
          <span>{{ t.message }}</span>
        </div>
      </transition-group>
    </div>
  </teleport>
</template>

<script setup>
import { useToast } from '../composables/useToast.js';
const { toasts } = useToast();
</script>

<style scoped>
.toast-enter-active { transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.toast-leave-active { transition: all 0.2s ease; }
.toast-enter-from { opacity: 0; transform: translateX(40px) scale(0.95); }
.toast-leave-to   { opacity: 0; transform: translateX(40px); }
</style>

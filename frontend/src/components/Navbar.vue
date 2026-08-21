<template>
  <header class="bg-navy-700 text-white shadow-lg sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
      <!-- Logo -->
      <router-link to="/" class="flex items-center gap-3 group">
        <img
          :src="logoUrl"
          alt="J.Mansart"
          class="w-10 h-10 rounded-lg shrink-0 object-cover"
        />
        <div class="leading-tight">
          <div class="font-serif tracking-[0.22em] text-sm text-white font-medium">J.MANSART</div>
          <div class="text-[10px] text-navy-200 tracking-widest uppercase font-sans">Imobiliária</div>
        </div>
      </router-link>

      <!-- Nav links -->
      <nav class="hidden sm:flex items-center gap-1">
        <router-link
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
          :class="$route.path === link.to
            ? 'bg-white/15 text-white'
            : 'text-navy-100 hover:bg-white/10 hover:text-white'"
        >
          {{ link.label }}
        </router-link>
      </nav>

      <!-- Mobile menu button -->
      <button
        @click="mobileOpen = !mobileOpen"
        class="sm:hidden rounded-lg p-2 text-navy-200 hover:bg-white/10 transition"
        aria-label="Menu"
      >
        <svg v-if="!mobileOpen" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
        <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <!-- Mobile nav -->
    <transition name="slide-down">
      <div v-if="mobileOpen" class="sm:hidden border-t border-navy-600 bg-navy-800 px-4 py-3 space-y-1">
        <router-link
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          @click="mobileOpen = false"
          class="block px-3 py-2 rounded-lg text-sm font-medium transition"
          :class="$route.path === link.to
            ? 'bg-white/15 text-white'
            : 'text-navy-200 hover:bg-white/10 hover:text-white'"
        >
          {{ link.label }}
        </router-link>
      </div>
    </transition>
  </header>
</template>

<script setup>
import { ref } from 'vue';
import logoUrl from '@/assets/logo.png';

const mobileOpen = ref(false);

const links = [
  { to: '/',        label: 'Início' },
  { to: '/imovel',  label: 'Cadastrar Imóvel' },
  { to: '/cliente', label: 'Cadastrar Cliente' },
  { to: '/listagem', label: 'Listagem' },
];
</script>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.2s ease;
}
.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>

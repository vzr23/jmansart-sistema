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
        </div>
      </router-link>

      <!-- Nav links + logout (desktop) -->
      <div class="hidden sm:flex items-center gap-1">
        <nav class="flex items-center gap-1">
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

        <div class="w-px h-5 bg-navy-500 mx-2"></div>

        <button
          @click="logout"
          class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
                 text-navy-200 hover:bg-white/10 hover:text-white transition-all"
          title="Sair"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"/>
          </svg>
          Sair
        </button>
      </div>

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
        <button
          @click="logout"
          class="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                 font-medium text-navy-300 hover:bg-white/10 hover:text-white transition"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"/>
          </svg>
          Sair
        </button>
      </div>
    </transition>
  </header>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import logoUrl from '@/assets/logo.png';

const router     = useRouter();
const mobileOpen = ref(false);

const links = [
  { to: '/',         label: 'Início' },
  { to: '/imovel',   label: 'Cadastrar Imóvel' },
  { to: '/cliente',  label: 'Cadastrar Cliente' },
  { to: '/listagem', label: 'Listagem' },
];

function logout() {
  sessionStorage.removeItem('authenticated');
  router.push('/login');
}
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

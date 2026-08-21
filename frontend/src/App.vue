<template>
  <div class="min-h-screen flex flex-col">
    <Navbar />
    <main class="flex-1">
      <router-view />
    </main>
    <footer class="bg-navy-800 text-navy-300 text-center text-xs py-4 mt-auto">
      © {{ new Date().getFullYear() }} J.Mansart Imobiliária · Sistema de Cadastro
    </footer>
    <Toast />
  </div>
</template>

<script setup>
import Navbar from './components/Navbar.vue';
import Toast from './components/Toast.vue';
</script>

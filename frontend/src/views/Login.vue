<template>
  <div class="min-h-screen bg-navy-700 flex items-center justify-center px-4">
    <div class="w-full max-w-sm">
      <!-- Logo + título -->
      <div class="flex flex-col items-center mb-8">
        <img :src="logoUrl" alt="J.Mansart" class="w-20 h-20 rounded-2xl shadow-2xl mb-5 object-cover" />
        <h1 class="font-serif tracking-[0.22em] text-2xl text-white font-medium">J.MANSART</h1>
        <p class="text-navy-200 text-xs tracking-widest uppercase mt-1 font-sans">Sistema de Cadastro</p>
      </div>

      <!-- Card de login -->
      <div class="bg-white rounded-2xl shadow-2xl p-8">

        <!-- Passo 1: usuário + senha -->
        <template v-if="!otpStep">
          <h2 class="text-navy-700 font-semibold text-base mb-6 text-center">Acesso Restrito</h2>

          <form @submit.prevent="handleLogin" class="space-y-4">
            <div>
              <label class="input-label">Usuário</label>
              <input
                v-model="username"
                type="text"
                class="input-field"
                placeholder="Digite seu usuário"
                autocomplete="username"
                required
              />
            </div>

            <div>
              <label class="input-label">Senha</label>
              <input
                v-model="password"
                type="password"
                class="input-field"
                placeholder="Digite sua senha"
                autocomplete="current-password"
                required
              />
            </div>

            <div v-if="error" class="text-red-600 text-xs text-center bg-red-50 rounded-lg py-2 px-3">
              {{ error }}
            </div>

            <button type="submit" :disabled="loading" class="btn-primary w-full justify-center mt-2">
              <svg v-if="loading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              {{ loading ? 'Verificando…' : 'Entrar' }}
            </button>
          </form>
        </template>

        <!-- Passo 2: código OTP -->
        <template v-else>
          <h2 class="text-navy-700 font-semibold text-base mb-2 text-center">Verificação em dois fatores</h2>
          <p class="text-gray-500 text-xs text-center mb-6">
            Um código de 6 dígitos foi enviado para o e-mail cadastrado. Digite-o abaixo para concluir o login.
          </p>

          <form @submit.prevent="handleVerifyOtp" class="space-y-4">
            <div>
              <label class="input-label">Código de verificação</label>
              <input
                v-model="otpCode"
                type="text"
                inputmode="numeric"
                maxlength="6"
                class="input-field text-center tracking-[0.4em] font-mono text-xl"
                placeholder="000000"
                autocomplete="one-time-code"
                required
              />
            </div>

            <div v-if="error" class="text-red-600 text-xs text-center bg-red-50 rounded-lg py-2 px-3">
              {{ error }}
            </div>

            <button type="submit" :disabled="loading" class="btn-primary w-full justify-center mt-2">
              <svg v-if="loading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              {{ loading ? 'Verificando…' : 'Verificar código' }}
            </button>

            <button
              type="button"
              class="w-full text-xs text-navy-400 hover:text-navy-600 mt-1 text-center"
              @click="voltarLogin"
            >
              ← Voltar ao login
            </button>
          </form>
        </template>
      </div>

      <p class="text-navy-300 text-xs text-center mt-6">
        © {{ new Date().getFullYear() }} J.Mansart
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/api/index.js';
import logoUrl from '@/assets/logo.png';

const router   = useRouter();
const username = ref('');
const password = ref('');
const otpCode  = ref('');
const error    = ref('');
const loading  = ref(false);
const otpStep  = ref(false);

async function handleLogin() {
  error.value   = '';
  loading.value = true;
  try {
    const { data } = await api.post('/auth/login', {
      user:     username.value,
      password: password.value,
    });
    if (data.requiresOtp) {
      otpStep.value = true;
    } else {
      localStorage.setItem('jmansart_token', data.token);
      router.push('/');
    }
  } catch (err) {
    const msg = err.response?.data?.error;
    error.value    = msg || 'Erro ao conectar com o servidor.';
    password.value = '';
  } finally {
    loading.value = false;
  }
}

async function handleVerifyOtp() {
  error.value   = '';
  loading.value = true;
  try {
    const { data } = await api.post('/auth/verify-otp', {
      user: username.value,
      code: otpCode.value,
    });
    localStorage.setItem('jmansart_token', data.token);
    router.push('/');
  } catch (err) {
    const msg = err.response?.data?.error;
    error.value   = msg || 'Código inválido. Tente novamente.';
    otpCode.value = '';
  } finally {
    loading.value = false;
  }
}

function voltarLogin() {
  otpStep.value  = false;
  otpCode.value  = '';
  password.value = '';
  error.value    = '';
}
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 py-16">
    <!-- Hero -->
    <div class="text-center mb-14">
      <div class="inline-flex flex-col items-center gap-4 mb-6">
        <img
          :src="logoUrl"
          alt="J.Mansart"
          class="w-24 h-24 rounded-2xl object-cover shadow-xl"
        />
        <div>
          <div class="font-serif tracking-[0.28em] text-2xl text-navy-700 font-medium">J.MANSART</div>
        </div>
      </div>
      <p class="text-slate-500 text-base">Sistema de cadastro de imóveis e clientes</p>
    </div>

    <!-- Alertas: autorizações de venda vencendo / vencidas -->
    <div v-if="temAlerta" class="card p-5 mb-10 border-amber-200 bg-amber-50/40" data-teste="painel-alertas">
      <div class="flex items-center gap-2 mb-3">
        <svg class="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
        </svg>
        <h2 class="font-semibold text-navy-700">Autorizações de venda para renovar</h2>
      </div>
      <ul class="divide-y divide-amber-100">
        <li v-for="it in itens" :key="it.id" class="py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1" data-teste="alerta-item">
          <span class="font-mono text-sm font-semibold text-navy-700">{{ it.id }}</span>
          <span class="text-sm text-slate-600 flex-1 min-w-[10rem]">
            {{ [it.subtipo || it.tipo, it.bairro, it.cidade].filter(Boolean).join(' · ') }}
            <span v-if="it.vendedor" class="text-slate-400"> — {{ it.vendedor }}</span>
          </span>
          <span class="text-xs font-semibold px-2 py-0.5 rounded-full"
            :class="it.diasRestantes < 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'">
            {{ textoPrazo(it) }}
          </span>
          <router-link :to="{ path: '/imovel', query: { editar: it.id } }" class="text-xs font-semibold text-navy-600 hover:underline">Abrir</router-link>
        </li>
      </ul>
      <p v-if="alertas.totalVencidas > alertas.vencidas.length" class="text-xs text-slate-500 mt-2">
        Mostrando as {{ alertas.vencidas.length }} vencidas mais recentes de {{ alertas.totalVencidas }}.
      </p>
    </div>

    <!-- Cards de ação -->
    <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <router-link
        to="/imovel"
        class="card p-7 flex flex-col items-center text-center gap-4 hover:shadow-md
               hover:border-navy-300 transition-all group cursor-pointer"
      >
        <div class="w-14 h-14 rounded-xl bg-navy-50 flex items-center justify-center
                    group-hover:bg-navy-100 transition">
          <svg class="w-7 h-7 text-navy-600" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/>
          </svg>
        </div>
        <div>
          <h3 class="font-semibold text-navy-700 mb-1">Cadastrar Imóvel</h3>
          <p class="text-sm text-slate-500">Registre um novo imóvel com todos os dados</p>
        </div>
        <span class="mt-auto text-xs font-semibold text-navy-600 group-hover:underline">Acessar →</span>
      </router-link>

      <router-link
        to="/cliente"
        class="card p-7 flex flex-col items-center text-center gap-4 hover:shadow-md
               hover:border-navy-300 transition-all group cursor-pointer"
      >
        <div class="w-14 h-14 rounded-xl bg-navy-50 flex items-center justify-center
                    group-hover:bg-navy-100 transition">
          <svg class="w-7 h-7 text-navy-600" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/>
          </svg>
        </div>
        <div>
          <h3 class="font-semibold text-navy-700 mb-1">Cadastrar Cliente</h3>
          <p class="text-sm text-slate-500">Registre um cliente com preferências e histórico</p>
        </div>
        <span class="mt-auto text-xs font-semibold text-navy-600 group-hover:underline">Acessar →</span>
      </router-link>

      <router-link
        to="/listagem"
        class="card p-7 flex flex-col items-center text-center gap-4 hover:shadow-md
               hover:border-navy-300 transition-all group cursor-pointer"
      >
        <div class="w-14 h-14 rounded-xl bg-navy-50 flex items-center justify-center
                    group-hover:bg-navy-100 transition">
          <svg class="w-7 h-7 text-navy-600" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/>
          </svg>
        </div>
        <div>
          <h3 class="font-semibold text-navy-700 mb-1">Listagem</h3>
          <p class="text-sm text-slate-500">Busque e visualize imóveis e clientes cadastrados</p>
        </div>
        <span class="mt-auto text-xs font-semibold text-navy-600 group-hover:underline">Acessar →</span>
      </router-link>

      <router-link
        to="/contrato"
        class="card p-7 flex flex-col items-center text-center gap-4 hover:shadow-md
               hover:border-navy-300 transition-all group cursor-pointer"
      >
        <div class="w-14 h-14 rounded-xl bg-navy-50 flex items-center justify-center
                    group-hover:bg-navy-100 transition">
          <svg class="w-7 h-7 text-navy-600" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
          </svg>
        </div>
        <div>
          <h3 class="font-semibold text-navy-700 mb-1">Contrato</h3>
          <p class="text-sm text-slate-500">Gere a Autorização para Venda em PDF</p>
        </div>
        <span class="mt-auto text-xs font-semibold text-navy-600 group-hover:underline">Acessar →</span>
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import logoUrl from '@/assets/logo.png';
import { buscarAlertasAutorizacao } from '../api/index.js';

const alertas = ref({ vencendo: [], vencidas: [], totalVencidas: 0 });
const itens = computed(() => [...alertas.value.vencidas, ...alertas.value.vencendo]
  .sort((a, b) => a.diasRestantes - b.diasRestantes));
const temAlerta = computed(() => itens.value.length > 0);

function textoPrazo(it) {
  const d = it.diasRestantes;
  if (d < 0) return `Vencida há ${-d} ${d === -1 ? 'dia' : 'dias'}`;
  if (d === 0) return 'Vence hoje';
  return `Vence em ${d} ${d === 1 ? 'dia' : 'dias'}`;
}

// Falha silenciosa: o aviso é um extra, a Home continua funcionando sem ele.
onMounted(async () => {
  try {
    const { data } = await buscarAlertasAutorizacao(15);
    alertas.value = {
      vencendo: Array.isArray(data.vencendo) ? data.vencendo : [],
      vencidas: Array.isArray(data.vencidas) ? data.vencidas : [],
      totalVencidas: Number(data.totalVencidas) || 0,
    };
  } catch { /* sem aviso */ }
});
</script>

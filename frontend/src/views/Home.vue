<template>
  <div class="max-w-5xl mx-auto px-4 py-16">
    <!-- Hero -->
    <div class="text-center mb-14">
      <div class="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-navy-600 shadow-lg mb-6">
        <span class="text-gold-400 font-bold text-3xl">JM</span>
      </div>
      <h1 class="text-3xl font-bold text-navy-700 mb-2">J.Mansart Imobiliária</h1>
      <p class="text-slate-500 text-base">Sistema de cadastro de imóveis e clientes</p>
    </div>

    <!-- Cards de ação -->
    <div class="grid sm:grid-cols-3 gap-6">
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
    </div>
  </div>
</template>

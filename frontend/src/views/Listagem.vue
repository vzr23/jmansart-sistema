<template>
  <div class="max-w-7xl mx-auto px-4 py-10">
    <!-- Header -->
    <div class="mb-8 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
      <div>
        <h1 class="text-2xl font-bold text-navy-700">Listagem</h1>
        <p class="text-sm text-slate-500 mt-1">Consulte imóveis e clientes cadastrados</p>
      </div>
      <div class="flex gap-2">
        <router-link to="/imovel" class="btn-primary text-xs py-2 px-4">+ Imóvel</router-link>
        <router-link to="/cliente" class="btn-secondary text-xs py-2 px-4">+ Cliente</router-link>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit mb-6">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        @click="activeTab = tab.key; page = 1; buscar()"
        class="px-5 py-2 rounded-md text-sm font-semibold transition-all"
        :class="activeTab === tab.key
          ? 'bg-white text-navy-700 shadow-sm'
          : 'text-slate-500 hover:text-navy-600'"
      >
        {{ tab.label }}
        <span class="ml-1.5 text-xs rounded-full px-1.5 py-0.5"
          :class="activeTab === tab.key ? 'bg-navy-100 text-navy-600' : 'bg-slate-200 text-slate-500'">
          {{ tab.key === 'imoveis' ? totalImoveis : totalClientes }}
        </span>
      </button>
    </div>

    <!-- Search bar -->
    <div class="relative mb-6 max-w-md">
      <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
        fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/>
      </svg>
      <input
        v-model="search"
        @input="buscarDebounced"
        class="input-field pl-9"
        :placeholder="activeTab === 'imoveis'
          ? 'Buscar por ID, nome ou cidade...'
          : 'Buscar por ID, nome ou CPF...'"
      />
      <button v-if="search" @click="search = ''; page = 1; buscar()"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20 text-slate-400">
      <svg class="w-6 h-6 animate-spin mr-3" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
      Carregando...
    </div>

    <!-- Error -->
    <div v-else-if="erroApi" class="card p-6 text-center text-red-600">
      <svg class="w-10 h-10 mx-auto mb-3 text-red-300" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
      </svg>
      <p class="font-semibold">Erro ao carregar dados</p>
      <p class="text-sm text-red-400 mt-1">{{ erroApi }}</p>
      <button @click="buscar()" class="btn-secondary mt-4 text-sm">Tentar novamente</button>
    </div>

    <!-- Empty -->
    <div v-else-if="rows.length === 0 && !loading" class="card p-12 text-center text-slate-400">
      <svg class="w-12 h-12 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
      </svg>
      <p class="font-semibold">Nenhum registro encontrado</p>
      <p class="text-sm mt-1">{{ search ? 'Tente outros termos de busca.' : 'Cadastre o primeiro registro.' }}</p>
    </div>

    <!-- ── TABELA IMÓVEIS ── -->
    <div v-else-if="activeTab === 'imoveis' && rows.length > 0">
      <div class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 border-b border-slate-200">
              <tr>
                <th class="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">ID</th>
                <th class="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Tipo</th>
                <th class="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Vendedor</th>
                <th class="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Cidade</th>
                <th class="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Valor</th>
                <th class="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Quitado</th>
                <th class="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Cadastro</th>
                <th class="px-4 py-3 text-right font-semibold text-slate-600 whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <template v-for="(row, i) in rows" :key="i">
                <tr class="hover:bg-slate-50 transition cursor-pointer" @click="toggle(i)">
                  <td class="px-4 py-3 font-mono font-semibold text-navy-700 whitespace-nowrap">
                    {{ row['ID'] || '—' }}
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <span class="text-xs font-medium px-2 py-1 rounded-full"
                      :class="row['Tipo'] === 'Comercial'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-blue-50 text-blue-700'">
                      {{ row['Tipo'] || '—' }}
                    </span>
                  </td>
                  <td class="px-4 py-3 max-w-[180px] truncate">{{ row['Nome / Razão Social'] || '—' }}</td>
                  <td class="px-4 py-3 whitespace-nowrap">{{ row['Cidade Imóvel'] || '—' }}</td>
                  <td class="px-4 py-3 whitespace-nowrap text-emerald-700 font-medium">{{ row['Valor'] || '—' }}</td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <span class="text-xs font-medium px-2 py-0.5 rounded-full"
                      :class="row['Quitado'] === 'Sim'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-red-50 text-red-600'">
                      {{ row['Quitado'] || '—' }}
                    </span>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap text-slate-400 text-xs">{{ row['Data Cadastro'] || '—' }}</td>
                  <td class="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      @click.stop="abrirMovimentacao(row['ID'], row['Nome / Razão Social'], 'Imóvel')"
                      class="inline-flex items-center gap-1 text-xs font-medium text-navy-600 hover:text-navy-800 bg-navy-50 hover:bg-navy-100 px-2.5 py-1 rounded-md transition mr-1"
                      title="Registrar movimentação"
                    >
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
                      </svg>
                      Mov.
                    </button>
                    <button
                      @click.stop="editarRegistro(row['ID'], 'imovel')"
                      class="inline-flex items-center p-1.5 text-slate-400 hover:text-navy-600 hover:bg-navy-50 rounded-md transition mr-1"
                      title="Editar imóvel"
                    >
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                      </svg>
                    </button>
                    <button
                      @click.stop="pedirExclusao(row['ID'], row['Nome / Razão Social'])"
                      class="inline-flex items-center p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition mr-1"
                      title="Remover imóvel"
                    >
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                    </button>
                    <svg class="w-4 h-4 text-slate-400 transition-transform inline"
                      :class="expanded === i ? 'rotate-180' : ''"
                      fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
                    </svg>
                  </td>
                </tr>
                <!-- Expandido -->
                <tr v-if="expanded === i" class="bg-slate-50/70">
                  <td colspan="8" class="px-6 py-5">
                    <div class="grid sm:grid-cols-3 gap-x-8 gap-y-3 text-sm">
                      <detail label="Subtipo" :value="row['Subtipo']" />
                      <detail label="Autorização Venda" :value="row['Autorização Venda']" />
                      <detail label="Tipo Vendedor" :value="row['Tipo Vendedor']" />
                      <detail label="CPF / CNPJ" :value="row['CPF / CNPJ']" />
                      <detail label="RG" :value="row['RG']" />
                      <detail label="Estado Civil" :value="row['Estado Civil']" />
                      <detail label="Endereço Vendedor" :value="row['Endereço Vendedor']" />
                      <detail label="Endereço Imóvel" :value="row['Endereço Imóvel']" />
                      <detail label="UF" :value="row['UF Imóvel']" />
                      <detail label="Inscrição IPTU" :value="row['Inscrição IPTU']" />
                      <detail label="Matrícula" :value="row['Matrícula']" />
                      <detail label="Saldo Devedor" :value="row['Saldo Devedor']" />
                      <detail label="Condições Pagamento" :value="row['Condições de Pagamento']" />
                      <div class="sm:col-span-3">
                        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Observações</p>
                        <p class="text-slate-700 whitespace-pre-wrap">{{ row['Observações'] || '—' }}</p>
                      </div>
                      <div class="sm:col-span-3">
                        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Notas do Cadastro</p>
                        <p class="text-slate-700 whitespace-pre-wrap font-mono text-xs">{{ row['Movimentação'] || '—' }}</p>
                      </div>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ── TABELA CLIENTES ── -->
    <div v-else-if="activeTab === 'clientes' && rows.length > 0">
      <div class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 border-b border-slate-200">
              <tr>
                <th class="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">ID</th>
                <th class="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Nome</th>
                <th class="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">CPF</th>
                <th class="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Cidade</th>
                <th class="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Imóvel de Interesse</th>
                <th class="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Cadastro</th>
                <th class="px-4 py-3 text-right font-semibold text-slate-600 whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <template v-for="(row, i) in rows" :key="i">
                <tr class="hover:bg-slate-50 transition cursor-pointer" @click="toggle(i)">
                  <td class="px-4 py-3 font-mono font-semibold text-navy-700 whitespace-nowrap">
                    {{ row['ID'] || '—' }}
                  </td>
                  <td class="px-4 py-3 font-medium">{{ row['Nome'] || '—' }}</td>
                  <td class="px-4 py-3 text-slate-500 font-mono text-xs">{{ row['CPF'] || '—' }}</td>
                  <td class="px-4 py-3">{{ row['Cidade'] || '—' }}</td>
                  <td class="px-4 py-3 font-mono text-navy-600 font-medium">{{ row['Imóvel de Interesse'] || '—' }}</td>
                  <td class="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{{ row['Data Cadastro'] || '—' }}</td>
                  <td class="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      @click.stop="abrirMovimentacao(row['ID'], row['Nome'], 'Cliente')"
                      class="inline-flex items-center gap-1 text-xs font-medium text-navy-600 hover:text-navy-800 bg-navy-50 hover:bg-navy-100 px-2.5 py-1 rounded-md transition mr-1"
                      title="Registrar movimentação"
                    >
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
                      </svg>
                      Mov.
                    </button>
                    <button
                      @click.stop="editarRegistro(row['ID'], 'cliente')"
                      class="inline-flex items-center p-1.5 text-slate-400 hover:text-navy-600 hover:bg-navy-50 rounded-md transition mr-1"
                      title="Editar cliente"
                    >
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                      </svg>
                    </button>
                    <button
                      @click.stop="pedirExclusao(row['ID'], row['Nome'])"
                      class="inline-flex items-center p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition mr-1"
                      title="Remover cliente"
                    >
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                    </button>
                    <svg class="w-4 h-4 text-slate-400 transition-transform inline"
                      :class="expanded === i ? 'rotate-180' : ''"
                      fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
                    </svg>
                  </td>
                </tr>
                <!-- Expandido -->
                <tr v-if="expanded === i" class="bg-slate-50/70">
                  <td colspan="7" class="px-6 py-5">
                    <div class="grid sm:grid-cols-3 gap-x-8 gap-y-3 text-sm">
                      <detail label="RG" :value="row['RG']" />
                      <detail label="Estado Civil" :value="row['Estado Civil']" />
                      <detail label="Cônjuge" :value="row['Cônjuge']" />
                      <detail label="Endereço" :value="row['Endereço']" />
                      <detail label="UF" :value="row['UF']" />
                      <detail label="CEP" :value="row['CEP']" />
                      <detail label="Aniversário" :value="row['Data Aniversário']" />
                      <detail label="E-mail" :value="row['E-mail']" />
                      <detail label="Telefone" :value="row['Telefone']" />
                      <detail label="Hobbies" :value="row['Hobbies']" />
                      <detail label="Bebida Preferida" :value="row['Bebida Preferida']" />
                      <div class="sm:col-span-3">
                        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Gostos Pessoais</p>
                        <p class="text-slate-700 whitespace-pre-wrap">{{ row['Gostos Pessoais'] || '—' }}</p>
                      </div>
                      <div class="sm:col-span-3">
                        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Notas do Cadastro</p>
                        <p class="text-slate-700 whitespace-pre-wrap font-mono text-xs">{{ row['Movimentação'] || '—' }}</p>
                      </div>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ── PAGINAÇÃO ──────────────────────────────────────── -->
    <div
      v-if="!loading && !erroApi && totalPages > 1"
      class="flex items-center justify-between mt-5 px-1"
    >
      <!-- Info -->
      <p class="text-xs text-slate-500">
        Página {{ page }} de {{ totalPages }}
      </p>

      <!-- Botões -->
      <div class="flex items-center gap-1">
        <!-- Primeira -->
        <button
          @click="irParaPagina(1)"
          :disabled="page === 1"
          class="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
          title="Primeira página"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5"/>
          </svg>
        </button>

        <!-- Anterior -->
        <button
          @click="irParaPagina(page - 1)"
          :disabled="page === 1"
          class="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
          title="Página anterior"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/>
          </svg>
        </button>

        <!-- Números de página -->
        <template v-for="p in totalPages" :key="p">
          <button
            v-if="p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1)"
            @click="irParaPagina(p)"
            class="min-w-[32px] h-8 px-2 rounded-lg text-xs font-semibold transition"
            :class="p === page
              ? 'bg-navy-700 text-white shadow'
              : 'text-slate-600 hover:bg-slate-100'"
          >
            {{ p }}
          </button>
          <span
            v-else-if="p === page - 2 || p === page + 2"
            class="text-slate-400 text-xs px-1"
          >…</span>
        </template>

        <!-- Próxima -->
        <button
          @click="irParaPagina(page + 1)"
          :disabled="page === totalPages"
          class="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
          title="Próxima página"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
          </svg>
        </button>

        <!-- Última -->
        <button
          @click="irParaPagina(totalPages)"
          :disabled="page === totalPages"
          class="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
          title="Última página"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 4.5l7.5 7.5-7.5 7.5m6-15l7.5 7.5-7.5 7.5"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════
         MODAL DE CONFIRMAÇÃO DE EXCLUSÃO
    ══════════════════════════════════════════════════════════ -->
    <teleport to="body">
      <transition name="modal">
        <div v-if="confirmExclusao" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="confirmExclusao = null"></div>
          <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <!-- Ícone de aviso -->
            <div class="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 mx-auto mb-4">
              <svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </div>
            <h3 class="text-center font-bold text-slate-800 text-lg mb-1">Confirmar exclusão</h3>
            <p class="text-center text-slate-500 text-sm mb-1">
              Tem certeza que deseja remover:
            </p>
            <p class="text-center font-semibold text-navy-700 mb-1">{{ confirmExclusao.nome }}</p>
            <p class="text-center font-mono text-xs text-slate-400 mb-5">{{ confirmExclusao.id }}</p>
            <p class="text-center text-xs text-red-500 mb-6">Esta ação remove o registro da planilha e não pode ser desfeita.</p>
            <div class="flex gap-3">
              <button
                @click="confirmExclusao = null"
                :disabled="excluindo"
                class="flex-1 btn-secondary justify-center"
              >
                Cancelar
              </button>
              <button
                @click="confirmarExclusao"
                :disabled="excluindo"
                class="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 transition"
              >
                <svg v-if="excluindo" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                {{ excluindo ? 'Removendo...' : 'Sim, remover' }}
              </button>
            </div>
          </div>
        </div>
      </transition>
    </teleport>

    <!-- ═══════════════════════════════════════════════════════
         MODAL DE MOVIMENTAÇÃO
    ══════════════════════════════════════════════════════════ -->
    <teleport to="body">
      <transition name="modal">
        <div v-if="modal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <!-- Backdrop -->
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="fecharModal"></div>

          <!-- Painel -->
          <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

            <!-- Header do modal -->
            <div class="flex items-start justify-between p-6 border-b border-slate-100">
              <div>
                <div class="flex items-center gap-2 mb-0.5">
                  <span class="text-xs font-semibold px-2 py-0.5 rounded-full"
                    :class="modal.tipo === 'Imóvel' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'">
                    {{ modal.tipo }}
                  </span>
                  <span class="font-mono text-sm font-bold text-navy-700">{{ modal.id }}</span>
                </div>
                <p class="text-slate-500 text-sm truncate max-w-xs">{{ modal.nome }}</p>
              </div>
              <button @click="fecharModal" class="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition ml-4 flex-shrink-0">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <!-- Formulário nova movimentação -->
            <div class="p-6 border-b border-slate-100 bg-slate-50/50">
              <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Nova movimentação</p>
              <div class="space-y-3">
                <div>
                  <label class="input-label">Seu nome</label>
                  <input
                    v-model="movForm.usuario"
                    class="input-field"
                    placeholder="Ex: João Silva"
                    @blur="salvarUsuarioLocal"
                  />
                </div>
                <div>
                  <label class="input-label">Descrição *</label>
                  <textarea
                    v-model="movForm.descricao"
                    class="input-field"
                    rows="3"
                    placeholder="Ex: Visita realizada ao imóvel. Cliente demonstrou interesse na localização..."
                  ></textarea>
                </div>
                <button
                  @click="salvarMovimentacao"
                  :disabled="movSaving || !movForm.descricao.trim()"
                  class="btn-primary w-full justify-center"
                >
                  <svg v-if="movSaving" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                  </svg>
                  {{ movSaving ? 'Salvando...' : 'Registrar movimentação' }}
                </button>
              </div>
            </div>

            <!-- Histórico -->
            <div class="flex-1 overflow-y-auto p-6">
              <div class="flex items-center justify-between mb-4">
                <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Histórico
                  <span v-if="movHistorico.length" class="ml-1 bg-slate-200 text-slate-600 rounded-full px-1.5 py-0.5 text-xs font-bold">
                    {{ movHistorico.length }}
                  </span>
                </p>
                <button v-if="!movLoading" @click="carregarHistorico" class="text-xs text-navy-600 hover:underline">
                  Atualizar
                </button>
              </div>

              <!-- Loading histórico -->
              <div v-if="movLoading" class="flex items-center justify-center py-8 text-slate-400 text-sm">
                <svg class="w-4 h-4 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Carregando histórico...
              </div>

              <!-- Sem histórico -->
              <div v-else-if="movHistorico.length === 0" class="text-center py-8 text-slate-400">
                <svg class="w-10 h-10 mx-auto mb-2 text-slate-200" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <p class="text-sm">Nenhuma movimentação registrada ainda.</p>
              </div>

              <!-- Lista de movimentações -->
              <div v-else class="space-y-3">
                <div
                  v-for="mov in movHistorico"
                  :key="mov['ID']"
                  class="border border-slate-100 rounded-xl p-4 bg-white shadow-sm"
                >
                  <div class="flex items-start justify-between gap-3 mb-2">
                    <span class="text-xs font-semibold text-white bg-navy-600 px-2 py-0.5 rounded-full">
                      {{ mov['Usuário'] || 'Sem identificação' }}
                    </span>
                    <span class="text-xs text-slate-400 whitespace-nowrap flex-shrink-0">{{ mov['Data/Hora'] }}</span>
                  </div>
                  <p class="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{{ mov['Descrição'] }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </teleport>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { listarImoveis, listarClientes, criarMovimentacao, listarMovimentacoes, deletarImovel, deletarCliente } from '../api/index.js';
import { useToast } from '../composables/useToast.js';

const router = useRouter();
const { success, error } = useToast();

const activeTab   = ref('imoveis');
const search      = ref('');
const rows        = ref([]);
const totalImoveis  = ref(0);
const totalClientes = ref(0);
const loading     = ref(false);
const erroApi     = ref('');
const expanded    = ref(null);

// ── Paginação ─────────────────────────────
const page       = ref(1);
const totalPages = ref(1);
const PAGE_SIZE  = 10;

// ── Confirmação de exclusão ───────────────
const confirmExclusao = ref(null);
const excluindo = ref(false);

// ── Modal de movimentação ─────────────────
const modal = ref(null);
const movForm = ref({ usuario: '', descricao: '' });
const movHistorico = ref([]);
const movLoading = ref(false);
const movSaving  = ref(false);

const tabs = [
  { key: 'imoveis',  label: 'Imóveis'  },
  { key: 'clientes', label: 'Clientes' },
];

const detail = {
  props: ['label', 'value'],
  template: `
    <div>
      <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">{{ label }}</p>
      <p class="text-slate-700">{{ value || '—' }}</p>
    </div>
  `,
};

let debounceTimer = null;
function buscarDebounced() {
  clearTimeout(debounceTimer);
  page.value = 1;
  debounceTimer = setTimeout(buscar, 350);
}

async function buscar() {
  loading.value = true;
  erroApi.value = '';
  expanded.value = null;
  try {
    if (activeTab.value === 'imoveis') {
      const { data } = await listarImoveis(search.value, page.value, PAGE_SIZE);
      rows.value        = data.data;
      totalImoveis.value = data.total;
      totalPages.value   = data.totalPages;
    } else {
      const { data } = await listarClientes(search.value, page.value, PAGE_SIZE);
      rows.value         = data.data;
      totalClientes.value = data.total;
      totalPages.value    = data.totalPages;
    }
  } catch (e) {
    erroApi.value = e?.response?.data?.error || e.message || 'Erro desconhecido';
    rows.value = [];
  } finally {
    loading.value = false;
  }
}

function irParaPagina(p) {
  if (p < 1 || p > totalPages.value || p === page.value) return;
  page.value = p;
  buscar();
}

function toggle(i) {
  expanded.value = expanded.value === i ? null : i;
}

// ── Modal ─────────────────────────────────
function abrirMovimentacao(id, nome, tipo) {
  modal.value = { id, nome, tipo };
  movForm.value.descricao = '';
  movForm.value.usuario = localStorage.getItem('jmansart_usuario') || '';
  carregarHistorico();
}

function fecharModal() {
  modal.value = null;
  movHistorico.value = [];
}

function salvarUsuarioLocal() {
  if (movForm.value.usuario.trim()) {
    localStorage.setItem('jmansart_usuario', movForm.value.usuario.trim());
  }
}

async function carregarHistorico() {
  if (!modal.value) return;
  movLoading.value = true;
  try {
    const { data } = await listarMovimentacoes(modal.value.id);
    movHistorico.value = data;
  } catch {
    movHistorico.value = [];
  } finally {
    movLoading.value = false;
  }
}

async function salvarMovimentacao() {
  if (!movForm.value.descricao.trim() || !modal.value) return;
  movSaving.value = true;
  try {
    await criarMovimentacao({
      usuario:        movForm.value.usuario.trim() || 'Sem identificação',
      tipo:           modal.value.tipo,
      idReferencia:   modal.value.id,
      nomeReferencia: modal.value.nome,
      descricao:      movForm.value.descricao.trim(),
    });
    salvarUsuarioLocal();
    movForm.value.descricao = '';
    success('Movimentação registrada!');
    await carregarHistorico();
  } catch (err) {
    error(err?.response?.data?.error || 'Erro ao registrar movimentação.');
  } finally {
    movSaving.value = false;
  }
}

// ── Edição ───────────────────────────────
function editarRegistro(id, tipo) {
  const rota = tipo === 'imovel' ? '/imovel' : '/cliente';
  router.push({ path: rota, query: { editar: id } });
}

// ── Exclusão ─────────────────────────────
function pedirExclusao(id, nome) {
  confirmExclusao.value = { id, nome, tabela: activeTab.value };
}

async function confirmarExclusao() {
  if (!confirmExclusao.value) return;
  excluindo.value = true;
  try {
    const { id, tabela } = confirmExclusao.value;
    if (tabela === 'imoveis') await deletarImovel(id);
    else await deletarCliente(id);

    confirmExclusao.value = null;
    success('Registro removido com sucesso.');
    // Se a página ficou vazia e não é a primeira, volta uma página
    if (rows.value.length === 1 && page.value > 1) page.value--;
    await buscar();
  } catch (err) {
    error(err?.response?.data?.error || 'Erro ao remover registro.');
  } finally {
    excluindo.value = false;
  }
}

onMounted(async () => {
  buscar();
  // Carrega total da aba inativa para mostrar badge correto
  try {
    const { data } = await listarClientes('', 1, 1);
    totalClientes.value = data.total;
  } catch { /* silencioso */ }
});
</script>

<style scoped>
/* Modal transition */
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-active .relative, .modal-leave-active .relative { transition: transform 0.2s ease; }
.modal-enter-from .relative, .modal-leave-to .relative { transform: scale(0.96) translateY(8px); }
</style>

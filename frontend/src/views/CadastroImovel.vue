<template>
  <div class="max-w-4xl mx-auto px-4 py-10">
    <!-- Page header -->
    <div class="mb-8">
      <button type="button" @click="router.push(editMode ? '/listagem' : '/')" class="btn-ghost mb-3 -ml-2">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
        </svg>
        Voltar
      </button>
      <div class="flex items-center gap-3">
        <h1 class="text-2xl font-bold text-navy-700">{{ editMode ? 'Editar Imóvel' : 'Cadastro de Imóvel' }}</h1>
        <span v-if="editMode" class="font-mono text-sm font-semibold text-navy-500 bg-navy-50 px-2 py-0.5 rounded-md">{{ editId }}</span>
      </div>
      <p class="text-sm text-slate-500 mt-1">{{ editMode ? 'Altere os dados e salve para atualizar na planilha' : 'Preencha todos os dados do imóvel a ser cadastrado' }}</p>
    </div>

    <form @submit.prevent="submit" class="space-y-6">

      <!-- ───── 1. Tipo de Imóvel ───── -->
      <div class="card p-6">
        <div class="section-title">
          <span class="section-number">1</span>
          Tipo de Imóvel
        </div>
        <div class="flex flex-wrap gap-3 mb-5">
          <label
            v-for="tipo in ['Comercial', 'Residencial']"
            :key="tipo"
            class="radio-card"
            :class="{ selected: form.tipo === tipo }"
          >
            <input type="radio" class="sr-only" v-model="form.tipo" :value="tipo" @change="form.subtipos = []" />
            <span class="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
              :class="form.tipo === tipo ? 'border-navy-600' : 'border-slate-300'">
              <span v-if="form.tipo === tipo" class="w-2 h-2 rounded-full bg-navy-600"></span>
            </span>
            {{ tipo }}
          </label>
        </div>

        <!-- Subtipos condicionais -->
        <transition name="fade">
          <div v-if="form.tipo" class="mt-2">
            <label class="input-label mb-2">Selecione o(s) subtipo(s):</label>
            <div class="flex flex-wrap gap-3">
              <label
                v-for="sub in subtiposDisponiveis"
                :key="sub"
                class="flex items-center gap-2 cursor-pointer select-none text-sm font-medium"
              >
                <input
                  type="checkbox"
                  :value="sub"
                  v-model="form.subtipos"
                  class="w-4 h-4 rounded border-slate-300 text-navy-600
                         focus:ring-navy-500 focus:ring-offset-0"
                />
                {{ sub }}
              </label>
            </div>
          </div>
        </transition>
      </div>

      <!-- ───── 2. Autorização de Venda ───── -->
      <div class="card p-6">
        <div class="section-title">
          <span class="section-number">2</span>
          Autorização de Venda
        </div>
        <div class="flex flex-wrap gap-3">
          <label
            v-for="op in ['Sim', 'Não']"
            :key="op"
            class="radio-card"
            :class="{ selected: form.autorizacaoVenda === op }"
          >
            <input type="radio" class="sr-only" v-model="form.autorizacaoVenda" :value="op" />
            <span class="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
              :class="form.autorizacaoVenda === op ? 'border-navy-600' : 'border-slate-300'">
              <span v-if="form.autorizacaoVenda === op" class="w-2 h-2 rounded-full bg-navy-600"></span>
            </span>
            {{ op }}
          </label>
        </div>
      </div>

      <!-- ───── 3. Dados do Vendedor ───── -->
      <div class="card p-6">
        <div class="section-title">
          <span class="section-number">3</span>
          Dados do Vendedor
        </div>

        <!-- Toggle PF / PJ -->
        <div class="inline-flex bg-slate-100 rounded-lg p-1 mb-6">
          <button
            type="button"
            @click="form.tipoVendedor = 'PF'"
            class="toggle-btn"
            :class="form.tipoVendedor === 'PF' ? 'active' : 'inactive'"
          >
            Pessoa Física
          </button>
          <button
            type="button"
            @click="form.tipoVendedor = 'PJ'"
            class="toggle-btn"
            :class="form.tipoVendedor === 'PJ' ? 'active' : 'inactive'"
          >
            Pessoa Jurídica
          </button>
        </div>

        <!-- PF Fields -->
        <transition name="fade">
          <div v-if="form.tipoVendedor === 'PF'" class="space-y-5">
            <div class="grid sm:grid-cols-2 gap-4">
              <div>
                <label class="input-label">Nome completo *</label>
                <input v-model="form.nomeVendedor" class="input-field" placeholder="Nome completo" />
              </div>
              <div>
                <label class="input-label">CPF</label>
                <input v-model="form.cpf" class="input-field" placeholder="000.000.000-00" maxlength="14" @input="formatCPF" />
              </div>
              <div>
                <label class="input-label">RG</label>
                <input v-model="form.rg" class="input-field" placeholder="RG" />
              </div>
              <div>
                <label class="input-label">Estado Civil</label>
                <select v-model="form.estadoCivil" class="input-field">
                  <option value="">Selecione...</option>
                  <option v-for="ec in estadosCivis" :key="ec" :value="ec">{{ ec }}</option>
                </select>
              </div>
              <transition name="fade">
                <div v-if="form.estadoCivil === 'Casado(a)'">
                  <label class="input-label">Nome do Cônjuge</label>
                  <input v-model="form.conjuge" class="input-field" placeholder="Nome completo do cônjuge" />
                </div>
              </transition>
              <div>
                <label class="input-label">Data de Aniversário</label>
                <input v-model="form.dataAniversario" type="date" class="input-field" />
              </div>
              <div>
                <label class="input-label">E-mail</label>
                <input v-model="form.email" type="email" class="input-field" placeholder="email@exemplo.com" />
              </div>
              <div>
                <label class="input-label">Telefone / WhatsApp</label>
                <input v-model="form.telefone" class="input-field" placeholder="(00) 00000-0000" maxlength="16" @input="formatarTelefone" />
              </div>
            </div>
            <!-- Endereço PF -->
            <div>
              <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Endereço do Vendedor</p>
              <div class="grid sm:grid-cols-3 gap-4">
                <div class="sm:col-span-2">
                  <label class="input-label">Logradouro</label>
                  <input v-model="form.logradouroVendedor" class="input-field" placeholder="Rua, Av., etc." />
                </div>
                <div>
                  <label class="input-label">Número</label>
                  <input v-model="form.numeroVendedor" class="input-field" placeholder="Nº" />
                </div>
                <div>
                  <label class="input-label">Complemento</label>
                  <input v-model="form.complementoVendedor" class="input-field" placeholder="Apto, Sala..." />
                </div>
                <div>
                  <label class="input-label">Bairro</label>
                  <input v-model="form.bairroVendedor" class="input-field" placeholder="Bairro" />
                </div>
                <div>
                  <label class="input-label">CEP</label>
                  <div class="relative">
                    <input
                      v-model="form.cepVendedor"
                      @input="e => { form.cepVendedor = formatarCep(e.target.value); cepVendedorErro = '' }"
                      @blur="buscarCepVendedor"
                      class="input-field"
                      placeholder="00000-000"
                      maxlength="9"
                    />
                    <svg v-if="cepVendedorLoading" class="absolute right-2.5 top-2.5 w-4 h-4 animate-spin text-navy-400" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                  </div>
                  <p v-if="cepVendedorErro" class="text-red-500 text-xs mt-1">{{ cepVendedorErro }}</p>
                </div>
                <div>
                  <label class="input-label">Cidade</label>
                  <input v-model="form.cidadeVendedor" class="input-field" placeholder="Cidade" />
                </div>
                <div>
                  <label class="input-label">UF</label>
                  <select v-model="form.ufVendedor" class="input-field">
                    <option value="">UF</option>
                    <option v-for="uf in ufs" :key="uf" :value="uf">{{ uf }}</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </transition>

        <!-- PJ Fields -->
        <transition name="fade">
          <div v-if="form.tipoVendedor === 'PJ'" class="space-y-4">
            <div class="grid sm:grid-cols-2 gap-4">
              <div class="sm:col-span-2">
                <label class="input-label">Razão Social *</label>
                <input v-model="form.razaoSocial" class="input-field" placeholder="Razão Social" />
              </div>
              <div>
                <label class="input-label">CNPJ</label>
                <input v-model="form.cnpj" class="input-field" placeholder="00.000.000/0000-00" maxlength="18" />
              </div>
              <div>
                <label class="input-label">Endereço completo</label>
                <input v-model="form.enderecoEmpresa" class="input-field" placeholder="Rua, Nº, Cidade – UF" />
              </div>
              <div>
                <label class="input-label">Site</label>
                <input v-model="form.site" type="url" class="input-field" placeholder="https://www.empresa.com.br" />
              </div>
              <div>
                <label class="input-label">E-mail</label>
                <input v-model="form.email" type="email" class="input-field" placeholder="email@empresa.com" />
              </div>
              <div>
                <label class="input-label">Telefone / WhatsApp</label>
                <input v-model="form.telefone" class="input-field" placeholder="(00) 00000-0000" maxlength="16" @input="formatarTelefone" />
              </div>
            </div>
          </div>
        </transition>
      </div>

      <!-- ───── 4. Informações do Imóvel ───── -->
      <div class="card p-6">
        <div class="section-title">
          <span class="section-number">4</span>
          Informações do Imóvel
        </div>
        <div class="grid sm:grid-cols-3 gap-4 mb-4">
          <div class="sm:col-span-2">
            <label class="input-label">Logradouro *</label>
            <input v-model="form.logradouroImovel" class="input-field" placeholder="Rua, Av., etc." />
          </div>
          <div>
            <label class="input-label">Número</label>
            <input v-model="form.numeroImovel" class="input-field" placeholder="Nº" />
          </div>
          <div>
            <label class="input-label">Complemento</label>
            <input v-model="form.complementoImovel" class="input-field" placeholder="Apto, Bloco..." />
          </div>
          <div>
            <label class="input-label">Bairro</label>
            <input v-model="form.bairroImovel" class="input-field" placeholder="Bairro" />
          </div>
          <div>
            <label class="input-label">CEP</label>
            <div class="relative">
              <input
                v-model="form.cepImovel"
                @input="e => { form.cepImovel = formatarCep(e.target.value); cepImovelErro = '' }"
                @blur="buscarCepImovel"
                class="input-field"
                placeholder="00000-000"
                maxlength="9"
              />
              <svg v-if="cepImovelLoading" class="absolute right-2.5 top-2.5 w-4 h-4 animate-spin text-navy-400" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            </div>
            <p v-if="cepImovelErro" class="text-red-500 text-xs mt-1">{{ cepImovelErro }}</p>
          </div>
          <!-- Cidade + Sigla para geração de ID -->
          <div>
            <label class="input-label">
              Cidade *
              <span class="text-slate-400 font-normal">(usada no ID)</span>
            </label>
            <input
              v-model="form.cidadeImovel"
              @blur="sugerirSigla"
              class="input-field"
              placeholder="Ex: Balneário Camboriú"
            />
          </div>
          <div>
            <label class="input-label">
              Sigla da cidade *
              <span class="text-slate-400 font-normal">(para o ID)</span>
            </label>
            <input
              v-model="form.cidadeAbrev"
              class="input-field uppercase"
              maxlength="5"
              placeholder="Ex: BC"
            />
          </div>
          <div>
            <label class="input-label">UF</label>
            <select v-model="form.ufImovel" class="input-field">
              <option value="">UF</option>
              <option v-for="uf in ufs" :key="uf" :value="uf">{{ uf }}</option>
            </select>
          </div>
        </div>

        <div class="grid sm:grid-cols-2 gap-4 mt-2">
          <div>
            <label class="input-label">Inscrição IPTU</label>
            <input v-model="form.inscricaoIptu" class="input-field" placeholder="Inscrição IPTU" />
          </div>
          <div>
            <label class="input-label">Matrícula</label>
            <input v-model="form.matricula" class="input-field" placeholder="Nº da matrícula" />
          </div>
        </div>

        <!-- Quitado -->
        <div class="mt-4">
          <label class="input-label mb-2">Imóvel quitado?</label>
          <div class="flex flex-wrap gap-3">
            <label
              v-for="op in ['Sim', 'Não']"
              :key="op"
              class="radio-card"
              :class="{ selected: form.quitado === op }"
            >
              <input type="radio" class="sr-only" v-model="form.quitado" :value="op" />
              <span class="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                :class="form.quitado === op ? 'border-navy-600' : 'border-slate-300'">
                <span v-if="form.quitado === op" class="w-2 h-2 rounded-full bg-navy-600"></span>
              </span>
              {{ op }}
            </label>
          </div>
        </div>

        <!-- Saldo devedor condicional -->
        <transition name="fade">
          <div v-if="form.quitado === 'Não'" class="mt-4">
            <label class="input-label">Saldo Devedor (R$)</label>
            <input v-model="form.saldoDevedor" @input="formatarMoeda($event, 'saldoDevedor')" class="input-field" placeholder="R$ 0,00" inputmode="numeric" />
          </div>
        </transition>

        <div class="mt-4">
          <label class="input-label">Observações gerais</label>
          <textarea v-model="form.observacoes" class="input-field" rows="3" placeholder="Observações sobre o imóvel..."></textarea>
        </div>
      </div>

      <!-- ───── 5. Condições Comerciais ───── -->
      <div class="card p-6">
        <div class="section-title">
          <span class="section-number">5</span>
          Condições Comerciais
        </div>
        <div class="grid sm:grid-cols-2 gap-4">
          <div>
            <label class="input-label">Valor do Imóvel (R$)</label>
            <input v-model="form.valor" @input="formatarMoeda($event, 'valor')" class="input-field" placeholder="R$ 0,00" inputmode="numeric" />
          </div>
          <div>
            <label class="input-label">Condições de Pagamento</label>
            <input v-model="form.condicoesPagamento" class="input-field" placeholder="Ex: À vista, financiamento..." />
          </div>
        </div>
      </div>

      <!-- ───── 6. Movimentação ───── -->
      <div class="card p-6">
        <div class="section-title">
          <span class="section-number">6</span>
          Movimentação / Histórico
        </div>
        <textarea
          v-model="form.movimentacao"
          class="input-field font-mono text-xs"
          rows="8"
          placeholder="Histórico de interações, visitas, negociações, observações..."
        ></textarea>
      </div>

      <!-- ID Preview (somente no modo cadastro) -->
      <div v-if="!editMode && form.cidadeAbrev" class="card p-4 flex items-center gap-3 bg-navy-50 border-navy-200">
        <svg class="w-5 h-5 text-navy-500 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8.25h4.5"/>
        </svg>
        <div>
          <p class="text-xs text-navy-600 font-medium">ID gerado automaticamente pelo sistema:</p>
          <p class="font-mono font-bold text-navy-700">
            {{ form.cidadeAbrev.toUpperCase() }}XXX{{ new Date().getFullYear() }}
          </p>
        </div>
      </div>

      <!-- Submit -->
      <div class="flex justify-end gap-3 pt-2">
        <button type="button" @click="router.push(editMode ? '/listagem' : '/')" class="btn-secondary">Cancelar</button>
        <button type="submit" :disabled="loading" class="btn-primary">
          <svg v-if="loading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
          </svg>
          {{ loading ? 'Salvando...' : (editMode ? 'Atualizar Imóvel' : 'Salvar Imóvel') }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { criarImovel, atualizarImovel, buscarSigla, listarImoveis } from '../api/index.js';
import { useToast } from '../composables/useToast.js';
import { useRouter, useRoute } from 'vue-router';
import { formatarCep, buscarEnderecoPorCep } from '../utils/cep.js';

const router = useRouter();
const route  = useRoute();
const { success, error } = useToast();

const loading  = ref(false);
const editMode = ref(false);
const editId   = ref('');

// ── CEP lookup ────────────────────────────
const cepVendedorLoading = ref(false);
const cepVendedorErro    = ref('');
const cepImovelLoading   = ref(false);
const cepImovelErro      = ref('');

async function buscarCepVendedor() {
  const digits = form.value.cepVendedor.replace(/\D/g, '');
  if (digits.length !== 8) return;
  cepVendedorLoading.value = true;
  cepVendedorErro.value = '';
  try {
    const addr = await buscarEnderecoPorCep(form.value.cepVendedor);
    if (!addr) { cepVendedorErro.value = 'CEP não encontrado.'; return; }
    form.value.logradouroVendedor = addr.logradouro;
    form.value.bairroVendedor     = addr.bairro;
    form.value.cidadeVendedor     = addr.cidade;
    form.value.ufVendedor         = addr.uf;
  } catch {
    cepVendedorErro.value = 'Erro ao consultar o CEP.';
  } finally {
    cepVendedorLoading.value = false;
  }
}

async function buscarCepImovel() {
  const digits = form.value.cepImovel.replace(/\D/g, '');
  if (digits.length !== 8) return;
  cepImovelLoading.value = true;
  cepImovelErro.value = '';
  try {
    const addr = await buscarEnderecoPorCep(form.value.cepImovel);
    if (!addr) { cepImovelErro.value = 'CEP não encontrado.'; return; }
    form.value.logradouroImovel = addr.logradouro;
    form.value.bairroImovel     = addr.bairro;
    form.value.cidadeImovel     = addr.cidade;
    form.value.ufImovel         = addr.uf;
    if (!form.value.cidadeAbrev) sugerirSigla();
  } catch {
    cepImovelErro.value = 'Erro ao consultar o CEP.';
  } finally {
    cepImovelLoading.value = false;
  }
}

const form = ref({
  // Seção 1
  tipo: '',
  subtipos: [],
  // Seção 2
  autorizacaoVenda: '',
  // Seção 3
  tipoVendedor: 'PF',
  // PF
  nomeVendedor: '', cpf: '', rg: '', estadoCivil: '', conjuge: '', dataAniversario: '',
  logradouroVendedor: '', numeroVendedor: '', complementoVendedor: '',
  bairroVendedor: '', cepVendedor: '', cidadeVendedor: '', ufVendedor: '',
  // PJ
  razaoSocial: '', cnpj: '', enderecoEmpresa: '', site: '',
  // Contato (PF e PJ)
  email: '', telefone: '',
  // Seção 4
  logradouroImovel: '', numeroImovel: '', complementoImovel: '',
  bairroImovel: '', cidadeImovel: '', cidadeAbrev: '', ufImovel: '', cepImovel: '',
  inscricaoIptu: '', matricula: '', quitado: '', saldoDevedor: '', observacoes: '',
  // Seção 5
  valor: '', condicoesPagamento: '',
  // Seção 6
  movimentacao: '',
});

const subtiposDisponiveis = computed(() => {
  if (form.value.tipo === 'Comercial') return ['Terreno', 'Galpão', 'Casa', 'Sala'];
  if (form.value.tipo === 'Residencial') return ['Apartamento', 'Terreno', 'Casa', 'Sobrado'];
  return [];
});

const estadosCivis = ['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União Estável'];

const ufs = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

function formatarTelefone(e) {
  let v = e.target.value.replace(/\D/g, '').slice(0, 11);
  if (v.length > 10) {
    v = v.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  } else if (v.length > 6) {
    v = v.replace(/^(\d{2})(\d{4})(\d{0,4})$/, '($1) $2-$3');
  } else if (v.length > 2) {
    v = v.replace(/^(\d{2})(\d+)$/, '($1) $2');
  } else if (v.length > 0) {
    v = v.replace(/^(\d+)$/, '($1');
  }
  form.value.telefone = v;
}

function formatarMoeda(e, campo) {
  const digits = e.target.value.replace(/\D/g, '');
  if (!digits) { form.value[campo] = ''; return; }
  const num = parseInt(digits, 10) / 100;
  form.value[campo] = num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatCPF(e) {
  let v = e.target.value.replace(/\D/g, '');
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  form.value.cpf = v;
}

async function sugerirSigla() {
  if (!form.value.cidadeImovel || form.value.cidadeAbrev) return;
  try {
    const { data } = await buscarSigla(form.value.cidadeImovel);
    form.value.cidadeAbrev = data.sigla || '';
  } catch { /* silencioso */ }
}

function buildPayload(f) {
  return {
    tipoImovel: { tipo: f.tipo, subtipos: f.subtipos },
    autorizacaoVenda: f.autorizacaoVenda,
    vendedor: {
      tipoVendedor:    f.tipoVendedor,
      nome:            f.nomeVendedor,
      cpf:             f.cpf,
      rg:              f.rg,
      estadoCivil:     f.estadoCivil,
      conjuge:         f.conjuge,
      dataAniversario: f.dataAniversario,
      enderecoVendedor: {
        logradouro:  f.logradouroVendedor,
        numero:      f.numeroVendedor,
        complemento: f.complementoVendedor,
        bairro:      f.bairroVendedor,
        cidade:      f.cidadeVendedor,
        uf:          f.ufVendedor,
        cep:         f.cepVendedor,
      },
      razaoSocial:     f.razaoSocial,
      cnpj:            f.cnpj,
      enderecoEmpresa: f.enderecoEmpresa,
      site:            f.site,
      email:           f.email,
      telefone:        f.telefone,
    },
    imovel: {
      logradouro:    f.logradouroImovel,
      numero:        f.numeroImovel,
      complemento:   f.complementoImovel,
      bairro:        f.bairroImovel,
      cidade:        f.cidadeImovel,
      cidadeAbrev:   f.cidadeAbrev,
      uf:            f.ufImovel,
      cep:           f.cepImovel,
      inscricaoIptu: f.inscricaoIptu,
      matricula:     f.matricula,
      quitado:       f.quitado,
      saldoDevedor:  f.saldoDevedor,
      observacoes:   f.observacoes,
    },
    condicoesComerciais: {
      valor:              f.valor,
      condicoesPagamento: f.condicoesPagamento,
    },
    movimentacao: f.movimentacao,
  };
}

onMounted(async () => {
  const idEditar = route.query.editar;
  if (!idEditar) return;

  editMode.value = true;
  editId.value   = idEditar;

  try {
    const { data: rows } = await listarImoveis(idEditar);
    const row = (rows.data || rows).find((r) => r['ID'] === idEditar);
    if (!row) { error('Imóvel não encontrado.'); return; }

    const isPJ = row['Tipo Vendedor'] === 'PJ';
    form.value.tipo            = row['Tipo'] || '';
    form.value.subtipos        = row['Subtipo'] ? row['Subtipo'].split(', ').filter(Boolean) : [];
    form.value.autorizacaoVenda = row['Autorização Venda'] || '';
    form.value.tipoVendedor    = row['Tipo Vendedor'] || 'PF';

    if (isPJ) {
      form.value.razaoSocial     = row['Nome / Razão Social'] || '';
      form.value.cnpj            = row['CPF / CNPJ'] || '';
      form.value.enderecoEmpresa = row['Endereço Vendedor'] || '';
      form.value.site            = row['Site'] || '';
    } else {
      form.value.nomeVendedor       = row['Nome / Razão Social'] || '';
      form.value.cpf                = row['CPF / CNPJ'] || '';
      form.value.rg                 = row['RG'] || '';
      form.value.estadoCivil        = row['Estado Civil'] || '';
      form.value.conjuge            = row['Cônjuge'] || '';
      form.value.dataAniversario    = row['Data Aniversário'] || '';
      form.value.logradouroVendedor = row['Endereço Vendedor'] || '';
    }

    form.value.email              = row['E-mail'] || '';
    form.value.telefone           = row['Telefone'] || '';
    form.value.logradouroImovel   = row['Endereço Imóvel'] || '';
    form.value.cidadeImovel       = row['Cidade Imóvel'] || '';
    form.value.ufImovel           = row['UF Imóvel'] || '';
    form.value.cepImovel          = row['CEP Imóvel'] || '';
    form.value.inscricaoIptu      = row['Inscrição IPTU'] || '';
    form.value.matricula          = row['Matrícula'] || '';
    form.value.quitado            = row['Quitado'] || '';
    form.value.saldoDevedor       = row['Saldo Devedor'] || '';
    form.value.observacoes        = row['Observações'] || '';
    form.value.valor              = row['Valor'] || '';
    form.value.condicoesPagamento = row['Condições de Pagamento'] || '';
    form.value.movimentacao       = row['Movimentação'] || '';

    // Extrai sigla do ID (ex: BC0012026 → BC)
    const siglaMatch = idEditar.match(/^([A-Z]+)/);
    form.value.cidadeAbrev = siglaMatch ? siglaMatch[1] : '';
  } catch (err) {
    error('Erro ao carregar dados do imóvel para edição.');
  }
});

async function submit() {
  const f = form.value;
  if (!editMode.value && !f.cidadeAbrev) {
    error('Informe a sigla da cidade para geração do ID.');
    return;
  }
  loading.value = true;
  try {
    const payload = buildPayload(f);

    if (editMode.value) {
      await atualizarImovel(editId.value, payload);
      success('Imóvel atualizado com sucesso!');
    } else {
      const { data } = await criarImovel(payload);
      success(`Imóvel cadastrado com sucesso! ID: ${data.id}`);
    }
    setTimeout(() => router.push('/listagem'), 1800);
  } catch (err) {
    error(err?.response?.data?.error || 'Erro ao salvar imóvel. Verifique a conexão com a API.');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: all 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-6px); }
</style>

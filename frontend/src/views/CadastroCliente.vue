<template>
  <div class="max-w-4xl mx-auto px-4 py-10">
    <!-- Header -->
    <div class="mb-8">
      <button type="button" @click="router.push(editMode ? '/listagem' : '/')" class="btn-ghost mb-3 -ml-2">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
        </svg>
        Voltar
      </button>
      <div class="flex items-center gap-3">
        <h1 class="text-2xl font-bold text-navy-700">{{ editMode ? 'Editar Cliente' : 'Cadastro de Cliente' }}</h1>
        <span v-if="editMode" class="font-mono text-sm font-semibold text-navy-500 bg-navy-50 px-2 py-0.5 rounded-md">{{ editId }}</span>
      </div>
      <p class="text-sm text-slate-500 mt-1">{{ editMode ? 'Altere os dados e salve para atualizar na planilha' : 'Registre as informações completas do cliente' }}</p>
    </div>

    <form @submit.prevent="submit" class="space-y-6">

      <!-- ───── Dados Pessoais ───── -->
      <div class="card p-6">
        <div class="section-title">
          <span class="section-number">1</span>
          Dados Pessoais
        </div>
        <div class="grid sm:grid-cols-2 gap-4">
          <div class="sm:col-span-2">
            <label class="input-label">Nome completo *</label>
            <input v-model="form.nome" class="input-field" placeholder="Nome completo" required />
          </div>
          <div class="sm:col-span-2">
            <label class="input-label">Tipo de cliente</label>
            <select v-model="form.tipoCliente" class="input-field">
              <option value="">Selecione...</option>
              <option v-for="t in tiposCliente" :key="t.valor" :value="t.valor">{{ t.rotulo }}</option>
            </select>
            <p class="text-xs text-slate-400 mt-1">Quem é Vendedor ou Ambos aparece na busca de vendedor ao cadastrar um imóvel.</p>
          </div>
          <div class="sm:col-span-2">
            <label class="input-label">Status do cliente</label>
            <select v-model="form.statusCliente" class="input-field sm:max-w-xs" data-teste="status-cliente">
              <option v-for="st in statusClienteOpcoes" :key="st" :value="st">{{ st }}</option>
            </select>
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

        <!-- Endereço -->
        <div class="mt-5">
          <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Endereço</p>
          <div class="grid sm:grid-cols-3 gap-4">
            <div class="sm:col-span-2">
              <label class="input-label">Logradouro</label>
              <input v-model="form.logradouro" class="input-field" placeholder="Rua, Av., etc." />
            </div>
            <div>
              <label class="input-label">Número</label>
              <input v-model="form.numero" class="input-field" placeholder="Nº" />
            </div>
            <div>
              <label class="input-label">Complemento</label>
              <input v-model="form.complemento" class="input-field" placeholder="Apto, Sala..." />
            </div>
            <div>
              <label class="input-label">Bairro</label>
              <input v-model="form.bairro" class="input-field" placeholder="Bairro" />
            </div>
            <div>
              <label class="input-label">CEP</label>
              <div class="relative">
                <input
                  v-model="form.cep"
                  @input="e => { form.cep = formatarCep(e.target.value); cepErro = '' }"
                  @blur="buscarCep"
                  class="input-field"
                  placeholder="00000-000"
                  maxlength="9"
                />
                <svg v-if="cepLoading" class="absolute right-2.5 top-2.5 w-4 h-4 animate-spin text-navy-400" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              </div>
              <p v-if="cepErro" class="text-red-500 text-xs mt-1">{{ cepErro }}</p>
            </div>
            <div>
              <label class="input-label">Cidade</label>
              <input v-model="form.cidade" class="input-field" placeholder="Cidade" />
            </div>
            <div>
              <label class="input-label">UF</label>
              <select v-model="form.uf" class="input-field">
                <option value="">UF</option>
                <option v-for="uf in ufs" :key="uf" :value="uf">{{ uf }}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- ───── Preferências ───── -->
      <div class="card p-6">
        <div class="section-title">
          <span class="section-number">2</span>
          Preferências &amp; Perfil
        </div>
        <div class="grid sm:grid-cols-2 gap-4">
          <div class="sm:col-span-2">
            <label class="input-label">Hobbies</label>
            <input v-model="form.hobbies" class="input-field" placeholder="Ex: Golf, leitura, viagens..." />
          </div>
          <div class="sm:col-span-2">
            <label class="input-label">Gostos pessoais</label>
            <textarea v-model="form.gostosPessoais" class="input-field" rows="2"
              placeholder="Estilo de vida, preferências gerais..."></textarea>
          </div>
          <div>
            <label class="input-label">Bebida preferida</label>
            <input v-model="form.bebidaPreferida" class="input-field" placeholder="Ex: Vinho tinto, whisky..." />
          </div>
        </div>
      </div>

      <!-- ───── O que o comprador procura (só para Comprador / Ambos) ───── -->
      <transition name="fade">
        <div v-if="ehComprador" class="card p-6" data-teste="perfil-busca">
          <div class="section-title">
            <span class="section-number">3</span>
            O que o cliente procura
          </div>
          <p class="text-xs text-slate-500 -mt-2 mb-4">Com isso o sistema avisa quais imóveis combinam com este comprador.</p>
          <div class="grid sm:grid-cols-2 gap-4">
            <div>
              <label class="input-label">Valor mínimo (R$)</label>
              <input v-model="form.valorMinimo" @input="formatarMoeda($event, 'valorMinimo')" class="input-field" placeholder="R$ 0,00" inputmode="numeric" data-teste="valor-minimo" />
            </div>
            <div>
              <label class="input-label">Valor máximo (R$)</label>
              <input v-model="form.valorMaximo" @input="formatarMoeda($event, 'valorMaximo')" class="input-field" placeholder="R$ 0,00" inputmode="numeric" data-teste="valor-maximo" />
            </div>
            <div class="sm:col-span-2">
              <label class="input-label">Tipo de imóvel</label>
              <select v-model="form.tipoProcurado" class="input-field sm:max-w-xs" data-teste="tipo-procurado">
                <option value="">Qualquer</option>
                <option value="Residencial">Residencial</option>
                <option value="Comercial">Comercial</option>
              </select>
            </div>
            <div class="sm:col-span-2">
              <label class="input-label">Subtipos</label>
              <div class="flex flex-wrap gap-2">
                <label v-for="st in subtiposOpcoes" :key="st" class="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border cursor-pointer"
                  :class="form.subtiposProcurados.includes(st) ? 'border-navy-600 bg-navy-50 text-navy-700' : 'border-slate-200 text-slate-600'">
                  <input type="checkbox" class="sr-only" :value="st" v-model="form.subtiposProcurados" />
                  {{ st }}
                </label>
              </div>
            </div>
            <div>
              <label class="input-label">Cidade</label>
              <input v-model="form.cidadeProcurada" class="input-field" placeholder="Ex.: Blumenau" maxlength="100" data-teste="cidade-procurada" />
            </div>
            <div>
              <label class="input-label">Bairros (separe por vírgula)</label>
              <input v-model="form.bairrosProcurados" class="input-field" placeholder="Ex.: Itoupava Norte, Velha" maxlength="300" data-teste="bairros-procurados" />
            </div>
          </div>
        </div>
      </transition>

      <!-- ───── Vínculo com Imóvel ───── -->
      <div class="card p-6">
        <div class="section-title">
          <span class="section-number">4</span>
          Vínculo com Imóvel
        </div>
        <div>
          <label class="input-label">ID do Imóvel de Interesse</label>
          <input
            v-model="form.imovelInteresse"
            class="input-field font-mono"
            placeholder="Ex: BC0012026"
          />
          <p class="text-xs text-slate-400 mt-1">
            Informe o ID do imóvel cadastrado no sistema (ex: BC0012026).
          </p>
        </div>
      </div>

      <!-- ───── Movimentação ───── -->
      <div class="card p-6">
        <div class="section-title">
          <span class="section-number">5</span>
          Movimentação / Histórico
        </div>
        <textarea
          v-model="form.movimentacao"
          class="input-field font-mono text-xs"
          rows="8"
          placeholder="Histórico de contatos, visitas, preferências expressas, negociações..."
        ></textarea>
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
          {{ loading ? 'Salvando...' : (editMode ? 'Atualizar Cliente' : 'Salvar Cliente') }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { criarCliente, atualizarCliente, listarClientes } from '../api/index.js';
import { useRouter, useRoute } from 'vue-router';
import { useToast } from '../composables/useToast.js';
import { formatarCep, buscarEnderecoPorCep } from '../utils/cep.js';

const router   = useRouter();
const route    = useRoute();
const { success, error } = useToast();
const loading  = ref(false);
const editMode = ref(false);
const editId   = ref('');

// ── CEP lookup ────────────────────────────
const cepLoading = ref(false);
const cepErro    = ref('');

async function buscarCep() {
  const digits = form.value.cep.replace(/\D/g, '');
  if (digits.length !== 8) return;
  cepLoading.value = true;
  cepErro.value = '';
  try {
    const addr = await buscarEnderecoPorCep(form.value.cep);
    if (!addr) { cepErro.value = 'CEP não encontrado.'; return; }
    form.value.logradouro = addr.logradouro;
    form.value.bairro     = addr.bairro;
    form.value.cidade     = addr.cidade;
    form.value.uf         = addr.uf;
  } catch {
    cepErro.value = 'Erro ao consultar o CEP.';
  } finally {
    cepLoading.value = false;
  }
}

const statusClienteOpcoes = ['Novo', 'Em atendimento', 'Negociando', 'Fechado', 'Inativo'];
const subtiposOpcoes = ['Apartamento', 'Casa', 'Sobrado', 'Terreno', 'Galpão', 'Sala'];

function formatarMoeda(e, campo) {
  const digits = e.target.value.replace(/\D/g, '');
  if (!digits) { form.value[campo] = ''; return; }
  form.value[campo] = (parseInt(digits, 10) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const form = ref({
  statusCliente: 'Novo',
  valorMinimo: '', valorMaximo: '', tipoProcurado: '', subtiposProcurados: [], cidadeProcurada: '', bairrosProcurados: '',
  tipoCliente: '',
  nome: '', cpf: '', rg: '', estadoCivil: '', conjuge: '', dataAniversario: '',
  email: '', telefone: '',
  logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '', cep: '',
  hobbies: '', gostosPessoais: '', bebidaPreferida: '',
  imovelInteresse: '',
  movimentacao: '',
});

const tiposCliente = [
  { valor: 'Vendedor',  rotulo: 'Vendedor' },
  { valor: 'Comprador', rotulo: 'Comprador' },
  { valor: 'Ambos',     rotulo: 'Ambos (vende e compra)' },
];

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

function formatCPF(e) {
  let v = e.target.value.replace(/\D/g, '');
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d)/, '$1.$2');
  v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  form.value.cpf = v;
}

const ehComprador = computed(() => ['Comprador', 'Ambos'].includes(form.value.tipoCliente));

function buildPayload(f) {
  const payload = {
    dadosPessoais: {
      tipoCliente:     f.tipoCliente,
      nome:            f.nome,
      cpf:             f.cpf,
      rg:              f.rg,
      estadoCivil:     f.estadoCivil,
      conjuge:         f.conjuge,
      dataAniversario: f.dataAniversario,
      email:           f.email,
      telefone:        f.telefone,
      endereco: {
        logradouro:  f.logradouro,
        numero:      f.numero,
        complemento: f.complemento,
        bairro:      f.bairro,
        cidade:      f.cidade,
        uf:          f.uf,
        cep:         f.cep,
      },
    },
    preferencias: {
      hobbies:         f.hobbies,
      gostosPessoais:  f.gostosPessoais,
      bebidaPreferida: f.bebidaPreferida,
    },
    vinculo: {
      imovelInteresse: f.imovelInteresse,
    },
    movimentacao: f.movimentacao,
    gestao: { status: f.statusCliente },
  };
  // Só envia o perfil de busca de quem é comprador; para os demais o servidor mantém o que já estava salvo.
  if (['Comprador', 'Ambos'].includes(f.tipoCliente)) {
    payload.perfilBusca = {
      valorMinimo: f.valorMinimo,
      valorMaximo: f.valorMaximo,
      tipo: f.tipoProcurado,
      subtipos: f.subtiposProcurados,
      cidade: f.cidadeProcurada,
      bairros: f.bairrosProcurados,
    };
  }
  return payload;
}

async function submit() {
  const f = form.value;
  if (!f.nome.trim()) {
    error('O nome do cliente é obrigatório.');
    return;
  }
  if (ehComprador.value && f.valorMinimo && f.valorMaximo) {
    const n = (v) => parseFloat(String(v).replace(/[^\d,]/g, '').replace(',', '.')) || 0;
    if (n(f.valorMinimo) > n(f.valorMaximo)) {
      error('O valor mínimo não pode ser maior que o máximo.');
      return;
    }
  }
  loading.value = true;
  try {
    const payload = buildPayload(f);
    if (editMode.value) {
      await atualizarCliente(editId.value, payload);
      success('Cliente atualizado com sucesso!');
    } else {
      const { data } = await criarCliente(payload);
      success(`Cliente cadastrado com sucesso! ID: ${data.id}`);
    }
    setTimeout(() => router.push('/listagem'), 1800);
  } catch (err) {
    error(err?.response?.data?.error || 'Erro ao salvar cliente. Verifique a conexão com a API.');
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  const idEditar = route.query.editar;
  if (!idEditar) return;
  editMode.value = true;
  editId.value   = idEditar;
  try {
    const { data } = await listarClientes(idEditar);
    const registros = data.data || data.clientes || data;
    const cliente = registros.find((c) => c['ID'] === idEditar);
    if (!cliente) { error(`Cliente "${idEditar}" não encontrado.`); return; }

    const dp  = cliente['Dados Pessoais'] || {};
    const end = dp['Endereço']            || {};
    const pref = cliente['Preferências']  || {};
    const vin  = cliente['Vínculo']       || {};

    form.value.tipoCliente     = dp['Tipo de Cliente']  || cliente['Tipo de Cliente'] || '';
    form.value.nome            = dp['Nome']             || cliente['Nome'] || '';
    form.value.cpf             = dp['CPF']              || cliente['CPF']  || '';
    form.value.rg              = dp['RG']               || cliente['RG']   || '';
    form.value.estadoCivil     = dp['Estado Civil']     || cliente['Estado Civil'] || '';
    form.value.conjuge         = dp['Cônjuge']          || cliente['Cônjuge'] || '';
    form.value.dataAniversario = dp['Data Aniversário'] || cliente['Data Aniversário'] || '';
    form.value.email           = dp['E-mail']           || cliente['E-mail']           || '';
    form.value.telefone        = dp['Telefone']         || cliente['Telefone']         || '';

    form.value.logradouro  = end['Logradouro']  || cliente['Logradouro']  || '';
    form.value.numero      = end['Número']      || cliente['Número']      || '';
    form.value.complemento = end['Complemento'] || cliente['Complemento'] || '';
    form.value.bairro      = end['Bairro']      || cliente['Bairro']      || '';
    form.value.cidade      = end['Cidade']      || cliente['Cidade']      || '';
    form.value.uf          = end['UF']          || cliente['UF']          || '';
    form.value.cep         = end['CEP']         || cliente['CEP']         || '';

    form.value.hobbies         = pref['Hobbies']          || cliente['Hobbies']          || '';
    form.value.gostosPessoais  = pref['Gostos Pessoais']  || cliente['Gostos Pessoais']  || '';
    form.value.bebidaPreferida = pref['Bebida Preferida'] || cliente['Bebida Preferida'] || '';

    form.value.imovelInteresse = vin['Imóvel de Interesse'] || cliente['Imóvel de Interesse'] || '';
    form.value.movimentacao    = cliente['Movimentação']    || '';

    form.value.statusCliente      = cliente['Status Cliente'] || 'Novo';
    form.value.valorMinimo        = cliente['Valor Mínimo'] || '';
    form.value.valorMaximo        = cliente['Valor Máximo'] || '';
    form.value.tipoProcurado      = cliente['Tipo Procurado'] || '';
    form.value.subtiposProcurados = String(cliente['Subtipos Procurados'] || '').split(',').map((x) => x.trim()).filter(Boolean);
    form.value.cidadeProcurada    = cliente['Cidade Procurada'] || '';
    form.value.bairrosProcurados  = cliente['Bairros Procurados'] || '';
  } catch {
    error('Erro ao carregar dados do cliente.');
  }
});
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: all 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-4px); }
</style>

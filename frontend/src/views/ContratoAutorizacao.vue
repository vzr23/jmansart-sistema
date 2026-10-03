<template>
  <div class="max-w-3xl mx-auto px-4 py-6 sm:py-10">
    <!-- Cabeçalho -->
    <div class="mb-6">
      <button type="button" @click="router.push('/')" class="btn-ghost mb-3 -ml-2">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
        </svg>
        Voltar
      </button>
      <h1 class="text-2xl font-bold text-navy-700">Autorização para Venda</h1>
      <p class="text-sm text-slate-500 mt-1">Gere o contrato em PDF para assinatura</p>
    </div>

    <!-- ───── PDF pronto ───── -->
    <div v-if="pronto" class="card p-6 space-y-5" data-teste="pronto">
      <div v-if="pdfBlob">
        <div class="flex items-center gap-3 mb-1">
          <span class="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
          </span>
          <h2 class="text-lg text-navy-700">PDF gerado</h2>
        </div>
        <p class="text-sm text-slate-500">Os dados já foram removidos da tela. O PDF fica só na memória do aparelho até você enviá-lo ou baixá-lo.</p>
        <div class="mt-5 flex flex-col sm:flex-row gap-3">
          <button type="button" class="btn-primary justify-center" :disabled="entregando" @click="entregar(true)" data-teste="compartilhar">
            {{ podeCompartilhar ? 'Compartilhar (WhatsApp, e-mail…)' : 'Baixar PDF' }}
          </button>
          <button v-if="podeCompartilhar" type="button" class="btn-secondary justify-center" :disabled="entregando" @click="entregar(false)" data-teste="baixar">
            Baixar PDF
          </button>
        </div>
        <p v-if="desfecho" class="text-sm text-slate-500 mt-3">{{ desfecho }}</p>
      </div>
      <div v-else>
        <h2 class="text-lg text-navy-700 mb-1">Concluído</h2>
        <p class="text-sm text-slate-600" data-teste="desfecho">{{ desfecho }}</p>
        <p class="text-sm text-slate-500 mt-1">O PDF foi descartado da memória e os dados saíram da tela.</p>
      </div>

      <div v-if="avisoMovimentacao" class="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800" data-teste="aviso-movimentacao">
        O contrato foi gerado, mas <strong>não foi possível registrar</strong> a geração na aba Movimentações. Se precisar do histórico, registre manualmente.
      </div>

      <div class="flex flex-wrap gap-3 pt-2 border-t border-slate-100">
        <button type="button" class="btn-secondary" @click="novoContrato">Novo contrato</button>
        <button type="button" class="btn-ghost" @click="router.push('/')">Início</button>
      </div>
    </div>

    <template v-else>
      <!-- ───── Indicador de etapas ───── -->
      <ol class="flex items-start justify-between gap-1 mb-6" aria-label="Etapas">
        <li v-for="p in PASSOS" :key="p.n" class="flex-1 flex flex-col items-center text-center gap-1">
          <span
            class="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition"
            :class="p.n === passo ? 'bg-navy-600 text-white' : p.n < passo ? 'bg-navy-100 text-navy-700' : 'bg-slate-200 text-slate-500'"
          >{{ p.n }}</span>
          <span class="text-[11px] leading-tight" :class="p.n === passo ? 'text-navy-700 font-semibold' : 'text-slate-500'">{{ p.curto }}</span>
        </li>
      </ol>

      <form @submit.prevent autocomplete="off" class="space-y-5">

        <!-- ───── 1. Imóvel ───── -->
        <div v-if="passo === 1" class="space-y-5">
          <div class="card p-5 sm:p-6">
            <div class="section-title"><span class="section-number">1</span> Imóvel</div>
            <label class="input-label" for="busca-id">ID do imóvel</label>
            <div class="flex gap-2">
              <input
                id="busca-id" v-model="idBusca" type="text" class="input-field uppercase" placeholder="Ex.: BC0012026"
                autocomplete="off" autocapitalize="characters" autocorrect="off" spellcheck="false" maxlength="30"
                @keydown.enter.prevent="buscarImovel"
              />
              <button type="button" class="btn-primary shrink-0" :disabled="buscando || !idBusca.trim()" @click="buscarImovel" data-teste="buscar">
                {{ buscando ? 'Buscando…' : 'Buscar' }}
              </button>
            </div>
            <p v-if="erroBusca" class="mt-2 text-sm text-red-600" data-teste="erro-busca">{{ erroBusca }}</p>
          </div>

          <template v-if="imovelId">
            <div v-for="(a, i) in avisosImovel" :key="'ai' + i" class="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800" data-teste="aviso-imovel">
              {{ a }}
            </div>

            <div class="card p-5 sm:p-6">
              <div class="flex items-center gap-2 mb-4">
                <span class="font-mono text-sm font-semibold text-navy-500 bg-navy-50 px-2 py-0.5 rounded-md">{{ imovelId }}</span>
                <span class="text-xs text-slate-500">Confira e complete os dados do imóvel</span>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div v-for="c in CAMPOS_IMOVEL" :key="c.k" :class="c.col">
                  <label class="input-label" :for="'im-' + c.k">{{ c.l }}</label>
                  <input
                    :id="'im-' + c.k" type="text" class="input-field" :class="{ '!border-red-400': tentou && vazio(imovel[c.k]) }"
                    :value="imovel[c.k]" :placeholder="c.ph" :inputmode="c.im" :maxlength="c.max"
                    autocomplete="off" autocorrect="off" spellcheck="false" :autocapitalize="c.cap || 'sentences'"
                    @input="imovel[c.k] = aplicar(c.mask, $event.target.value)"
                  />
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- ───── 2. Proprietários ───── -->
        <div v-if="passo === 2" class="space-y-5">
          <div v-for="(p, i) in proprietarios" :key="p.uid" class="card p-5 sm:p-6" data-teste="proprietario">
            <div class="flex items-center justify-between mb-4">
              <div class="section-title !mb-0"><span class="section-number">{{ i + 1 }}</span> Proprietário{{ proprietarios.length > 1 ? ` ${i + 1}` : '' }}</div>
              <button v-if="proprietarios.length > 1" type="button" class="btn-ghost text-red-600" @click="removerProprietario(i)">Remover</button>
            </div>

            <p v-if="i === 1 && conjuge" class="mb-4 text-xs text-slate-500">Cônjuge cadastrado no imóvel: <strong>{{ conjuge }}</strong></p>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="sm:col-span-2">
                <label class="input-label" :for="`p${i}-nome`">Nome completo</label>
                <input :id="`p${i}-nome`" type="text" class="input-field" :class="{ '!border-red-400': tentou && vazio(p.nome) }"
                  v-model="p.nome" autocomplete="off" autocorrect="off" spellcheck="false" autocapitalize="words" maxlength="200" />
              </div>

              <div class="sm:col-span-2">
                <span class="input-label">Gênero (para concordância do texto)</span>
                <div class="flex gap-3">
                  <label v-for="g in GENEROS" :key="g.v" class="radio-card flex-1 justify-center" :class="{ selected: p.genero === g.v, '!border-red-400': tentou && !p.genero }">
                    <input type="radio" class="sr-only" :name="`genero-${p.uid}`" :value="g.v" v-model="p.genero" @change="ajustarNacionalidade(p)" />
                    {{ g.l }}
                  </label>
                </div>
              </div>

              <div v-for="c in CAMPOS_PROP" :key="c.k" :class="c.col">
                <label class="input-label" :for="`p${i}-${c.k}`">{{ c.l }}{{ c.opcional ? ' (opcional)' : '' }}</label>
                <input
                  :id="`p${i}-${c.k}`" type="text" class="input-field"
                  :class="{ '!border-red-400': tentou && !c.opcional && vazio(p[c.k]) }"
                  :value="p[c.k]" :placeholder="c.ph" :inputmode="c.im" :maxlength="c.max"
                  autocomplete="off" autocorrect="off" spellcheck="false" :autocapitalize="c.cap || 'sentences'"
                  @input="p[c.k] = aplicar(c.mask, $event.target.value)"
                />
                <p v-if="c.k === 'cpf' && cpfSuspeito(p)" class="mt-1 text-xs text-amber-700" data-teste="aviso-cpf">
                  Dígitos verificadores do CPF não conferem. Confira a digitação (isto não bloqueia).
                </p>
              </div>
            </div>
          </div>

          <button v-if="proprietarios.length < MAX_PROPRIETARIOS" type="button" class="btn-secondary w-full justify-center" @click="adicionarProprietario" data-teste="add-prop">
            + Adicionar proprietário
          </button>
        </div>

        <!-- ───── 3. Condições ───── -->
        <div v-if="passo === 3" class="card p-5 sm:p-6">
          <div class="section-title"><span class="section-number">3</span> Condições</div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div v-for="c in CAMPOS_COND" :key="c.k" :class="c.col">
              <label class="input-label" :for="'co-' + c.k">{{ c.l }}</label>
              <input
                :id="'co-' + c.k" type="text" class="input-field" :class="{ '!border-red-400': tentou && vazio(cond[c.k]) }"
                :value="cond[c.k]" :placeholder="c.ph" :inputmode="c.im" :maxlength="c.max"
                autocomplete="off" autocorrect="off" spellcheck="false" :autocapitalize="c.cap || 'sentences'"
                @input="cond[c.k] = aplicar(c.mask, $event.target.value)"
              />
              <p v-if="c.dica" class="mt-1 text-[11px] text-slate-400">{{ c.dica }}</p>
            </div>
            <div class="sm:col-span-2">
              <span class="input-label">Exclusividade</span>
              <div class="radio-card selected cursor-default">Sem exclusividade (“não exclusividade”)</div>
            </div>
          </div>
        </div>

        <!-- ───── 4. Revisar e gerar ───── -->
        <div v-if="passo === 4" class="space-y-4">
          <div v-if="carregandoPrevia" class="card p-6 text-sm text-slate-500" data-teste="carregando-previa">Conferindo os dados…</div>

          <div v-else-if="errosPrevia.length || erroPrevia" class="card p-5 border-red-300 space-y-3" data-teste="erros-previa">
            <h2 class="text-base text-red-700">Corrija antes de gerar</h2>
            <p v-if="erroPrevia" class="text-sm text-red-700">{{ erroPrevia }}</p>
            <ul class="text-sm text-red-700 list-disc pl-5 space-y-1">
              <li v-for="(e, i) in errosPrevia" :key="i">{{ e.texto }}</li>
            </ul>
            <button v-if="errosPrevia.length" type="button" class="btn-secondary" @click="passo = errosPrevia[0].passo">Corrigir</button>
          </div>

          <template v-else-if="previa">
            <div v-for="(a, i) in todosAvisos" :key="'av' + i" class="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800" data-teste="aviso-revisao">
              {{ a }}
            </div>

            <div v-if="previa.marca_minuta" class="rounded-lg bg-navy-50 border border-navy-200 px-4 py-2 text-xs text-navy-700 font-semibold tracking-wide" data-teste="faixa-minuta">
              MINUTA — texto sujeito a revisão jurídica. O PDF sairá com a marca “MINUTA”.
            </div>

            <!-- Prévia (com a marca MINUTA) -->
            <div class="card relative overflow-hidden p-5 sm:p-6 space-y-5" data-teste="previa">
              <div>
                <h3 class="text-xs uppercase tracking-wider text-slate-500 mb-2">{{ proprietarios.length > 1 ? 'Proprietários' : 'Proprietário' }}</h3>
                <ul class="space-y-2 text-sm">
                  <li v-for="p in proprietarios" :key="p.uid">
                    <div class="font-semibold text-navy-700">{{ p.nome.toUpperCase() }}</div>
                    <div class="text-slate-600">CPF {{ p.cpf }}</div>
                  </li>
                </ul>
              </div>
              <div>
                <h3 class="text-xs uppercase tracking-wider text-slate-500 mb-2">Imóvel {{ imovelId }}</h3>
                <p class="text-sm text-slate-700">
                  {{ imovel.tipo_imovel }} de {{ imovel.area_m2 }} m², matrícula {{ imovel.matricula }} (Comarca de {{ imovel.comarca }}) —
                  {{ imovel.logradouro_imovel }}, {{ imovel.bairro_imovel }}, {{ imovel.municipio_imovel }}/{{ imovel.uf_imovel }}
                </p>
              </div>
              <div>
                <h3 class="text-xs uppercase tracking-wider text-slate-500 mb-2">Condições</h3>
                <dl class="text-sm text-slate-700 space-y-1">
                  <div><dt class="inline font-semibold">Valor: </dt><dd class="inline">{{ previa.resumo.valor }} ({{ previa.resumo.valor_extenso }})</dd></div>
                  <div><dt class="inline font-semibold">Comissão: </dt><dd class="inline">{{ previa.resumo.comissao_pct }}% ({{ previa.resumo.comissao_extenso }} por cento)</dd></div>
                  <div><dt class="inline font-semibold">Prazo: </dt><dd class="inline">{{ previa.resumo.prazo_dias }} dias ({{ previa.resumo.prazo_extenso }})</dd></div>
                  <div><dt class="inline font-semibold">Multa: </dt><dd class="inline">{{ previa.resumo.multa_pct }}% ({{ previa.resumo.multa_extenso }} por cento)</dd></div>
                  <div><dt class="inline font-semibold">Juros: </dt><dd class="inline">{{ previa.resumo.juros_pct_mes }}% ao mês ({{ previa.resumo.juros_extenso }} por cento)</dd></div>
                  <div><dt class="inline font-semibold">Exclusividade: </dt><dd class="inline">não</dd></div>
                  <div><dt class="inline font-semibold">Assinatura: </dt><dd class="inline">{{ cond.cidade_assinatura }}, {{ previa.resumo.data_assinatura }}</dd></div>
                </dl>
              </div>

              <div v-if="previa.marca_minuta" aria-hidden="true" class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center select-none" data-teste="marca-minuta">
                <span class="font-serif font-bold tracking-widest text-6xl sm:text-8xl text-slate-500/20 -rotate-[30deg]">MINUTA</span>
              </div>
            </div>

            <p v-if="erroGeracao" class="text-sm text-red-600" data-teste="erro-geracao">{{ erroGeracao }}</p>
            <ul v-if="errosGeracao.length" class="text-sm text-red-600 list-disc pl-5">
              <li v-for="(e, i) in errosGeracao" :key="i">{{ e.texto }}</li>
            </ul>
          </template>
        </div>

        <!-- Mensagem de campos faltando -->
        <p v-if="tentou && faltando.length && passo < 4" class="text-sm text-red-600" data-teste="faltando">
          Preencha os campos marcados: {{ faltando.join(', ') }}.
        </p>

        <!-- ───── Navegação ───── -->
        <div class="flex gap-3 pt-1">
          <button v-if="passo > 1" type="button" class="btn-secondary flex-1 sm:flex-none justify-center" :disabled="gerando" @click="voltar">Voltar</button>
          <button v-if="passo < 4" type="button" class="btn-primary flex-1 sm:flex-none justify-center sm:ml-auto" :disabled="passo === 1 && !imovelId" @click="avancar" data-teste="continuar">
            Continuar
          </button>
          <button v-else type="button" class="btn-primary flex-1 sm:flex-none justify-center sm:ml-auto" :disabled="gerando || !previa || carregandoPrevia" @click="gerar" data-teste="gerar">
            {{ gerando ? 'Gerando PDF…' : 'Gerar PDF' }}
          </button>
        </div>
      </form>
    </template>
  </div>
</template>

<script setup>
/**
 * Gerador da Autorização para Venda (4 etapas).
 * Privacidade: todos os dados pessoais vivem só nestas variáveis (memória da aba).
 * Nada em localStorage/sessionStorage/URL/console. Ao gerar (e ao sair da tela) tudo é apagado.
 */
import { ref, reactive, shallowRef, computed, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { buscarImovelContrato, previaContrato, gerarContratoPdf, lerErroApi } from '@/api/index.js';
import {
  mascaraCpf, mascaraCep, mascaraMoeda, moedaDaPlanilha, mascaraDecimal, mascaraInteiro, mascaraUf, cpfDigitosValidos,
} from '@/utils/mascaras.js';
import { compartilharOuBaixar, baixarPdf, compartilhamentoDisponivel } from '@/utils/compartilharPdf.js';

const router = useRouter();

const PASSOS = [
  { n: 1, curto: 'Imóvel' },
  { n: 2, curto: 'Proprietários' },
  { n: 3, curto: 'Condições' },
  { n: 4, curto: 'Revisar' },
];
const GENEROS = [{ v: 'M', l: 'Masculino' }, { v: 'F', l: 'Feminino' }];
const MAX_PROPRIETARIOS = 10;

// ── Definição dos campos ──
const CAMPOS_IMOVEL = [
  { k: 'matricula', l: 'Matrícula', max: 40 },
  { k: 'comarca', l: 'Comarca do Registro de Imóveis', max: 100, cap: 'words' },
  { k: 'tipo_imovel', l: 'Tipo do imóvel', ph: 'casa, terreno, apartamento…', max: 60, cap: 'none' },
  { k: 'area_m2', l: 'Área (m²)', ph: '21282,18', im: 'decimal', mask: 'decimal', max: 15 },
  { k: 'logradouro_imovel', l: 'Endereço (rua, número, complemento)', col: 'sm:col-span-2', max: 250, cap: 'words' },
  { k: 'bairro_imovel', l: 'Bairro', max: 100, cap: 'words' },
  { k: 'municipio_imovel', l: 'Município', max: 100, cap: 'words' },
  { k: 'uf_imovel', l: 'UF', mask: 'uf', max: 2, cap: 'characters' },
];
const CAMPOS_PROP = [
  { k: 'nacionalidade', l: 'Nacionalidade', max: 60, cap: 'none' },
  { k: 'profissao', l: 'Profissão', ph: 'empresário, do lar…', max: 80, cap: 'none' },
  { k: 'estado_civil', l: 'Estado civil', ph: 'casado, solteiro…', col: 'sm:col-span-2', max: 120, cap: 'none' },
  { k: 'cpf', l: 'CPF', ph: '000.000.000-00', im: 'numeric', mask: 'cpf', max: 14 },
  { k: 'cep', l: 'CEP', ph: '00000-000', im: 'numeric', mask: 'cep', max: 9 },
  { k: 'rua', l: 'Rua', col: 'sm:col-span-2', max: 200, cap: 'words' },
  { k: 'numero', l: 'Número / complemento', max: 20 },
  { k: 'bairro', l: 'Bairro', max: 100, cap: 'words' },
  { k: 'cidade', l: 'Cidade', max: 100, cap: 'words' },
  { k: 'uf', l: 'UF', mask: 'uf', max: 2, cap: 'characters' },
];
const CAMPOS_COND = [
  { k: 'valor', l: 'Valor do imóvel', ph: 'R$ 0,00', im: 'numeric', mask: 'moeda', col: 'sm:col-span-2', max: 24 },
  { k: 'comissao_pct', l: 'Comissão (%)', im: 'decimal', mask: 'decimal', max: 6, dica: 'Padrão: 6' },
  { k: 'prazo_dias', l: 'Prazo (dias)', im: 'numeric', mask: 'inteiro', max: 4, dica: 'Padrão: 120' },
  { k: 'multa_pct', l: 'Multa por atraso (%)', im: 'decimal', mask: 'decimal', max: 6, dica: 'Padrão: 2' },
  { k: 'juros_pct_mes', l: 'Juros ao mês (%)', im: 'decimal', mask: 'decimal', max: 6, dica: 'Padrão: 1' },
  { k: 'cidade_assinatura', l: 'Cidade da assinatura', col: 'sm:col-span-2', max: 100, cap: 'words' },
];

const ROTULOS = Object.fromEntries(
  [...CAMPOS_IMOVEL, ...CAMPOS_PROP, ...CAMPOS_COND].map((c) => [c.k, c.l.replace(/ \(.*\)$/, '')]).concat([
    ['nome', 'Nome'], ['genero', 'Gênero'], ['data_assinatura', 'Data da assinatura'], ['imovel_id', 'ID do imóvel'],
  ]),
);

const MASCARAS = {
  cpf: mascaraCpf, cep: mascaraCep, moeda: mascaraMoeda, decimal: (v) => mascaraDecimal(v),
  inteiro: (v) => mascaraInteiro(v, 4), uf: mascaraUf,
};
const aplicar = (mask, v) => (mask ? MASCARAS[mask](v) : String(v ?? ''));
const vazio = (v) => String(v ?? '').trim() === '';

// ── Estado (somente memória) ──
let uidSeq = 0;
const novoProprietario = (base = {}) => ({
  uid: ++uidSeq, nome: '', genero: '', nacionalidade: '', profissao: '', estado_civil: '',
  cpf: '', cep: '', rua: '', numero: '', bairro: '', cidade: '', uf: '', ...base,
});
const imovelVazio = () => ({ matricula: '', comarca: '', tipo_imovel: '', area_m2: '', logradouro_imovel: '', bairro_imovel: '', municipio_imovel: '', uf_imovel: '' });
const condVazia = () => ({ valor: '', comissao_pct: '6', prazo_dias: '120', multa_pct: '2', juros_pct_mes: '1', cidade_assinatura: '' });

const passo = ref(1);
const tentou = ref(false);
const idBusca = ref('');
const imovelId = ref('');
const conjuge = ref('');
const avisosImovel = ref([]);
const buscando = ref(false);
const erroBusca = ref('');
const imovel = reactive(imovelVazio());
const proprietarios = ref([novoProprietario()]);
const cond = reactive(condVazia());

const previa = ref(null);
const carregandoPrevia = ref(false);
const erroPrevia = ref('');
const errosPrevia = ref([]);
let tokenPrevia = 0;

const gerando = ref(false);
const erroGeracao = ref('');
const errosGeracao = ref([]);

const pronto = ref(false);
const pdfBlob = shallowRef(null);
const nomeArquivo = ref('autorizacao-venda.pdf');
const avisoMovimentacao = ref(false);
const entregando = ref(false);
const desfecho = ref('');
const podeCompartilhar = ref(false);

// ── Utilidades de tela ──
function descrever(erro) {
  const campo = String(erro?.campo ?? '');
  let m;
  if ((m = /^proprietarios\[(\d+)\]\.(\w+)$/.exec(campo))) {
    const rot = ROTULOS[m[2]] || m[2];
    return { texto: `Proprietário ${Number(m[1]) + 1} – ${rot}: ${erro.mensagem}`, passo: 2 };
  }
  if ((m = /^imovel\.(\w+)$/.exec(campo))) return { texto: `${ROTULOS[m[1]] || m[1]}: ${erro.mensagem}`, passo: 1 };
  if ((m = /^condicoes\.(\w+)$/.exec(campo))) return { texto: `${ROTULOS[m[1]] || m[1]}: ${erro.mensagem}`, passo: 3 };
  if (campo === 'proprietarios') return { texto: `Proprietários: ${erro.mensagem}`, passo: 2 };
  return { texto: `${ROTULOS[campo] || campo || 'Dados'}: ${erro.mensagem}`, passo: 1 };
}

const cpfSuspeito = (p) => p.cpf.replace(/\D/g, '').length === 11 && !cpfDigitosValidos(p.cpf);

const faltando = computed(() => {
  if (passo.value === 1) return CAMPOS_IMOVEL.filter((c) => vazio(imovel[c.k])).map((c) => c.l);
  if (passo.value === 3) return CAMPOS_COND.filter((c) => vazio(cond[c.k])).map((c) => c.l);
  if (passo.value === 2) {
    const lista = [];
    proprietarios.value.forEach((p, i) => {
      const pref = proprietarios.value.length > 1 ? `Prop. ${i + 1}: ` : '';
      if (vazio(p.nome)) lista.push(`${pref}Nome`);
      if (!p.genero) lista.push(`${pref}Gênero`);
      CAMPOS_PROP.filter((c) => !c.opcional && vazio(p[c.k])).forEach((c) => lista.push(`${pref}${c.l}`));
    });
    return lista;
  }
  return [];
});

const todosAvisos = computed(() => [
  ...avisosImovel.value,
  ...(previa.value?.avisos ?? []).map((a) => descrever(a).texto),
]);

function ajustarNacionalidade(p) {
  const padroes = ['', 'brasileiro', 'brasileira'];
  if (padroes.includes(p.nacionalidade.trim().toLowerCase())) p.nacionalidade = p.genero === 'F' ? 'brasileira' : 'brasileiro';
}

function adicionarProprietario() {
  proprietarios.value.push(novoProprietario());
}
function removerProprietario(i) {
  if (proprietarios.value.length > 1) proprietarios.value.splice(i, 1);
}

// ── Etapa 1: buscar imóvel ──
async function buscarImovel() {
  const id = idBusca.value.trim();
  if (!id || buscando.value) return;
  buscando.value = true;
  erroBusca.value = '';
  try {
    const { data } = await buscarImovelContrato(id);
    limparDados();
    imovelId.value = data.id || id.toUpperCase();
    idBusca.value = imovelId.value;
    conjuge.value = data.conjuge || '';
    avisosImovel.value = Array.isArray(data.avisos) ? data.avisos : [];
    Object.assign(imovel, imovelVazio(), data.imovel || {});
    imovel.uf_imovel = mascaraUf(imovel.uf_imovel);
    const pr = data.proprietario || {};
    proprietarios.value = [novoProprietario({
      nome: pr.nome || '', estado_civil: pr.estado_civil || '',
      cpf: mascaraCpf(pr.cpf || ''), cep: mascaraCep(pr.cep || ''),
      rua: pr.rua || '', numero: pr.numero || '', bairro: pr.bairro || '', cidade: pr.cidade || '', uf: mascaraUf(pr.uf || ''),
    })];
    const pad = data.padroes || {};
    Object.assign(cond, condVazia(), {
      valor: moedaDaPlanilha(data.valor),
      comissao_pct: String(pad.comissao_pct ?? 6), prazo_dias: String(pad.prazo_dias ?? 120),
      multa_pct: String(pad.multa_pct ?? 2), juros_pct_mes: String(pad.juros_pct_mes ?? 1),
    });
    tentou.value = false;
  } catch (e) {
    const er = await lerErroApi(e);
    imovelId.value = '';
    erroBusca.value = er.status === 404 ? 'Imóvel não encontrado. Confira o ID.' : er.mensagem;
  } finally {
    buscando.value = false;
  }
}

// ── Navegação ──
function avancar() {
  if (faltando.value.length) { tentou.value = true; return; }
  tentou.value = false;
  passo.value += 1;
  if (passo.value === 4) carregarPrevia();
  window.scrollTo({ top: 0 });
}
function voltar() {
  tentou.value = false;
  if (passo.value > 1) passo.value -= 1;
  window.scrollTo({ top: 0 });
}

function montarPayload() {
  return {
    proprietarios: proprietarios.value.map(({ uid, ...resto }) => ({ ...resto })),
    imovel: { ...imovel },
    condicoes: { ...cond },
  };
}

// ── Etapa 4: prévia no servidor ──
async function carregarPrevia() {
  const meu = ++tokenPrevia;
  previa.value = null;
  erroPrevia.value = '';
  errosPrevia.value = [];
  erroGeracao.value = '';
  errosGeracao.value = [];
  carregandoPrevia.value = true;
  try {
    const { data } = await previaContrato(montarPayload());
    if (meu === tokenPrevia) previa.value = data;
  } catch (e) {
    const er = await lerErroApi(e);
    if (meu !== tokenPrevia) return;
    errosPrevia.value = er.erros.map(descrever);
    erroPrevia.value = er.erros.length ? '' : er.mensagem;
  } finally {
    if (meu === tokenPrevia) carregandoPrevia.value = false;
  }
}

// ── Gerar ──
function nomeDoCabecalho(cabecalho, padrao) {
  const m = /filename="?([\w.-]+\.pdf)"?/i.exec(String(cabecalho ?? ''));
  return m ? m[1] : padrao;
}

async function gerar() {
  if (gerando.value || !previa.value) return; // trava dupla: o botão também fica desativado
  gerando.value = true;
  erroGeracao.value = '';
  errosGeracao.value = [];
  try {
    const id = imovelId.value;
    const res = await gerarContratoPdf({ imovel_id: id, ...montarPayload() });
    if (!(res.data instanceof Blob) || res.data.size === 0) throw new Error('resposta vazia');
    avisoMovimentacao.value = String(res.headers?.['x-registro-movimentacao'] ?? '').toLowerCase() === 'falhou';
    nomeArquivo.value = nomeDoCabecalho(res.headers?.['content-disposition'], `autorizacao-venda-${id}.pdf`);
    pdfBlob.value = res.data;
    podeCompartilhar.value = compartilhamentoDisponivel();
    desfecho.value = '';
    limparDados(); // some tudo da tela; só o PDF fica na memória até o uso
    pronto.value = true;
  } catch (e) {
    const er = await lerErroApi(e);
    erroGeracao.value = er.erros.length ? 'Dados inválidos. Corrija e tente de novo.' : er.mensagem;
    errosGeracao.value = er.erros.map(descrever);
  } finally {
    gerando.value = false;
  }
}

// ── Entrega do PDF ──
async function entregar(preferirCompartilhar) {
  if (!pdfBlob.value || entregando.value) return;
  entregando.value = true;
  try {
    const blob = pdfBlob.value;
    const nome = nomeArquivo.value;
    let resultado;
    if (preferirCompartilhar) resultado = await compartilharOuBaixar(blob, nome);
    else { baixarPdf(blob, nome); resultado = 'baixado'; }
    if (resultado === 'cancelado') {
      desfecho.value = 'Envio cancelado. O PDF continua disponível aqui.';
      return;
    }
    desfecho.value = resultado === 'compartilhado' ? 'PDF enviado pelo menu de compartilhar.' : 'PDF baixado no aparelho.';
    pdfBlob.value = null; // libera o PDF da memória após o uso
  } finally {
    entregando.value = false;
  }
}

// ── Limpeza ──
function limparDados() {
  tokenPrevia += 1;
  passo.value = 1;
  tentou.value = false;
  imovelId.value = '';
  idBusca.value = '';
  conjuge.value = '';
  avisosImovel.value = [];
  erroBusca.value = '';
  Object.assign(imovel, imovelVazio());
  proprietarios.value = [novoProprietario()];
  Object.assign(cond, condVazia());
  previa.value = null;
  erroPrevia.value = '';
  errosPrevia.value = [];
  carregandoPrevia.value = false;
}

function novoContrato() {
  pdfBlob.value = null;
  pronto.value = false;
  desfecho.value = '';
  avisoMovimentacao.value = false;
  erroGeracao.value = '';
  errosGeracao.value = [];
  limparDados();
}

onBeforeUnmount(() => {
  pdfBlob.value = null;
  limparDados();
});
</script>

'use strict';
/**
 * Gera PDFs de EXEMPLO em backend/exemplos/ (ignorado pelo git) usando SOMENTE dados fictícios.
 * Uso: node scripts/gerar-exemplo.js
 */
const fs = require('fs');
const path = require('path');
const { gerarTextoAutorizacaoVenda } = require('../utils/contratoAutorizacao');
const { gerarPdfContrato } = require('../utils/pdfContrato');

const MARIA = {
  nome: 'Maria Aparecida Conceição Teste', genero: 'F', nacionalidade: 'brasileira', profissao: 'empresária',
  estado_civil: 'casada com o coproprietário', cpf: '111.111.111-11',
  rua: 'Rua das Palmeiras de Exemplo', numero: '100', bairro: 'Vila Fictícia', cidade: 'Blumenau', uf: 'SC', cep: '89000-000',
};
const JOSE = {
  nome: "José Antônio d'Ávila Teste", genero: 'M', nacionalidade: 'brasileiro', profissao: 'advogado',
  estado_civil: 'casado com a coproprietária', cpf: '222.222.222-22',
  rua: 'Avenida Exemplo Fictício', numero: '2500, apto 31', bairro: 'Centro', cidade: 'Itajaí', uf: 'SC', cep: '88300-000',
};
const BASE = {
  imovel: {
    matricula: '12.345', comarca: 'Blumenau', tipo_imovel: 'terreno', area_m2: '21282,18',
    logradouro_imovel: 'Rodovia SC-999, km 5, lote 7 (loteamento “Vale do Teste”)', bairro_imovel: 'Bairro Fictício',
    municipio_imovel: 'Blumenau', uf_imovel: 'SC',
  },
  condicoes: { valor: 'R$ 1.500.000,00', cidade_assinatura: 'Blumenau', data_assinatura: '2026-10-01' },
};

(async () => {
  const dir = path.join(__dirname, '..', 'exemplos');
  fs.mkdirSync(dir, { recursive: true });
  const casos = {
    'exemplo-1-proprietario.pdf': { proprietarios: [MARIA], desc: '1 proprietário, casa' },
    'exemplo-2-proprietarios.pdf': { proprietarios: [MARIA, JOSE], desc: '2 proprietários, terreno' },
    'exemplo-apartamento-2002.pdf': {
      proprietarios: [MARIA],
      imovel: { ...BASE.imovel, tipo_imovel: 'apartamento', numero_unidade: '2002' },
      condicoes: BASE.condicoes,
      desc: '1 proprietário, apartamento com unidade',
    },
  };
  for (const [nome, opcoes] of Object.entries(casos)) {
    const entrada = {
      proprietarios: opcoes.proprietarios,
      imovel: opcoes.imovel || BASE.imovel,
      condicoes: opcoes.condicoes || BASE.condicoes,
    };
    const { texto, avisos } = gerarTextoAutorizacaoVenda(entrada);
    const pdf = await gerarPdfContrato(texto);
    fs.writeFileSync(path.join(dir, nome), pdf);
    console.log(`${nome}: ${pdf.length} bytes (${opcoes.desc}) | avisos: ${avisos.map((a) => a.campo).join(', ') || 'nenhum'}`);
  }
})().catch((e) => { console.error(e.message); process.exit(1); });

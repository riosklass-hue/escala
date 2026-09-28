import { INITIAL_TURMAS, INITIAL_PROFESSORES } from './data/initialData';
import {
  calcularHorasAtuaisProfessor,
  calcularCompatibilidadeSubstitutos,
  calcularMetricasTurma,
  obterStatusDocenteNoTurno,
} from './services/riosEngine';

console.log('🧪 ===============================================');
console.log('🧪 INICIANDO TESTES AUTOMATIZADOS - SISTEMA RIOS');
console.log('🧪 ===============================================\n');

let totalTestes = 0;
let testesPassaram = 0;

function assert(condicao: boolean, descricao: string) {
  totalTestes++;
  if (condicao) {
    testesPassaram++;
    console.log(`✅ [PASSOU] ${descricao}`);
  } else {
    console.error(`❌ [FALHOU] ${descricao}`);
  }
}

// ----------------------------------------------------
// 1. TESTE DE INTEGRIDADE DOS DADOS INICIAIS
// ----------------------------------------------------
console.log('--- 1. Integridade de Dados ---');
assert(INITIAL_TURMAS.length > 0, `Turmas iniciais carregadas: ${INITIAL_TURMAS.length} turmas`);
assert(INITIAL_PROFESSORES.length > 0, `Professores iniciais carregados: ${INITIAL_PROFESSORES.length} professores`);

// Valida que toda turma tem componentes com horas > 0
const todasTurmasComComponentes = INITIAL_TURMAS.every(
  (t) => t.componentes && t.componentes.length > 0 && t.componentes.every((c) => c.cargaHoraria > 0)
);
assert(todasTurmasComComponentes, 'Todas as turmas possuem componentes curriculares com carga horária válida (> 0h)');

// ----------------------------------------------------
// 2. TESTE DE CÁLCULO DE HORAS DO PROFESSOR
// ----------------------------------------------------
console.log('\n--- 2. Cálculo de Horas e Alocação ---');
const prof1 = INITIAL_PROFESSORES[0];
const horasCalculadas = calcularHorasAtuaisProfessor(prof1.id, INITIAL_TURMAS);
assert(typeof horasCalculadas === 'number' && horasCalculadas >= 0, `Cálculo de horas ativas do professor ${prof1.nome}: ${horasCalculadas}h`);

// ----------------------------------------------------
// 3. TESTE DE COMPATIBILIDADE DE SUBSTITUTOS (MOTOR RIOS)
// ----------------------------------------------------
console.log('\n--- 3. Motor de Substituição Inteligente ---');
const primeiraTurma = INITIAL_TURMAS[0];
const primeiroComp = primeiraTurma.componentes[0];

const rankingSubstitutos = calcularCompatibilidadeSubstitutos(
  primeiraTurma,
  primeiroComp,
  INITIAL_PROFESSORES,
  INITIAL_TURMAS
);

assert(rankingSubstitutos.length > 0, `Ranking gerado com ${rankingSubstitutos.length} candidatos a substituição`);
assert(
  rankingSubstitutos[0].score >= rankingSubstitutos[rankingSubstitutos.length - 1].score,
  'Ranking de substitutos ordenado corretamente por pontuação decrescente (compatibilidade)'
);
assert(
  rankingSubstitutos.every((sub) => sub.professor.id !== primeiroComp.professorId),
  'O professor titular atual nunca é sugerido como seu próprio substituto'
);

// ----------------------------------------------------
// 4. TESTE DE MÉTRICAS DA TURMA (PROGRESSO MATRIZ)
// ----------------------------------------------------
console.log('\n--- 4. Métricas e Carga da Turma ---');
const metricas = calcularMetricasTurma(primeiraTurma);
assert(metricas.cargaTotal > 0, `Carga horária total da turma calculada: ${metricas.cargaTotal}h`);
assert(
  metricas.cargaMinistrada + metricas.cargaEmAndamento + metricas.cargaPendente === metricas.cargaTotal,
  'Soma das cargas (Ministrada + Em Andamento + Pendente) bate 100% com a carga total da matriz'
);
assert(
  metricas.percentualConcluido >= 0 && metricas.percentualConcluido <= 100,
  `Percentual concluído válido: ${metricas.percentualConcluido}%`
);

// ----------------------------------------------------
// 5. TESTE DE STATUS DOCENTE POR TURNO E DIA
// ----------------------------------------------------
console.log('\n--- 5. Ocupação e Conflito de Grade ---');
const statusProf = obterStatusDocenteNoTurno(prof1, INITIAL_TURMAS, 'Segunda-feira', 'NOITE');
assert(
  statusProf.status === 'EM AULA' || statusProf.status === 'LIVRE' || statusProf.status === 'INDISPONÍVEL' || statusProf.status === 'EM OUTRA ESCOLA',
  `Status de ocupação retornado com enum válido: ${statusProf.status}`
);

// ----------------------------------------------------
// 6. TESTE DE AUDITORIA DE REGRAS INVIOLÁVEIS DO RIOS
// ----------------------------------------------------
console.log('\n--- 6. Validação das Regras Invioláveis do RIOS ---');
// Regra 1: Código de turma não pode ser vazio
const codigosValidos = INITIAL_TURMAS.every((t) => t.codigo && t.codigo.trim().length > 0);
assert(codigosValidos, 'Regra: Toda turma possui código identificador fixo');

// Regra 2: Cada turma possui horário e turno definidos
const turnosValidos = INITIAL_TURMAS.every((t) => ['MANHÃ', 'TARDE', 'NOITE', 'INTEGRAL'].includes(t.turno));
assert(turnosValidos, 'Regra: Toda turma opera em turno escolar padronizado');

// Regra 3: Professores possuem carga máxima válida
const cargasValidas = INITIAL_PROFESSORES.every((p) => p.cargaHorariaMaxima > 0);
assert(cargasValidas, 'Regra: Todos os docentes possuem teto de carga horária máxima estipulado');

// ----------------------------------------------------
// RESULTADO FINAL
// ----------------------------------------------------
console.log('\n===============================================');
console.log(`📊 RESULTADO FINAL: ${testesPassaram}/${totalTestes} testes aprovados.`);
console.log('===============================================\n');

if (testesPassaram !== totalTestes) {
  process.exit(1);
}

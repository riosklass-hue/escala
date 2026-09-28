export interface UnidadeCurricularMatriz {
  id?: string;
  nome: string;
  cargaHoraria: number;
}

export interface MatrizCursoOficial {
  id: string;
  nome: string;
  sigla: string;
  modalidade: string;
  cargaHorariaTotal: number;
  descricao: string;
  unidades: UnidadeCurricularMatriz[];
}

export const STORAGE_KEY_MATRIZES = 'rios_matrizes_cursos_v1';

export function obterMatrizesIniciais(): MatrizCursoOficial[] {
  if (typeof window === 'undefined') return MATRIZES_CURSOS_OFICIAIS;
  try {
    const saved = localStorage.getItem(STORAGE_KEY_MATRIZES);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // fallback
  }
  return MATRIZES_CURSOS_OFICIAIS;
}

export function salvarMatrizesNoStorage(matrizes: MatrizCursoOficial[]): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_MATRIZES, JSON.stringify(matrizes));
    } catch {
      // ignore
    }
  }
}

/**
 * Matrizes Curriculares Oficiais (800h)
 * Extraídas diretamente dos Planos de Curso Oficiais do Governo do Estado / Educação Profissional de Rondônia
 */
export const MATRIZES_CURSOS_OFICIAIS: MatrizCursoOficial[] = [
  {
    id: 'matriz-logistica',
    nome: 'Técnico em Logística',
    sigla: 'LOG',
    modalidade: 'Concomitante e Subsequente',
    cargaHorariaTotal: 800,
    descricao: 'Matriz I Curricular – Concomitante e Subsequente Logística (800h)',
    unidades: [
      { nome: 'Introdução a inteligência artificial', cargaHoraria: 20 },
      { nome: 'Matemática aplicada', cargaHoraria: 40 },
      { nome: 'Informática Aplicada', cargaHoraria: 40 },
      { nome: 'Comunicação e Expressão', cargaHoraria: 40 },
      { nome: 'Fundamentos da Logística', cargaHoraria: 40 },
      { nome: 'Ética, Saúde e Segurança no trabalho', cargaHoraria: 40 },
      { nome: 'Introdução à Logística', cargaHoraria: 40 },
      { nome: 'Gestão de Materiais e Logística', cargaHoraria: 40 },
      { nome: 'Logística Empresarial', cargaHoraria: 40 },
      { nome: 'Gestão da Qualidade', cargaHoraria: 40 },
      { nome: 'Gestão de Suprimentos', cargaHoraria: 60 },
      { nome: 'Gestão da Produção', cargaHoraria: 40 },
      { nome: 'Gestão da Distribuição e Transporte', cargaHoraria: 40 },
      { nome: 'Logística reversa e o impacto ambiental', cargaHoraria: 40 },
      { nome: 'Custos Logísticos', cargaHoraria: 20 },
      { nome: 'Gestão Mercadológica e Canais de Marketing', cargaHoraria: 60 },
      { nome: 'Logística Internacional', cargaHoraria: 40 },
      { nome: 'Legislação Aplicado à Logística', cargaHoraria: 20 },
      { nome: 'Projeto Integrador', cargaHoraria: 100 },
    ],
  },
  {
    id: 'matriz-secretaria-escolar',
    nome: 'Técnico em Secretaria Escolar',
    sigla: 'SEC',
    modalidade: 'Concomitante e Subsequente',
    cargaHorariaTotal: 800,
    descricao: 'Matriz I Curricular Concomitante e Subsequente Secretaria Escolar (800h)',
    unidades: [
      { nome: 'Gestão Escolar', cargaHoraria: 40 },
      { nome: 'Planejamento e Organização do Ambiente Escolar', cargaHoraria: 40 },
      { nome: 'Informática Aplicada', cargaHoraria: 40 },
      { nome: 'Técnicas de Redação e Arquivo', cargaHoraria: 40 },
      { nome: 'Gestão de Pessoas', cargaHoraria: 40 },
      { nome: 'Fundamentos da Administração', cargaHoraria: 40 },
      { nome: 'Rotina Escolar: Documentação, Arquivo e Atendimento', cargaHoraria: 40 },
      { nome: 'Secretariado', cargaHoraria: 40 },
      { nome: 'História da Educação', cargaHoraria: 40 },
      { nome: 'Organização do Sistema Educacional Brasileiro', cargaHoraria: 40 },
      { nome: 'Homem, Pensamento e Cultura: abordagem filosófica e antropológica', cargaHoraria: 40 },
      { nome: 'Currículo e Práticas Pedagógicas', cargaHoraria: 40 },
      { nome: 'Legislação Escolar', cargaHoraria: 20 },
      { nome: 'Gestão Financeira e Patrimonial Escolar', cargaHoraria: 40 },
      { nome: 'Contabilidade na Escola', cargaHoraria: 40 },
      { nome: 'Estatística', cargaHoraria: 20 },
      { nome: 'Avaliação de Projetos', cargaHoraria: 40 },
      { nome: 'Introdução a Inteligência Artificial', cargaHoraria: 20 },
      { nome: 'Fundamentos para elaboração de memorial', cargaHoraria: 40 },
      { nome: 'Projeto Integrador - PI', cargaHoraria: 100 },
    ],
  },
  {
    id: 'matriz-recursos-humanos',
    nome: 'Técnico em Recursos Humanos',
    sigla: 'RH',
    modalidade: 'Concomitante e Subsequente',
    cargaHorariaTotal: 800,
    descricao: 'Plano de Curso – Técnico em Recursos Humanos (800h)',
    unidades: [
      { nome: 'Planejamento, Recrutamento e Seleção', cargaHoraria: 40 },
      { nome: 'Gestão de Desempenho e Retenção de Talentos', cargaHoraria: 40 },
      { nome: 'Gerenciamento de Rotinas Administrativas', cargaHoraria: 40 },
      { nome: 'Tendências e Cenários em Recursos Humanos', cargaHoraria: 40 },
      { nome: 'Prática de Departamento Pessoal', cargaHoraria: 40 },
      { nome: 'Legislação e Relações Trabalhistas', cargaHoraria: 40 },
      { nome: 'Legislação Previdenciária e Tributária', cargaHoraria: 40 },
      { nome: 'Gestão da Qualidade', cargaHoraria: 40 },
      { nome: 'Cálculo de folha de pagamento', cargaHoraria: 40 },
      { nome: 'Ética, Saúde e Segurança no trabalho', cargaHoraria: 40 },
      { nome: 'Comunicação e Expressão', cargaHoraria: 40 },
      { nome: 'Inglês Instrumental', cargaHoraria: 20 },
      { nome: 'Psicologia e Processo de Motivação e Liderança', cargaHoraria: 40 },
      { nome: 'Gestão Estratégica de Resultado', cargaHoraria: 60 },
      { nome: 'Informática Aplicada', cargaHoraria: 40 },
      { nome: 'Introdução a Inteligência Artificial', cargaHoraria: 20 },
      { nome: 'Desenvolvimento Humano Organizacional', cargaHoraria: 20 },
      { nome: 'Teoria das relações Humanas', cargaHoraria: 40 },
      { nome: 'Prática de Competências Sociais', cargaHoraria: 20 },
      { nome: 'Projeto Integrador - PI', cargaHoraria: 100 },
    ],
  },
  {
    id: 'matriz-comercio',
    nome: 'Técnico em Comércio',
    sigla: 'COM',
    modalidade: 'Concomitante e Subsequente',
    cargaHorariaTotal: 800,
    descricao: 'Plano de Curso – Técnico em Comércio (800h)',
    unidades: [
      { nome: 'Planejamento Empresarial e Estrutura Organizacional', cargaHoraria: 20 },
      { nome: 'Psicologia Comportamental', cargaHoraria: 20 },
      { nome: 'Empreendedorismo', cargaHoraria: 40 },
      { nome: 'Logística Empresarial e Reversa', cargaHoraria: 40 },
      { nome: 'Informática Aplicada', cargaHoraria: 40 },
      { nome: 'Introdução a Inteligência Artificial', cargaHoraria: 20 },
      { nome: 'Legislação Comercial e Tributária', cargaHoraria: 20 },
      { nome: 'Cálculos Financeiros e Estatísticos', cargaHoraria: 40 },
      { nome: 'Controles Financeiros e Contábeis', cargaHoraria: 40 },
      { nome: 'Técnicas de Negociação', cargaHoraria: 40 },
      { nome: 'E-Commerce', cargaHoraria: 40 },
      { nome: 'Ética e Cidadania Organizacional', cargaHoraria: 20 },
      { nome: 'Gestão de Vendas', cargaHoraria: 40 },
      { nome: 'Planejamento do Ponto de Vendas', cargaHoraria: 40 },
      { nome: 'Linguagem, Trabalho e Tecnologia', cargaHoraria: 20 },
      { nome: 'Gestão Comercial', cargaHoraria: 40 },
      { nome: 'Gestão da Qualidade', cargaHoraria: 40 },
      { nome: 'Gestão de Compras e Estoques', cargaHoraria: 40 },
      { nome: 'Gestão de Marketing', cargaHoraria: 40 },
      { nome: 'Gestão de Pessoas', cargaHoraria: 40 },
      { nome: 'Comércio Internacional', cargaHoraria: 20 },
      { nome: 'Projeto Integrador - PI', cargaHoraria: 100 },
    ],
  },
  {
    id: 'matriz-administracao',
    nome: 'Técnico em Administração',
    sigla: 'ADM',
    modalidade: 'Concomitante e Subsequente',
    cargaHorariaTotal: 800,
    descricao: 'Plano de Curso – Técnico em Administração (800h)',
    unidades: [
      { nome: 'Fundamentos da Administração', cargaHoraria: 40 },
      { nome: 'Organização, Sistema e Métodos', cargaHoraria: 40 },
      { nome: 'Gestão da Qualidade', cargaHoraria: 40 },
      { nome: 'Gestão de Materiais e Logística', cargaHoraria: 40 },
      { nome: 'Contabilidade Básica', cargaHoraria: 40 },
      { nome: 'Gestão Financeira e Orçamentária', cargaHoraria: 40 },
      { nome: 'Cálculos Financeiros e Estatísticos', cargaHoraria: 40 },
      { nome: 'Gestão de Custo', cargaHoraria: 40 },
      { nome: 'Comunicação e Expressão', cargaHoraria: 40 },
      { nome: 'Ética, Saúde e Segurança no Trabalho', cargaHoraria: 40 },
      { nome: 'Empreendedorismo', cargaHoraria: 40 },
      { nome: 'Informática Aplicada', cargaHoraria: 40 },
      { nome: 'Introdução a inteligência artificial', cargaHoraria: 20 },
      { nome: 'Matemática Aplicada', cargaHoraria: 40 },
      { nome: 'Gestão de Pessoas', cargaHoraria: 40 },
      { nome: 'Gestão de Marketing', cargaHoraria: 40 },
      { nome: 'Gestão da Produção', cargaHoraria: 40 },
      { nome: 'Planejamento Estratégico', cargaHoraria: 40 },
      { nome: 'Projeto Integrador – PI', cargaHoraria: 100 },
    ],
  },
];

/**
 * Busca a matriz correspondente pelo nome do curso (com tolerância a variações)
 */
export function buscarMatrizPorNomeCurso(nomeCurso: string): MatrizCursoOficial | undefined {
  if (!nomeCurso) return undefined;
  const normalizado = nomeCurso.toLowerCase().trim();

  if (normalizado.includes('logística') || normalizado.includes('logistica')) {
    return MATRIZES_CURSOS_OFICIAIS.find((m) => m.id === 'matriz-logistica');
  }
  if (normalizado.includes('secretaria') || normalizado.includes('secretariado')) {
    return MATRIZES_CURSOS_OFICIAIS.find((m) => m.id === 'matriz-secretaria-escolar');
  }
  if (normalizado.includes('recursos humanos') || normalizado.includes(' rh')) {
    return MATRIZES_CURSOS_OFICIAIS.find((m) => m.id === 'matriz-recursos-humanos');
  }
  if (normalizado.includes('comércio') || normalizado.includes('comercio')) {
    return MATRIZES_CURSOS_OFICIAIS.find((m) => m.id === 'matriz-comercio');
  }
  if (normalizado.includes('administração') || normalizado.includes('administracao') || normalizado.includes(' adm')) {
    return MATRIZES_CURSOS_OFICIAIS.find((m) => m.id === 'matriz-administracao');
  }

  return undefined;
}

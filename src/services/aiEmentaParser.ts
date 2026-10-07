/**
 * Serviço Inteligente de Processamento e Organização de Ementas Curriculares com IA
 * Suporta Gemini 3.8 Flash, OpenAI GPT e Motor Heurístico Nativo de Fallback
 */

export interface UnidadeCurricularIA {
  id?: string;
  nome: string;
  cargaHoraria: number;
  modulo?: string;
}

export interface EmentaProcessadaResultado {
  nome: string;
  sigla: string;
  modalidade: string;
  descricao: string;
  cargaHorariaTotal: number;
  unidades: UnidadeCurricularIA[];
  resumoIA: string;
  provider: 'gemini' | 'openai' | 'heuristica';
}

/**
 * Motor heurístico nativo: analisa texto desestruturado, linhas, numerações,
 * marcadores e valores de carga horária para extrair disciplinas mesmo offline.
 */
export function processarEmentaHeuristica(texto: string): EmentaProcessadaResultado {
  const linhas = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let nomeCurso = 'Novo Curso Técnico';
  let sigla = 'CURSO';
  let modalidade = 'Concomitante e Subsequente';
  let descricao = 'Matriz Curricular estruturada a partir da ementa do curso';

  // 1. Tenta identificar o nome do curso e a sigla nas primeiras linhas
  for (let i = 0; i < Math.min(linhas.length, 6); i++) {
    const l = linhas[i];
    if (/t[ée]cnico|enfermagem|inform[áa]tica|administra[çc]|recursos|log[íi]stica|edifica|seguran[çc]|farm[áa]cia|est[ée]tica|sa[úu]de|eletro|mec[âa]n/i.test(l)) {
      nomeCurso = l
        .replace(/^(curso\s+)?(t[ée]cnico\s+em\s+)?/i, 'Técnico em ')
        .replace(/\([A-Z]{2,6}\)/g, '')
        .replace(/[\-–:]\s*\d+.*$/i, '')
        .trim();
      break;
    }
  }

  // Tenta extrair sigla entre parênteses ou em caixa alta
  const siglaParenMatch = texto.match(/\(([A-Z]{2,6})\)/);
  if (siglaParenMatch) {
    sigla = siglaParenMatch[1];
  } else {
    const siglaMatch = texto.match(/\b([A-Z]{2,5})\b/);
    if (siglaMatch && !['PPC', 'MEC', 'EJA', 'PDF', 'DOC', 'TXT', 'CURSO'].includes(siglaMatch[1])) {
      sigla = siglaMatch[1];
    } else {
      const palavras = nomeCurso.replace(/t[ée]cnico|em|de|da|do|para/gi, '').trim().split(/\s+/);
      sigla = palavras.map((p) => p[0]?.toUpperCase()).join('').slice(0, 4) || 'TEC';
    }
  }

  // 2. Extrai disciplinas e cargas horárias
  const unidades: UnidadeCurricularIA[] = [];
  const regexCarga = /(?:[\(\[\-–:]\s*)?(\d{2,3})\s*(?:h(?:oras?)?|ch)\b[\)\]]?/i;

  linhas.forEach((linha, idx) => {
    // Ignora linhas que são cabeçalhos de curso ou seções
    if (/^(curso|matriz|ementa|plano de curso|sum[áa]rio|m[óo]dulo\s+\w+|per[íi]odo\s+\d+|semestre\s+\d+|carga hor[áa]ria|componente curricular|grade curricular)/i.test(linha)) {
      return;
    }
    if (linha.toLowerCase().includes(nomeCurso.toLowerCase())) {
      return;
    }

    // Procura valor de carga horária na linha
    let cargaHoraria = 40;
    const matchC = linha.match(regexCarga);
    if (matchC) {
      const parsed = parseInt(matchC[1], 10);
      if (parsed >= 10 && parsed <= 400) {
        cargaHoraria = parsed;
      }
    }

    // Limpa a linha para obter o nome limpo da disciplina
    let nomeLimpo = linha
      .replace(regexCarga, '')
      .replace(/^[\d\.\-\–\*\•\)\(\[\]\s]+/, '')
      .replace(/[\(\)\[\]\:\-–\s]+$/, '')
      .trim();

    // Se a linha tem tamanho suficiente para ser uma disciplina (>= 4 caracteres)
    // e não é um texto longo de parágrafo institucional (> 90 caracteres)
    if (nomeLimpo.length >= 4 && nomeLimpo.length <= 85) {
      nomeLimpo = nomeLimpo.replace(/^(disciplina|componente|unidade|uc\s*\d*)\s*[:\-–]?\s*/i, '').trim();

      if (nomeLimpo.length >= 3 && !unidades.some((u) => u.nome.toLowerCase() === nomeLimpo.toLowerCase())) {
        unidades.push({
          id: `uc-auto-${Date.now()}-${idx}`,
          nome: nomeLimpo,
          cargaHoraria,
        });
      }
    }
  });

  // Se não encontrou nenhuma com regex rígido, divide por linhas com tamanho de disciplina
  if (unidades.length === 0) {
    linhas.slice(1, 15).forEach((linha, idx) => {
      if (linha.length >= 5 && linha.length <= 70) {
        unidades.push({
          id: `uc-auto-${Date.now()}-${idx}`,
          nome: linha.replace(/^[\d\.\-\*\s]+/, '').trim(),
          cargaHoraria: 40,
        });
      }
    });
  }

  const cargaHorariaTotal = unidades.reduce((acc, u) => acc + u.cargaHoraria, 0) || 800;

  return {
    nome: nomeCurso,
    sigla: sigla.toUpperCase(),
    modalidade,
    descricao: `${nomeCurso} – Matriz estruturada com ${unidades.length} disciplinas (${cargaHorariaTotal}h)`,
    cargaHorariaTotal,
    unidades,
    resumoIA: `Foram identificadas e organizadas ${unidades.length} disciplinas com carga horária total de ${cargaHorariaTotal}h.`,
    provider: 'heuristica',
  };
}

/**
 * Consulta a rota de IA no backend ou executa fallback transparente
 */
export async function processarEmentaComIA(
  textoEmenta: string,
  instrucoes?: string
): Promise<EmentaProcessadaResultado> {
  const textoLimpo = textoEmenta.trim();
  if (!textoLimpo) {
    throw new Error('Por favor, informe ou cole o texto da ementa curricular.');
  }

  try {
    const res = await fetch('/api/ai/parse-ementa', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        texto: textoLimpo,
        instrucoes: instrucoes || '',
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.curso) {
        return {
          nome: data.curso.nome || 'Novo Curso Técnico',
          sigla: (data.curso.sigla || 'CURSO').toUpperCase(),
          modalidade: data.curso.modalidade || 'Concomitante e Subsequente',
          descricao: data.curso.descricao || '',
          cargaHorariaTotal: Number(data.curso.cargaHorariaTotal) || 800,
          unidades: Array.isArray(data.curso.unidades)
            ? data.curso.unidades.map((u: any, idx: number) => ({
                id: `uc-ai-${Date.now()}-${idx}`,
                nome: u.nome || `Disciplina ${idx + 1}`,
                cargaHoraria: Number(u.cargaHoraria) || 40,
                modulo: u.modulo || undefined,
              }))
            : [],
          resumoIA: data.curso.resumoIA || 'Ementa analisada e organizada com Inteligência Artificial.',
          provider: data.provider || 'gemini',
        };
      }
    }
  } catch (err) {
    console.warn('[RIOS AI] Servidor de IA indisponível, utilizando motor de análise nativo:', err);
  }

  // Fallback heurístico inteligente
  return processarEmentaHeuristica(textoLimpo);
}

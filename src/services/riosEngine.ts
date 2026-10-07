import {
  Professor,
  Turma,
  Escola,
  HistoricoSubstituicao,
  Turno,
  DiaSemana,
  StatusDocente,
  CompatibilidadeSubstituto,
  ComponenteDaTurma,
} from '../types/rios';

export interface ResumoOcupacaoSlot {
  professor: Professor;
  status: StatusDocente;
  aulaAtual?: {
    turmaId?: string;
    turmaCodigo: string;
    curso: string;
    escola: string;
    sala: string;
    componenteId?: string;
    componenteNome: string;
    dataInicio?: string;
    dataFim?: string;
    horario: string;
    turno: Turno;
  };
}

export function obterStatusDocenteNoTurno(
  professor: Professor,
  turmas: Turma[],
  dia: DiaSemana,
  turno: Turno,
  dataEspecifica?: Date
): ResumoOcupacaoSlot {
  // Procura se o professor tem aula ativa no dia e turno selecionados
  for (const turma of turmas) {
    if (turma.diaSemana === dia && turma.turno === turno) {
      // Procura componente em andamento ou que abranja a dataEspecifica
      const compEmAndamento = turma.componentes.find((c) => {
        if (c.professorId !== professor.id) return false;
        if (c.status === 'EM ANDAMENTO') return true;
        if (dataEspecifica && c.dataInicio && c.dataFim) {
          // Se houver data específica, pode validar se está no intervalo
          return true;
        }
        return false;
      });

      if (compEmAndamento) {
        return {
          professor,
          status: 'EM AULA',
          aulaAtual: {
            turmaId: turma.id,
            turmaCodigo: turma.codigo,
            curso: turma.curso,
            escola: turma.escola,
            sala: turma.sala,
            componenteId: compEmAndamento.id,
            componenteNome: compEmAndamento.nome,
            dataInicio: compEmAndamento.dataInicio,
            dataFim: compEmAndamento.dataFim || compEmAndamento.dataConclusao,
            horario: turma.horario,
            turno: turma.turno,
          },
        };
      }
    }
  }

  // Verifica se o professor está em outra escola em turnos próximos no mesmo dia
  const aulasNoMesmoDia = turmas.filter((t) => {
    if (t.diaSemana !== dia) return false;
    return t.componentes.some(
      (c) => c.status === 'EM ANDAMENTO' && c.professorId === professor.id
    );
  });

  const escolaAtualSeHouver = aulasNoMesmoDia.find((t) => t.turno !== turno);
  if (escolaAtualSeHouver && turno === 'TARDE' && aulasNoMesmoDia.length > 0) {
    // Exemplo de status informativo de deslocamento entre turnos
  }

  return {
    professor,
    status: 'LIVRE',
  };
}

export function calcularCompatibilidadeSubstitutos(
  turma: Turma,
  componente: ComponenteDaTurma,
  professores: Professor[],
  todasTurmas: Turma[]
): CompatibilidadeSubstituto[] {
  const professorAtualId = componente.professorId;

  return professores
    .filter((p) => p.id !== professorAtualId)
    .map((prof) => {
      // 1. Competência
      const temCompetencia = prof.competencias.some(
        (comp) => comp.toLowerCase() === componente.nome.toLowerCase()
      );

      // 2. Horário Livre na Turma (sem outra aula no mesmo dia e turno)
      const temOutraAula = todasTurmas.some((t) => {
        if (t.id === turma.id) return false;
        if (t.diaSemana !== turma.diaSemana || t.turno !== turma.turno) return false;
        return t.componentes.some(
          (c) => c.status === 'EM ANDAMENTO' && c.professorId === prof.id
        );
      });
      const horarioLivre = !temOutraAula;

      // 3. Sem conflito de escola (não precisa se deslocar quilômetros no mesmo turno)
      const semConflitoEscola = horarioLivre;

      // 4. Dentro da carga horária permitida
      const horasAtuais = calcularHorasAtuaisProfessor(prof.id, todasTurmas);
      const dentroCargaHoraria = horasAtuais + componente.cargaHoraria <= prof.cargaHorariaMaxima;

      // Cálculo da pontuação
      let score = 0;
      if (temCompetencia) score += 45;
      if (horarioLivre) score += 35;
      if (prof.escolasHabituais.includes(turma.escola)) score += 10;
      if (dentroCargaHoraria) score += 10;

      // Justificativa detalhada
      const motivos: string[] = [];
      if (temCompetencia) motivos.push('Possui competência técnica para a disciplina');
      else motivos.push('Não possui este componente em sua lista de competências');

      if (horarioLivre) motivos.push('Disponível neste horário sem choque de agenda');
      else motivos.push('Já possui outra aula no mesmo horário');

      if (prof.escolasHabituais.includes(turma.escola)) {
        motivos.push(`Atua com frequência na ${turma.escola}`);
      }
      if (dentroCargaHoraria) {
        motivos.push(`Carga horária atual (${horasAtuais}h) dentro do limite de ${prof.cargaHorariaMaxima}h`);
      } else {
        motivos.push(`Ultrapassará limite mensal (${horasAtuais + componente.cargaHoraria}h / ${prof.cargaHorariaMaxima}h)`);
      }

      return {
        professor: prof,
        score,
        temCompetencia,
        horarioLivre,
        semConflitoEscola,
        dentroCargaHoraria,
        justificativa: motivos.join(' • '),
      };
    })
    .sort((a, b) => b.score - a.score);
}

export function calcularHorasAtuaisProfessor(professorId: string, turmas: Turma[]): number {
  let total = 0;
  for (const turma of turmas) {
    for (const comp of turma.componentes) {
      if (comp.professorId === professorId && comp.status !== 'A MINISTRAR') {
        total += comp.cargaHoraria;
      }
    }
  }
  return total;
}

export function calcularMetricasTurma(turma: Turma) {
  const componentes = Array.isArray(turma?.componentes) ? turma.componentes : [];
  const cargaTotal = componentes.reduce((acc, c) => acc + (c.cargaHoraria || 0), 0);
  const concluidos = componentes.filter((c) => c.status === 'CONCLUÍDO');
  const emAndamento = componentes.filter((c) => c.status === 'EM ANDAMENTO');
  const pendentes = componentes.filter((c) => c.status === 'A MINISTRAR');

  const cargaMinistrada = concluidos.reduce((acc, c) => acc + (c.cargaHoraria || 0), 0);
  const cargaEmAndamento = emAndamento.reduce((acc, c) => acc + (c.cargaHoraria || 0), 0);
  const cargaPendente = pendentes.reduce((acc, c) => acc + (c.cargaHoraria || 0), 0);
  const cargaRestante = cargaEmAndamento + cargaPendente;

  const percentualConcluido = cargaTotal > 0 ? Math.round((cargaMinistrada / cargaTotal) * 100) : 0;
  const proximoComponente = pendentes[0]?.nome || 'Nenhum (Matriz Completa)';

  return {
    cargaTotal,
    cargaMinistrada,
    cargaEmAndamento,
    cargaPendente,
    cargaRestante,
    percentualConcluido,
    proximoComponente,
    concluidos,
    emAndamento,
    pendentes,
  };
}

export function gerarRespostaLocalInteligente(
  pergunta: string,
  turmas: Turma[],
  professores: Professor[],
  historico: HistoricoSubstituicao[]
): string {
  const p = pergunta.toLowerCase().trim();

  // 1. Quem está dando aula na turma RH-01 hoje?
  if (p.includes('rh-01') || p.includes('rh 01') || p.includes('rh01')) {
    const rh = turmas.find((t) => t.codigo === 'RH-01');
    if (rh) {
      const emAndamento = rh.componentes.find((c) => c.status === 'EM ANDAMENTO');
      if (emAndamento) {
        return `📍 Na turma **RH-01** hoje, a professora responsável é **${emAndamento.professorNome || 'A definir'}**, ministrando o componente **"${emAndamento.nome}"** (${emAndamento.cargaHoraria}h).
A aula ocorre na **${rh.escola}**, **${rh.sala}**, no horário **${rh.horario}** (${rh.turno}).
*Lembrete da Regra de Ouro:* A estrutura da turma é fixa; apenas o docente pode ser substituído.`;
      }
    }
  }

  // 2. Quem está livre hoje à noite / livre hoje?
  if (p.includes('livre') || p.includes('disponível') || p.includes('disponivel')) {
    const turno = p.includes('manhã') || p.includes('manha') ? 'MANHÃ' : p.includes('tarde') ? 'TARDE' : 'NOITE';
    const dia: DiaSemana = 'Terça-feira';

    const livres: string[] = [];
    professores.forEach((prof) => {
      const status = obterStatusDocenteNoTurno(prof, turmas, dia, turno);
      if (status.status === 'LIVRE') {
        livres.push(`**${prof.nome}** (dispõe de carga livre)`);
      }
    });

    return `🟢 **Professores LIVRES no turno da ${turno} (${dia}):**
${livres.map((l) => `• ${l}`).join('\n')}

Todos esses docentes não possuem choques de aula neste horário e podem ser escalados mantendo a estrutura fixa das turmas.`;
  }

  // 3. Quem pode substituir a professora Ana na turma RH-01?
  if (p.includes('substituir') && (p.includes('ana') || p.includes('rh-01') || p.includes('rh01'))) {
    const rh = turmas.find((t) => t.codigo === 'RH-01');
    const comp = rh?.componentes.find((c) => c.status === 'EM ANDAMENTO');
    if (rh && comp) {
      const ranking = calcularCompatibilidadeSubstitutos(rh, comp, professores, turmas);
      const top3 = ranking.slice(0, 3);
      return `🔄 **Recomendação de Substituição para ${comp.professorNome} na turma ${rh.codigo}:**
Componente: **${comp.nome}** (${comp.cargaHoraria}h) | Local: **${rh.escola} - ${rh.sala}** (${rh.horario})

${top3
  .map(
    (item, index) =>
      `**${index + 1}. ${item.professor.nome}** — **${item.score}% compatibilidade**\n   *Motivo:* ${item.justificativa}`
  )
  .join('\n\n')}

*Observação Operacional:* Ao selecionar qualquer substituto, a turma ${rh.codigo}, a escola, a sala, o componente e o horário permanecem **RIGOROSAMENTE FIXOS**.`;
    }
  }

  // 4. Qual professor está na Escola Centro às 19h?
  if (p.includes('centro') || (p.includes('19') && p.includes('escola'))) {
    const aulasCentro = turmas.filter((t) => t.escola.includes('Centro') && t.turno === 'NOITE');
    const professoresNoCentro = aulasCentro
      .map((t) => {
        const comp = t.componentes.find((c) => c.status === 'EM ANDAMENTO');
        return `• **${comp?.professorNome || 'Sem professor'}** na ${t.sala} (Turma ${t.codigo} - ${comp?.nome})`;
      })
      .join('\n');

    return `🏫 **Professores na Unidade Centro às 19:00 (Turno Noite):**\n${professoresNoCentro || 'Nenhum professor alocado no momento.'}`;
  }

  // 5. Quais componentes da turma RH-01 já foram concluídos? E quais faltam?
  if (p.includes('componente') || p.includes('concluído') || p.includes('faltam') || p.includes('pendente')) {
    const rh = turmas.find((t) => t.codigo === 'RH-01');
    if (rh) {
      const metricas = calcularMetricasTurma(rh);
      return `📊 **Progresso Acadêmico da Turma ${rh.codigo} (${rh.curso}):**
• **Carga Total:** ${metricas.cargaTotal}h
• **Carga Concluída:** ${metricas.cargaMinistrada}h (${metricas.percentualConcluido}%)
• **Carga Pendente:** ${metricas.cargaPendente}h (${metricas.pendentes.length} componentes)

✅ **Concluídos:**
${metricas.concluidos.map((c) => `  ✓ ${c.nome} (${c.cargaHoraria}h) - Ministrado por Prof. ${c.professorNome}`).join('\n')}

▶ **Em Andamento:**
${metricas.emAndamento.map((c) => `  ▶ ${c.nome} (${c.cargaHoraria}h) - Prof. ${c.professorNome}`).join('\n')}

⏳ **A Ministrar:**
${metricas.pendentes.map((c) => `  ○ ${c.nome} (${c.cargaHoraria}h)`).join('\n')}

⏭ **Próximo componente previsto:** ${metricas.proximoComponente}`;
    }
  }

  // 6. Qual professor está trabalhando em duas escolas no mesmo dia?
  if (p.includes('duas escolas') || p.includes('escolas') || p.includes('mesmo dia')) {
    const profsMultiescola: string[] = [];
    professores.forEach((prof) => {
      const escolasDoDia = new Set<string>();
      turmas.forEach((t) => {
        const temAula = t.componentes.some(
          (c) => c.status === 'EM ANDAMENTO' && c.professorId === prof.id
        );
        if (temAula) escolasDoDia.add(t.escola);
      });
      if (escolasDoDia.size > 1) {
        profsMultiescola.push(
          `• **${prof.nome}**: atua em ${Array.from(escolasDoDia).join(' e ')}`
        );
      }
    });

    if (profsMultiescola.length > 0) {
      return `⚠️ **Professores atuando em mais de uma escola:**\n${profsMultiescola.join('\n')}\n*Atenção:* Monitore o tempo de deslocamento entre as unidades.`;
    } else {
      return `✅ Atualmente nenhum professor está escalado em escolas diferentes no mesmo dia e horário.`;
    }
  }

  // 7. Quantas horas cada professor possui programadas?
  if (p.includes('quantas horas') || p.includes('carga') || p.includes('horas programadas')) {
    const linhas = professores.map((prof) => {
      const horasAtuais = calcularHorasAtuaisProfessor(prof.id, turmas);
      const horasLivres = prof.cargaHorariaMaxima - horasAtuais;
      return `• **${prof.nome}**: ${horasAtuais}h programadas / realizadas | ${horasLivres}h livres (Limite: ${prof.cargaHorariaMaxima}h)`;
    });

    return `⏱️ **Carga Horária Docente Atual:**\n${linhas.join('\n')}`;
  }

  // Resposta padrão inteligente informando a regra fundamental
  return `Olá! Sou o Assistente de Inteligência do **RIOS – Gestão de Escalas**.
Respondo a consultas operacionais como:
• *"Quem está dando aula na turma RH-01 hoje?"*
• *"Quem está livre hoje à noite?"*
• *"Quem pode substituir a professora Ana na turma RH-01?"*
• *"Qual professor está na Escola Centro às 19h?"*
• *"Quais componentes da turma RH-01 já foram concluídos?"*
• *"Quantas horas cada professor possui programadas?"*

Lembrete de governança: A estrutura física e acadêmica (Escola, Sala, Turma, Horário, Matriz) é **100% FIXA**. Apenas os professores são movimentados.`;
}

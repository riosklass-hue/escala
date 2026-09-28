import { Turma, ComponenteDaTurma, ConflitoHorarioProfessor, DiaSemana } from '../types/rios';

/**
 * Converte strings de data como 'DD/MM/AAAA' ou 'AAAA-MM-DD' em objeto Date para comparação temporal
 */
export function parseDataBR(dataStr?: string): Date | null {
  if (!dataStr || typeof dataStr !== 'string') return null;
  const trimmed = dataStr.trim();
  if (!trimmed) return null;

  // Formato ISO: YYYY-MM-DD
  if (trimmed.includes('-')) {
    const parts = trimmed.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new Date(year, month, day);
      }
    }
  }

  // Formato Brasileiro: DD/MM/YYYY ou DD/MM
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/');
    if (parts.length === 2) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = new Date().getFullYear();
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new Date(year, month, day);
      }
    } else if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      let year = parseInt(parts[2], 10);
      if (year < 100) year += 2000;
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new Date(year, month, day);
      }
    }
  }

  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Formata um objeto Date no padrão brasileiro 'DD/MM/AAAA'
 */
export function formatarDataBR(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Extrai a quantidade de horas por dia a partir da string de horário (ex: "18:30 – 22:30" => 4)
 */
export function extrairHorasPorDia(horarioStr?: string): number {
  if (!horarioStr) return 4;
  const matches = horarioStr.match(/(\d{1,2})[:h](\d{0,2})\s*[-–—]\s*(\d{1,2})[:h](\d{0,2})/i);
  if (matches) {
    const h1 = parseInt(matches[1], 10);
    const m1 = parseInt(matches[2] || '0', 10);
    const h2 = parseInt(matches[3], 10);
    const m2 = parseInt(matches[4] || '0', 10);
    const minDiff = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (minDiff > 0) {
      const horas = Math.round(minDiff / 60);
      if (horas > 0 && horas <= 12) return horas;
    }
  }
  return 4; // padrão de 4 horas por encontro
}

/**
 * Calcula automaticamente a data de término de um componente
 * com base na carga horária (horas ministradas), desconsiderando
 * os finais de semana (sábados e domingos).
 *
 * @param dataInicioStr Data de início no formato DD/MM/AAAA ou AAAA-MM-DD
 * @param cargaHoraria Total de horas do componente (ex: 20, 40, 60, 80)
 * @param horasPorDia Horas de aula por dia letivo (padrão: 4 horas)
 * @returns Data de término formatada em DD/MM/AAAA
 */
export function calcularDataFimSemFinaisDeSemana(
  dataInicioStr?: string,
  cargaHoraria?: number,
  horasPorDia: number = 4
): string {
  if (!dataInicioStr) return '';
  const dtInicio = parseDataBR(dataInicioStr);
  if (!dtInicio || isNaN(dtInicio.getTime())) {
    return '';
  }

  const horas = Math.max(1, Number(cargaHoraria) || 0);
  const hDia = Math.max(1, Number(horasPorDia) || 4);
  const diasDeAulaNecessarios = Math.ceil(horas / hDia);

  const curr = new Date(dtInicio);

  // Se a data de início indicada for sábado (6) ou domingo (0), avança para a segunda-feira seguinte
  if (curr.getDay() === 6) {
    curr.setDate(curr.getDate() + 2);
  } else if (curr.getDay() === 0) {
    curr.setDate(curr.getDate() + 1);
  }

  // O primeiro dia letivo já é 'curr'.
  // Precisamos avançar mais (diasDeAulaNecessarios - 1) dias úteis sem contar sábados nem domingos.
  let diasContados = 1;
  while (diasContados < diasDeAulaNecessarios) {
    curr.setDate(curr.getDate() + 1);
    const dayOfWeek = curr.getDay();
    // 0 = Domingo, 6 = Sábado
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      diasContados++;
    }
  }

  return formatarDataBR(curr);
}

/**
 * Verifica se dois intervalos de datas se sobrepõem
 */
export function intervalosSobrepoem(
  inicioA?: string,
  fimA?: string,
  inicioB?: string,
  fimB?: string
): boolean {
  const dtInicioA = parseDataBR(inicioA);
  const dtFimA = parseDataBR(fimA) || dtInicioA;
  const dtInicioB = parseDataBR(inicioB);
  const dtFimB = parseDataBR(fimB) || dtInicioB;

  // Se não houver datas em algum dos lados, considera que pode haver sobreposição por precaução
  if (!dtInicioA || !dtInicioB) {
    return true;
  }

  const startA = dtInicioA.getTime();
  const endA = dtFimA ? dtFimA.getTime() : startA;
  const startB = dtInicioB.getTime();
  const endB = dtFimB ? dtFimB.getTime() : startB;

  return startA <= endB && endA >= startB;
}

interface ParametrosVerificacao {
  professorId?: string;
  professorNome?: string;
  dataInicio?: string;
  dataFim?: string;
  diaSemanaTurma: string;
  turnoTurma: string;
  horarioTurma: string;
  turmaIdAtual: string;
  componenteIdAtual?: string;
  todasTurmas: Turma[];
}

/**
 * Avalia se a alocação de um professor gerará choque de horário com outra turma
 */
export function verificarConflitoProfessor(
  params: ParametrosVerificacao
): ConflitoHorarioProfessor {
  const {
    professorId,
    professorNome,
    dataInicio,
    dataFim,
    diaSemanaTurma,
    turnoTurma,
    horarioTurma,
    turmaIdAtual,
    componenteIdAtual,
    todasTurmas,
  } = params;

  if (!professorId) {
    return {
      temConflito: false,
      tipo: 'CHOQUE_DIRETO',
      mensagem: '',
    };
  }

  for (const outraTurma of todasTurmas) {
    // Não compara com a mesma turma se estiver editando a mesma turma
    const isMesmaTurma = outraTurma.id === turmaIdAtual;

    for (const outroComp of outraTurma.componentes) {
      // Ignora o próprio componente
      if (isMesmaTurma && outroComp.id === componenteIdAtual) {
        continue;
      }

      // Verifica se o professor é o mesmo
      if (outroComp.professorId === professorId) {
        // Componentes CONCLUÍDOS no passado geralmente não conflitam com componentes futuros a menos que datas batam
        const compAtivo = outroComp.status === 'EM ANDAMENTO' || outroComp.status === 'A MINISTRAR' || outroComp.status === 'CONCLUÍDO';
        if (!compAtivo) continue;

        // Verifica sobreposição de datas (data início e fim)
        const temSobreposicaoDatas = intervalosSobrepoem(
          dataInicio,
          dataFim,
          outroComp.dataInicio,
          outroComp.dataFim || outroComp.dataConclusao
        );

        if (temSobreposicaoDatas) {
          const mesmoDiaSemana =
            outraTurma.diaSemana.toLowerCase().trim() ===
            diaSemanaTurma.toLowerCase().trim();

          const mesmoTurno =
            outraTurma.turno.toUpperCase().trim() ===
            turnoTurma.toUpperCase().trim();

          // 1. Choque Direto: mesmo dia da semana e mesmo turno/horário
          if (mesmoDiaSemana && mesmoTurno) {
            const nomeDocente = professorNome || outroComp.professorNome || 'Professor';
            const periodoOutro = outroComp.dataInicio && (outroComp.dataFim || outroComp.dataConclusao)
              ? `${outroComp.dataInicio} a ${outroComp.dataFim || outroComp.dataConclusao}`
              : outroComp.dataInicio || 'Período atual';

            return {
              temConflito: true,
              tipo: 'CHOQUE_DIRETO',
              turmaConflitante: outraTurma,
              componenteConflitante: outroComp,
              mensagem: `ALERTA CRÍTICO: O(A) Prof. ${nomeDocente} já está ministrando na Turma ${outraTurma.codigo} (${outraTurma.curso}) na mesma ${outraTurma.diaSemana} no turno ${outraTurma.turno} (${outraTurma.horario}) na ${outraTurma.escola} (${outraTurma.sala})!`,
              detalhes: {
                professorNome: nomeDocente,
                turmaCodigo: outraTurma.codigo,
                turmaCurso: outraTurma.curso,
                escola: outraTurma.escola,
                sala: outraTurma.sala,
                diaSemana: outraTurma.diaSemana,
                turno: outraTurma.turno,
                horario: outraTurma.horario,
                componenteNome: outroComp.nome,
                dataInicio: outroComp.dataInicio,
                dataFim: outroComp.dataFim || outroComp.dataConclusao,
              },
            };
          }

          // 2. Mesmo dia da semana em escolas/turnos diferentes (atenção de logística)
          if (mesmoDiaSemana && !mesmoTurno) {
            const nomeDocente = professorNome || outroComp.professorNome || 'Professor';
            return {
              temConflito: true,
              tipo: 'TURNO_DIFERENTE_MESMO_DIA',
              turmaConflitante: outraTurma,
              componenteConflitante: outroComp,
              mensagem: `ATENÇÃO DE LOGÍSTICA: O(A) Prof. ${nomeDocente} já leciona na mesma ${outraTurma.diaSemana} na Turma ${outraTurma.codigo} no turno ${outraTurma.turno} (${outraTurma.horario}) na ${outraTurma.escola}. Verifique a disponibilidade e o deslocamento.`,
              detalhes: {
                professorNome: nomeDocente,
                turmaCodigo: outraTurma.codigo,
                turmaCurso: outraTurma.curso,
                escola: outraTurma.escola,
                sala: outraTurma.sala,
                diaSemana: outraTurma.diaSemana,
                turno: outraTurma.turno,
                horario: outraTurma.horario,
                componenteNome: outroComp.nome,
                dataInicio: outroComp.dataInicio,
                dataFim: outroComp.dataFim || outroComp.dataConclusao,
              },
            };
          }
        }
      }
    }
  }

  return {
    temConflito: false,
    tipo: 'CHOQUE_DIRETO',
    mensagem: '',
  };
}

/**
 * Retorna todos os conflitos ativos para os componentes de uma turma
 */
export function detectarConflitosDaTurma(
  turma: Turma,
  todasTurmas: Turma[]
): Map<string, ConflitoHorarioProfessor> {
  const conflitos = new Map<string, ConflitoHorarioProfessor>();

  for (const comp of turma.componentes) {
    if (comp.professorId) {
      const conflito = verificarConflitoProfessor({
        professorId: comp.professorId,
        professorNome: comp.professorNome,
        dataInicio: comp.dataInicio,
        dataFim: comp.dataFim,
        diaSemanaTurma: turma.diaSemana,
        turnoTurma: turma.turno,
        horarioTurma: turma.horario,
        turmaIdAtual: turma.id,
        componenteIdAtual: comp.id,
        todasTurmas,
      });

      if (conflito.temConflito) {
        conflitos.set(comp.id, conflito);
      }
    }
  }

  return conflitos;
}

/**
 * Converte um objeto Date em DiaSemana (pt-BR)
 */
export function getDiaSemanaPorData(date: Date): DiaSemana | null {
  const dia = date.getDay(); // 0: Dom, 1: Seg, 2: Ter, 3: Qua, 4: Qui, 5: Sex, 6: Sáb
  switch (dia) {
    case 1:
      return 'Segunda-feira';
    case 2:
      return 'Terça-feira';
    case 3:
      return 'Quarta-feira';
    case 4:
      return 'Quinta-feira';
    case 5:
      return 'Sexta-feira';
    case 6:
      return 'Sábado';
    default:
      return null;
  }
}

/**
 * Verifica se uma data específica está dentro do intervalo [inicioStr, fimStr]
 */
export function isDataNoIntervalo(
  data: Date,
  inicioStr?: string,
  fimStr?: string
): boolean {
  const dtInicio = parseDataBR(inicioStr);
  const dtFim = parseDataBR(fimStr) || dtInicio;

  if (!dtInicio) return true;

  const target = new Date(data.getFullYear(), data.getMonth(), data.getDate()).getTime();
  const start = new Date(dtInicio.getFullYear(), dtInicio.getMonth(), dtInicio.getDate()).getTime();
  const end = dtFim
    ? new Date(dtFim.getFullYear(), dtFim.getMonth(), dtFim.getDate()).getTime()
    : start;

  return target >= start && target <= end;
}

/**
 * Retorna os dias da semana para uma data de referência
 */
export function getDiasDaSemana(
  dataReferencia: Date,
  incluirSabado: boolean = true
): Date[] {
  const curr = new Date(dataReferencia);
  const day = curr.getDay(); // 0 is Sunday, 1 is Monday
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(curr);
  monday.setDate(curr.getDate() + diff);

  const dias: Date[] = [];
  const totalDias = incluirSabado ? 6 : 5;
  for (let i = 0; i < totalDias; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dias.push(d);
  }
  return dias;
}

/**
 * Gera matriz de dias para a visão mensal do calendário
 */
export function getDiasDoMes(
  ano: number,
  mes: number // 0-indexed (0 = Jan, 8 = Set, etc.)
): { date: Date; isCurrentMonth: boolean; dayNumber: number }[] {
  const primeiroDiaDoMes = new Date(ano, mes, 1);
  const ultimoDiaDoMes = new Date(ano, mes + 1, 0);

  const dias: { date: Date; isCurrentMonth: boolean; dayNumber: number }[] = [];

  const diaSemanaInicio = primeiroDiaDoMes.getDay();
  for (let i = diaSemanaInicio - 1; i >= 0; i--) {
    const d = new Date(ano, mes, 1 - (i + 1));
    dias.push({
      date: d,
      isCurrentMonth: false,
      dayNumber: d.getDate(),
    });
  }

  const totalDiasNoMes = ultimoDiaDoMes.getDate();
  for (let d = 1; d <= totalDiasNoMes; d++) {
    const dataAtual = new Date(ano, mes, d);
    dias.push({
      date: dataAtual,
      isCurrentMonth: true,
      dayNumber: d,
    });
  }

  const resto = dias.length % 7;
  if (resto > 0) {
    const diasFaltando = 7 - resto;
    for (let i = 1; i <= diasFaltando; i++) {
      const d = new Date(ano, mes + 1, i);
      dias.push({
        date: d,
        isCurrentMonth: false,
        dayNumber: d.getDate(),
      });
    }
  }

  return dias;
}

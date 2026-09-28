import React, { useState, useMemo } from 'react';
import { Professor, Turma, Turno, DiaSemana, ComponenteDaTurma, AulaMinistradaRecord } from '../types/rios';
import { obterStatusDocenteNoTurno, calcularHorasAtuaisProfessor } from '../services/riosEngine';
import {
  parseDataBR,
  formatarDataBR,
  getDiasDaSemana,
  getDiasDoMes,
  getDiaSemanaPorData,
  isDataNoIntervalo,
} from '../utils/conflitoAgenda';
import {
  Calendar,
  Clock,
  School,
  Building,
  UserCheck,
  Award,
  AlertTriangle,
  CheckCircle2,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  ArrowRight,
  Sparkles,
  PlusCircle,
  FileCheck2,
  MapPin,
  Search,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  BarChart3,
  TrendingUp,
} from 'lucide-react';

interface ProfessorPorDiaViewProps {
  professores: Professor[];
  turmas: Turma[];
  aulasMinistradas: AulaMinistradaRecord[];
  selectedProfessorId?: string;
  onSelectProfessor: (id: string) => void;
  onOpenSubstituicao: (turma: Turma, componente: ComponenteDaTurma) => void;
  onRegistrarAulaMinistrada: (aula: Omit<AulaMinistradaRecord, 'id' | 'timestampRegistro'>) => void;
}

export type ModoVisualizacaoProfessor = 'SEMANAL' | 'MENSAL' | 'ANUAL' | 'DIARIO';

const MESES_NOMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

// Converte string 'YYYY-MM-DD' para DiaSemana
function getDiaSemanaFromDate(dateStr: string): DiaSemana {
  if (!dateStr) return 'Terça-feira';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return 'Terça-feira';

  const ano = parseInt(parts[0], 10);
  const mes = parseInt(parts[1], 10) - 1;
  const dia = parseInt(parts[2], 10);
  const data = new Date(ano, mes, dia);
  const dayIndex = data.getDay();

  switch (dayIndex) {
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
    case 0:
    default:
      return 'Segunda-feira';
  }
}

// Formata 'YYYY-MM-DD' para 'DD/MM/YYYY'
function formatarDataPtBr(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export const ProfessorPorDiaView: React.FC<ProfessorPorDiaViewProps> = ({
  professores,
  turmas,
  aulasMinistradas,
  selectedProfessorId,
  onSelectProfessor,
  onOpenSubstituicao,
  onRegistrarAulaMinistrada,
}) => {
  // Modo de visualização temporal: SEMANAL, MENSAL, ANUAL ou DIARIO
  const [modoVisualizacao, setModoVisualizacao] = useState<ModoVisualizacaoProfessor>('SEMANAL');

  const [selectedProfId, setSelectedProfId] = useState<string>(
    selectedProfessorId || professores[0]?.id || ''
  );

  // Estado da visão diária
  const [dataSelecionada, setDataSelecionada] = useState<string>('2026-09-10');

  // Estado da visão semanal (segunda-feira 07/09/2026)
  const [dataBaseSemana, setDataBaseSemana] = useState<Date>(() => new Date(2026, 8, 7));

  // Estado da visão mensal
  const [anoSelecionado, setAnoSelecionado] = useState<number>(2026);
  const [mesSelecionado, setMesSelecionado] = useState<number>(8); // 8 = Setembro

  // Estado da visão anual
  const [anoLetivo, setAnoLetivo] = useState<number>(2026);

  const [filtroTexto, setFiltroTexto] = useState<string>('');
  const [modalRegistroAberto, setModalRegistroAberto] = useState<{
    isOpen: boolean;
    turno: Turno;
    horario: string;
    turma: Turma | null;
    componente: ComponenteDaTurma | null;
  }>({
    isOpen: false,
    turno: 'NOITE',
    horario: '18:30 – 22:30',
    turma: null,
    componente: null,
  });

  const [conteudoMinistradoInput, setConteudoMinistradoInput] = useState<string>('');
  const [obsInput, setObsInput] = useState<string>('');

  const professor = professores.find((p) => p.id === selectedProfId) || professores[0];

  const turnosConfig: Array<{ turno: Turno; horarioPadrao: string; label: string }> = [
    { turno: 'MANHÃ', horarioPadrao: '07:30 – 11:30', label: 'Manhã (07:30 – 11:30)' },
    { turno: 'TARDE', horarioPadrao: '13:30 – 17:30', label: 'Tarde (13:30 – 17:30)' },
    { turno: 'NOITE', horarioPadrao: '18:30 – 22:30', label: 'Noite (18:30 – 22:30)' },
  ];

  // ==========================================
  // NAVEGAÇÃO TEMPORAL
  // ==========================================
  const avancarSemana = () => {
    setDataBaseSemana((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  };

  const retrocederSemana = () => {
    setDataBaseSemana((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  };

  const irSemanaAtual = () => {
    setDataBaseSemana(new Date(2026, 8, 7));
  };

  const avancarMes = () => {
    if (mesSelecionado === 11) {
      setMesSelecionado(0);
      setAnoSelecionado((prev) => prev + 1);
    } else {
      setMesSelecionado((prev) => prev + 1);
    }
  };

  const retrocederMes = () => {
    if (mesSelecionado === 0) {
      setMesSelecionado(11);
      setAnoSelecionado((prev) => prev - 1);
    } else {
      setMesSelecionado((prev) => prev - 1);
    }
  };

  // ==========================================
  // CÁLCULOS SEMANAIS
  // ==========================================
  const diasDaSemanaAtiva = useMemo(() => {
    return getDiasDaSemana(dataBaseSemana, true); // Segunda a Sábado
  }, [dataBaseSemana]);

  const intervaloSemanaLabel = useMemo(() => {
    if (diasDaSemanaAtiva.length === 0) return '';
    const inicio = formatarDataBR(diasDaSemanaAtiva[0]);
    const fim = formatarDataBR(diasDaSemanaAtiva[diasDaSemanaAtiva.length - 1]);
    return `Semana de ${inicio} a ${fim}`;
  }, [diasDaSemanaAtiva]);

  // Alocações do professor em cada dia da semana ativa
  const escalaSemanal = useMemo(() => {
    if (!professor) return [];

    return diasDaSemanaAtiva.map((dataDia) => {
      const diaNome = getDiaSemanaPorData(dataDia);
      const dataStr = formatarDataBR(dataDia);

      // Encontrar todas as turmas que têm aula neste dia da semana
      const aulasDoDiaNoDocente: Array<{
        turma: Turma;
        componente: ComponenteDaTurma;
        turno: Turno;
        horario: string;
        escola: string;
        sala: string;
        isVigenteNaData: boolean;
      }> = [];

      turmas.forEach((t) => {
        if (t.diaSemana === diaNome) {
          t.componentes.forEach((c) => {
            if (c.professorId === professor.id) {
              // Verifica se a data de hoje cai no intervalo do componente
              const vigente = isDataNoIntervalo(dataDia, c.dataInicio, c.dataFim || c.dataConclusao);
              if (vigente || c.status === 'EM ANDAMENTO') {
                aulasDoDiaNoDocente.push({
                  turma: t,
                  componente: c,
                  turno: t.turno,
                  horario: t.horario,
                  escola: t.escola,
                  sala: t.sala,
                  isVigenteNaData: vigente,
                });
              }
            }
          });
        }
      });

      const escolasDoDia = Array.from(new Set(aulasDoDiaNoDocente.map((a) => a.escola)));
      const temDeslocamentoMultiplasEscolas = escolasDoDia.length > 1;

      return {
        data: dataDia,
        dataStr,
        diaNome: diaNome || 'Dia Letivo',
        aulas: aulasDoDiaNoDocente,
        totalHoras: aulasDoDiaNoDocente.length * 4,
        escolas: escolasDoDia,
        temDeslocamentoMultiplasEscolas,
      };
    });
  }, [diasDaSemanaAtiva, professor, turmas]);

  const metricasSemanais = useMemo(() => {
    let totalAulas = 0;
    const escolasSet = new Set<string>();
    let diasComAula = 0;

    escalaSemanal.forEach((dia) => {
      if (dia.aulas.length > 0) {
        diasComAula++;
        totalAulas += dia.aulas.length;
        dia.escolas.forEach((e) => escolasSet.add(e));
      }
    });

    const totalHoras = totalAulas * 4;
    const remuneracaoSemanal = totalHoras * (professor?.valorHora || 0);

    return {
      totalAulas,
      totalHoras,
      diasComAula,
      remuneracaoSemanal,
      escolas: Array.from(escolasSet),
    };
  }, [escalaSemanal, professor]);

  // ==========================================
  // CÁLCULOS MENSAIS
  // ==========================================
  const diasDoMesMatriz = useMemo(() => {
    return getDiasDoMes(anoSelecionado, mesSelecionado);
  }, [anoSelecionado, mesSelecionado]);

  const metricasMensais = useMemo(() => {
    if (!professor) {
      return { totalAulasMes: 0, totalHorasMes: 0, valorEstimadoMes: 0, turmasAtivas: [], diasComAula: 0 };
    }

    let totalAulas = 0;
    let diasComAulaCount = 0;
    const turmasAtivasSet = new Set<string>();

    diasDoMesMatriz.forEach((item) => {
      if (!item.isCurrentMonth) return;
      const diaNome = getDiaSemanaPorData(item.date);
      if (!diaNome) return; // Domingo

      let temAulaNesteDia = false;
      turmas.forEach((t) => {
        if (t.diaSemana === diaNome) {
          t.componentes.forEach((c) => {
            if (c.professorId === professor.id) {
              const vigente = isDataNoIntervalo(item.date, c.dataInicio, c.dataFim || c.dataConclusao);
              if (vigente || c.status === 'EM ANDAMENTO') {
                totalAulas++;
                temAulaNesteDia = true;
                turmasAtivasSet.add(t.codigo);
              }
            }
          });
        }
      });
      if (temAulaNesteDia) diasComAulaCount++;
    });

    const totalHoras = totalAulas * 4;
    const valorEstimado = totalHoras * professor.valorHora;
    const percentualCargaMaxima = Math.min(
      100,
      Math.round((totalHoras / (professor.cargaHorariaMaxima || 80)) * 100)
    );

    return {
      totalAulasMes: totalAulas,
      totalHorasMes: totalHoras,
      valorEstimadoMes: valorEstimado,
      turmasAtivas: Array.from(turmasAtivasSet),
      diasComAula: diasComAulaCount,
      percentualCargaMaxima,
    };
  }, [diasDoMesMatriz, professor, turmas]);

  // ==========================================
  // CÁLCULOS ANUAIS
  // ==========================================
  const metricasAnuais = useMemo(() => {
    if (!professor) {
      return { totalHorasAno: 0, totalAulasAno: 0, valorEstimadoAno: 0, mesesDetalhados: [] };
    }

    const mesesDetalhados: Array<{
      mesIndex: number;
      mesNome: string;
      totalAulas: number;
      totalHoras: number;
      turmas: string[];
    }> = [];

    let totalHorasAno = 0;
    let totalAulasAno = 0;

    for (let m = 0; m < 12; m++) {
      const diasMatriz = getDiasDoMes(anoLetivo, m);
      let aulasNoMes = 0;
      const turmasMesSet = new Set<string>();

      diasMatriz.forEach((item) => {
        if (!item.isCurrentMonth) return;
        const diaNome = getDiaSemanaPorData(item.date);
        if (!diaNome) return;

        turmas.forEach((t) => {
          if (t.diaSemana === diaNome) {
            t.componentes.forEach((c) => {
              if (c.professorId === professor.id) {
                const vigente = isDataNoIntervalo(item.date, c.dataInicio, c.dataFim || c.dataConclusao);
                if (vigente || c.status === 'EM ANDAMENTO') {
                  aulasNoMes++;
                  turmasMesSet.add(t.codigo);
                }
              }
            });
          }
        });
      });

      const horasMes = aulasNoMes * 4;
      totalAulasAno += aulasNoMes;
      totalHorasAno += horasMes;

      mesesDetalhados.push({
        mesIndex: m,
        mesNome: MESES_NOMES[m],
        totalAulas: aulasNoMes,
        totalHoras: horasMes,
        turmas: Array.from(turmasMesSet),
      });
    }

    const valorEstimadoAno = totalHorasAno * professor.valorHora;

    return {
      totalHorasAno,
      totalAulasAno,
      valorEstimadoAno,
      mesesDetalhados,
    };
  }, [anoLetivo, professor, turmas]);

  // ==========================================
  // CÁLCULOS DIÁRIOS
  // ==========================================
  const diaDaSemanaDiario = useMemo(() => {
    return getDiaSemanaFromDate(dataSelecionada);
  }, [dataSelecionada]);

  const aulasDoDia = useMemo(() => {
    if (!professor) return [];

    const resultado: Array<{
      turno: Turno;
      horario: string;
      turma: Turma;
      componente: ComponenteDaTurma;
      escola: string;
      sala: string;
      jaRegistradaComoMinistrada: boolean;
    }> = [];

    turmas.forEach((t) => {
      if (t.diaSemana === diaDaSemanaDiario) {
        t.componentes.forEach((c) => {
          if (c.professorId === professor.id && c.status === 'EM ANDAMENTO') {
            const dataPt = formatarDataPtBr(dataSelecionada);
            const jaRegistrada = aulasMinistradas.some(
              (am) =>
                am.professorId === professor.id &&
                am.turmaCodigo === t.codigo &&
                am.componenteNome === c.nome &&
                am.data === dataPt
            );

            resultado.push({
              turno: t.turno,
              horario: t.horario,
              turma: t,
              componente: c,
              escola: t.escola,
              sala: t.sala,
              jaRegistradaComoMinistrada: jaRegistrada,
            });
          }
        });
      }
    });

    return resultado;
  }, [professor, turmas, diaDaSemanaDiario, dataSelecionada, aulasMinistradas]);

  const escolasNoDia = useMemo(() => {
    const escolas = new Set<string>();
    aulasDoDia.forEach((a) => escolas.add(a.escola));
    return Array.from(escolas);
  }, [aulasDoDia]);

  const temDeslocamentoMultiplasEscolasDiario = escolasNoDia.length > 1;
  const horasTotalNoDia = aulasDoDia.length * 4;

  const historicoNoDia = useMemo(() => {
    const dataPt = formatarDataPtBr(dataSelecionada);
    return aulasMinistradas.filter(
      (a) => a.professorId === professor?.id && a.data === dataPt
    );
  }, [aulasMinistradas, professor, dataSelecionada]);

  // Lista de professores filtrados
  const professoresFiltrados = useMemo(() => {
    if (!filtroTexto) return professores;
    const termo = filtroTexto.toLowerCase();
    return professores.filter(
      (p) =>
        p.nome.toLowerCase().includes(termo) ||
        p.competencias.some((c) => c.toLowerCase().includes(termo)) ||
        p.escolasHabituais.some((e) => e.toLowerCase().includes(termo))
    );
  }, [professores, filtroTexto]);

  const handleSalvarRegistroAula = () => {
    if (!modalRegistroAberto.turma || !modalRegistroAberto.componente || !professor) return;

    const dataPt = formatarDataPtBr(dataSelecionada);

    onRegistrarAulaMinistrada({
      data: dataPt,
      horario: modalRegistroAberto.horario,
      turno: modalRegistroAberto.turno,
      diaSemana: diaDaSemanaDiario,
      turmaCodigo: modalRegistroAberto.turma.codigo,
      curso: modalRegistroAberto.turma.curso,
      componenteNome: modalRegistroAberto.componente.nome,
      horasMinistradas: 4,
      professorId: professor.id,
      professorNome: professor.nome,
      escola: modalRegistroAberto.turma.escola,
      sala: modalRegistroAberto.turma.sala,
      conteudoMinistrado:
        conteudoMinistradoInput || 'Aula presencial ministrada conforme o plano de curso.',
      observacoes: obsInput || 'Registro confirmado pela coordenação acadêmica.',
      status: 'CONFIRMADA',
      registradoPor: 'Coordenação Acadêmica (RIOS)',
    });

    setModalRegistroAberto({
      isOpen: false,
      turno: 'NOITE',
      horario: '',
      turma: null,
      componente: null,
    });
    setConteudoMinistradoInput('');
    setObsInput('');
  };

  if (!professor) return null;

  return (
    <div className="space-y-6">
      {/* Top Header Card: Title, View Switcher & Period Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-indigo-50 text-indigo-700">
                {modoVisualizacao === 'SEMANAL' && <CalendarDays className="w-5 h-5" />}
                {modoVisualizacao === 'MENSAL' && <CalendarRange className="w-5 h-5" />}
                {modoVisualizacao === 'ANUAL' && <BarChart3 className="w-5 h-5" />}
                {modoVisualizacao === 'DIARIO' && <CalendarCheck className="w-5 h-5" />}
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900 leading-tight">
                  Visão do Professor (Semana / Mês / Ano)
                </h2>
                <p className="text-xs text-slate-500">
                  Acompanhe a alocação e carga horária docente por Semana, Mês, Ano ou Dia específico.
                </p>
              </div>
            </div>
          </div>

          {/* Temporal Perspective Selector Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                id="btn-modo-semanal"
                onClick={() => setModoVisualizacao('SEMANAL')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  modoVisualizacao === 'SEMANAL'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Visão Semanal</span>
              </button>

              <button
                id="btn-modo-mensal"
                onClick={() => setModoVisualizacao('MENSAL')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  modoVisualizacao === 'MENSAL'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <CalendarRange className="w-3.5 h-3.5" />
                <span>Visão Mensal</span>
              </button>

              <button
                id="btn-modo-anual"
                onClick={() => setModoVisualizacao('ANUAL')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  modoVisualizacao === 'ANUAL'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Visão Anual</span>
              </button>

              <button
                id="btn-modo-diario"
                onClick={() => setModoVisualizacao('DIARIO')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  modoVisualizacao === 'DIARIO'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>Dia Específico</span>
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Navigation Bar per Temporal Mode */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 bg-slate-50/60 p-3 rounded-xl border">
          {/* SEMANAL CONTROLS */}
          {modoVisualizacao === 'SEMANAL' && (
            <div className="flex flex-wrap items-center justify-between w-full gap-2">
              <div className="flex items-center gap-2">
                <button
                  id="btn-prev-week"
                  onClick={retrocederSemana}
                  className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs"
                  title="Semana Anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  id="btn-current-week"
                  onClick={irSemanaAtual}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 shadow-2xs"
                >
                  Semana Atual
                </button>
                <button
                  id="btn-next-week"
                  onClick={avancarSemana}
                  className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs"
                  title="Próxima Semana"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <span className="text-xs font-black text-indigo-900 ml-1">
                  {intervaloSemanaLabel}
                </span>
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Grade de Segunda a Sábado com alocação detalhada de turnos e salas
              </div>
            </div>
          )}

          {/* MENSAL CONTROLS */}
          {modoVisualizacao === 'MENSAL' && (
            <div className="flex flex-wrap items-center justify-between w-full gap-2">
              <div className="flex items-center gap-2">
                <button
                  id="btn-prev-month"
                  onClick={retrocederMes}
                  className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs"
                  title="Mês Anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-black text-indigo-900 px-2 py-1 bg-white rounded-lg border border-slate-200">
                  {MESES_NOMES[mesSelecionado]} / {anoSelecionado}
                </span>
                <button
                  id="btn-next-month"
                  onClick={avancarMes}
                  className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs"
                  title="Próximo Mês"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setMesSelecionado(8);
                    setAnoSelecionado(2026);
                  }}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 shadow-2xs ml-1"
                >
                  Setembro/2026 (Atual)
                </button>
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Carga acumulada e calendário de aulas em {MESES_NOMES[mesSelecionado]}
              </div>
            </div>
          )}

          {/* ANUAL CONTROLS */}
          {modoVisualizacao === 'ANUAL' && (
            <div className="flex flex-wrap items-center justify-between w-full gap-2">
              <div className="flex items-center gap-2">
                <button
                  id="btn-prev-year"
                  onClick={() => setAnoLetivo((prev) => prev - 1)}
                  className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-black text-indigo-900 px-3 py-1 bg-white rounded-lg border border-slate-200">
                  Ano Letivo {anoLetivo}
                </span>
                <button
                  id="btn-next-year"
                  onClick={() => setAnoLetivo((prev) => prev + 1)}
                  className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setAnoLetivo(2026)}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 shadow-2xs ml-1"
                >
                  2026 (Padrão)
                </button>
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Planejamento curricular completo de Janeiro a Dezembro de {anoLetivo}
              </div>
            </div>
          )}

          {/* DIARIO CONTROLS */}
          {modoVisualizacao === 'DIARIO' && (
            <div className="flex flex-wrap items-center justify-between w-full gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200 text-xs">
                  <button
                    onClick={() => setDataSelecionada('2026-09-10')}
                    className={`px-2.5 py-1 rounded font-semibold transition-all ${
                      dataSelecionada === '2026-09-10'
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    10/09 (Qui)
                  </button>
                  <button
                    onClick={() => setDataSelecionada('2026-09-07')}
                    className={`px-2.5 py-1 rounded font-semibold transition-all ${
                      dataSelecionada === '2026-09-07'
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    07/09 (Seg)
                  </button>
                  <button
                    onClick={() => setDataSelecionada('2026-09-09')}
                    className={`px-2.5 py-1 rounded font-semibold transition-all ${
                      dataSelecionada === '2026-09-09'
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    09/09 (Qua)
                  </button>
                </div>

                <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-3 py-1.5 shadow-2xs">
                  <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
                  <input
                    id="input-date-picker-professor"
                    type="date"
                    value={dataSelecionada}
                    onChange={(e) => {
                      if (e.target.value) setDataSelecionada(e.target.value);
                    }}
                    className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
                  />
                  <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 uppercase">
                    {diaDaSemanaDiario}
                  </span>
                </div>
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Consulta detalhada por turnos e homologação de aulas
              </div>
            </div>
          )}
        </div>

        {/* Teacher Carousel / Selector Bar */}
        <div className="pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Selecione o Docente ({professores.length} cadastrados):
            </span>
            <div className="w-56 relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Buscar por professor ou escola..."
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
                className="w-full pl-8 pr-2 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {professoresFiltrados.map((p) => {
              const isSelected = p.id === professor.id;
              return (
                <button
                  key={p.id}
                  id={`btn-select-prof-day-${p.id}`}
                  onClick={() => {
                    setSelectedProfId(p.id);
                    onSelectProfessor(p.id);
                  }}
                  className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border transition-all text-left shrink-0 ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm ring-2 ring-indigo-200'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                      isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {p.nome.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-xs leading-tight">{p.nome}</div>
                    <div
                      className={`text-[10px] ${
                        isSelected ? 'text-indigo-100' : 'text-slate-400'
                      }`}
                    >
                      R$ {p.valorHora}/h • teto {p.cargaHorariaMaxima}h
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. MODO SEMANAL: CARDS DE RESUMO E GRADE DE 6 DIAS                        */}
      {/* ========================================================================= */}
      {modoVisualizacao === 'SEMANAL' && (
        <div className="space-y-6">
          {/* Summary KPIs for the Week */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Docente Selecionado
              </span>
              <div className="mt-2 flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
                  {professor.nome.charAt(0)}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{professor.nome}</h4>
                  <p className="text-[11px] text-slate-500">{professor.email}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Carga Horária Semanal
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-indigo-700">
                  {metricasSemanais.totalHoras}h
                </span>
                <span className="text-xs text-slate-500">
                  {metricasSemanais.totalAulas} aula(s) em {metricasSemanais.diasComAula} dia(s)
                </span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Remuneração Semanal Estimada
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-700">
                  R$ {metricasSemanais.remuneracaoSemanal.toLocaleString('pt-BR')},00
                </span>
                <span className="text-[10px] text-slate-400">
                  ({metricasSemanais.totalHoras}h × R$ {professor.valorHora})
                </span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Escolas Atendidas na Semana
              </span>
              <div className="mt-2">
                {metricasSemanais.escolas.length === 0 ? (
                  <span className="text-xs text-slate-400">Nenhuma escola nesta semana</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {metricasSemanais.escolas.map((esc, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200"
                      >
                        {esc}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Detailed Week Schedule by Day (Monday to Saturday) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-indigo-600" />
                <span>Grade Semanal Completa: {intervaloSemanaLabel}</span>
              </h3>
              <span className="text-xs text-slate-500">
                Horários e salas fixos; componentes vinculados aos dias vigentes.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {escalaSemanal.map((diaItem, idx) => (
                <div
                  key={idx}
                  className={`bg-white rounded-xl border p-4 shadow-xs flex flex-col justify-between space-y-3 transition-all ${
                    diaItem.aulas.length > 0
                      ? 'border-indigo-200 ring-1 ring-indigo-500/10'
                      : 'border-slate-200 bg-slate-50/40'
                  }`}
                >
                  {/* Day Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div>
                      <div className="text-xs font-bold text-slate-900">{diaItem.diaNome}</div>
                      <div className="text-[11px] text-slate-500 font-medium">{diaItem.dataStr}</div>
                    </div>
                    {diaItem.aulas.length > 0 ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {diaItem.totalHoras}h • {diaItem.aulas.length} aula(s)
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                        Livre
                      </span>
                    )}
                  </div>

                  {/* Day Transit Alert */}
                  {diaItem.temDeslocamentoMultiplasEscolas && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-[10px] text-amber-900 flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>Atenção:</strong> Atuação em {diaItem.escolas.length} escolas:{' '}
                        {diaItem.escolas.join(' ➔ ')}.
                      </span>
                    </div>
                  )}

                  {/* Shifts & Classes */}
                  <div className="space-y-2 flex-1">
                    {turnosConfig.map((tc) => {
                      const aulaTurno = diaItem.aulas.find((a) => a.turno === tc.turno);

                      if (!aulaTurno) {
                        return (
                          <div
                            key={tc.turno}
                            className="bg-slate-50/80 rounded-lg p-2 border border-slate-100 text-[11px] flex items-center justify-between text-slate-400"
                          >
                            <span className="font-semibold text-slate-500">{tc.turno}</span>
                            <span>Disponível</span>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={tc.turno}
                          className="bg-indigo-50/50 rounded-lg p-2.5 border border-indigo-200 text-xs space-y-1.5 shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-indigo-700 px-1.5 py-0.2 bg-indigo-100 rounded">
                              {aulaTurno.turno} • {aulaTurno.horario}
                            </span>
                            <span className="text-[10px] font-bold text-slate-700 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                              Turma {aulaTurno.turma.codigo}
                            </span>
                          </div>

                          <div>
                            <div className="font-bold text-slate-900 leading-tight">
                              {aulaTurno.componente.nome}
                            </div>
                            <div className="text-[11px] text-slate-600 mt-0.5 flex items-center gap-1">
                              <School className="w-3 h-3 text-indigo-600 shrink-0" />
                              <span>{aulaTurno.escola}</span>
                              <span>•</span>
                              <span className="font-medium text-slate-800">{aulaTurno.sala}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-indigo-100">
                            <span>
                              Período: {aulaTurno.componente.dataInicio || 'Início'} a{' '}
                              {aulaTurno.componente.dataFim || aulaTurno.componente.dataConclusao || 'Término'}
                            </span>
                            <button
                              onClick={() => onOpenSubstituicao(aulaTurno.turma, aulaTurno.componente)}
                              className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                            >
                              Substituir
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MODO MENSAL: VISÃO DO MÊS, CALENDÁRIO E CUMPRIMENTO DO TETO            */}
      {/* ========================================================================= */}
      {modoVisualizacao === 'MENSAL' && (
        <div className="space-y-6">
          {/* Monthly KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Carga do Mês ({MESES_NOMES[mesSelecionado]})
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-indigo-700">
                  {metricasMensais.totalHorasMes}h
                </span>
                <span className="text-xs text-slate-500">
                  {metricasMensais.totalAulasMes} aula(s) em {metricasMensais.diasComAula} dias
                </span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Teto Contratual Mensal
              </span>
              <div className="mt-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-bold text-slate-900">
                    {metricasMensais.totalHorasMes}h / {professor.cargaHorariaMaxima}h
                  </span>
                  <span className="text-xs font-bold text-indigo-700">
                    {metricasMensais.percentualCargaMaxima}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 mt-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      metricasMensais.percentualCargaMaxima > 95
                        ? 'bg-amber-500'
                        : 'bg-indigo-600'
                    }`}
                    style={{ width: `${Math.min(100, metricasMensais.percentualCargaMaxima)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Folha Mensal Estimada
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-700">
                  R$ {metricasMensais.valorEstimadoMes.toLocaleString('pt-BR')},00
                </span>
                <span className="text-[10px] text-slate-400">
                  (R$ {professor.valorHora}/h)
                </span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Turmas Ativas no Mês
              </span>
              <div className="mt-2">
                {metricasMensais.turmasAtivas.length === 0 ? (
                  <span className="text-xs text-slate-400">Nenhuma turma neste mês</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {metricasMensais.turmasAtivas.map((tCod, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200"
                      >
                        Turma {tCod}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Monthly Calendar Grid */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CalendarRange className="w-4 h-4 text-indigo-600" />
                <span>
                  Calendário Mensal de Aulas de {professor.nome} • {MESES_NOMES[mesSelecionado]} / {anoSelecionado}
                </span>
              </h3>
              <span className="text-xs text-slate-500">
                Os dias destacados em azul/roxo indicam turmas escaladas.
              </span>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 text-center font-bold text-[11px] text-slate-500 uppercase pb-1">
              <div className="text-rose-500">Dom</div>
              <div>Seg</div>
              <div>Ter</div>
              <div>Qua</div>
              <div>Qui</div>
              <div>Sex</div>
              <div>Sáb</div>
            </div>

            {/* Calendar Cells */}
            <div className="grid grid-cols-7 gap-1.5">
              {diasDoMesMatriz.map((item, idx) => {
                const diaNome = getDiaSemanaPorData(item.date);
                const aulasNoDiaMatriz: Array<{ turma: Turma; comp: ComponenteDaTurma }> = [];

                if (diaNome && item.isCurrentMonth) {
                  turmas.forEach((t) => {
                    if (t.diaSemana === diaNome) {
                      t.componentes.forEach((c) => {
                        if (c.professorId === professor.id) {
                          const vigente = isDataNoIntervalo(
                            item.date,
                            c.dataInicio,
                            c.dataFim || c.dataConclusao
                          );
                          if (vigente || c.status === 'EM ANDAMENTO') {
                            aulasNoDiaMatriz.push({ turma: t, comp: c });
                          }
                        }
                      });
                    }
                  });
                }

                const temAula = aulasNoDiaMatriz.length > 0;

                return (
                  <div
                    key={idx}
                    className={`min-h-[85px] rounded-lg p-1.5 border flex flex-col justify-between transition-all ${
                      !item.isCurrentMonth
                        ? 'bg-slate-50/50 border-slate-100 text-slate-300'
                        : temAula
                        ? 'bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-400/20 text-slate-900 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                          temAula ? 'bg-indigo-600 text-white font-black' : ''
                        }`}
                      >
                        {item.dayNumber}
                      </span>
                      {temAula && (
                        <span className="text-[9px] font-bold text-indigo-700 bg-white px-1 rounded border border-indigo-200">
                          {aulasNoDiaMatriz.length * 4}h
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 mt-1">
                      {aulasNoDiaMatriz.map((a, aIdx) => (
                        <div
                          key={aIdx}
                          className="bg-white/90 p-1 rounded border border-indigo-200 text-[10px] leading-tight"
                        >
                          <div className="font-bold text-indigo-900 truncate">
                            {a.comp.nome}
                          </div>
                          <div className="text-slate-500 text-[9px] truncate">
                            {a.turma.codigo} • {a.turma.turno}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MODO ANUAL: DISTRIBUIÇÃO MÊS A MÊS E ORÇAMENTO DO ANO                   */}
      {/* ========================================================================= */}
      {modoVisualizacao === 'ANUAL' && (
        <div className="space-y-6">
          {/* Annual KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Total de Horas no Ano {anoLetivo}
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-indigo-700">
                  {metricasAnuais.totalHorasAno}h
                </span>
                <span className="text-xs text-slate-500">
                  {metricasAnuais.totalAulasAno} aula(s) letivas
                </span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Remuneração Anual Estimada
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-700">
                  R$ {metricasAnuais.valorEstimadoAno.toLocaleString('pt-BR')},00
                </span>
                <span className="text-[10px] text-slate-400">
                  (R$ {professor.valorHora}/h)
                </span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Média de Horas / Mês
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-blue-700">
                  {Math.round(metricasAnuais.totalHorasAno / 12)}h / mês
                </span>
                <span className="text-xs text-slate-500">
                  teto de {professor.cargaHorariaMaxima}h
                </span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Escolas Habituais
              </span>
              <div className="mt-2 flex flex-wrap gap-1">
                {professor.escolasHabituais.map((esc, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
                  >
                    {esc}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Month by Month Grid */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                <span>Distribuição Anual de Carga Docente • {anoLetivo}</span>
              </h3>
              <span className="text-xs text-slate-500">
                Acompanhamento mensal da grade e turmas atendidas no ano letivo.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {metricasAnuais.mesesDetalhados.map((mItem) => {
                const temAulas = mItem.totalHoras > 0;
                const valorMes = mItem.totalHoras * professor.valorHora;

                return (
                  <div
                    key={mItem.mesIndex}
                    className={`rounded-xl border p-3.5 transition-all flex flex-col justify-between space-y-2 ${
                      temAulas
                        ? 'bg-white border-indigo-200 shadow-xs'
                        : 'bg-slate-50/50 border-slate-200 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="font-bold text-xs text-slate-900">{mItem.mesNome}</span>
                      {temAulas ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                          {mItem.totalHoras}h
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Recesso / 0h</span>
                      )}
                    </div>

                    <div className="space-y-1 text-xs">
                      {temAulas ? (
                        <>
                          <div className="flex justify-between text-slate-600 text-[11px]">
                            <span>Aulas no mês:</span>
                            <strong className="text-slate-800">{mItem.totalAulas}</strong>
                          </div>
                          <div className="flex justify-between text-slate-600 text-[11px]">
                            <span>Previsão folha:</span>
                            <strong className="text-emerald-700">
                              R$ {valorMes.toLocaleString('pt-BR')},00
                            </strong>
                          </div>
                          {mItem.turmas.length > 0 && (
                            <div className="pt-1">
                              <span className="text-[10px] font-semibold text-slate-500 block">
                                Turmas ativas:
                              </span>
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {mItem.turmas.map((tCod, tIdx) => (
                                  <span
                                    key={tIdx}
                                    className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200"
                                  >
                                    {tCod}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-[11px] text-slate-400 py-1">
                          Sem componentes alocados para este período.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODO DIÁRIO: CONSULTA POR DATA ESPECÍFICA & REGISTRO DE AULA             */}
      {/* ========================================================================= */}
      {modoVisualizacao === 'DIARIO' && (
        <div className="space-y-6">
          {/* Daily Summary & Transit Alerts */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Docente Selecionado
              </span>
              <div className="mt-2 flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
                  {professor.nome.charAt(0)}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{professor.nome}</h4>
                  <p className="text-[11px] text-slate-500">{professor.email}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Data em Análise
              </span>
              <div className="mt-2">
                <div className="text-base font-bold text-slate-900">
                  {formatarDataPtBr(dataSelecionada)}
                </div>
                <p className="text-xs font-semibold text-indigo-700">{diaDaSemanaDiario}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Aulas Programadas no Dia
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-indigo-700">{aulasDoDia.length}</span>
                <span className="text-xs text-slate-500">
                  aula(s) • <strong className="text-slate-800">{horasTotalNoDia}h</strong> de docência
                </span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Locais de Atuação no Dia
              </span>
              <div className="mt-2">
                {escolasNoDia.length === 0 ? (
                  <span className="text-xs text-slate-400">Nenhuma escola escalada</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {escolasNoDia.map((esc, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
                      >
                        {esc}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Inter-school Transit Alert (Multi-school on same day) */}
          {temDeslocamentoMultiplasEscolasDiario && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-amber-900 shadow-2xs">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <strong className="font-bold block text-sm text-amber-950">
                  Atenção de Logística: Docente em Múltiplas Escolas nesta Data
                </strong>
                <p className="mt-0.5 text-amber-800">
                  O professor <strong>{professor.nome}</strong> está escalado para atuar em unidades diferentes no mesmo dia:
                  {' '}
                  <strong>{escolasNoDia.join(' ➔ ')}</strong>. Certifique-se de que há intervalo adequado entre os turnos para deslocamento.
                </p>
              </div>
            </div>
          )}

          {/* Detailed Schedule of the Day (Morning, Afternoon, Night) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>
                  Grade Completa dos Turnos em {formatarDataPtBr(dataSelecionada)} ({diaDaSemanaDiario})
                </span>
              </h3>
              <span className="text-xs text-slate-500">
                Regra Fundamental: Horários e salas fixos; apenas o professor é móvel.
              </span>
            </div>

            <div className="space-y-3.5">
              {turnosConfig.map((item) => {
                const statusInfo = obterStatusDocenteNoTurno(
                  professor,
                  turmas,
                  diaDaSemanaDiario,
                  item.turno
                );

                const isEmAula = statusInfo.status === 'EM AULA';
                const aulaAtual = statusInfo.aulaAtual;

                let turmaObj: Turma | null = null;
                let compObj: ComponenteDaTurma | null = null;

                if (aulaAtual) {
                  turmaObj = turmas.find((t) => t.codigo === aulaAtual.turmaCodigo) || null;
                  if (turmaObj) {
                    compObj =
                      turmaObj.componentes.find(
                        (c) => c.nome === aulaAtual.componenteNome && c.status === 'EM ANDAMENTO'
                      ) || null;
                  }
                }

                const dataPt = formatarDataPtBr(dataSelecionada);
                const jaRegistrada = aulasMinistradas.some(
                  (am) =>
                    am.professorId === professor.id &&
                    am.turmaCodigo === aulaAtual?.turmaCodigo &&
                    am.componenteNome === aulaAtual?.componenteNome &&
                    am.data === dataPt
                );

                return (
                  <div
                    key={item.turno}
                    className={`rounded-xl border transition-all p-5 shadow-xs ${
                      isEmAula
                        ? 'bg-white border-indigo-200 ring-1 ring-indigo-500/20'
                        : 'bg-slate-50/60 border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      {/* Left: Shift Badge & Time */}
                      <div className="flex items-start sm:items-center gap-3.5">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                            isEmAula
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          <Clock className="w-6 h-6" />
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">
                              {item.label}
                            </span>
                            {isEmAula ? (
                              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                                EM AULA / ALOCADO
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
                                LIVRE (DISPONÍVEL)
                              </span>
                            )}

                            {jaRegistrada && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 flex items-center gap-1 border border-blue-200">
                                <CheckCircle2 className="w-3 h-3 text-blue-600" />
                                AULA REGISTRADA NO HISTÓRICO
                              </span>
                            )}
                          </div>

                          {/* Class Details if Allocated */}
                          {aulaAtual ? (
                            <div className="mt-2.5 space-y-1.5 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-slate-900">
                                  {aulaAtual.componenteNome}
                                </span>
                                <span className="text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.2 rounded">
                                  Turma {aulaAtual.turmaCodigo}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-600">
                                <span className="font-medium text-slate-800">
                                  {aulaAtual.curso}
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1 font-semibold text-slate-900">
                                  <School className="w-3.5 h-3.5 text-indigo-600" />
                                  {aulaAtual.escola}
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-slate-800 font-bold border border-slate-200">
                                  <Building className="w-3.5 h-3.5 text-slate-500" />
                                  {aulaAtual.sala}
                                </span>
                                <span>•</span>
                                <span className="text-slate-500 font-medium">
                                  Horário: {aulaAtual.horario}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500 mt-1">
                              Professor sem alocação de aula neste turno. Disponível para substituição imediata ou preparação pedagógica.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      {aulaAtual && turmaObj && compObj && (
                        <div className="flex flex-wrap items-center gap-2 shrink-0 self-end lg:self-center">
                          <button
                            id={`btn-registrar-aula-${item.turno}`}
                            onClick={() => {
                              setModalRegistroAberto({
                                isOpen: true,
                                turno: item.turno,
                                horario: aulaAtual.horario,
                                turma: turmaObj,
                                componente: compObj,
                              });
                              setConteudoMinistradoInput(
                                `Aula de ${compObj?.nome} realizada com a Turma ${turmaObj?.codigo} na ${turmaObj?.escola} (${turmaObj?.sala}).`
                              );
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-2xs transition-colors"
                          >
                            <FileCheck2 className="w-3.5 h-3.5" />
                            <span>Registrar Aula Ministrada</span>
                          </button>

                          <button
                            id={`btn-substituir-dia-${item.turno}`}
                            onClick={() => onOpenSubstituicao(turmaObj!, compObj!)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1.5 shadow-2xs transition-colors"
                          >
                            <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                            <span>Substituir Docente</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Historical classes already logged for this teacher on this day */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Aulas Concluídas e Auditadas em {formatarDataPtBr(dataSelecionada)}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Registros históricos confirmados para este professor nesta data específica.
                </p>
              </div>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
                {historicoNoDia.length} registro(s)
              </span>
            </div>

            {historicoNoDia.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                Nenhuma aula com registro formal de ministrada para {professor.nome} nesta data.
                <br />
                Utilize o botão <strong>"Registrar Aula Ministrada"</strong> acima para homologar a aula no histórico.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {historicoNoDia.map((item) => (
                  <div
                    key={item.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                  >
                    <div>
                      <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <span>{item.componenteNome}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          {item.status}
                        </span>
                      </div>
                      <div className="text-slate-500 text-xs mt-0.5">
                        Turma <strong>{item.turmaCodigo}</strong> • {item.curso} • {item.escola} ({item.sala}) • {item.horario}
                      </div>
                      {item.conteudoMinistrado && (
                        <div className="text-slate-600 text-xs mt-1 italic bg-slate-50 p-2 rounded border border-slate-100">
                          "{item.conteudoMinistrado}"
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-bold text-slate-800">{item.horasMinistradas} horas</span>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Por: {item.registradoPor}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Registrar Aula Ministrada (Usado em modo Diário) */}
      {modalRegistroAberto.isOpen && modalRegistroAberto.turma && modalRegistroAberto.componente && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-indigo-50 text-indigo-700">
                  <FileCheck2 className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Registrar Aula Ministrada
                  </h3>
                  <p className="text-xs text-slate-500">
                    Gera registro histórico oficial para fins de auditoria e avanço acadêmico.
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  setModalRegistroAberto({
                    isOpen: false,
                    turno: 'NOITE',
                    horario: '',
                    turma: null,
                    componente: null,
                  })
                }
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Class info summary (Fixed Structure) */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Professor:</span>
                <strong className="text-slate-900">{professor.nome}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Componente Curricular:</span>
                <strong className="text-indigo-700">{modalRegistroAberto.componente.nome}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Turma (Fixa):</span>
                <strong className="text-slate-800">
                  {modalRegistroAberto.turma.codigo} ({modalRegistroAberto.turma.curso})
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Local (Fixo):</span>
                <span className="text-slate-700">
                  {modalRegistroAberto.turma.escola} • {modalRegistroAberto.turma.sala}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Data & Horário:</span>
                <span className="text-slate-700">
                  {formatarDataPtBr(dataSelecionada)} • {modalRegistroAberto.horario}
                </span>
              </div>
            </div>

            {/* Input: Topic Covered */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Conteúdo Ministrado / Ementa do Dia:
              </label>
              <textarea
                rows={2}
                value={conteudoMinistradoInput}
                onChange={(e) => setConteudoMinistradoInput(e.target.value)}
                placeholder="Descreva os tópicos trabalhados nesta aula..."
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Input: Observations */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Observações de Auditoria:
              </label>
              <input
                type="text"
                value={obsInput}
                onChange={(e) => setObsInput(e.target.value)}
                placeholder="Ex: Aula presencial realizada sem ocorrências. 28 presentes."
                className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() =>
                  setModalRegistroAberto({
                    isOpen: false,
                    turno: 'NOITE',
                    horario: '',
                    turma: null,
                    componente: null,
                  })
                }
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                id="btn-confirmar-registro-aula"
                onClick={handleSalvarRegistroAula}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar e Homologar Aula</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

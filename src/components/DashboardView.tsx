import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  LayoutDashboard,
  Calendar,
  Filter,
  Users,
  Clock,
  Building2,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Download,
  Printer,
  ChevronRight,
  Search,
  School,
  ArrowUpRight,
  Layers,
  Sparkles,
  User,
  GraduationCap,
  X,
} from 'lucide-react';
import { Turma, Professor, Escola, AulaMinistradaRecord, HistoricoSubstituicao, DiaSemana, Turno, Usuario } from '../types/rios';
import { extrairHorasPorDia, parseDataBR } from '../utils/conflitoAgenda';
import { AuditLogTable } from './AuditLogTable';

interface DashboardViewProps {
  turmas: Turma[];
  professores: Professor[];
  escolas?: Escola[];
  aulasMinistradas?: AulaMinistradaRecord[];
  historico?: HistoricoSubstituicao[];
  usuarioAtual?: Usuario | null;
  onSelectProfessor?: (profId: string) => void;
}

export type PeriodoTipo =
  | 'semana-atual'
  | 'mes-atual'
  | 'proximo-mes'
  | 'bimestre'
  | 'semestre'
  | 'ano'
  | 'personalizado';

const DIAS_ORDENADOS: DiaSemana[] = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

const DIAS_ABREV: Record<DiaSemana, string> = {
  'Segunda-feira': 'Segunda',
  'Terça-feira': 'Terça',
  'Quarta-feira': 'Quarta',
  'Quinta-feira': 'Quinta',
  'Sexta-feira': 'Sexta',
  'Sábado': 'Sábado',
};

const CORES_DONUT = ['#4f46e5', '#0284c7', '#0d9488', '#e11d48', '#d97706', '#8b5cf6'];

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

const MESES_ABREV = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

export const DashboardView: React.FC<DashboardViewProps> = ({
  turmas,
  professores,
  escolas = [],
  aulasMinistradas = [],
  historico = [],
  usuarioAtual,
  onSelectProfessor,
}) => {
  // Filtros
  const [periodo, setPeriodo] = useState<PeriodoTipo>('mes-atual');
  const [dataInicioCustom, setDataInicioCustom] = useState<string>('2026-09-01');
  const [dataFimCustom, setDataFimCustom] = useState<string>('2026-09-30');
  const [escolaFiltro, setEscolaFiltro] = useState<string>('TODAS');
  const [professorFiltro, setProfessorFiltro] = useState<string>('TODOS');
  const [turnoFiltro, setTurnoFiltro] = useState<string>('TODOS');
  const [statusCargaFiltro, setStatusCargaFiltro] = useState<string>('TODOS');
  const [termoBusca, setTermoBusca] = useState<string>('');
  const [visaoMetricaDocente, setVisaoMetricaDocente] = useState<'semanal' | 'mensal'>('semanal');

  // Alternância de visão do Gráfico 1: Semana, Mensal, Anual, Por Escola/Unidade ou Por Professor
  const [visaoOcupacao, setVisaoOcupacao] = useState<'semana' | 'mensal' | 'anual' | 'escola' | 'professor'>('semana');
  const [mesOcupacao, setMesOcupacao] = useState<number>(9); // 9 = Setembro
  const [anoOcupacao] = useState<number>(2026);

  // Nomes de escolas disponíveis
  const listaEscolas = useMemo(() => {
    const setEscolas = new Set<string>();
    escolas.forEach((e) => setEscolas.add(e.nome));
    turmas.forEach((t) => {
      if (t.escola) setEscolas.add(t.escola);
    });
    return Array.from(setEscolas);
  }, [escolas, turmas]);

  // Turmas filtradas por Escola, Turno e Professor
  const turmasFiltradas = useMemo(() => {
    return turmas.filter((t) => {
      if (escolaFiltro !== 'TODAS' && t.escola !== escolaFiltro) return false;
      if (turnoFiltro !== 'TODOS' && t.turno !== turnoFiltro) return false;
      if (professorFiltro !== 'TODOS') {
        const temProf = t.componentes.some((c) => c.professorId === professorFiltro);
        if (!temProf) return false;
      }
      return true;
    });
  }, [turmas, escolaFiltro, turnoFiltro, professorFiltro]);

  // Multiplicador de período para horas (Semanal vs Mensal)
  const semanasNoPeriodo = useMemo(() => {
    switch (periodo) {
      case 'semana-atual':
        return 1;
      case 'mes-atual':
      case 'proximo-mes':
        return 4.2;
      case 'bimestre':
        return 8.5;
      case 'semestre':
        return 20;
      case 'ano':
        return 42;
      case 'personalizado': {
        const d1 = new Date(dataInicioCustom);
        const d2 = new Date(dataFimCustom);
        const diffDays = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
        return Math.max(1, diffDays / 7);
      }
      default:
        return 4.2;
    }
  }, [periodo, dataInicioCustom, dataFimCustom]);

  // 1. DADOS DE OCUPAÇÃO (Semana, Mensal, Anual, Escola e Professor - Gráfico 1)
  const dadosOcupacaoSemana = useMemo(() => {
    return DIAS_ORDENADOS.map((dia) => {
      // Turmas que acontecem neste dia
      const turmasDoDia = turmasFiltradas.filter((t) => t.diaSemana === dia);

      // Horas por turma neste dia
      let horasAlocadas = 0;
      turmasDoDia.forEach((t) => {
        horasAlocadas += extrairHorasPorDia(t.horario);
      });

      // Capacidade estimada com base nas salas das escolas ou teto diário do professor selecionado
      const salasDisponiveis = professorFiltro !== 'TODOS' ? 1 : Math.max(6, turmasDoDia.length + 2);
      const capacidadeHorasTeorica = professorFiltro !== 'TODOS' ? 4 : salasDisponiveis * 4; // 1 turno padrão de 4h por sala
      const taxaOcupacao = Math.min(100, Math.round((horasAlocadas / Math.max(1, capacidadeHorasTeorica)) * 100));

      // Docentes atuando neste dia
      const profsIdsNoDia = new Set<string>();
      turmasDoDia.forEach((t) => {
        t.componentes.forEach((c) => {
          if (c.status === 'EM ANDAMENTO' && c.professorId) {
            profsIdsNoDia.add(c.professorId);
          }
        });
      });

      return {
        label: DIAS_ABREV[dia],
        nomeCompleto: dia,
        horasAlocadas,
        turmasAtivas: turmasDoDia.length,
        professoresAtivos: profsIdsNoDia.size,
        taxaOcupacao,
        capacidadeHorasTeorica,
      };
    });
  }, [turmasFiltradas, professorFiltro]);

  const dadosOcupacaoMensal = useMemo(() => {
    const ultimoDiaMes = new Date(anoOcupacao, mesOcupacao, 0).getDate();
    const semanas = [
      { num: 1, inicio: 1, fim: 7, label: 'Sem 1 (01-07)' },
      { num: 2, inicio: 8, fim: 14, label: 'Sem 2 (08-14)' },
      { num: 3, inicio: 15, fim: 21, label: 'Sem 3 (15-21)' },
      { num: 4, inicio: 22, fim: 28, label: 'Sem 4 (22-28)' },
      { num: 5, inicio: 29, fim: ultimoDiaMes, label: `Sem 5 (29-${ultimoDiaMes})` },
    ];

    const horasSemanaisBase = turmasFiltradas.reduce((acc, t) => acc + extrairHorasPorDia(t.horario), 0);
    const turmasCount = turmasFiltradas.length;

    return semanas.map((sem) => {
      const diasNaSemana = sem.fim - sem.inicio + 1;
      const fatorSem = sem.num === 5 ? diasNaSemana / 7 : 1;
      const horasSemana = Math.round(horasSemanaisBase * fatorSem);

      const salasDisponiveis = Math.max(6, turmasCount + 2);
      const capacidadeSemana = salasDisponiveis * 4 * (sem.num === 5 ? Math.max(1, Math.round(diasNaSemana / 1.5)) : 5);
      const taxaOcupacao = Math.min(100, Math.round((horasSemana / Math.max(1, capacidadeSemana)) * 100));

      const profsAtivos = new Set<string>();
      turmasFiltradas.forEach((t) => {
        t.componentes.forEach((c) => {
          if (c.status === 'EM ANDAMENTO' && c.professorId) {
            profsAtivos.add(c.professorId);
          }
        });
      });

      return {
        label: sem.label,
        nomeCompleto: `Semana ${sem.num} de ${MESES_NOMES[mesOcupacao - 1]} (${String(sem.inicio).padStart(2, '0')} a ${String(sem.fim).padStart(2, '0')}/${String(mesOcupacao).padStart(2, '0')})`,
        horasAlocadas: horasSemana,
        turmasAtivas: turmasCount,
        professoresAtivos: profsAtivos.size,
        taxaOcupacao: taxaOcupacao || Math.round(Math.min(95, (horasSemana / 24) * 80)),
        capacidadeHorasTeorica: capacidadeSemana,
      };
    });
  }, [turmasFiltradas, mesOcupacao, anoOcupacao]);

  const dadosOcupacaoAnual = useMemo(() => {
    const horasSemanaisBase = turmasFiltradas.reduce((acc, t) => acc + extrairHorasPorDia(t.horario), 0);
    const turmasCount = turmasFiltradas.length;

    return MESES_ABREV.map((mesAbrev, idx) => {
      const mesNum = idx + 1;
      const nomeCompleto = MESES_NOMES[idx];

      let fatorSemanas = 4.3;
      let taxaPercentual = 78;

      if (mesNum === 1) {
        // Janeiro: recesso letivo e planejamento
        fatorSemanas = 1.0;
        taxaPercentual = 20;
      } else if (mesNum === 2) {
        // Fevereiro: início do ano letivo
        fatorSemanas = 3.5;
        taxaPercentual = 68;
      } else if (mesNum === 7) {
        // Julho: recesso de inverno
        fatorSemanas = 1.2;
        taxaPercentual = 25;
      } else if (mesNum === 12) {
        // Dezembro: encerramento e avaliações finais
        fatorSemanas = 2.8;
        taxaPercentual = 62;
      } else if (mesNum === 9 || mesNum === 10 || mesNum === 4 || mesNum === 5) {
        // Meses de pico de atividade acadêmica
        fatorSemanas = 4.4;
        taxaPercentual = 84;
      }

      const horasMes = Math.round(horasSemanaisBase * fatorSemanas);
      const turmasMes = mesNum === 1 || mesNum === 7 ? Math.round(turmasCount * 0.35) : turmasCount;
      const profsAtivos =
        mesNum === 1 || mesNum === 7 ? Math.round(professores.length * 0.3) : Math.round(professores.length * 0.8);

      return {
        label: mesAbrev,
        nomeCompleto: `${nomeCompleto} de ${anoOcupacao}`,
        horasAlocadas: horasMes,
        turmasAtivas: turmasMes,
        professoresAtivos: profsAtivos,
        taxaOcupacao: taxaPercentual,
        capacidadeHorasTeorica: Math.round(horasMes / (taxaPercentual / 100)),
      };
    });
  }, [turmasFiltradas, anoOcupacao, professores]);

  // 1.4 DADOS DE OCUPAÇÃO SEGREGADOS POR ESCOLA / UNIDADE DE ATUAÇÃO
  const dadosOcupacaoEscola = useMemo(() => {
    return listaEscolas.map((nomeEscola) => {
      // Objeto da escola para pegar salas cadastradas
      const escolaObj = escolas.find((e) => e.nome.toLowerCase() === nomeEscola.toLowerCase());
      const qtdSalas = escolaObj?.salas?.length || 4;

      // Turmas desta escola (respeitando filtros de turno e professor se selecionados)
      const turmasDestaEscola = turmas.filter((t) => {
        if (t.escola !== nomeEscola) return false;
        if (turnoFiltro !== 'TODOS' && t.turno !== turnoFiltro) return false;
        if (professorFiltro !== 'TODOS') {
          const temProf = t.componentes.some((c) => c.professorId === professorFiltro);
          if (!temProf) return false;
        }
        return true;
      });

      let horasAlocadasSemanais = 0;
      turmasDestaEscola.forEach((t) => {
        horasAlocadasSemanais += extrairHorasPorDia(t.horario);
      });

      const horasAlocadas =
        visaoMetricaDocente === 'mensal'
          ? Math.round(horasAlocadasSemanais * semanasNoPeriodo)
          : horasAlocadasSemanais;

      // Capacidade estimada: salas * 4h/turno * 5 dias
      const capacidadeSemanal = Math.max(1, qtdSalas * 20);
      const capacidadeHorasTeorica =
        visaoMetricaDocente === 'mensal'
          ? Math.round(capacidadeSemanal * semanasNoPeriodo)
          : capacidadeSemanal;

      const taxaOcupacao = Math.min(100, Math.round((horasAlocadas / Math.max(1, capacidadeHorasTeorica)) * 100));

      // Professores atuando nesta unidade
      const profsNaEscola = new Set<string>();
      turmasDestaEscola.forEach((t) => {
        t.componentes.forEach((c) => {
          if (c.status === 'EM ANDAMENTO' && c.professorId) {
            profsNaEscola.add(c.professorId);
          }
        });
      });

      // Rótulo compacto para o eixo X
      const labelCompacta = nomeEscola
        .replace(/^Escola\s+/i, '')
        .replace(/^Unidade\s+/i, '')
        .trim();

      return {
        label: labelCompacta || nomeEscola,
        nomeCompleto: nomeEscola,
        regiao: escolaObj?.regiao || 'Sede Regional',
        horasAlocadas,
        turmasAtivas: turmasDestaEscola.length,
        professoresAtivos: profsNaEscola.size,
        qtdSalas,
        taxaOcupacao,
        capacidadeHorasTeorica,
      };
    });
  }, [listaEscolas, escolas, turmas, turnoFiltro, professorFiltro, visaoMetricaDocente, semanasNoPeriodo]);

  // 1.5 DADOS DE OCUPAÇÃO SEGREGADOS POR PROFESSOR DOCENTE
  const dadosOcupacaoProfessor = useMemo(() => {
    return professores
      .filter((prof) => {
        if (professorFiltro !== 'TODOS' && prof.id !== professorFiltro) return false;
        return true;
      })
      .map((prof) => {
        // Turmas do professor considerando escola e turno ativos
        const turmasDoProf = turmas.filter((t) => {
          if (escolaFiltro !== 'TODAS' && t.escola !== escolaFiltro) return false;
          if (turnoFiltro !== 'TODOS' && t.turno !== turnoFiltro) return false;
          return t.componentes.some((c) => c.professorId === prof.id && c.status !== 'CONCLUÍDO');
        });

        let horasSemanais = 0;
        const escolasAtuacao = new Set<string>();
        turmasDoProf.forEach((t) => {
          horasSemanais += extrairHorasPorDia(t.horario);
          if (t.escola) escolasAtuacao.add(t.escola);
        });

        const horasAlocadas =
          visaoMetricaDocente === 'mensal'
            ? Math.round(horasSemanais * semanasNoPeriodo)
            : horasSemanais;

        const tetoContratual =
          visaoMetricaDocente === 'mensal'
            ? Math.round((prof.cargaHorariaMaxima / 4) * semanasNoPeriodo)
            : Math.round(prof.cargaHorariaMaxima / 4);

        const taxaOcupacao = Math.min(150, Math.round((horasAlocadas / Math.max(1, tetoContratual)) * 100));

        // Primeiro e último nome para o rótulo do gráfico
        const partes = prof.nome.split(' ');
        const label = partes.length > 1 ? `${partes[0]} ${partes[partes.length - 1]}` : prof.nome;

        return {
          label,
          nomeCompleto: prof.nome,
          horasAlocadas,
          turmasAtivas: turmasDoProf.length,
          professoresAtivos: 1,
          tetoContratual,
          taxaOcupacao,
          escolasAtuacao: Array.from(escolasAtuacao).join(', ') || 'Nenhuma',
          capacidadeHorasTeorica: tetoContratual,
        };
      })
      .filter((d) => (professorFiltro !== 'TODOS' ? true : d.horasAlocadas > 0 || d.turmasAtivas > 0));
  }, [professores, professorFiltro, turmas, escolaFiltro, turnoFiltro, visaoMetricaDocente, semanasNoPeriodo]);

  const dadosOcupacaoAtivos = useMemo(() => {
    if (visaoOcupacao === 'mensal') return dadosOcupacaoMensal;
    if (visaoOcupacao === 'anual') return dadosOcupacaoAnual;
    if (visaoOcupacao === 'escola') return dadosOcupacaoEscola;
    if (visaoOcupacao === 'professor') return dadosOcupacaoProfessor;
    return dadosOcupacaoSemana;
  }, [visaoOcupacao, dadosOcupacaoSemana, dadosOcupacaoMensal, dadosOcupacaoAnual, dadosOcupacaoEscola, dadosOcupacaoProfessor]);

  // 2. DADOS DE CARGA HORÁRIA DISTRIBUÍDA POR PROFESSORES (Gráfico 2)
  const dadosCargaProfessores = useMemo(() => {
    return professores
      .filter((prof) => {
        if (professorFiltro !== 'TODOS' && prof.id !== professorFiltro) return false;
        return true;
      })
      .map((prof) => {
        // Encontra turmas onde o professor atua em componentes em andamento ou ativos
        const turmasDoProf = turmasFiltradas.filter((t) =>
          t.componentes.some((c) => c.professorId === prof.id && c.status !== 'CONCLUÍDO')
        );

        // Horas semanais (cada aula semanal da turma)
        let horasSemanais = 0;
        const diasQueLeciona = new Set<DiaSemana>();
        const escolasAtuacao = new Set<string>();

        turmasDoProf.forEach((t) => {
          const comp = t.componentes.find((c) => c.professorId === prof.id && c.status !== 'CONCLUÍDO');
          if (comp) {
            const h = extrairHorasPorDia(t.horario);
            horasSemanais += h;
            diasQueLeciona.add(t.diaSemana);
            escolasAtuacao.add(t.escola);
          }
        });

        // Carga horária calculada no período
        const horasNoPeriodo = Math.round(horasSemanais * semanasNoPeriodo);
        const cargaMaximaPeriodo = Math.round(
          visaoMetricaDocente === 'semanal'
            ? prof.cargaHorariaMaxima / 4 // ex: 160h / 4 = 40h/sem
            : (prof.cargaHorariaMaxima / 4) * semanasNoPeriodo
        );

        const cargaExibida = visaoMetricaDocente === 'semanal' ? horasSemanais : horasNoPeriodo;
        const percentualUso = cargaMaximaPeriodo > 0 ? Math.round((cargaExibida / cargaMaximaPeriodo) * 100) : 0;

        // Classificação de status
        let statusCarga: 'NORMAL' | 'ATENÇÃO' | 'SOBRECARGA' = 'NORMAL';
        if (percentualUso > 100) {
          statusCarga = 'SOBRECARGA';
        } else if (percentualUso >= 80) {
          statusCarga = 'ATENÇÃO';
        }

        return {
          id: prof.id,
          nome: prof.nome,
          nomeAbrev: prof.nome.split(' ').slice(0, 2).join(' '),
          email: prof.email,
          competencias: prof.competencias,
          horasSemanais,
          horasNoPeriodo,
          cargaExibida,
          cargaMaximaPeriodo,
          percentualUso,
          statusCarga,
          turmasCount: turmasDoProf.length,
          turmasCodigos: turmasDoProf.map((t) => t.codigo),
          diasQueLeciona: Array.from(diasQueLeciona),
          escolasAtuacao: Array.from(escolasAtuacao),
        };
      })
      .filter((item) => {
        // Filtro por professor selecionado
        if (professorFiltro !== 'TODOS' && item.id !== professorFiltro) return false;

        // Filtro por status de carga
        if (statusCargaFiltro === 'SOBRECARGA' && item.statusCarga !== 'SOBRECARGA') return false;
        if (statusCargaFiltro === 'ATENCAO' && item.statusCarga !== 'ATENÇÃO') return false;
        if (statusCargaFiltro === 'NORMAL' && item.statusCarga !== 'NORMAL') return false;

        // Filtro por texto
        if (termoBusca.trim()) {
          const t = termoBusca.toLowerCase();
          const matchNome = item.nome.toLowerCase().includes(t);
          const matchComp = item.competencias.some((c) => c.toLowerCase().includes(t));
          const matchTurma = item.turmasCodigos.some((c) => c.toLowerCase().includes(t));
          return matchNome || matchComp || matchTurma;
        }
        return true;
      })
      .sort((a, b) => b.cargaExibida - a.cargaExibida);
  }, [professores, turmasFiltradas, semanasNoPeriodo, visaoMetricaDocente, statusCargaFiltro, termoBusca, professorFiltro]);

  // 3. DADOS DE DISTRIBUIÇÃO POR ESCOLA (Gráfico Pizza)
  const dadosDistribuicaoEscola = useMemo(() => {
    const mapa = new Map<string, { nome: string; horas: number; turmas: number }>();
    turmasFiltradas.forEach((t) => {
      const nome = t.escola || 'Não informada';
      const h = extrairHorasPorDia(t.horario);
      const atual = mapa.get(nome) || { nome, horas: 0, turmas: 0 };
      atual.horas += h;
      atual.turmas += 1;
      mapa.set(nome, atual);
    });

    return Array.from(mapa.values()).map((item, index) => ({
      ...item,
      color: CORES_DONUT[index % CORES_DONUT.length],
    }));
  }, [turmasFiltradas]);

  // 4. METRICAS CONSOLIDADAS (KPIs)
  const totalHorasSemanais = useMemo(() => {
    return dadosOcupacaoSemana.reduce((acc, d) => acc + d.horasAlocadas, 0);
  }, [dadosOcupacaoSemana]);

  const totalHorasOcupacaoAtiva = useMemo(() => {
    return dadosOcupacaoAtivos.reduce((acc, d) => acc + d.horasAlocadas, 0);
  }, [dadosOcupacaoAtivos]);

  const taxaMediaOcupacao = useMemo(() => {
    const soma = dadosOcupacaoSemana.reduce((acc, d) => acc + d.taxaOcupacao, 0);
    return dadosOcupacaoSemana.length > 0 ? Math.round(soma / dadosOcupacaoSemana.length) : 0;
  }, [dadosOcupacaoSemana]);

  const taxaMediaOcupacaoAtiva = useMemo(() => {
    const soma = dadosOcupacaoAtivos.reduce((acc, d) => acc + d.taxaOcupacao, 0);
    return dadosOcupacaoAtivos.length > 0 ? Math.round(soma / dadosOcupacaoAtivos.length) : 0;
  }, [dadosOcupacaoAtivos]);

  const totalProfsSobrecarga = useMemo(() => {
    return dadosCargaProfessores.filter((p) => p.statusCarga === 'SOBRECARGA').length;
  }, [dadosCargaProfessores]);

  const totalProfsAtivos = useMemo(() => {
    return dadosCargaProfessores.filter((p) => p.horasSemanais > 0).length;
  }, [dadosCargaProfessores]);

  // Exportar dados em CSV
  const handleExportarCSV = () => {
    const headers = [
      'Docente',
      'Carga Alocada (h)',
      'Carga Maxima (h)',
      'Percentual (%)',
      'Status Carga',
      'Qtd Turmas',
      'Dias que Leciona',
      'Escolas de Atuacao',
    ];

    const rows = dadosCargaProfessores.map((p) => [
      `"${p.nome}"`,
      p.cargaExibida,
      p.cargaMaximaPeriodo,
      `${p.percentualUso}%`,
      p.statusCarga,
      p.turmasCount,
      `"${p.diasQueLeciona.join(', ')}"`,
      `"${p.escolasAtuacao.join(', ')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `dashboard_indicadores_rios_${periodo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Tooltip formatado para o gráfico de ocupação (Semana, Mensal, Anual, Escola e Professor)
  const CustomTooltipOcupacao = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl text-xs border border-slate-700 min-w-[210px]">
          <p className="font-bold text-slate-200 border-b border-slate-700 pb-1.5 mb-2">{data.nomeCompleto || label}</p>
          <div className="space-y-1.5">
            {data.regiao && (
              <div className="flex justify-between items-center text-slate-300">
                <span>Região / Polo:</span>
                <span className="font-medium text-slate-200">{data.regiao}</span>
              </div>
            )}
            {data.escolasAtuacao && (
              <div className="flex justify-between items-center text-slate-300">
                <span>Unidades:</span>
                <span className="font-medium text-slate-200 text-right max-w-[130px] truncate" title={data.escolasAtuacao}>
                  {data.escolasAtuacao}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center text-slate-300">
              <span>{visaoOcupacao === 'professor' ? 'Horas Alocadas:' : 'Horas de Aula:'}</span>
              <span className="font-bold text-indigo-400">{data.horasAlocadas}h</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span>Turmas Ativas:</span>
              <span className="font-bold text-sky-400">{data.turmasAtivas}</span>
            </div>
            {data.qtdSalas !== undefined && (
              <div className="flex justify-between items-center text-slate-300">
                <span>Salas Cadastradas:</span>
                <span className="font-bold text-teal-400">{data.qtdSalas}</span>
              </div>
            )}
            {visaoOcupacao !== 'professor' && data.professoresAtivos !== undefined && (
              <div className="flex justify-between items-center text-slate-300">
                <span>Docentes Atuando:</span>
                <span className="font-bold text-emerald-400">{data.professoresAtivos}</span>
              </div>
            )}
            {data.tetoContratual !== undefined && (
              <div className="flex justify-between items-center text-slate-300">
                <span>Teto Contratual:</span>
                <span className="font-bold text-purple-400">{data.tetoContratual}h</span>
              </div>
            )}
            <div className="flex justify-between items-center text-slate-300 pt-1 border-t border-slate-800">
              <span>{visaoOcupacao === 'professor' ? 'Aproveitamento Carga:' : 'Taxa de Ocupação:'}</span>
              <span
                className={`font-bold ${
                  data.taxaOcupacao > 100
                    ? 'text-rose-400'
                    : data.taxaOcupacao >= 80
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {data.taxaOcupacao}%
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Tooltip formatado para o gráfico de professores
  const CustomTooltipDocentes = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl text-xs border border-slate-700 min-w-[210px]">
          <p className="font-bold text-slate-200 border-b border-slate-700 pb-1.5 mb-2">{data.nome}</p>
          <div className="space-y-1">
            <div className="flex justify-between items-center text-slate-300">
              <span>Carga Alocada:</span>
              <span className="font-bold text-indigo-400">{data.cargaExibida}h</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span>Teto Permitido:</span>
              <span className="font-bold text-slate-300">{data.cargaMaximaPeriodo}h</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span>Uso da Carga:</span>
              <span
                className={`font-bold ${
                  data.percentualUso > 100
                    ? 'text-rose-400'
                    : data.percentualUso >= 80
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {data.percentualUso}%
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-300 pt-1 border-t border-slate-800">
              <span>Turmas Ativas:</span>
              <span className="font-bold text-sky-400">{data.turmasCount} turma(s)</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Title */}
      <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Painel de Indicadores & Métricas</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitoramento consolidado de ocupação semanal, distribuição de carga horária e alocação docente
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="btn-exportar-dashboard-csv"
            onClick={handleExportarCSV}
            className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs"
            title="Exportar dados consolidados em planilha CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Exportar CSV</span>
          </button>
          <button
            id="btn-imprimir-dashboard"
            onClick={() => window.print()}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
            title="Imprimir visualização do painel"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir Painel</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar (Barra de Filtros por Período) */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-indigo-600" />
            <span>Filtros do Período & Parâmetros</span>
          </div>

          {/* Quick Period Selector Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs overflow-x-auto">
            <button
              onClick={() => setPeriodo('semana-atual')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                periodo === 'semana-atual'
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semana Atual
            </button>
            <button
              onClick={() => setPeriodo('mes-atual')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                periodo === 'mes-atual'
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mês Vigente
            </button>
            <button
              onClick={() => setPeriodo('proximo-mes')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                periodo === 'proximo-mes'
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Próximo Mês
            </button>
            <button
              onClick={() => setPeriodo('bimestre')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                periodo === 'bimestre'
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bimestre
            </button>
            <button
              onClick={() => setPeriodo('semestre')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                periodo === 'semestre'
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semestre
            </button>
            <button
              onClick={() => setPeriodo('ano')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                periodo === 'ano'
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ano Letivo
            </button>
            <button
              onClick={() => setPeriodo('personalizado')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                periodo === 'personalizado'
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Customizado
            </button>
          </div>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
          {/* Custom Date Inputs (if Period is Custom) */}
          {periodo === 'personalizado' && (
            <>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Data Início</label>
                <input
                  type="date"
                  value={dataInicioCustom}
                  onChange={(e) => setDataInicioCustom(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Data Término</label>
                <input
                  type="date"
                  value={dataFimCustom}
                  onChange={(e) => setDataFimCustom(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </>
          )}

          {/* Seletor de Escola / Unidade */}
          <div className={periodo === 'personalizado' ? 'col-span-1' : 'col-span-1'}>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <School className="w-3 h-3 text-indigo-600" />
                Escola / Unidade
              </span>
              {escolaFiltro !== 'TODAS' && (
                <button
                  type="button"
                  onClick={() => setEscolaFiltro('TODAS')}
                  className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Limpar
                </button>
              )}
            </label>
            <select
              id="select-filtro-escola"
              value={escolaFiltro}
              onChange={(e) => setEscolaFiltro(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-medium"
            >
              <option value="TODAS">Todas as Escolas / Unidades</option>
              {listaEscolas.map((esc) => (
                <option key={esc} value={esc}>
                  {esc}
                </option>
              ))}
            </select>
          </div>

          {/* Seletor de Professor / Docente */}
          <div className="col-span-1">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <GraduationCap className="w-3 h-3 text-indigo-600" />
                Professor
              </span>
              {professorFiltro !== 'TODOS' && (
                <button
                  type="button"
                  onClick={() => setProfessorFiltro('TODOS')}
                  className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Limpar
                </button>
              )}
            </label>
            <select
              id="select-filtro-professor"
              value={professorFiltro}
              onChange={(e) => setProfessorFiltro(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-medium"
            >
              <option value="TODOS">Todos os Professores</option>
              {professores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Turno */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Turno</label>
            <select
              value={turnoFiltro}
              onChange={(e) => setTurnoFiltro(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            >
              <option value="TODOS">Todos os Turnos</option>
              <option value="NOITE">Noite (18:30 – 22:30)</option>
              <option value="TARDE">Tarde (13:30 – 17:30)</option>
              <option value="MANHÃ">Manhã (08:00 – 12:00)</option>
            </select>
          </div>

          {/* Status Carga Docente */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Status Carga Docente</label>
            <select
              value={statusCargaFiltro}
              onChange={(e) => setStatusCargaFiltro(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            >
              <option value="TODOS">Todos os Status</option>
              <option value="NORMAL">Dentro do Limite (&lt;80%)</option>
              <option value="ATENCAO">Carga Alta (80% a 100%)</option>
              <option value="SOBRECARGA">Sobrecarga (&gt;100%)</option>
            </select>
          </div>

          {/* Busca textual */}
          <div className={periodo === 'personalizado' ? 'sm:col-span-2 md:col-span-3 lg:col-span-6' : 'col-span-1'}>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Buscar Docente / Turma</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Filtrar por nome, matéria ou código..."
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              {termoBusca && (
                <button
                  type="button"
                  onClick={() => setTermoBusca('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Badges de filtros ativos */}
        {(escolaFiltro !== 'TODAS' ||
          professorFiltro !== 'TODOS' ||
          turnoFiltro !== 'TODOS' ||
          statusCargaFiltro !== 'TODOS' ||
          termoBusca.trim() !== '') && (
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-semibold text-slate-500">Filtros ativos:</span>

              {escolaFiltro !== 'TODAS' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-medium">
                  <School className="w-3 h-3" />
                  <span>Escola: {escolaFiltro}</span>
                  <button
                    type="button"
                    onClick={() => setEscolaFiltro('TODAS')}
                    className="hover:text-indigo-900 ml-0.5"
                    title="Remover filtro de escola"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {professorFiltro !== 'TODOS' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 border border-purple-200 text-purple-700 text-[11px] font-medium">
                  <GraduationCap className="w-3 h-3" />
                  <span>
                    Professor: {professores.find((p) => p.id === professorFiltro)?.nome || professorFiltro}
                  </span>
                  <button
                    type="button"
                    onClick={() => setProfessorFiltro('TODOS')}
                    className="hover:text-purple-900 ml-0.5"
                    title="Remover filtro de professor"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {turnoFiltro !== 'TODOS' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 border border-sky-200 text-sky-700 text-[11px] font-medium">
                  <span>Turno: {turnoFiltro}</span>
                  <button
                    type="button"
                    onClick={() => setTurnoFiltro('TODOS')}
                    className="hover:text-sky-900 ml-0.5"
                    title="Remover filtro de turno"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {statusCargaFiltro !== 'TODOS' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium">
                  <span>Status: {statusCargaFiltro}</span>
                  <button
                    type="button"
                    onClick={() => setStatusCargaFiltro('TODOS')}
                    className="hover:text-amber-900 ml-0.5"
                    title="Remover filtro de status"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {termoBusca.trim() !== '' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-medium">
                  <span>Busca: "{termoBusca}"</span>
                  <button
                    type="button"
                    onClick={() => setTermoBusca('')}
                    className="hover:text-slate-900 ml-0.5"
                    title="Limpar busca"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setEscolaFiltro('TODAS');
                setProfessorFiltro('TODOS');
                setTurnoFiltro('TODOS');
                setStatusCargaFiltro('TODOS');
                setTermoBusca('');
              }}
              className="text-[11px] text-slate-500 hover:text-slate-800 font-semibold underline decoration-slate-300 hover:decoration-slate-500"
            >
              Limpar todos os filtros
            </button>
          </div>
        )}
      </div>

      {/* KPI Cards Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Ocupação Média */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ocupação Semanal Média</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{taxaMediaOcupacao}%</h3>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>Salas ativas no período</span>
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Horas Semanais Alocadas */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Horas Alocadas / Semana</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{totalHorasSemanais}h</h3>
            <p className="text-[11px] text-slate-500 mt-1">
              {turmasFiltradas.length} turmas em atividade
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Professores Ativos */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Docentes em Aula</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
              {totalProfsAtivos} <span className="text-sm font-normal text-slate-400">/ {professores.length}</span>
            </h3>
            <p className="text-[11px] text-indigo-600 font-semibold mt-1">
              {Math.round((totalProfsAtivos / Math.max(1, professores.length)) * 100)}% do corpo docente
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Alerta de Sobrecarga */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status de Conformidade</p>
            <h3
              className={`text-2xl font-bold mt-0.5 ${
                totalProfsSobrecarga > 0 ? 'text-rose-600' : 'text-emerald-600'
              }`}
            >
              {totalProfsSobrecarga > 0 ? `${totalProfsSobrecarga} Sobrecarga` : '100% Regular'}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              {totalProfsSobrecarga > 0 ? 'Necessário remanejar horas' : 'Sem violações da Regra de Ouro'}
            </p>
          </div>
          <div
            className={`w-11 h-11 rounded-xl border flex items-center justify-center ${
              totalProfsSobrecarga > 0
                ? 'bg-rose-50 border-rose-100 text-rose-600'
                : 'bg-emerald-50 border-emerald-100 text-emerald-600'
            }`}
          >
            {totalProfsSobrecarga > 0 ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Gráfico 1: Ocupação (Semana, Mensal, Anual, Por Escola ou Por Professor) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                {visaoOcupacao === 'semana' && 'Ocupação Semanal por Dia da Semana'}
                {visaoOcupacao === 'mensal' && `Ocupação Mensal por Semanas (${MESES_NOMES[mesOcupacao - 1]})`}
                {visaoOcupacao === 'anual' && `Ocupação Anual (${anoOcupacao})`}
                {visaoOcupacao === 'escola' && 'Ocupação & Carga por Unidade Escolar'}
                {visaoOcupacao === 'professor' && 'Carga Horária & Ocupação por Docente'}
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {visaoOcupacao === 'semana' && 'Volume de horas de aula e taxa de aproveitamento das salas por dia útil'}
                {visaoOcupacao === 'mensal' && 'Distribuição semanal das horas letivas e taxa de ocupação no mês'}
                {visaoOcupacao === 'anual' && 'Evolução do volume de horas e taxa de ocupação ao longo dos 12 meses do ano'}
                {visaoOcupacao === 'escola' && 'Segregação de turmas, horas alocadas e taxa de utilização das salas por unidade de atuação'}
                {visaoOcupacao === 'professor' && 'Distribuição das horas letivas alocadas e percentual de aproveitamento de carga por professor'}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Seletor de mês para a visão Mensal */}
              {visaoOcupacao === 'mensal' && (
                <select
                  value={mesOcupacao}
                  onChange={(e) => setMesOcupacao(Number(e.target.value))}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2 py-1 font-semibold focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                >
                  {MESES_NOMES.map((m, idx) => (
                    <option key={m} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              )}

              {/* Toggle Semana / Mensal / Anual / Por Escola / Por Professor */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs flex-wrap">
                <button
                  type="button"
                  id="btn-ocupacao-semana"
                  onClick={() => setVisaoOcupacao('semana')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    visaoOcupacao === 'semana'
                      ? 'bg-white text-indigo-700 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Semana
                </button>
                <button
                  type="button"
                  id="btn-ocupacao-mensal"
                  onClick={() => setVisaoOcupacao('mensal')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    visaoOcupacao === 'mensal'
                      ? 'bg-white text-indigo-700 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Mensal
                </button>
                <button
                  type="button"
                  id="btn-ocupacao-anual"
                  onClick={() => setVisaoOcupacao('anual')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    visaoOcupacao === 'anual'
                      ? 'bg-white text-indigo-700 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Anual
                </button>
                <button
                  type="button"
                  id="btn-ocupacao-escola"
                  onClick={() => setVisaoOcupacao('escola')}
                  className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                    visaoOcupacao === 'escola'
                      ? 'bg-white text-indigo-700 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Segregar ocupação por unidade escolar / local de atuação"
                >
                  <School className="w-3 h-3" />
                  <span>Por Escola</span>
                </button>
                <button
                  type="button"
                  id="btn-ocupacao-professor"
                  onClick={() => setVisaoOcupacao('professor')}
                  className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                    visaoOcupacao === 'professor'
                      ? 'bg-white text-indigo-700 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Visualizar ocupação e carga distribuída por professor"
                >
                  <GraduationCap className="w-3 h-3" />
                  <span>Por Professor</span>
                </button>
              </div>

              {/* Badge total de horas */}
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-md">
                Total:{' '}
                {visaoOcupacao === 'semana' && `${totalHorasOcupacaoAtiva}h semanais`}
                {visaoOcupacao === 'mensal' && `${totalHorasOcupacaoAtiva}h no mês`}
                {visaoOcupacao === 'anual' && `${totalHorasOcupacaoAtiva}h no ano`}
                {visaoOcupacao === 'escola' && `${totalHorasOcupacaoAtiva}h nas escolas`}
                {visaoOcupacao === 'professor' && `${totalHorasOcupacaoAtiva}h com docentes`}
              </span>
            </div>
          </div>

          <div className="w-full h-80 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={dadosOcupacaoAtivos}
                margin={{ top: 10, right: 15, left: -15, bottom: visaoOcupacao === 'escola' || visaoOcupacao === 'professor' ? 15 : 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                  interval={0}
                  angle={visaoOcupacao === 'escola' || visaoOcupacao === 'professor' ? -15 : 0}
                  textAnchor={visaoOcupacao === 'escola' || visaoOcupacao === 'professor' ? 'end' : 'middle'}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  label={{ value: 'Horas', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 10 }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, visaoOcupacao === 'professor' ? 'auto' : 100]}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  unit="%"
                />
                <Tooltip content={<CustomTooltipOcupacao />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="horasAlocadas"
                  name={visaoOcupacao === 'professor' ? 'Horas Alocadas' : 'Horas de Aula'}
                  fill="#4f46e5"
                  radius={[4, 4, 0, 0]}
                  barSize={visaoOcupacao === 'anual' ? 20 : visaoOcupacao === 'professor' ? 22 : visaoOcupacao === 'escola' ? 26 : 32}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="taxaOcupacao"
                  name={visaoOcupacao === 'professor' ? 'Aproveitamento Carga (%)' : 'Taxa de Ocupação (%)'}
                  stroke="#d97706"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#d97706', strokeWidth: 1, stroke: '#fff' }}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Micro-insights footer */}
          <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 text-center text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">
                {visaoOcupacao === 'semana' && 'Dia com Maior Carga'}
                {visaoOcupacao === 'mensal' && 'Semana com Maior Carga'}
                {visaoOcupacao === 'anual' && 'Mês de Pico Letivo'}
                {visaoOcupacao === 'escola' && 'Unidade com Maior Carga'}
                {visaoOcupacao === 'professor' && 'Docente com Maior Carga'}
              </span>
              <span className="font-bold text-slate-800">
                {
                  [...dadosOcupacaoAtivos].sort((a, b) => b.horasAlocadas - a.horasAlocadas)[0]?.nomeCompleto ||
                  'Nenhum'
                }
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">
                {visaoOcupacao === 'semana' && 'Média Diária'}
                {visaoOcupacao === 'mensal' && 'Média Semanal no Mês'}
                {visaoOcupacao === 'anual' && 'Média Mensal'}
                {visaoOcupacao === 'escola' && 'Média por Unidade'}
                {visaoOcupacao === 'professor' && 'Média por Docente'}
              </span>
              <span className="font-bold text-slate-800">
                {visaoOcupacao === 'semana' && `${Math.round(totalHorasOcupacaoAtiva / 6)}h / dia`}
                {visaoOcupacao === 'mensal' && `${Math.round(totalHorasOcupacaoAtiva / 5)}h / semana`}
                {visaoOcupacao === 'anual' && `${Math.round(totalHorasOcupacaoAtiva / 12)}h / mês`}
                {visaoOcupacao === 'escola' && `${dadosOcupacaoAtivos.length > 0 ? Math.round(totalHorasOcupacaoAtiva / dadosOcupacaoAtivos.length) : 0}h / escola`}
                {visaoOcupacao === 'professor' && `${dadosOcupacaoAtivos.length > 0 ? Math.round(totalHorasOcupacaoAtiva / dadosOcupacaoAtivos.length) : 0}h / docente`}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">
                {visaoOcupacao === 'professor' ? 'Aproveitamento Médio' : 'Ocupação Média'}
              </span>
              <span className="font-bold text-emerald-600">{taxaMediaOcupacaoAtiva}% médio</span>
            </div>
          </div>
        </div>

        {/* Gráfico 3: Distribuição da Carga por Escola / Unidade (Donut) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Distribuição por Unidade Escolar
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Repartição percentual das turmas e horas entre as escolas
              </p>
            </div>
            <School className="w-4 h-4 text-slate-400" />
          </div>

          <div className="w-full h-80 flex items-center justify-center">
            {dadosDistribuicaoEscola.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dadosDistribuicaoEscola}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="horas"
                    nameKey="nome"
                  >
                    {dadosDistribuicaoEscola.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, name: any, item: any) => [
                      `${value}h de aula (${item.payload.turmas} turmas)`,
                      name,
                    ]}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '11px',
                      border: 'none',
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-xs text-slate-400">Nenhuma turma alocada para os filtros selecionados.</div>
            )}
          </div>
        </div>
      </div>

      {/* Gráfico 2: Carga Horária Total Distribuída por Professores */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Carga Horária Total Distribuída por Professores
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Comparativo direto entre carga alocada e teto contratual do docente no período ({semanasNoPeriodo.toFixed(1)} semanas)
            </p>
          </div>

          {/* Metric Toggle (Semanal vs Período Completo) */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Métrica exibida:</span>
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                onClick={() => setVisaoMetricaDocente('semanal')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  visaoMetricaDocente === 'semanal'
                    ? 'bg-white text-indigo-700 font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Horas / Semana
              </button>
              <button
                onClick={() => setVisaoMetricaDocente('mensal')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  visaoMetricaDocente === 'mensal'
                    ? 'bg-white text-indigo-700 font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Total no Período
              </button>
            </div>
          </div>
        </div>

        {/* Legend pills for status */}
        <div className="flex items-center gap-4 text-xs mb-3 pb-2 border-b border-slate-100 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block"></span>
            <span className="text-slate-600">Dentro do Limite (&lt;80%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
            <span className="text-slate-600">Carga Alta (80% - 100%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block"></span>
            <span className="text-slate-600 font-semibold">Sobrecarga (&gt;100%)</span>
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-300 inline-block"></span>
            <span className="text-slate-500">Teto Máximo Permitido</span>
          </div>
        </div>

        <div className="w-full h-88 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={dadosCargaProfessores}
              margin={{ top: 10, right: 15, left: -10, bottom: 25 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="nomeAbrev"
                tick={{ fontSize: 11, fill: '#475569' }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
                angle={-15}
                textAnchor="end"
                height={40}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                label={{ value: 'Horas', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 10 }}
              />
              <Tooltip content={<CustomTooltipDocentes />} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
              />
              <Bar
                dataKey="cargaExibida"
                name="Carga Alocada (h)"
                radius={[4, 4, 0, 0]}
                barSize={28}
              >
                {dadosCargaProfessores.map((entry, index) => {
                  let fillColor = '#4f46e5';
                  if (entry.statusCarga === 'SOBRECARGA') fillColor = '#e11d48';
                  else if (entry.statusCarga === 'ATENÇÃO') fillColor = '#f59e0b';
                  return <Cell key={`bar-${index}`} fill={fillColor} />;
                })}
              </Bar>
              <Bar
                dataKey="cargaMaximaPeriodo"
                name="Teto Contratual Máximo (h)"
                fill="#cbd5e1"
                radius={[4, 4, 0, 0]}
                barSize={14}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detalhamento Tabular dos Professores com Métricas de Ocupação */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Quadro Analítico de Docentes & Cargas Horárias
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Detalhamento nominal com verificação de compliance de carga e turmas sob responsabilidade
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {dadosCargaProfessores.length} docentes listados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Docente</th>
                <th className="py-3 px-4">Competências Principais</th>
                <th className="py-3 px-4 text-center">Carga Alocada</th>
                <th className="py-3 px-4 text-center">Teto Máx.</th>
                <th className="py-3 px-4">Utilização (%)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Dias que Leciona</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dadosCargaProfessores.map((prof) => (
                <tr key={prof.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-900">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[10px]">
                        {prof.nome.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 leading-tight">{prof.nome}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{prof.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 max-w-xs">
                    <div className="flex flex-wrap gap-1">
                      {prof.competencias.slice(0, 2).map((comp) => (
                        <span
                          key={comp}
                          className="px-1.5 py-0.5 bg-slate-100 text-slate-700 text-[10px] rounded border border-slate-200 truncate"
                        >
                          {comp}
                        </span>
                      ))}
                      {prof.competencias.length > 2 && (
                        <span className="text-[10px] text-slate-400">+{prof.competencias.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-indigo-700">
                    {prof.cargaExibida}h
                    <span className="text-[10px] font-normal text-slate-400 block">
                      {prof.horasSemanais}h/sem
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center text-slate-500 font-medium">
                    {prof.cargaMaximaPeriodo}h
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="w-32">
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="font-semibold">{prof.percentualUso}%</span>
                        <span className="text-slate-400">{prof.cargaExibida}/{prof.cargaMaximaPeriodo}h</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            prof.statusCarga === 'SOBRECARGA'
                              ? 'bg-rose-500'
                              : prof.statusCarga === 'ATENÇÃO'
                              ? 'bg-amber-500'
                              : 'bg-indigo-600'
                          }`}
                          style={{ width: `${Math.min(100, prof.percentualUso)}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        prof.statusCarga === 'SOBRECARGA'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : prof.statusCarga === 'ATENÇÃO'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {prof.statusCarga === 'SOBRECARGA'
                        ? 'Sobrecarga'
                        : prof.statusCarga === 'ATENÇÃO'
                        ? 'Próximo ao Teto'
                        : 'Equilibrado'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">
                    {prof.diasQueLeciona.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {prof.diasQueLeciona.map((d) => (
                          <span
                            key={d}
                            className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded font-semibold"
                          >
                            {DIAS_ABREV[d]?.slice(0, 3).toUpperCase()}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">Sem aulas alocadas</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {onSelectProfessor && (
                      <button
                        onClick={() => onSelectProfessor(prof.id)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-md transition-all inline-flex items-center gap-1"
                      >
                        <span>Ver Docente</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {dadosCargaProfessores.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Nenhum docente encontrado para os critérios de busca selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Componente de Log de Auditoria no Dashboard (Acesso Exclusivo para ADMIN) */}
      {usuarioAtual?.perfil === 'ADMIN' && (
        <AuditLogTable usuarioAtual={usuarioAtual} />
      )}
    </div>
  );
};

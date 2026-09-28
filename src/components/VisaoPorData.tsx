import React, { useState, useMemo } from 'react';
import { Professor, Turma, Turno, DiaSemana, ComponenteDaTurma } from '../types/rios';
import { obterStatusDocenteNoTurno } from '../services/riosEngine';
import {
  Calendar,
  CalendarDays,
  CalendarRange,
  Clock,
  School,
  Building,
  CheckCircle2,
  User,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Filter,
  Users,
  GraduationCap,
  AlertTriangle,
  ArrowRightLeft,
  Edit,
  Sparkles,
  Layers,
  ArrowUpRight,
  Info,
} from 'lucide-react';
import {
  parseDataBR,
  formatarDataBR,
  isDataNoIntervalo,
  getDiaSemanaPorData,
  getDiasDaSemana,
  getDiasDoMes,
  verificarConflitoProfessor,
} from '../utils/conflitoAgenda';

export type ModoCalendario = 'SEMANAL' | 'MENSAL' | 'ANUAL' | 'DIARIO';

interface VisaoPorDataProps {
  professores: Professor[];
  turmas: Turma[];
  onOpenSubstituicao?: (turma: Turma, componente: ComponenteDaTurma) => void;
  onOpenEditarComponente?: (turma: Turma, componente: ComponenteDaTurma) => void;
}

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

const DIAS_SEMANA_NOMES: DiaSemana[] = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

const TURNOS: Turno[] = ['MANHÃ', 'TARDE', 'NOITE'];

export const VisaoPorData: React.FC<VisaoPorDataProps> = ({
  professores,
  turmas,
  onOpenSubstituicao,
  onOpenEditarComponente,
}) => {
  // Modo de visualização ativo
  const [modoVisualizacao, setModoVisualizacao] = useState<ModoCalendario>('SEMANAL');

  // Estados de navegação temporal (padrão em Setembro/2026)
  const [dataBaseSemana, setDataBaseSemana] = useState<Date>(() => new Date(2026, 8, 7)); // 07/09/2026 (segunda-feira)
  const [anoSelecionado, setAnoSelecionado] = useState<number>(2026);
  const [mesSelecionado, setMesSelecionado] = useState<number>(8); // 8 = Setembro
  const [diaSelecionadoInspecao, setDiaSelecionadoInspecao] = useState<Date>(
    () => new Date(2026, 8, 7)
  );

  // Filtros
  const [filtroProfessor, setFiltroProfessor] = useState<string>('TODOS');
  const [filtroEscola, setFiltroEscola] = useState<string>('TODAS');
  const [filtroTurno, setFiltroTurno] = useState<string>('TODOS');

  // Estado do instantâneo diário legado
  const [dataInstantaneo, setDataInstantaneo] = useState<string>('2026-09-10');
  const [horarioInstantaneo, setHorarioInstantaneo] = useState<string>('19:00');

  // Lista única de escolas
  const escolasDisponiveis = useMemo(() => {
    const set = new Set<string>();
    turmas.forEach((t) => set.add(t.escola));
    return Array.from(set);
  }, [turmas]);

  // Navegações de semana
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

  const irParaHojeSemana = () => {
    setDataBaseSemana(new Date(2026, 8, 7));
  };

  // Navegações de mês
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

  const irParaHojeMes = () => {
    setAnoSelecionado(2026);
    setMesSelecionado(8);
  };

  // Dias da semana atual (Segunda a Sábado)
  const diasDaSemana = useMemo(() => {
    return getDiasDaSemana(dataBaseSemana, true);
  }, [dataBaseSemana]);

  // Dias do mês selecionado
  const diasDoMes = useMemo(() => {
    return getDiasDoMes(anoSelecionado, mesSelecionado);
  }, [anoSelecionado, mesSelecionado]);

  /**
   * Helper: localiza aulas ativas de turmas em uma data e turno específicos
   */
  const obterAulasNaDataETurno = (data: Date, turno: Turno) => {
    const diaSemanaNome = getDiaSemanaPorData(data);
    if (!diaSemanaNome) return [];

    return turmas
      .filter((t) => {
        if (filtroTurno !== 'TODOS' && t.turno !== filtroTurno) return false;
        if (filtroEscola !== 'TODAS' && t.escola !== filtroEscola) return false;
        if (t.turno !== turno) return false;
        // Verifica se a turma leciona nesse dia da semana
        if (t.diaSemana !== diaSemanaNome) return false;
        return true;
      })
      .map((t) => {
        // Encontra o componente em andamento ou que abrange esta data
        const compAtivo =
          t.componentes.find((c) => isDataNoIntervalo(data, c.dataInicio, c.dataFim || c.dataConclusao)) ||
          t.componentes.find((c) => c.status === 'EM ANDAMENTO') ||
          t.componentes[0];

        if (!compAtivo) return null;

        if (
          filtroProfessor !== 'TODOS' &&
          compAtivo.professorId !== filtroProfessor
        ) {
          return null;
        }

        // Verifica choque de horário para esse professor
        const temConflito = compAtivo.professorId
          ? verificarConflitoProfessor({
              professorId: compAtivo.professorId,
              professorNome: compAtivo.professorNome,
              dataInicio: compAtivo.dataInicio,
              dataFim: compAtivo.dataFim || compAtivo.dataConclusao,
              diaSemanaTurma: t.diaSemana,
              turnoTurma: t.turno,
              horarioTurma: t.horario,
              turmaIdAtual: t.id,
              componenteIdAtual: compAtivo.id,
              todasTurmas: turmas,
            }).temConflito
          : false;

        return {
          turma: t,
          componente: compAtivo,
          temConflito,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  };

  /**
   * Helper: obtém todas as aulas ativas em uma data
   */
  const obterTodasAulasNaData = (data: Date) => {
    const diaSemanaNome = getDiaSemanaPorData(data);
    if (!diaSemanaNome) return [];

    return turmas
      .filter((t) => {
        if (filtroTurno !== 'TODOS' && t.turno !== filtroTurno) return false;
        if (filtroEscola !== 'TODAS' && t.escola !== filtroEscola) return false;
        if (t.diaSemana !== diaSemanaNome) return false;
        return true;
      })
      .map((t) => {
        const compAtivo =
          t.componentes.find((c) => isDataNoIntervalo(data, c.dataInicio, c.dataFim || c.dataConclusao)) ||
          t.componentes.find((c) => c.status === 'EM ANDAMENTO') ||
          t.componentes[0];

        if (!compAtivo) return null;

        if (
          filtroProfessor !== 'TODOS' &&
          compAtivo.professorId !== filtroProfessor
        ) {
          return null;
        }

        return {
          turma: t,
          componente: compAtivo,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  };

  // Resumo estatístico do mês
  const metricasMes = useMemo(() => {
    let totalAulas = 0;
    let totalHoras = 0;
    const profsSet = new Set<string>();
    const turmasSet = new Set<string>();

    diasDoMes.forEach(({ date, isCurrentMonth }) => {
      if (!isCurrentMonth) return;
      const aulas = obterTodasAulasNaData(date);
      totalAulas += aulas.length;
      aulas.forEach((a) => {
        turmasSet.add(a.turma.id);
        totalHoras += 4; // 4h padrão por aula/encontro
        if (a.componente.professorId) {
          profsSet.add(a.componente.professorId);
        }
      });
    });

    return {
      totalAulas,
      totalHoras,
      totalProfessores: profsSet.size,
      totalTurmas: turmasSet.size,
    };
  }, [diasDoMes, turmas, filtroProfessor, filtroEscola, filtroTurno]);

  // Aulas do dia selecionado para inspeção
  const aulasDiaInspecao = useMemo(() => {
    return obterTodasAulasNaData(diaSelecionadoInspecao);
  }, [diaSelecionadoInspecao, turmas, filtroProfessor, filtroEscola, filtroTurno]);

  return (
    <div className="space-y-6">
      {/* Top Header & View Switcher */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                <CalendarDays className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900 leading-tight">
                  Calendário & Escala Operacional
                </h2>
                <p className="text-xs text-slate-500">
                  Visão completa de alocação de turmas e docentes por perspectivas temporal Semanal, Mensal e Anual.
                </p>
              </div>
            </div>
          </div>

          {/* Segmented Controller: Semanal / Mensal / Anual / Diário */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 self-start lg:self-auto overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setModoVisualizacao('SEMANAL')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                modoVisualizacao === 'SEMANAL'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>Visão Semanal</span>
            </button>

            <button
              type="button"
              onClick={() => setModoVisualizacao('MENSAL')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                modoVisualizacao === 'MENSAL'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5 text-indigo-600" />
              <span>Visão Mensal</span>
            </button>

            <button
              type="button"
              onClick={() => setModoVisualizacao('ANUAL')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                modoVisualizacao === 'ANUAL'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>Visão Anual</span>
            </button>

            <button
              type="button"
              onClick={() => setModoVisualizacao('DIARIO')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                modoVisualizacao === 'DIARIO'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              <span>Instantâneo</span>
            </button>
          </div>
        </div>

        {/* Global Filter Bar */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 font-bold text-slate-700">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Filtros:</span>
            </div>

            {/* Filtro Docente */}
            <select
              value={filtroProfessor}
              onChange={(e) => setFiltroProfessor(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="TODOS">Todos os Professores</option>
              {professores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>

            {/* Filtro Escola */}
            <select
              value={filtroEscola}
              onChange={(e) => setFiltroEscola(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="TODAS">Todas as Escolas</option>
              {escolasDisponiveis.map((esc) => (
                <option key={esc} value={esc}>
                  {esc}
                </option>
              ))}
            </select>

            {/* Filtro Turno */}
            <select
              value={filtroTurno}
              onChange={(e) => setFiltroTurno(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="TODOS">Todos os Turnos</option>
              <option value="MANHÃ">Manhã (07:30 - 11:30)</option>
              <option value="TARDE">Tarde (13:30 - 17:30)</option>
              <option value="NOITE">Noite (18:30 - 22:30)</option>
            </select>
          </div>

          {(filtroProfessor !== 'TODOS' ||
            filtroEscola !== 'TODAS' ||
            filtroTurno !== 'TODOS') && (
            <button
              type="button"
              onClick={() => {
                setFiltroProfessor('TODOS');
                setFiltroEscola('TODAS');
                setFiltroTurno('TODOS');
              }}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* =========================================================================
          MODO 1: VISÃO SEMANAL
          ========================================================================= */}
      {modoVisualizacao === 'SEMANAL' && (
        <div className="space-y-4">
          {/* Week Navigation Header */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={retrocederSemana}
                className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors"
                title="Semana Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-lg border border-slate-200">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span className="font-bold text-slate-900 text-xs sm:text-sm">
                  Semana de {formatarDataBR(diasDaSemana[0])} a{' '}
                  {formatarDataBR(diasDaSemana[diasDaSemana.length - 1])}
                </span>
              </div>

              <button
                type="button"
                onClick={avancarSemana}
                className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors"
                title="Próxima Semana"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={irParaHojeSemana}
                className="px-2.5 py-1 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors ml-1"
              >
                Hoje
              </button>
            </div>

            <div className="text-xs text-slate-500 flex items-center gap-3">
              <span className="flex items-center gap-1 font-semibold text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Horário Regular
              </span>
              <span className="flex items-center gap-1 font-semibold text-rose-700">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                Alerta de Choque
              </span>
            </div>
          </div>

          {/* Weekly Grid */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-x-auto">
            <div className="min-w-[960px]">
              {/* Header Days */}
              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                <div className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider border-r border-slate-200 text-center flex items-center justify-center">
                  Turno / Horário
                </div>
                {diasDaSemana.map((dataDia, idx) => {
                  const nomeDia = DIAS_SEMANA_NOMES[idx];
                  const diaFormatado = formatarDataBR(dataDia).substring(0, 5);
                  const aulasDia = obterTodasAulasNaData(dataDia);

                  return (
                    <div
                      key={dataDia.toISOString()}
                      className="p-3 text-center border-r border-slate-200 last:border-r-0"
                    >
                      <div className="text-xs font-bold text-slate-900">{nomeDia}</div>
                      <div className="text-[11px] font-semibold text-indigo-600 mt-0.5">
                        {diaFormatado}
                      </div>
                      <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200/80 text-slate-700 font-bold">
                        {aulasDia.length} {aulasDia.length === 1 ? 'turma' : 'turmas'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Rows per Turno */}
              {TURNOS.map((turno) => {
                if (filtroTurno !== 'TODOS' && filtroTurno !== turno) return null;

                const labelHorario =
                  turno === 'MANHÃ'
                    ? '07:30 – 11:30'
                    : turno === 'TARDE'
                    ? '13:30 – 17:30'
                    : '18:30 – 22:30';

                return (
                  <div
                    key={turno}
                    className="grid grid-cols-7 border-b border-slate-200 last:border-b-0 min-h-[160px]"
                  >
                    {/* Shift Label Header */}
                    <div className="p-3 border-r border-slate-200 bg-slate-50/60 flex flex-col justify-center items-center text-center">
                      <span
                        className={`text-xs font-black px-2 py-0.5 rounded-md ${
                          turno === 'MANHÃ'
                            ? 'bg-blue-100 text-blue-800'
                            : turno === 'TARDE'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}
                      >
                        {turno}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium mt-1">
                        {labelHorario}
                      </span>
                    </div>

                    {/* Columns for each day of the week */}
                    {diasDaSemana.map((dataDia) => {
                      const aulas = obterAulasNaDataETurno(dataDia, turno);

                      return (
                        <div
                          key={dataDia.toISOString() + turno}
                          className="p-2 border-r border-slate-200 last:border-r-0 space-y-2 bg-white hover:bg-slate-50/40 transition-colors"
                        >
                          {aulas.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-[11px] text-slate-300 font-medium select-none min-h-[100px]">
                              Sem aulas
                            </div>
                          ) : (
                            aulas.map(({ turma: t, componente: comp, temConflito }) => {
                              return (
                                <div
                                  key={t.id + comp.id}
                                  className={`p-2.5 rounded-lg border text-xs space-y-1.5 transition-all shadow-2xs ${
                                    temConflito
                                      ? 'bg-rose-50 border-rose-300 ring-1 ring-rose-200'
                                      : 'bg-slate-50/90 border-slate-200 hover:border-indigo-300'
                                  }`}
                                >
                                  {/* Code and status */}
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-black text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded text-[11px] border border-indigo-200">
                                      {t.codigo}
                                    </span>
                                    {temConflito ? (
                                      <span className="text-[9px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                        <AlertTriangle className="w-2.5 h-2.5" /> Choque
                                      </span>
                                    ) : (
                                      <span
                                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                          comp.status === 'CONCLUÍDO'
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : comp.status === 'EM ANDAMENTO'
                                            ? 'bg-blue-100 text-blue-800'
                                            : 'bg-amber-100 text-amber-800'
                                        }`}
                                      >
                                        {comp.status}
                                      </span>
                                    )}
                                  </div>

                                  {/* Component name */}
                                  <div
                                    className="font-bold text-slate-900 line-clamp-1 leading-tight"
                                    title={comp.nome}
                                  >
                                    {comp.nome}
                                  </div>

                                  {/* Component Period */}
                                  {(comp.dataInicio || comp.dataFim) && (
                                    <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                                      <Calendar className="w-3 h-3 text-slate-400" />
                                      <span>
                                        {comp.dataInicio || '?'} ➔ {comp.dataFim || '?'}
                                      </span>
                                    </div>
                                  )}

                                  {/* Teacher */}
                                  <div className="flex items-center gap-1.5 pt-0.5">
                                    <div className="w-4 h-4 rounded-full bg-slate-300 text-slate-800 flex items-center justify-center text-[9px] font-bold shrink-0">
                                      {comp.professorNome
                                        ? comp.professorNome.charAt(0)
                                        : '?'}
                                    </div>
                                    <span
                                      className="font-semibold text-slate-800 text-[11px] truncate"
                                      title={comp.professorNome || 'Docente a definir'}
                                    >
                                      {comp.professorNome || 'Docente a definir'}
                                    </span>
                                  </div>

                                  {/* Room & School */}
                                  <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-200/60">
                                    <span className="truncate max-w-[85px]">{t.escola}</span>
                                    <span className="font-bold text-slate-700 bg-white px-1 py-0.2 rounded border border-slate-200">
                                      {t.sala}
                                    </span>
                                  </div>

                                  {/* Quick Actions */}
                                  <div className="pt-1 flex items-center justify-end gap-1">
                                    {onOpenSubstituicao && (
                                      <button
                                        type="button"
                                        onClick={() => onOpenSubstituicao(t, comp)}
                                        className="p-1 rounded bg-white hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 border border-slate-200"
                                        title="Substituir Professor"
                                      >
                                        <ArrowRightLeft className="w-3 h-3" />
                                      </button>
                                    )}
                                    {onOpenEditarComponente && (
                                      <button
                                        type="button"
                                        onClick={() => onOpenEditarComponente(t, comp)}
                                        className="p-1 rounded bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200"
                                        title="Editar Componente e Datas"
                                      >
                                        <Edit className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODO 2: VISÃO MENSAL
          ========================================================================= */}
      {modoVisualizacao === 'MENSAL' && (
        <div className="space-y-4">
          {/* Monthly Control & KPIs */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Month & Year Picker */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={retrocederMes}
                className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700"
                title="Mês Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2">
                <select
                  value={mesSelecionado}
                  onChange={(e) => setMesSelecionado(Number(e.target.value))}
                  className="bg-slate-50 border border-slate-300 font-bold text-slate-900 text-xs sm:text-sm rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500"
                >
                  {MESES_NOMES.map((m, idx) => (
                    <option key={m} value={idx}>
                      {m}
                    </option>
                  ))}
                </select>

                <select
                  value={anoSelecionado}
                  onChange={(e) => setAnoSelecionado(Number(e.target.value))}
                  className="bg-slate-50 border border-slate-300 font-bold text-slate-900 text-xs sm:text-sm rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500"
                >
                  {[2025, 2026, 2027, 2028].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={avancarMes}
                className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700"
                title="Próximo Mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={irParaHojeMes}
                className="px-2.5 py-1 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Mês Atual
              </button>
            </div>

            {/* Quick KPIs for the month */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 font-medium text-slate-700">
                <strong className="text-indigo-600 font-black">
                  {metricasMes.totalAulas}
                </strong>{' '}
                aulas no mês
              </div>
              <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 font-medium text-slate-700">
                <strong className="text-emerald-600 font-black">
                  {metricasMes.totalHoras}h
                </strong>{' '}
                programadas
              </div>
              <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 font-medium text-slate-700">
                <strong className="text-slate-900 font-black">
                  {metricasMes.totalProfessores}
                </strong>{' '}
                docentes em aula
              </div>
            </div>
          </div>

          {/* Monthly Calendar Grid */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Day Header */}
            <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200 text-center text-xs font-bold text-slate-600 py-2.5">
              <span>Dom</span>
              <span>Seg</span>
              <span>Ter</span>
              <span>Qua</span>
              <span>Qui</span>
              <span>Sex</span>
              <span>Sáb</span>
            </div>

            {/* Calendar Cells */}
            <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-200">
              {diasDoMes.map(({ date, isCurrentMonth, dayNumber }) => {
                const aulasNoDia = obterTodasAulasNaData(date);
                const isSelected =
                  diaSelecionadoInspecao.toDateString() === date.toDateString();

                return (
                  <div
                    key={date.toISOString()}
                    onClick={() => setDiaSelecionadoInspecao(date)}
                    className={`min-h-[105px] p-2 transition-all cursor-pointer flex flex-col justify-between ${
                      !isCurrentMonth
                        ? 'bg-slate-50/50 text-slate-400'
                        : isSelected
                        ? 'bg-indigo-50/60 ring-2 ring-indigo-500 ring-inset z-10'
                        : 'bg-white hover:bg-slate-50/70'
                    }`}
                  >
                    <div>
                      {/* Day Number and Pill */}
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className={`text-xs font-black rounded-full w-6 h-6 flex items-center justify-center ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-2xs'
                              : isCurrentMonth
                              ? 'text-slate-800'
                              : 'text-slate-400'
                          }`}
                        >
                          {dayNumber}
                        </span>

                        {aulasNoDia.length > 0 && isCurrentMonth && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            {aulasNoDia.length} {aulasNoDia.length === 1 ? 'aula' : 'aulas'}
                          </span>
                        )}
                      </div>

                      {/* Mini Class Cards */}
                      {isCurrentMonth && aulasNoDia.length > 0 && (
                        <div className="space-y-1">
                          {aulasNoDia.slice(0, 2).map(({ turma: t, componente: c }) => (
                            <div
                              key={t.id + c.id}
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded truncate border leading-tight ${
                                t.turno === 'MANHÃ'
                                  ? 'bg-blue-50 text-blue-900 border-blue-200'
                                  : t.turno === 'TARDE'
                                  ? 'bg-amber-50 text-amber-900 border-amber-200'
                                  : 'bg-indigo-50 text-indigo-900 border-indigo-200'
                              }`}
                              title={`${t.codigo} - ${c.nome} (${c.professorNome || 'Docente a definir'})`}
                            >
                              <span className="font-black mr-1">{t.codigo}</span>
                              <span className="font-normal truncate">
                                {c.professorNome ? c.professorNome.split(' ')[0] : 'Docente'}
                              </span>
                            </div>
                          ))}
                          {aulasNoDia.length > 2 && (
                            <div className="text-[9px] font-bold text-slate-500 pl-1">
                              +{aulasNoDia.length - 2} mais...
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Day footer indicator */}
                    {aulasNoDia.length > 0 && isCurrentMonth && (
                      <div className="text-[9px] font-semibold text-emerald-700 pt-1">
                        {aulasNoDia.length * 4}h de aula
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Day Inspector Panel */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Agenda Detalhada:{' '}
                    <span className="text-indigo-600">
                      {formatarDataBR(diaSelecionadoInspecao)} (
                      {getDiaSemanaPorData(diaSelecionadoInspecao) || 'Dia Não Letivo'})
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    {aulasDiaInspecao.length}{' '}
                    {aulasDiaInspecao.length === 1
                      ? 'aula programada'
                      : 'aulas programadas'}{' '}
                    nesta data selecionada.
                  </p>
                </div>
              </div>
            </div>

            {aulasDiaInspecao.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Nenhuma aula agendada para este dia de acordo com a ementa das turmas e filtros ativos.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                {aulasDiaInspecao.map(({ turma: t, componente: comp }) => {
                  return (
                    <div
                      key={t.id + comp.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2 hover:border-indigo-300 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded border border-indigo-200">
                          {t.codigo} • {t.turno}
                        </span>
                        <span className="text-xs font-semibold text-slate-600">
                          {t.horario}
                        </span>
                      </div>

                      <div className="font-bold text-slate-900 text-xs">
                        {comp.nome}
                      </div>
                      <div className="text-[11px] text-slate-500">{t.curso}</div>

                      <div className="pt-1 text-xs text-slate-700 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-semibold truncate">
                          {comp.professorNome || 'Docente a definir'}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                        <span>
                          {t.escola} • Sala {t.sala}
                        </span>

                        <div className="flex items-center gap-1">
                          {onOpenSubstituicao && (
                            <button
                              type="button"
                              onClick={() => onOpenSubstituicao(t, comp)}
                              className="px-2 py-1 rounded bg-white hover:bg-indigo-50 text-indigo-700 font-bold text-[11px] border border-slate-200 flex items-center gap-1"
                            >
                              <ArrowRightLeft className="w-3 h-3" />
                              Substituir
                            </button>
                          )}
                          {onOpenEditarComponente && (
                            <button
                              type="button"
                              onClick={() => onOpenEditarComponente(t, comp)}
                              className="p-1 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
                              title="Editar Componente"
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODO 3: VISÃO ANUAL
          ========================================================================= */}
      {modoVisualizacao === 'ANUAL' && (
        <div className="space-y-5">
          {/* Annual Control & Header */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                <Layers className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Planejamento e Mapa Anual • Ano Letivo {anoSelecionado}
                </h3>
                <p className="text-xs text-slate-500">
                  Distribuição dos 12 meses do calendário acadêmico e matriz de turmas ativas.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAnoSelecionado((prev) => prev - 1)}
                className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 bg-slate-100 rounded-lg font-black text-slate-900 text-sm">
                {anoSelecionado}
              </span>
              <button
                type="button"
                onClick={() => setAnoSelecionado((prev) => prev + 1)}
                className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 12 Months Heatmap Matrix */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {MESES_NOMES.map((nomeMes, mesIdx) => {
              // Calcular resumo para este mês
              const diasM = getDiasDoMes(anoSelecionado, mesIdx);
              let totalAulasNoMes = 0;
              const turmasAtivasNoMes = new Set<string>();

              diasM.forEach(({ date, isCurrentMonth }) => {
                if (!isCurrentMonth) return;
                const aulas = obterTodasAulasNaData(date);
                totalAulasNoMes += aulas.length;
                aulas.forEach((a) => turmasAtivasNoMes.add(a.turma.codigo));
              });

              const totalHorasNoMes = totalAulasNoMes * 4;
              const isMesAtual = mesIdx === mesSelecionado;

              return (
                <div
                  key={nomeMes}
                  className={`p-4 rounded-xl border transition-all shadow-2xs ${
                    isMesAtual
                      ? 'bg-indigo-50/40 border-indigo-300 ring-1 ring-indigo-200'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-900 text-sm">
                      {nomeMes}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {mesIdx < 6 ? '1º Semestre' : '2º Semestre'}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 mb-3">
                    <div className="flex justify-between">
                      <span>Aulas Programadas:</span>
                      <strong className="text-slate-900">{totalAulasNoMes}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Carga Horária:</span>
                      <strong className="text-emerald-700">{totalHorasNoMes}h</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Turmas em Sala:</span>
                      <strong className="text-indigo-700">{turmasAtivasNoMes.size}</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setMesSelecionado(mesIdx);
                      setModoVisualizacao('MENSAL');
                    }}
                    className="w-full py-1.5 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors flex items-center justify-center gap-1"
                  >
                    <span>Ver no Calendário</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Annual Turmas Sequence Gantt / Overview */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-slate-900">
                  Cronograma Anual de Turmas & Componentes ({anoSelecionado})
                </h4>
                <p className="text-xs text-slate-500">
                  Acompanhamento da progressão das turmas ao longo dos 12 meses do ano.
                </p>
              </div>
            </div>

            <div className="p-4 divide-y divide-slate-100 space-y-4">
              {turmas.map((t) => {
                const totalHoras = t.componentes.reduce(
                  (acc, c) => acc + c.cargaHoraria,
                  0
                );
                const horasConcluidas = t.componentes
                  .filter((c) => c.status === 'CONCLUÍDO')
                  .reduce((acc, c) => acc + c.cargaHoraria, 0);
                const perc =
                  totalHoras > 0
                    ? Math.round((horasConcluidas / totalHoras) * 100)
                    : 0;

                return (
                  <div key={t.id} className="pt-4 first:pt-0 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-xs border border-indigo-200">
                          {t.codigo}
                        </span>
                        <span className="font-bold text-slate-900 text-xs">
                          {t.curso}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          • {t.turno} ({t.diaSemana})
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-slate-500">
                          {horasConcluidas}h / {totalHoras}h ({perc}%)
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="font-semibold text-slate-700">{t.escola}</span>
                      </div>
                    </div>

                    {/* Progress Bar of Components */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {t.componentes.map((c, cIdx) => (
                        <div
                          key={c.id}
                          className={`p-2 rounded-lg border text-[11px] space-y-1 ${
                            c.status === 'CONCLUÍDO'
                              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                              : c.status === 'EM ANDAMENTO'
                              ? 'bg-blue-50/70 border-blue-200 text-blue-950'
                              : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold">
                            <span className="truncate max-w-[140px]">{c.nome}</span>
                            <span>{c.cargaHoraria}h</span>
                          </div>
                          {(c.dataInicio || c.dataFim) && (
                            <div className="text-[10px] text-slate-500">
                              {c.dataInicio || '?'} a {c.dataFim || '?'}
                            </div>
                          )}
                          <div className="text-[10px] font-semibold text-slate-600 truncate">
                            Docente: {c.professorNome || 'A definir'}
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

      {/* =========================================================================
          MODO 4: INSTANTÂNEO TEMPORAL DIÁRIO (PONTO ESPECÍFICO)
          ========================================================================= */}
      {modoVisualizacao === 'DIARIO' && (
        <div className="space-y-6">
          {/* Control Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Instantâneo Temporal de Ocupação Docente
                </h3>
                <p className="text-xs text-slate-500">
                  Consulte a posição operacional e disponibilidade de todos os professores no instante escolhido.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <input
                    id="input-data-consulta"
                    type="date"
                    value={dataInstantaneo}
                    onChange={(e) => setDataInstantaneo(e.target.value)}
                    className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-lg px-3 py-1.5 font-medium focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <select
                    id="select-horario-consulta"
                    value={horarioInstantaneo}
                    onChange={(e) => setHorarioInstantaneo(e.target.value)}
                    className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-lg px-3 py-1.5 font-semibold focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="08:30">08:30 (Manhã • 07:30 – 11:30)</option>
                    <option value="10:00">10:00 (Manhã • 07:30 – 11:30)</option>
                    <option value="14:00">14:00 (Tarde • 13:30 – 17:30)</option>
                    <option value="16:00">16:00 (Tarde • 13:30 – 17:30)</option>
                    <option value="19:00">19:00 (Noite • 18:30 – 22:30)</option>
                    <option value="21:00">21:00 (Noite • 18:30 – 22:30)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Status preview */}
            {(() => {
              const [hora] = horarioInstantaneo.split(':').map(Number);
              const turnoAtual: Turno =
                hora < 12 ? 'MANHÃ' : hora < 18 ? 'TARDE' : 'NOITE';
              const diaSemanaAtual: DiaSemana = 'Terça-feira';

              const statusDocentes = professores.map((p) =>
                obterStatusDocenteNoTurno(p, turmas, diaSemanaAtual, turnoAtual)
              );

              const profEmAula = statusDocentes.filter((s) => s.status === 'EM AULA');
              const profLivres = statusDocentes.filter((s) => s.status === 'LIVRE');

              return (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                  {/* Em Aula */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="bg-emerald-50/80 px-4 py-3 border-b border-emerald-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <h4 className="text-xs font-bold text-emerald-950">
                          Professores Em Aula ({profEmAula.length})
                        </h4>
                      </div>
                      <span className="text-[11px] text-emerald-700 font-medium">
                        Alocados e Ministrando
                      </span>
                    </div>

                    <div className="p-3 divide-y divide-slate-100">
                      {profEmAula.length === 0 ? (
                        <p className="text-slate-400 text-xs py-6 text-center">
                          Nenhum professor lecionando neste horário.
                        </p>
                      ) : (
                        profEmAula.map((item) => {
                          const aula = item.aulaAtual!;
                          return (
                            <div
                              key={item.professor.id}
                              className="py-2.5 first:pt-0 last:pb-0 space-y-1.5"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-900 text-xs">
                                  {item.professor.nome}
                                </span>
                                <span className="font-bold text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                  {aula.turmaCodigo}
                                </span>
                              </div>
                              <div className="text-xs text-slate-600">
                                {aula.componenteNome} ({aula.escola} • {aula.sala})
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Livres */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="bg-blue-50/80 px-4 py-3 border-b border-blue-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                        <h4 className="text-xs font-bold text-blue-950">
                          Professores Livres ({profLivres.length})
                        </h4>
                      </div>
                      <span className="text-[11px] text-blue-700 font-medium">
                        Sem choque de horário
                      </span>
                    </div>

                    <div className="p-3 divide-y divide-slate-100">
                      {profLivres.length === 0 ? (
                        <p className="text-slate-400 text-xs py-6 text-center">
                          Todos os professores ocupados.
                        </p>
                      ) : (
                        profLivres.map((item) => (
                          <div
                            key={item.professor.id}
                            className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between"
                          >
                            <span className="font-bold text-slate-900 text-xs">
                              {item.professor.nome}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              Disponível
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

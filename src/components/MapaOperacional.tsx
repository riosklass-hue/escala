import React, { useState, useMemo } from 'react';
import {
  Professor,
  Turma,
  Turno,
  DiaSemana,
  ComponenteDaTurma,
  HistoricoSubstituicao,
} from '../types/rios';
import {
  obterStatusDocenteNoTurno,
  calcularMetricasTurma,
  gerarRespostaLocalInteligente,
  ResumoOcupacaoSlot,
} from '../services/riosEngine';
import {
  parseDataBR,
  formatarDataBR,
  getDiasDaSemana,
  isDataNoIntervalo,
} from '../utils/conflitoAgenda';
import {
  Search,
  School,
  Clock,
  User,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  Building,
  Sparkles,
  Send,
  Loader2,
  Calendar,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';

interface MapaOperacionalProps {
  turmas: Turma[];
  professores: Professor[];
  historico?: HistoricoSubstituicao[];
  onOpenSubstituicao: (turma: Turma, componente: ComponenteDaTurma) => void;
  onSelectProfessor: (profId: string) => void;
}

type ModoTemporal = 'dia' | 'semana' | 'mes' | 'ano';

export const MapaOperacional: React.FC<MapaOperacionalProps> = ({
  turmas,
  professores,
  historico = [],
  onOpenSubstituicao,
  onSelectProfessor,
}) => {
  const [selectedTurno, setSelectedTurno] = useState<Turno>('NOITE');
  const [selectedDia, setSelectedDia] = useState<DiaSemana>('Terça-feira');
  const [modoTemporal, setModoTemporal] = useState<ModoTemporal>('dia');

  // Navegação de semana / mês / ano
  const [dataBaseSemana, setDataBaseSemana] = useState<Date>(new Date(2026, 8, 8)); // 08/09/2026
  const [mesSelecionado, setMesSelecionado] = useState<number>(8); // Setembro (0-indexado: 8)
  const [anoSelecionado, setAnoSelecionado] = useState<number>(2026);

  const [filtroEscola, setFiltroEscola] = useState<string>('TODAS');
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');
  const [termoBusca, setTermoBusca] = useState<string>('');

  // Inline AI Assistant Prompt state
  const [aiQuestion, setAiQuestion] = useState<string>('');
  const [aiResponse, setAiResponse] = useState<string>(
    'Analisando escala fixa... Identificado 2 professores com competência livres hoje:\n\n1. Maria Santos (92% compatibilidade)\n2. João Pereira (75% compatibilidade)'
  );
  const [aiLoading, setAiLoading] = useState<boolean>(false);

  const diasDisponiveis: DiaSemana[] = [
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado',
  ];

  const mesesNomes = [
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

  const turnosInfo = [
    { id: 'MANHÃ' as Turno, label: 'Manhã', horario: '07:30 – 11:30' },
    { id: 'TARDE' as Turno, label: 'Tarde', horario: '13:30 – 17:30' },
    { id: 'NOITE' as Turno, label: 'Noite', horario: '18:30 – 22:30' },
  ];

  // Datas da semana selecionada
  const diasDaSemanaAtual = useMemo(() => {
    return getDiasDaSemana(dataBaseSemana, true);
  }, [dataBaseSemana]);

  const inicioSemanaStr = useMemo(() => {
    return diasDaSemanaAtual[0] ? formatarDataBR(diasDaSemanaAtual[0]) : '';
  }, [diasDaSemanaAtual]);

  const fimSemanaStr = useMemo(() => {
    const ultimo = diasDaSemanaAtual[diasDaSemanaAtual.length - 1];
    return ultimo ? formatarDataBR(ultimo) : '';
  }, [diasDaSemanaAtual]);

  const navegarSemana = (direcao: number) => {
    const nova = new Date(dataBaseSemana);
    nova.setDate(nova.getDate() + direcao * 7);
    setDataBaseSemana(nova);
  };

  // Obter status de todos os professores de acordo com a perspectiva temporal (Dia, Semana, Mês, Ano)
  const statusDocentes: ResumoOcupacaoSlot[] = useMemo(() => {
    return professores.map((prof) => {
      // 1. MODO DIA
      if (modoTemporal === 'dia') {
        return obterStatusDocenteNoTurno(prof, turmas, selectedDia, selectedTurno);
      }

      // 2. MODO SEMANA: verifica se o professor tem aula ativa no turno durante os dias da semana selecionada
      if (modoTemporal === 'semana') {
        for (const turma of turmas) {
          if (turma.turno !== selectedTurno) continue;

          for (const comp of turma.componentes) {
            if (comp.professorId !== prof.id) continue;
            if (comp.status !== 'EM ANDAMENTO' && comp.status !== 'A MINISTRAR') continue;

            // Verifica se as datas do componente cruzam a semana
            const cruzamSemana = diasDaSemanaAtual.some((d) =>
              isDataNoIntervalo(d, comp.dataInicio, comp.dataFim || comp.dataConclusao)
            );

            if (cruzamSemana || comp.status === 'EM ANDAMENTO') {
              return {
                professor: prof,
                status: 'EM AULA',
                aulaAtual: {
                  turmaId: turma.id,
                  turmaCodigo: turma.codigo,
                  curso: turma.curso,
                  escola: turma.escola,
                  sala: turma.sala,
                  componenteId: comp.id,
                  componenteNome: comp.nome,
                  dataInicio: comp.dataInicio,
                  dataFim: comp.dataFim || comp.dataConclusao,
                  horario: turma.horario,
                  turno: turma.turno,
                },
              };
            }
          }
        }

        return {
          professor: prof,
          status: 'LIVRE',
        };
      }

      // 3. MODO MÊS: verifica se o professor tem componente ativo no mês e ano selecionados
      if (modoTemporal === 'mes') {
        const primeiroDiaMes = new Date(anoSelecionado, mesSelecionado, 1);
        const ultimoDiaMes = new Date(anoSelecionado, mesSelecionado + 1, 0);

        for (const turma of turmas) {
          if (turma.turno !== selectedTurno) continue;

          for (const comp of turma.componentes) {
            if (comp.professorId !== prof.id) continue;

            const dtIni = parseDataBR(comp.dataInicio);
            const dtFim = parseDataBR(comp.dataFim || comp.dataConclusao) || dtIni;

            let cruzaMes = false;
            if (dtIni && dtFim) {
              cruzaMes =
                dtIni.getTime() <= ultimoDiaMes.getTime() &&
                dtFim.getTime() >= primeiroDiaMes.getTime();
            } else if (comp.status === 'EM ANDAMENTO') {
              cruzaMes = true;
            }

            if (cruzaMes) {
              return {
                professor: prof,
                status: 'EM AULA',
                aulaAtual: {
                  turmaId: turma.id,
                  turmaCodigo: turma.codigo,
                  curso: turma.curso,
                  escola: turma.escola,
                  sala: turma.sala,
                  componenteId: comp.id,
                  componenteNome: comp.nome,
                  dataInicio: comp.dataInicio,
                  dataFim: comp.dataFim || comp.dataConclusao,
                  horario: turma.horario,
                  turno: turma.turno,
                },
              };
            }
          }
        }

        return {
          professor: prof,
          status: 'LIVRE',
        };
      }

      // 4. MODO ANO: verifica se o professor tem componente no ano selecionado
      if (modoTemporal === 'ano') {
        const primeiroDiaAno = new Date(anoSelecionado, 0, 1);
        const ultimoDiaAno = new Date(anoSelecionado, 11, 31);

        for (const turma of turmas) {
          if (turma.turno !== selectedTurno) continue;

          for (const comp of turma.componentes) {
            if (comp.professorId !== prof.id) continue;

            const dtIni = parseDataBR(comp.dataInicio);
            const dtFim = parseDataBR(comp.dataFim || comp.dataConclusao) || dtIni;

            let cruzaAno = false;
            if (dtIni && dtFim) {
              cruzaAno =
                dtIni.getTime() <= ultimoDiaAno.getTime() &&
                dtFim.getTime() >= primeiroDiaAno.getTime();
            } else if (comp.status === 'EM ANDAMENTO') {
              cruzaAno = true;
            }

            if (cruzaAno) {
              return {
                professor: prof,
                status: 'EM AULA',
                aulaAtual: {
                  turmaId: turma.id,
                  turmaCodigo: turma.codigo,
                  curso: turma.curso,
                  escola: turma.escola,
                  sala: turma.sala,
                  componenteId: comp.id,
                  componenteNome: comp.nome,
                  dataInicio: comp.dataInicio,
                  dataFim: comp.dataFim || comp.dataConclusao,
                  horario: turma.horario,
                  turno: turma.turno,
                },
              };
            }
          }
        }

        return {
          professor: prof,
          status: 'LIVRE',
        };
      }

      return {
        professor: prof,
        status: 'LIVRE',
      };
    });
  }, [
    professores,
    turmas,
    modoTemporal,
    selectedDia,
    selectedTurno,
    diasDaSemanaAtual,
    mesSelecionado,
    anoSelecionado,
  ]);

  // Filtragem
  const statusFiltrados = statusDocentes.filter((item) => {
    const busca = termoBusca.toLowerCase();
    const matchBusca =
      !termoBusca ||
      item.professor.nome.toLowerCase().includes(busca) ||
      (item.aulaAtual?.componenteNome.toLowerCase().includes(busca) ?? false) ||
      (item.aulaAtual?.turmaCodigo.toLowerCase().includes(busca) ?? false) ||
      (item.aulaAtual?.escola.toLowerCase().includes(busca) ?? false);

    const matchStatus = filtroStatus === 'TODOS' || item.status === filtroStatus;

    const matchEscola =
      filtroEscola === 'TODAS' ||
      (item.aulaAtual && item.aulaAtual.escola === filtroEscola) ||
      (item.status === 'LIVRE' && item.professor.escolasHabituais.includes(filtroEscola));

    return matchBusca && matchStatus && matchEscola;
  });

  const totalEmAula = statusDocentes.filter((s) => s.status === 'EM AULA').length;
  const totalLivres = statusDocentes.filter((s) => s.status === 'LIVRE').length;

  // Turma de destaque para o widget inferior (RH-01)
  const turmaDestaque = turmas.find((t) => t.codigo === 'RH-01') || turmas[0];
  const metricasDestaque = turmaDestaque ? calcularMetricasTurma(turmaDestaque) : null;

  const handleSendAi = async () => {
    if (!aiQuestion.trim() || aiLoading) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiQuestion }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.answer) {
          setAiResponse(data.answer);
          setAiLoading(false);
          setAiQuestion('');
          return;
        }
      }
      const resp = gerarRespostaLocalInteligente(aiQuestion, turmas, professores, historico);
      setAiResponse(resp);
    } catch {
      const resp = gerarRespostaLocalInteligente(aiQuestion, turmas, professores, historico);
      setAiResponse(resp);
    } finally {
      setAiLoading(false);
      setAiQuestion('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Turno selector */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Turno:
            </span>
            <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-50">
              {turnosInfo.map((turno) => (
                <button
                  key={turno.id}
                  id={`btn-turno-${turno.id.toLowerCase()}`}
                  onClick={() => setSelectedTurno(turno.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    selectedTurno === turno.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  {turno.label} ({turno.horario})
                </button>
              ))}
            </div>
          </div>

          {/* Temporal Perspective Switcher: Dia / Semana / Mês / Ano */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Perspectiva:
            </span>
            <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-100">
              <button
                id="btn-modo-dia"
                onClick={() => setModoTemporal('dia')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                  modoTemporal === 'dia'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Dia</span>
              </button>

              <button
                id="btn-modo-semana"
                onClick={() => setModoTemporal('semana')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                  modoTemporal === 'semana'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarRange className="w-3.5 h-3.5" />
                <span>Semana</span>
              </button>

              <button
                id="btn-modo-mes"
                onClick={() => setModoTemporal('mes')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                  modoTemporal === 'mes'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Mês</span>
              </button>

              <button
                id="btn-modo-ano"
                onClick={() => setModoTemporal('ano')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                  modoTemporal === 'ano'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Ano</span>
              </button>
            </div>
          </div>
        </div>

        {/* Second Row: Specific Temporal Selector & Search Input */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          {/* Controls specific to the selected Temporal Mode */}
          <div className="flex flex-wrap items-center gap-2">
            {/* 1. MODO DIA: Seletor de dia da semana */}
            {modoTemporal === 'dia' && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Dia:
                </span>
                <select
                  id="select-dia-semana"
                  value={selectedDia}
                  onChange={(e) => setSelectedDia(e.target.value as DiaSemana)}
                  className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-3 py-1.5 font-medium focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {diasDisponiveis.map((dia) => (
                    <option key={dia} value={dia}>
                      {dia}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 2. MODO SEMANA: Navegação de Semanas */}
            {modoTemporal === 'semana' && (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => navegarSemana(-1)}
                  title="Semana Anterior"
                  className="p-1 rounded hover:bg-slate-200/70 text-slate-600"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="px-2 text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span>
                    Semana: {inicioSemanaStr} a {fimSemanaStr}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => navegarSemana(1)}
                  title="Próxima Semana"
                  className="p-1 rounded hover:bg-slate-200/70 text-slate-600"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setDataBaseSemana(new Date())}
                  className="text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded ml-1"
                >
                  Semana Atual
                </button>
              </div>
            )}

            {/* 3. MODO MÊS: Seletor de Mês e Ano */}
            {modoTemporal === 'mes' && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Mês:
                </span>
                <select
                  value={mesSelecionado}
                  onChange={(e) => setMesSelecionado(Number(e.target.value))}
                  className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-3 py-1.5 font-medium focus:ring-1 focus:ring-indigo-500"
                >
                  {mesesNomes.map((nome, idx) => (
                    <option key={nome} value={idx}>
                      {nome}
                    </option>
                  ))}
                </select>

                <select
                  value={anoSelecionado}
                  onChange={(e) => setAnoSelecionado(Number(e.target.value))}
                  className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 font-medium focus:ring-1 focus:ring-indigo-500"
                >
                  <option value={2026}>2026</option>
                  <option value={2027}>2027</option>
                </select>
              </div>
            )}

            {/* 4. MODO ANO: Seletor de Ano Letivo */}
            {modoTemporal === 'ano' && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Ano Letivo:
                </span>
                <select
                  value={anoSelecionado}
                  onChange={(e) => setAnoSelecionado(Number(e.target.value))}
                  className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-3 py-1.5 font-bold text-indigo-700 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value={2026}>Ano 2026</option>
                  <option value={2027}>Ano 2027</option>
                  <option value={2028}>Ano 2028</option>
                </select>
              </div>
            )}
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              id="input-busca-mapa"
              type="text"
              placeholder="Buscar professor, turma..."
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Main Operational Table Card (Professional Polish Style) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
        {/* Card Header */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap justify-between items-center gap-2 bg-white">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Mapa de Alocação de Professores
            </h3>
            <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
              {modoTemporal === 'dia' && `Dia: ${selectedDia}`}
              {modoTemporal === 'semana' && `Semana: ${inicioSemanaStr} a ${fimSemanaStr}`}
              {modoTemporal === 'mes' && `Mês: ${mesesNomes[mesSelecionado]} / ${anoSelecionado}`}
              {modoTemporal === 'ano' && `Ano: ${anoSelecionado}`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> {totalLivres} LIVRES
            </span>
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> {totalEmAula} EM AULA
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 text-slate-600">
              <tr>
                <th className="p-3 font-semibold text-xs text-slate-600">PROFESSOR</th>
                <th className="p-3 font-semibold text-xs text-slate-600">SITUAÇÃO</th>
                <th className="p-3 font-semibold text-xs text-slate-600">ESCOLA</th>
                <th className="p-3 font-semibold text-xs text-slate-600">SALA</th>
                <th className="p-3 font-semibold text-xs text-slate-600">TURMA</th>
                <th className="p-3 font-semibold text-xs text-slate-600">COMPONENTE</th>
                <th className="p-3 font-semibold text-xs text-slate-600">PERÍODO (INÍCIO – FIM)</th>
                <th className="p-3 font-semibold text-xs text-slate-600 text-right">AÇÃO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {statusFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-400 text-xs">
                    Nenhum professor encontrado para os critérios selecionados.
                  </td>
                </tr>
              ) : (
                statusFiltrados.map((item) => {
                  const isEmAula = item.status === 'EM AULA';
                  const aula = item.aulaAtual;

                  return (
                    <tr
                      key={item.professor.id}
                      className={`transition-colors ${
                        isEmAula
                          ? 'hover:bg-indigo-50/30'
                          : 'bg-slate-50/50 hover:bg-slate-100/60'
                      }`}
                    >
                      {/* PROFESSOR */}
                      <td className="p-3">
                        <button
                          onClick={() => onSelectProfessor(item.professor.id)}
                          className={`font-bold text-left hover:text-indigo-600 transition-colors flex items-center gap-2 ${
                            isEmAula ? 'text-slate-900' : 'text-slate-500'
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              isEmAula
                                ? 'bg-indigo-100 text-indigo-700'
                                : 'bg-slate-200 text-slate-500'
                            }`}
                          >
                            {item.professor.nome.charAt(0)}
                          </div>
                          <span>{item.professor.nome}</span>
                        </button>
                      </td>

                      {/* SITUAÇÃO */}
                      <td className="p-3">
                        {isEmAula ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 inline-block">
                            EM AULA
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 border border-green-200 inline-block">
                            LIVRE
                          </span>
                        )}
                      </td>

                      {/* ESCOLA */}
                      <td className="p-3 text-xs">
                        {aula ? (
                          <span className="text-slate-600 italic">{aula.escola}</span>
                        ) : (
                          <span className="text-slate-300 italic">—</span>
                        )}
                      </td>

                      {/* SALA */}
                      <td className="p-3">
                        {aula ? (
                          <span className="font-mono text-xs text-slate-700 font-semibold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {aula.sala}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-mono text-xs">—</span>
                        )}
                      </td>

                      {/* TURMA */}
                      <td className="p-3">
                        {aula ? (
                          <span className="font-semibold text-slate-900">{aula.turmaCodigo}</span>
                        ) : (
                          <span className="text-slate-300 font-semibold">—</span>
                        )}
                      </td>

                      {/* COMPONENTE */}
                      <td className="p-3 text-xs">
                        {aula ? (
                          <div>
                            <span className="text-slate-900 font-semibold block">
                              {aula.componenteNome}
                            </span>
                            {aula.dataInicio && (
                              <span className="text-[11px] text-slate-500 block mt-0.5">
                                Vigência: {aula.dataInicio} ➔ {aula.dataFim || 'Conclusão'}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* PERÍODO (INÍCIO – FIM) */}
                      <td className="p-3 text-xs">
                        {aula && (aula.dataInicio || aula.dataFim) ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-800 font-semibold rounded-lg border border-indigo-200">
                            <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span>
                              {aula.dataInicio || '—'} ➔ {aula.dataFim || '—'}
                            </span>
                          </div>
                        ) : aula ? (
                          <span className="text-slate-400 text-xs italic">Não definido</span>
                        ) : (
                          <span className="text-slate-300 font-mono text-xs">—</span>
                        )}
                      </td>

                      {/* AÇÃO */}
                      <td className="p-3 text-right">
                        {aula ? (
                          <button
                            id={`btn-substituir-${aula.turmaCodigo.toLowerCase()}`}
                            onClick={() => {
                              const turmaObj = turmas.find((t) => t.codigo === aula.turmaCodigo);
                              const compObj = turmaObj?.componentes.find(
                                (c) => c.status === 'EM ANDAMENTO' || c.id === aula.componenteId
                              );
                              if (turmaObj && compObj) {
                                onOpenSubstituicao(turmaObj, compObj);
                              }
                            }}
                            className="text-indigo-600 font-bold text-[10px] uppercase hover:underline"
                          >
                            Substituir
                          </button>
                        ) : (
                          <button
                            onClick={() => onSelectProfessor(item.professor.id)}
                            className="text-slate-400 font-medium text-[10px] uppercase hover:text-slate-600"
                          >
                            Ver Horários
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Section: Progress + Terminal AI from Design HTML */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Academic Progress Widget */}
        {metricasDestaque && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Progresso Acadêmico: {turmaDestaque.codigo}
                </h3>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                  {turmaDestaque.curso.split(' ')[2] || turmaDestaque.codigo}
                </span>
              </div>

              <div className="space-y-3 overflow-auto pr-1">
                {turmaDestaque.componentes.slice(0, 3).map((comp, idx) => {
                  const isConcluido = comp.status === 'CONCLUÍDO';
                  const isEmAndamento = comp.status === 'EM ANDAMENTO';

                  return (
                    <div key={comp.id} className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full text-white flex items-center justify-center text-[10px] shrink-0 font-bold ${
                          isConcluido
                            ? 'bg-green-500'
                            : isEmAndamento
                            ? 'bg-blue-500 animate-pulse'
                            : 'bg-slate-300 text-slate-600'
                        }`}
                      >
                        {isConcluido ? '✓' : isEmAndamento ? '▶' : '○'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{comp.nome}</p>
                        <p className="text-[10px] text-slate-400 uppercase">
                          {comp.cargaHoraria}h • {comp.status}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1.5">
                <span>CARGA TOTAL MINISTRADA</span>
                <span>{metricasDestaque.percentualConcluido}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-full transition-all duration-300"
                  style={{ width: `${metricasDestaque.percentualConcluido}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* Right: Operational AI Terminal from Design HTML */}
        <div className="lg:col-span-2 bg-slate-900 rounded-xl border border-slate-700 shadow-lg p-5 flex flex-col relative">
          {/* Traffic Light Dots */}
          <div className="absolute top-4 right-4 flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 opacity-80"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 opacity-80"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 opacity-80"></span>
          </div>

          <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-300 mb-3 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>AI ASSISTENTE OPERACIONAL (RIOS CORE)</span>
          </h3>

          <div className="flex-1 bg-slate-950/70 rounded-lg p-3.5 overflow-auto mb-3 border border-slate-800 text-xs min-h-[140px]">
            <div className="space-y-3">
              {/* Question bubble */}
              <div className="flex flex-col gap-1 items-start">
                <span className="text-[8px] font-bold text-indigo-400 ml-1 uppercase">GESTOR</span>
                <div className="bg-slate-800 text-slate-200 p-2.5 rounded-lg rounded-tl-none text-xs leading-relaxed max-w-[90%]">
                  Quem pode substituir a professora Ana na turma RH-01 hoje?
                </div>
              </div>

              {/* AI Response bubble */}
              <div className="flex flex-col gap-1 items-end">
                <span className="text-[8px] font-bold text-green-400 mr-1 uppercase">RIOS AI</span>
                <div className="bg-indigo-900/40 text-indigo-100 p-2.5 rounded-lg rounded-tr-none text-xs border border-indigo-500/30 whitespace-pre-wrap leading-relaxed max-w-[95%]">
                  {aiLoading ? (
                    <span className="flex items-center gap-2 text-indigo-300">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Consultando escala e competências docentes...
                    </span>
                  ) : (
                    aiResponse
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Interactive input for the terminal */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendAi();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              placeholder="Pergunte sobre turmas ou professores..."
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              disabled={aiLoading}
              className="flex-1 bg-slate-800 border-none rounded-lg px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={aiLoading || !aiQuestion.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
            >
              Enviar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

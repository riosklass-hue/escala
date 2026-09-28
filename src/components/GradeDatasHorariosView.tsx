import React, { useState, useMemo } from 'react';
import { Turma, Professor, Turno, DiaSemana, ComponenteDaTurma } from '../types/rios';
import {
  CalendarDays,
  Calendar,
  Clock,
  School,
  Building,
  GraduationCap,
  Users,
  AlertTriangle,
  ArrowRightLeft,
  Search,
  Filter,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  BookOpen,
} from 'lucide-react';
import { verificarConflitoProfessor } from '../utils/conflitoAgenda';

interface GradeDatasHorariosViewProps {
  turmas: Turma[];
  professores: Professor[];
  onOpenSubstituicao: (turma: Turma, componente: ComponenteDaTurma) => void;
  onOpenEditarComponente?: (turma: Turma, componente: ComponenteDaTurma) => void;
}

const DIAS_SEMANA_ORDEM: DiaSemana[] = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

const TURNOS_ORDEM: Turno[] = ['MANHÃ', 'TARDE', 'NOITE'];

export const GradeDatasHorariosView: React.FC<GradeDatasHorariosViewProps> = ({
  turmas,
  professores,
  onOpenSubstituicao,
  onOpenEditarComponente,
}) => {
  const [modo, setModo] = useState<'GRADE_SEMANAL' | 'POR_DATA'>('GRADE_SEMANAL');
  const [filtroTurno, setFiltroTurno] = useState<string>('TODOS');
  const [filtroProf, setFiltroProf] = useState<string>('TODOS');
  const [busca, setBusca] = useState('');
  const [dataSelecionada, setDataSelecionada] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Lista plana de todas as aulas programadas (cruzando turma com componente em andamento)
  const todasAulas = useMemo(() => {
    const list: Array<{
      turma: Turma;
      componente: ComponenteDaTurma;
      professor?: Professor;
    }> = [];

    turmas.forEach((t) => {
      // Pega os componentes ativos da turma (ou todos se nenhum concluído)
      const componentesAtivos = t.componentes.filter((c) => c.status !== 'CONCLUÍDO');
      const compsParaExibir = componentesAtivos.length > 0 ? componentesAtivos : t.componentes;

      compsParaExibir.forEach((c) => {
        const prof = professores.find((p) => p.id === c.professorId);
        list.push({
          turma: t,
          componente: c,
          professor: prof,
        });
      });
    });

    return list;
  }, [turmas, professores]);

  // Detector de choques de horário (mesmo professor no mesmo dia da semana e turno)
  const conflitosDetectados = useMemo(() => {
    const conflitos: Array<{
      profNome: string;
      diaSemana: string;
      turno: string;
      turmas: string[];
    }> = [];

    const map: Record<string, Turma[]> = {};

    todasAulas.forEach((item) => {
      if (item.componente.professorId) {
        const chave = `${item.componente.professorId}_${item.turma.diaSemana}_${item.turma.turno}`;
        if (!map[chave]) map[chave] = [];
        if (!map[chave].some((t) => t.id === item.turma.id)) {
          map[chave].push(item.turma);
        }
      }
    });

    Object.entries(map).forEach(([chave, turmasConflito]) => {
      if (turmasConflito.length > 1) {
        const [profId, dia, turno] = chave.split('_');
        const prof = professores.find((p) => p.id === profId);
        conflitos.push({
          profNome: prof?.nome || 'Professor',
          diaSemana: dia,
          turno: turno,
          turmas: turmasConflito.map((t) => `${t.codigo} (${t.curso})`),
        });
      }
    });

    return conflitos;
  }, [todasAulas, professores]);

  // Filtragem
  const aulasFiltradas = useMemo(() => {
    return todasAulas.filter((item) => {
      if (filtroTurno !== 'TODOS' && item.turma.turno !== filtroTurno) return false;
      if (filtroProf !== 'TODOS' && item.componente.professorId !== filtroProf) return false;

      if (!busca.trim()) return true;
      const termo = busca.toLowerCase();
      const matchTurma = item.turma.codigo.toLowerCase().includes(termo) ||
        item.turma.curso.toLowerCase().includes(termo);
      const matchComp = item.componente.nome.toLowerCase().includes(termo);
      const matchProf = item.professor?.nome.toLowerCase().includes(termo) ||
        (item.componente.professorNome && item.componente.professorNome.toLowerCase().includes(termo));
      const matchSala = item.turma.sala.toLowerCase().includes(termo) ||
        item.turma.escola.toLowerCase().includes(termo);

      return matchTurma || matchComp || matchProf || matchSala;
    });
  }, [todasAulas, filtroTurno, filtroProf, busca]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 leading-tight">
                  Grade de Horários & Datas
                </h2>
                <p className="text-xs text-slate-500">
                  Cruzamento integral: Turmas, Professores, Disciplinas da Ementa, Dias e Faixas de Horário.
                </p>
              </div>
            </div>
          </div>

          {/* Alternador de Modo de Visualização */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 self-start lg:self-auto">
            <button
              type="button"
              id="btn-modo-grade-semanal"
              onClick={() => setModo('GRADE_SEMANAL')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                modo === 'GRADE_SEMANAL'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Grade Semanal de Horários
            </button>
            <button
              type="button"
              id="btn-modo-por-data"
              onClick={() => setModo('POR_DATA')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                modo === 'POR_DATA'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cronograma por Data
            </button>
          </div>
        </div>

        {/* Alerta de Conflitos se houver */}
        {conflitosDetectados.length > 0 && (
          <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-900">
                Choque de Horário Detectado ({conflitosDetectados.length})
              </h4>
              <div className="mt-1 space-y-1 text-xs">
                {conflitosDetectados.map((c, i) => (
                  <p key={i}>
                    <strong>{c.profNome}</strong> está alocado no mesmo dia ({c.diaSemana}) e turno ({c.turno}) nas turmas: {c.turmas.join(' e ')}.
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por turma, professor, disciplina da ementa, horário ou sala..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
          <select
            value={filtroTurno}
            onChange={(e) => setFiltroTurno(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-hidden cursor-pointer"
          >
            <option value="TODOS">Todos os Turnos</option>
            <option value="MANHÃ">Manhã</option>
            <option value="TARDE">Tarde</option>
            <option value="NOITE">Noite</option>
          </select>

          <select
            value={filtroProf}
            onChange={(e) => setFiltroProf(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-hidden cursor-pointer"
          >
            <option value="TODOS">Todos os Professores</option>
            {professores.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* MODO 1: GRADE SEMANAL DE HORÁRIOS */}
      {modo === 'GRADE_SEMANAL' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-slate-900 text-white border-b border-slate-800">
                    <th className="p-3.5 text-xs font-bold uppercase tracking-wider w-36">
                      Turno / Horário
                    </th>
                    {DIAS_SEMANA_ORDEM.map((dia) => (
                      <th
                        key={dia}
                        className="p-3.5 text-xs font-bold uppercase tracking-wider text-center"
                      >
                        {dia}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {TURNOS_ORDEM.map((turno) => {
                    if (filtroTurno !== 'TODOS' && filtroTurno !== turno) return null;

                    return (
                      <tr key={turno} className="hover:bg-slate-50/40 transition-colors">
                        {/* Coluna do Turno e Faixa de Horário */}
                        <td className="p-4 align-top bg-slate-50/80 border-r border-slate-200/80 w-36">
                          <span className="font-bold text-xs text-slate-900 block">
                            {turno}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono block mt-0.5">
                            {turno === 'MANHÃ'
                              ? '08:00 – 12:00'
                              : turno === 'TARDE'
                              ? '13:30 – 17:30'
                              : '18:30 – 22:30'}
                          </span>
                        </td>

                        {/* Células para cada dia da semana */}
                        {DIAS_SEMANA_ORDEM.map((dia) => {
                          const aulasNestaCelula = aulasFiltradas.filter(
                            (a) => a.turma.diaSemana === dia && a.turma.turno === turno
                          );

                          return (
                            <td
                              key={dia}
                              className="p-2.5 align-top border-r border-slate-100 last:border-r-0 min-w-[170px]"
                            >
                              {aulasNestaCelula.length === 0 ? (
                                <div className="h-20 rounded-xl border border-dashed border-slate-150 flex items-center justify-center text-slate-300 text-[11px] select-none">
                                  Sem aulas
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {aulasNestaCelula.map((item, idx) => (
                                    <div
                                      key={idx}
                                      className="p-3 rounded-xl bg-white border border-slate-200/90 shadow-xs hover:border-indigo-400 hover:shadow-md transition-all text-xs flex flex-col justify-between"
                                    >
                                      <div>
                                        <div className="flex items-center justify-between gap-1 mb-1">
                                          <span className="font-mono font-black text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded text-[10px]">
                                            {item.turma.codigo}
                                          </span>
                                          <span className="text-[10px] font-bold text-slate-400">
                                            {item.turma.horario}
                                          </span>
                                        </div>

                                        <p className="font-bold text-slate-900 text-xs line-clamp-1">
                                          {item.componente.nome}
                                        </p>

                                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                          {item.turma.escola} • {item.turma.sala}
                                        </p>
                                      </div>

                                      {/* Docente em Aula */}
                                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 min-w-0 pr-1">
                                          <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[9px] shrink-0">
                                            {item.professor?.nome.charAt(0) || 'P'}
                                          </div>
                                          <span className="font-semibold text-[11px] text-slate-800 truncate">
                                            {item.professor?.nome || item.componente.professorNome || 'Sem docente'}
                                          </span>
                                        </div>

                                        <button
                                          type="button"
                                          onClick={() => onOpenSubstituicao(item.turma, item.componente)}
                                          className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors shrink-0 cursor-pointer"
                                          title="Trocar ou alocar professor"
                                        >
                                          <ArrowRightLeft className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODO 2: CRONOGRAMA POR DATA ESPECÍFICA */}
      {modo === 'POR_DATA' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-indigo-600" />
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Selecione a Data:
                </label>
                <input
                  type="date"
                  value={dataSelecionada}
                  onChange={(e) => setDataSelecionada(e.target.value)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Atalhos Rápidos */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDataSelecionada(new Date().toISOString().split('T')[0])}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 1);
                  setDataSelecionada(d.toISOString().split('T')[0]);
                }}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                Amanhã
              </button>
            </div>
          </div>

          {/* Aulas do dia selecionado */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
            <h3 className="font-bold text-sm text-slate-900 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>
                Aulas Agendadas para {dataSelecionada.split('-').reverse().join('/')} ({aulasFiltradas.length} ativas)
              </span>
            </h3>

            {aulasFiltradas.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-8">
                Nenhuma aula cadastrada com os filtros atuais.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {aulasFiltradas.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 transition-all bg-white shadow-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
                        {item.turma.codigo}
                      </span>
                      <span className="text-xs font-bold text-slate-700">
                        {item.turma.turno} • {item.turma.horario}
                      </span>
                    </div>

                    <div>
                      <p className="font-bold text-slate-900 text-xs">
                        {item.componente.nome}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {item.turma.curso}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="font-semibold text-slate-800">
                          {item.professor?.nome || item.componente.professorNome || 'Sem docente'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => onOpenSubstituicao(item.turma, item.componente)}
                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        Substituir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

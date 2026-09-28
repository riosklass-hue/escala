import React, { useState, useMemo } from 'react';
import { Turma, Professor, ComponenteDaTurma, Turno, DiaSemana } from '../types/rios';
import { calcularMetricasTurma } from '../services/riosEngine';
import { MatrizesCursosModal } from './MatrizesCursosModal';
import { MatrizCursoOficial } from '../data/matrizesCursos';
import {
  GraduationCap,
  Calendar,
  Clock,
  School,
  Building,
  Plus,
  Edit,
  Trash2,
  ArrowRightLeft,
  CheckCircle2,
  PlayCircle,
  AlertTriangle,
  Search,
  BookOpen,
  User,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
} from 'lucide-react';

interface TurmasEmentasViewProps {
  turmas: Turma[];
  professores: Professor[];
  matrizes?: MatrizCursoOficial[];
  onSaveMatriz?: (matriz: MatrizCursoOficial) => void;
  onDeleteMatriz?: (matrizId: string) => void;
  onRestaurarMatrizesPadrao?: () => void;
  onOpenCadastrarTurma: () => void;
  onOpenCadastrarTurmaComMatriz?: (matriz: MatrizCursoOficial) => void;
  onOpenEditarTurma: (turma: Turma) => void;
  onDeleteTurma: (turmaId: string) => void;
  onOpenSubstituicao: (turma: Turma, componente: ComponenteDaTurma) => void;
  onOpenEditarComponente: (turma: Turma, componente: ComponenteDaTurma) => void;
  onConcluirComponente: (turmaId: string, compId: string) => void;
  onAdicionarComponente?: (turma: Turma) => void;
}

export const TurmasEmentasView: React.FC<TurmasEmentasViewProps> = ({
  turmas,
  professores,
  matrizes,
  onSaveMatriz,
  onDeleteMatriz,
  onRestaurarMatrizesPadrao,
  onOpenCadastrarTurma,
  onOpenCadastrarTurmaComMatriz,
  onOpenEditarTurma,
  onDeleteTurma,
  onOpenSubstituicao,
  onOpenEditarComponente,
  onConcluirComponente,
  onAdicionarComponente,
}) => {
  const [busca, setBusca] = useState('');
  const [filtroTurno, setFiltroTurno] = useState<string>('TODOS');
  const [filtroDia, setFiltroDia] = useState<string>('TODOS');
  const [isModalMatrizesOpen, setIsModalMatrizesOpen] = useState(false);
  const [turmasExpandidas, setTurmasExpandidas] = useState<Record<string, boolean>>(() => {
    // Por padrão, todas expandidas para que o coordenador veja as ementas diretamente
    const init: Record<string, boolean> = {};
    turmas.forEach((t) => {
      init[t.id] = true;
    });
    return init;
  });

  const toggleExpand = (turmaId: string) => {
    setTurmasExpandidas((prev) => ({
      ...prev,
      [turmaId]: !prev[turmaId],
    }));
  };

  const expandirTodas = () => {
    const next: Record<string, boolean> = {};
    turmas.forEach((t) => {
      next[t.id] = true;
    });
    setTurmasExpandidas(next);
  };

  const recolherTodas = () => {
    setTurmasExpandidas({});
  };

  // Filtragem
  const turmasFiltradas = useMemo(() => {
    return turmas.filter((t) => {
      if (filtroTurno !== 'TODOS' && t.turno !== filtroTurno) return false;
      if (filtroDia !== 'TODOS' && t.diaSemana !== filtroDia) return false;

      if (!busca.trim()) return true;
      const termo = busca.toLowerCase();
      const matchCodigo = t.codigo.toLowerCase().includes(termo);
      const matchCurso = t.curso.toLowerCase().includes(termo);
      const matchEscola = t.escola.toLowerCase().includes(termo);
      const matchSala = t.sala.toLowerCase().includes(termo);
      const matchHorario = t.horario.toLowerCase().includes(termo);
      const matchComponente = t.componentes.some((c) =>
        c.nome.toLowerCase().includes(termo) ||
        (c.professorNome && c.professorNome.toLowerCase().includes(termo))
      );

      return matchCodigo || matchCurso || matchEscola || matchSala || matchHorario || matchComponente;
    });
  }, [turmas, busca, filtroTurno, filtroDia]);

  // Estatísticas Rápidas
  const totalTurmas = turmas.length;
  const totalComponentes = useMemo(() => {
    return turmas.reduce((acc, t) => acc + t.componentes.length, 0);
  }, [turmas]);
  const componentesComDocente = useMemo(() => {
    return turmas.reduce((acc, t) => {
      return acc + t.componentes.filter((c) => !!c.professorId).length;
    }, 0);
  }, [turmas]);
  const percCobertura = totalComponentes > 0 ? Math.round((componentesComDocente / totalComponentes) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 leading-tight">
                  Turmas & Ementas Curriculares
                </h2>
                <p className="text-xs text-slate-500">
                  Visão centralizada: Turma, Datas de Início/Fim, Horário, Turno, Sala e Disciplinas da Ementa.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              id="btn-expandir-todas-turmas"
              onClick={expandirTodas}
              className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Expandir Ementas
            </button>
            <button
              type="button"
              id="btn-recolher-todas-turmas"
              onClick={recolherTodas}
              className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Recolher Ementas
            </button>
            <button
              type="button"
              id="btn-abrir-matrizes-oficiais"
              onClick={() => setIsModalMatrizesOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs rounded-xl border border-indigo-200 shadow-2xs transition-all cursor-pointer"
              title="Cadastrar, editar e visualizar as matrizes curriculares dos cursos"
            >
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <span>Gerenciar Ementas & Matrizes</span>
            </button>

            <button
              type="button"
              id="btn-cadastrar-nova-turma"
              onClick={onOpenCadastrarTurma}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Turma</span>
            </button>
          </div>
        </div>

        {/* Métricas Rápidas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-100">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Total de Turmas
            </span>
            <span className="text-xl font-extrabold text-slate-900 mt-0.5 block">
              {totalTurmas}
            </span>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Disciplinas da Ementa
            </span>
            <span className="text-xl font-extrabold text-slate-900 mt-0.5 block">
              {totalComponentes}
            </span>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Docentes Alocados
            </span>
            <span className="text-xl font-extrabold text-emerald-600 mt-0.5 block">
              {componentesComDocente} <span className="text-xs text-slate-400 font-normal">/ {totalComponentes}</span>
            </span>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Cobertura da Ementa
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xl font-extrabold text-indigo-600">
                {percCobertura}%
              </span>
              <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all"
                  style={{ width: `${percCobertura}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Pesquisa */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por código, curso, escola, sala, horário ou disciplina da ementa..."
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
            value={filtroDia}
            onChange={(e) => setFiltroDia(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-hidden cursor-pointer"
          >
            <option value="TODOS">Todos os Dias</option>
            <option value="Segunda-feira">Segunda-feira</option>
            <option value="Terça-feira">Terça-feira</option>
            <option value="Quarta-feira">Quarta-feira</option>
            <option value="Quinta-feira">Quinta-feira</option>
            <option value="Sexta-feira">Sexta-feira</option>
            <option value="Sábado">Sábado</option>
          </select>
        </div>
      </div>

      {/* Lista de Turmas com Ementa Integrada */}
      {turmasFiltradas.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center text-slate-500">
          <GraduationCap className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="font-semibold text-base text-slate-800">Nenhuma turma encontrada</p>
          <p className="text-xs text-slate-500 mt-1">
            Ajuste os filtros de pesquisa ou clique no botão &quot;Nova Turma&quot; para cadastrar.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {turmasFiltradas.map((turma) => {
            const isExpandida = !!turmasExpandidas[turma.id];
            const metricas = calcularMetricasTurma(turma);
            const totalHorasTurma = turma.componentes.reduce((acc, c) => acc + (c.cargaHoraria || 0), 0);
            const componentesSemProf = turma.componentes.filter((c) => !c.professorId).length;

            return (
              <div
                key={turma.id}
                id={`card-turma-${turma.id}`}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-300 transition-all overflow-hidden"
              >
                {/* Header da Turma */}
                <div className="p-5 bg-gradient-to-r from-slate-50/70 via-white to-slate-50/70 border-b border-slate-200/80">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Identificação Principal */}
                    <div className="flex items-start sm:items-center gap-3">
                      <button
                        type="button"
                        onClick={() => toggleExpand(turma.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 transition-colors shrink-0 mt-0.5 sm:mt-0 cursor-pointer"
                        title={isExpandida ? 'Recolher Ementa' : 'Expandir Ementa'}
                      >
                        {isExpandida ? (
                          <ChevronUp className="w-5 h-5 text-indigo-600" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </button>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-md font-mono text-xs font-black bg-indigo-600 text-white tracking-wider shadow-xs">
                            {turma.codigo}
                          </span>
                          <h3 className="font-bold text-slate-900 text-base">
                            {turma.curso}
                          </h3>
                          {componentesSemProf > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              {componentesSemProf} disciplina(s) sem professor
                            </span>
                          )}
                        </div>

                        {/* Localização e Dias */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-1.5">
                          <div className="flex items-center gap-1">
                            <School className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-medium">{turma.escola}</span>
                          </div>
                          <span className="text-slate-300">•</span>
                          <div className="flex items-center gap-1">
                            <Building className="w-3.5 h-3.5 text-slate-400" />
                            <span>{turma.sala}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bloco de Datas e Horários em Destaque */}
                    <div className="flex flex-wrap items-center gap-3 bg-white px-4 py-2.5 rounded-xl border border-slate-200/90 shadow-xs shrink-0">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block leading-tight">
                            Dia da Semana
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            {turma.diaSemana}
                          </span>
                        </div>
                      </div>

                      <div className="h-6 w-px bg-slate-200" />

                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block leading-tight">
                            Turno & Horário
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            {turma.turno} • {turma.horario}
                          </span>
                        </div>
                      </div>

                      <div className="h-6 w-px bg-slate-200" />

                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-amber-600 shrink-0" />
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block leading-tight">
                            Carga da Ementa
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            {totalHorasTurma}h ({turma.componentes.length} disc.)
                          </span>
                        </div>
                      </div>

                      {/* Ações da Turma */}
                      <div className="flex items-center gap-1 ml-1 pl-2 border-l border-slate-200">
                        <button
                          type="button"
                          onClick={() => onOpenEditarTurma(turma)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Editar Turma, Escola ou Horário"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Tem certeza que deseja excluir a turma ${turma.codigo}?`)) {
                              onDeleteTurma(turma.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Excluir Turma"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ementa da Turma (Expandível) */}
                {isExpandida && (
                  <div className="p-5 bg-white">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-indigo-600" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          Ementa Curricular & Alocação Docente
                        </h4>
                      </div>

                      {onAdicionarComponente && (
                        <button
                          type="button"
                          onClick={() => onAdicionarComponente(turma)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Adicionar Disciplina</span>
                        </button>
                      )}
                    </div>

                    {turma.componentes.length === 0 ? (
                      <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-slate-400 text-xs">
                        Nenhuma disciplina cadastrada na ementa desta turma.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                        {turma.componentes.map((comp, idx) => {
                          const hasProfessor = !!comp.professorId;
                          const profAtual = professores.find((p) => p.id === comp.professorId);

                          return (
                            <div
                              key={comp.id}
                              className="p-3.5 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
                            >
                              {/* Disciplina & Carga Horária */}
                              <div className="flex items-start gap-3 min-w-0">
                                <span className="w-6 h-6 rounded-lg bg-slate-100 font-mono text-[11px] font-bold text-slate-600 flex items-center justify-center shrink-0 mt-0.5">
                                  {idx + 1}
                                </span>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="font-semibold text-slate-900 text-xs truncate">
                                      {comp.nome}
                                    </p>
                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-mono text-[10px] font-bold shrink-0">
                                      {comp.cargaHoraria}h
                                    </span>
                                  </div>

                                  {/* Datas da Disciplina */}
                                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                    <Calendar className="w-3 h-3 text-slate-400" />
                                    <span>
                                      {comp.dataInicio && comp.dataFim
                                        ? `Período: ${comp.dataInicio} a ${comp.dataFim}`
                                        : comp.dataInicio
                                        ? `Início: ${comp.dataInicio}`
                                        : 'Datas do componente não definidas'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Professor e Ações */}
                              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                                {/* Docente Alocado */}
                                <div className="text-right">
                                  {hasProfessor ? (
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                                        {comp.professorNome?.charAt(0) || 'P'}
                                      </div>
                                      <div className="text-left sm:text-right">
                                        <p className="text-xs font-bold text-slate-800 leading-tight">
                                          {comp.professorNome}
                                        </p>
                                        <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 sm:justify-end">
                                          <CheckCircle2 className="w-2.5 h-2.5" />
                                          Docente Confirmado
                                        </span>
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-700 font-semibold text-[11px] rounded-lg flex items-center gap-1.5">
                                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                                      Docente não atribuído
                                    </span>
                                  )}
                                </div>

                                {/* Botões Operacionais */}
                                <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                                  <button
                                    type="button"
                                    onClick={() => onOpenSubstituicao(turma, comp)}
                                    className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                    title="Alocar ou Substituir Docente deste Componente"
                                  >
                                    <ArrowRightLeft className="w-3.5 h-3.5" />
                                    <span className="hidden md:inline">
                                      {hasProfessor ? 'Trocar' : 'Alocar'}
                                    </span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => onOpenEditarComponente(turma, comp)}
                                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                    title="Editar Nome, Carga Horária ou Datas"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>

                                  {comp.status !== 'CONCLUÍDO' ? (
                                    <button
                                      type="button"
                                      onClick={() => onConcluirComponente(turma.id, comp.id)}
                                      className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                      title="Marcar Disciplina como Concluída"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                    </button>
                                  ) : (
                                    <span className="px-2 py-1 bg-emerald-50 text-emerald-700 font-bold text-[10px] rounded-md">
                                      Concluída
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Gestão, Edição, Cadastro e Consulta das Matrizes Oficiais (800h) */}
      <MatrizesCursosModal
        isOpen={isModalMatrizesOpen}
        onClose={() => setIsModalMatrizesOpen(false)}
        matrizes={matrizes}
        onSaveMatriz={onSaveMatriz}
        onDeleteMatriz={onDeleteMatriz}
        onRestaurarPadrao={onRestaurarMatrizesPadrao}
        onCriarTurmaComMatriz={(matriz) => {
          if (onOpenCadastrarTurmaComMatriz) {
            onOpenCadastrarTurmaComMatriz(matriz);
          } else {
            onOpenCadastrarTurma();
          }
        }}
      />
    </div>
  );
};

import React, { useState } from 'react';
import { Turma, Professor, ComponenteDaTurma, Escola, Sala } from '../types/rios';
import { MatrizCursoOficial, MATRIZES_CURSOS_OFICIAIS } from '../data/matrizesCursos';
import { calcularMetricasTurma } from '../services/riosEngine';
import {
  GraduationCap,
  UserCheck,
  Plus,
  Edit,
  Trash2,
  BookOpen,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  PlayCircle,
  Clock,
  School,
  Building,
  Calendar,
  Sparkles,
  Search,
  Filter,
  MapPin,
  Layers,
} from 'lucide-react';

interface GestaoCadastrosEmentasProps {
  turmas: Turma[];
  professores: Professor[];
  escolas?: Escola[];
  matrizes?: MatrizCursoOficial[];
  onOpenCadastrarTurma: () => void;
  onOpenEditarTurma: (turma: Turma) => void;
  onDeleteTurma: (turmaId: string) => void;
  onOpenCadastrarProfessor: () => void;
  onOpenEditarProfessor: (prof: Professor) => void;
  onDeleteProfessor: (profId: string) => void;
  onOpenEditarComponente: (turma: Turma, comp: ComponenteDaTurma) => void;
  onOpenCadastrarEscola?: () => void;
  onOpenEditarEscola?: (escola: Escola) => void;
  onDeleteEscola?: (escolaId: string) => void;
  onOpenCadastrarMatriz?: () => void;
  onOpenEditarMatriz?: (matriz: MatrizCursoOficial) => void;
  onDeleteMatriz?: (matrizId: string) => void;
  onCriarTurmaComMatriz?: (matriz: MatrizCursoOficial) => void;
}

export const GestaoCadastrosEmentas: React.FC<GestaoCadastrosEmentasProps> = ({
  turmas,
  professores,
  escolas = [],
  matrizes = MATRIZES_CURSOS_OFICIAIS,
  onOpenCadastrarTurma,
  onOpenEditarTurma,
  onDeleteTurma,
  onOpenCadastrarProfessor,
  onOpenEditarProfessor,
  onDeleteProfessor,
  onOpenEditarComponente,
  onOpenCadastrarEscola,
  onOpenEditarEscola,
  onDeleteEscola,
  onOpenCadastrarMatriz,
  onOpenEditarMatriz,
  onDeleteMatriz,
  onCriarTurmaComMatriz,
}) => {
  const [subTab, setSubTab] = useState<'turmas' | 'professores' | 'escolas' | 'matrizes'>('turmas');
  const [searchTurma, setSearchTurma] = useState('');
  const [searchProf, setSearchProf] = useState('');
  const [searchEscola, setSearchEscola] = useState('');
  const [searchMatriz, setSearchMatriz] = useState('');
  const [expandedMatrizes, setExpandedMatrizes] = useState<Record<string, boolean>>({});
  const [expandedTurmas, setExpandedTurmas] = useState<Record<string, boolean>>({
    [turmas[0]?.id || '']: true,
  });

  const toggleExpand = (id: string) => {
    setExpandedTurmas((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredTurmas = turmas.filter((t) => {
    const q = searchTurma.toLowerCase();
    return (
      t.codigo.toLowerCase().includes(q) ||
      t.curso.toLowerCase().includes(q) ||
      t.escola.toLowerCase().includes(q)
    );
  });

  const filteredProfessores = professores.filter((p) => {
    const q = searchProf.toLowerCase();
    return (
      p.nome.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.competencias.some((c) => c.toLowerCase().includes(q))
    );
  });

  const filteredEscolas = escolas.filter((e) => {
    const q = searchEscola.toLowerCase();
    return (
      e.nome.toLowerCase().includes(q) ||
      e.regiao.toLowerCase().includes(q) ||
      e.salas.some(
        (s) =>
          s.nome.toLowerCase().includes(q) ||
          (s.bloco && s.bloco.toLowerCase().includes(q))
      )
    );
  });

  const filteredMatrizes = matrizes.filter((m) => {
    const q = searchMatriz.toLowerCase();
    return (
      m.nome.toLowerCase().includes(q) ||
      m.sigla.toLowerCase().includes(q) ||
      m.modalidade.toLowerCase().includes(q) ||
      (m.descricao && m.descricao.toLowerCase().includes(q)) ||
      m.unidades.some((u) => u.nome.toLowerCase().includes(q))
    );
  });

  const toggleExpandMatriz = (id: string) => {
    setExpandedMatrizes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const totalHorasGerais = turmas.reduce(
    (acc, t) => acc + t.componentes.reduce((sum, c) => sum + (c.cargaHoraria || 0), 0),
    0
  );

  const totalSalasGerais = escolas.reduce((acc, e) => acc + (e.salas?.length || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner with Subtabs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200">
            Módulo de Cadastros & Matrizes
          </span>
          <h2 className="text-xl font-bold text-slate-900 mt-1.5">
            Gestão de Turmas, Professores, Escolas & Ementas
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cadastre novas turmas com suas ementas curriculares, gerencie o corpo docente, controle escolas e personalize as matrizes dos cursos.
          </p>
        </div>

        {/* Subtabs Switcher */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <button
            id="tab-cadastros-turmas"
            onClick={() => setSubTab('turmas')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              subTab === 'turmas'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <GraduationCap className="w-4 h-4 text-indigo-600" />
            <span>Turmas ({turmas.length})</span>
          </button>

          <button
            id="tab-cadastros-professores"
            onClick={() => setSubTab('professores')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              subTab === 'professores'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <UserCheck className="w-4 h-4 text-indigo-600" />
            <span>Professores ({professores.length})</span>
          </button>

          <button
            id="tab-cadastros-escolas"
            onClick={() => setSubTab('escolas')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              subTab === 'escolas'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <School className="w-4 h-4 text-indigo-600" />
            <span>Escolas & Salas ({escolas.length})</span>
          </button>

          <button
            id="tab-cadastros-matrizes"
            onClick={() => setSubTab('matrizes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              subTab === 'matrizes'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <span>Ementas & Matrizes ({matrizes.length})</span>
          </button>
        </div>
      </div>

      {/* SUBTAB 1: TURMAS E EMENTAS */}
      {subTab === 'turmas' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por código da turma, curso ou escola..."
                value={searchTurma}
                onChange={(e) => setSearchTurma(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 hidden sm:inline">
                Total de Horas Curriculares: <strong className="text-slate-900">{totalHorasGerais}h</strong>
              </span>
              <button
                id="btn-cadastrar-nova-turma"
                onClick={onOpenCadastrarTurma}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar Turma com Ementa</span>
              </button>
            </div>
          </div>

          {/* Turmas List */}
          <div className="space-y-4">
            {filteredTurmas.map((t) => {
              const metricas = calcularMetricasTurma(t);
              const isExpanded = !!expandedTurmas[t.id];

              return (
                <div
                  key={t.id}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs hover:border-slate-300 transition-all"
                >
                  {/* Turma Main Header Card */}
                  <div className="p-5 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex flex-col items-center justify-center shrink-0 shadow-xs">
                        <span className="text-[11px] font-extrabold">{t.codigo}</span>
                        <span className="text-[9px] uppercase tracking-wider opacity-80">{t.turno}</span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900">{t.curso}</h3>
                          <span className="text-[11px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {t.codigo}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-600">
                          <span className="flex items-center gap-1">
                            <School className="w-3.5 h-3.5 text-slate-400" /> {t.escola}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Building className="w-3.5 h-3.5 text-slate-400" /> {t.sala}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" /> {t.diaSemana}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" /> {t.horario}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right side metrics and actions */}
                    <div className="flex items-center gap-3">
                      {/* Metric mini pill */}
                      <div className="text-right pr-2">
                        <div className="text-xs font-bold text-slate-900">
                          {metricas.percentualConcluido}% concluído
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {metricas.cargaMinistrada}h de {metricas.cargaTotal}h
                        </div>
                      </div>

                      {/* Edit Turma & Ementa */}
                      <button
                        id={`btn-editar-turma-${t.codigo.toLowerCase()}`}
                        onClick={() => onOpenEditarTurma(t)}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5 transition-colors"
                        title="Editar todos os dados da turma e sua ementa completa"
                      >
                        <Edit className="w-3.5 h-3.5 text-slate-500" />
                        <span>Editar Turma & Ementa</span>
                      </button>

                      {/* Expand/Collapse Button */}
                      <button
                        onClick={() => toggleExpand(t.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                        title={isExpanded ? 'Recolher ementa' : 'Visualizar ementa detalhada'}
                      >
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Ementa / Curriculum Components List */}
                  {isExpanded && (
                    <div className="p-5 bg-white space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                            <BookOpen className="w-4 h-4 text-indigo-600" />
                            Matriz Curricular & Ementa da Turma ({t.componentes.length} Unidades — {metricas.cargaTotal} horas)
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            Status de avanço, carga horária e identificação do docente que ministrou ou ministra cada unidade.
                          </p>
                        </div>

                        <button
                          onClick={() => onOpenEditarTurma(t)}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Adicionar / Reordenar Componentes</span>
                        </button>
                      </div>

                      {/* Components Grid / Table */}
                      <div className="space-y-2">
                        {t.componentes.map((comp, idx) => {
                          const isConcluido = comp.status === 'CONCLUÍDO';
                          const isEmAndamento = comp.status === 'EM ANDAMENTO';

                          return (
                            <div
                              key={comp.id}
                              className={`p-3 rounded-xl border transition-all text-xs flex flex-wrap items-center justify-between gap-3 ${
                                isConcluido
                                  ? 'bg-emerald-50/40 border-emerald-200'
                                  : isEmAndamento
                                  ? 'bg-amber-50/50 border-amber-300 ring-1 ring-amber-200'
                                  : 'bg-white border-slate-200'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-[240px] flex-1">
                                <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-bold text-[11px] flex items-center justify-center shrink-0">
                                  #{idx + 1}
                                </span>
                                <div>
                                  <div className="font-bold text-slate-900">{comp.nome}</div>
                                  <div className="text-[11px] text-slate-500">
                                    Carga Horária: <strong>{comp.cargaHoraria} horas</strong>
                                  </div>
                                </div>
                              </div>

                              {/* Status Badge */}
                              <div className="shrink-0">
                                {isConcluido && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    CONCLUÍDO
                                  </span>
                                )}
                                {isEmAndamento && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                    <PlayCircle className="w-3 h-3 text-amber-600" />
                                    EM ANDAMENTO
                                  </span>
                                )}
                                {!isConcluido && !isEmAndamento && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    A MINISTRAR
                                  </span>
                                )}
                              </div>

                              {/* Professor que Ministrou */}
                              <div className="min-w-[220px]">
                                {isConcluido ? (
                                  <div className="bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/80">
                                    <span className="text-[10px] text-emerald-700 font-bold uppercase block">
                                      Ministrado por:
                                    </span>
                                    <span className="font-bold text-emerald-950">
                                      {comp.professorNome || 'Docente Concluinte'}
                                    </span>
                                    {comp.dataConclusao && (
                                      <span className="text-[10px] text-emerald-700 block">
                                        (Concluído em {comp.dataConclusao})
                                      </span>
                                    )}
                                  </div>
                                ) : isEmAndamento ? (
                                  <div className="bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200/80">
                                    <span className="text-[10px] text-amber-700 font-bold uppercase block">
                                      Ministrando Atualmente:
                                    </span>
                                    <span className="font-bold text-amber-950">
                                      {comp.professorNome || 'Docente em Aula'}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="text-slate-400 italic">
                                    {comp.professorNome ? `Previsto: ${comp.professorNome}` : 'Docente a definir'}
                                  </div>
                                )}
                              </div>

                              {/* Edit Component Button */}
                              <div className="shrink-0 flex items-center gap-2">
                                <button
                                  id={`btn-editar-comp-${comp.id}`}
                                  onClick={() => onOpenEditarComponente(t, comp)}
                                  className="px-2.5 py-1 rounded border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                                  title="Editar status, carga horária e docente que ministrou"
                                >
                                  <Edit className="w-3 h-3 text-slate-500" />
                                  <span>Editar</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Bottom action for deleting turma */}
                      <div className="pt-2 flex justify-end border-t border-slate-100">
                        <button
                          onClick={() => {
                            if (
                              window.confirm(
                                `Tem certeza que deseja excluir a turma ${t.codigo} (${t.curso})? Esta ação não pode ser desfeita.`
                              )
                            ) {
                              onDeleteTurma(t.id);
                            }
                          }}
                          className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 transition-colors p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Excluir Turma {t.codigo}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBTAB 2: CORPO DOCENTE (PROFESSORES) */}
      {subTab === 'professores' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar professor por nome, e-mail ou competência..."
                value={searchProf}
                onChange={(e) => setSearchProf(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                Padrão: <strong>R$ 32/h</strong> (todos os turnos)
              </span>

              <button
                id="btn-cadastrar-novo-professor"
                onClick={onOpenCadastrarProfessor}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar Novo Professor</span>
              </button>
            </div>
          </div>

          {/* Grid of Teachers */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProfessores.map((prof) => {
              // Calculate how many classes/hours are currently allocated
              const turmasDoProf = turmas.filter((t) =>
                t.componentes.some((c) => c.professorId === prof.id)
              );

              return (
                <div
                  key={prof.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 text-indigo-700 font-bold flex items-center justify-center text-sm border border-slate-200">
                          {prof.nome
                            .split(' ')
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join('')}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-slate-900">{prof.nome}</h4>
                          <p className="text-[11px] text-slate-500">{prof.email || 'Sem e-mail cadastrado'}</p>
                        </div>
                      </div>

                      <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        R$ {prof.valorHora}/h
                      </span>
                    </div>

                    {/* Stats pills */}
                    <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">
                          Carga Máxima
                        </span>
                        <span className="font-bold text-slate-900">{prof.cargaHorariaMaxima}h / mês</span>
                      </div>

                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">
                          Turmas Alocadas
                        </span>
                        <span className="font-bold text-indigo-700">{turmasDoProf.length} turmas</span>
                      </div>
                    </div>

                    {/* Escolas */}
                    <div className="mt-3 text-xs">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                        Unidades de Atuação:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {prof.escolasHabituais.map((esc) => (
                          <span
                            key={esc}
                            className="bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded"
                          >
                            {esc}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Competências */}
                    <div className="mt-3 text-xs">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                        Competências Habilitadas ({prof.competencias.length}):
                      </span>
                      <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                        {prof.competencias.slice(0, 5).map((comp) => (
                          <span
                            key={comp}
                            className="bg-indigo-50 text-indigo-800 text-[10px] font-semibold px-2 py-0.5 rounded border border-indigo-100 truncate max-w-full"
                          >
                            {comp}
                          </span>
                        ))}
                        {prof.competencias.length > 5 && (
                          <span className="text-[10px] text-slate-400 px-1 py-0.5">
                            +{prof.competencias.length - 5} mais
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => onDeleteProfessor(prof.id)}
                      className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Excluir</span>
                    </button>

                    <button
                      id={`btn-editar-prof-${prof.id}`}
                      onClick={() => onOpenEditarProfessor(prof)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center gap-1 transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5 text-slate-500" />
                      <span>Editar Professor</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBTAB 3: ESCOLAS E SALAS */}
      {subTab === 'escolas' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                id="input-busca-escolas"
                type="text"
                placeholder="Buscar escola por nome, região ou sala..."
                value={searchEscola}
                onChange={(e) => setSearchEscola(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-medium">
                <span className="px-2.5 py-1 bg-slate-100 rounded-lg font-bold text-slate-700">
                  {totalSalasGerais} Salas Físicas
                </span>
                <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg font-bold border border-indigo-100">
                  {escolas.length} Unidades
                </span>
              </div>

              <button
                id="btn-cadastrar-nova-escola"
                onClick={onOpenCadastrarEscola}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar Nova Escola</span>
              </button>
            </div>
          </div>

          {/* Grid de Escolas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEscolas.map((escola) => {
              const turmasNestaEscola = turmas.filter((t) => t.escola === escola.nome);
              return (
                <div
                  key={escola.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Header Card */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 shrink-0">
                          <School className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm">{escola.nome}</h3>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{escola.regiao}</span>
                          </div>
                        </div>
                      </div>

                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        {escola.salas?.length || 0} salas
                      </span>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-2 text-center py-2 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-slate-400">Turmas Ativas</span>
                        <span className="font-bold text-slate-800 text-sm">{turmasNestaEscola.length} turmas</span>
                      </div>
                      <div className="border-l border-slate-200">
                        <span className="block text-[10px] uppercase font-bold text-slate-400">Salas Físicas</span>
                        <span className="font-bold text-indigo-700 text-sm">{escola.salas?.length || 0} salas</span>
                      </div>
                    </div>

                    {/* Lista de Salas */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                        Salas de Aula:
                      </span>
                      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                        {escola.salas && escola.salas.length > 0 ? (
                          escola.salas.map((sala) => (
                            <span
                              key={sala.id}
                              className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg border border-slate-200"
                            >
                              <Building className="w-3 h-3 text-slate-400" />
                              <strong className="font-bold">{sala.nome}</strong>
                              {sala.bloco && (
                                <span className="text-[10px] text-slate-500">({sala.bloco})</span>
                              )}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">Nenhuma sala cadastrada.</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => {
                        if (onDeleteEscola) onDeleteEscola(escola.id);
                      }}
                      className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Excluir</span>
                    </button>

                    <button
                      id={`btn-editar-escola-${escola.id}`}
                      onClick={() => onOpenEditarEscola && onOpenEditarEscola(escola)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center gap-1 transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5 text-slate-500" />
                      <span>Editar Escola & Salas</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredEscolas.length === 0 && (
              <div className="col-span-full bg-white rounded-xl border border-slate-200 p-8 text-center space-y-3">
                <School className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500">Nenhuma escola encontrada para a busca.</p>
                <button
                  onClick={onOpenCadastrarEscola}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Cadastrar Primeira Escola
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 4: MATRIZES & EMENTAS */}
      {subTab === 'matrizes' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por curso, sigla, modalidade ou disciplina da ementa..."
                value={searchMatriz}
                onChange={(e) => setSearchMatriz(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
                Total de <strong>{filteredMatrizes.length}</strong> matrizes cadastradas
              </span>

              <button
                id="btn-cadastrar-nova-ementa-modulo"
                onClick={() => onOpenCadastrarMatriz && onOpenCadastrarMatriz()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-colors shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar Nova Ementa</span>
              </button>
            </div>
          </div>

          {/* Grid de Matrizes Curriculares */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredMatrizes.map((matriz) => {
              const isExpanded = expandedMatrizes[matriz.id] ?? false;
              const totalHoras = matriz.cargaHorariaTotal || matriz.unidades.reduce((s, u) => s + (u.cargaHoraria || 0), 0);

              return (
                <div
                  key={matriz.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between gap-4 hover:border-indigo-200 transition-all"
                >
                  <div className="space-y-3">
                    {/* Header do Card */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center font-mono shadow-xs shrink-0">
                          {matriz.sigla}
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-900 leading-tight">
                            {matriz.nome}
                          </h3>
                          <span className="text-xs text-slate-500 font-medium">
                            {matriz.modalidade}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                          {totalHoras}h
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold">
                          {matriz.unidades.length} disciplinas
                        </span>
                      </div>
                    </div>

                    {matriz.descricao && (
                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                        {matriz.descricao}
                      </p>
                    )}

                    {/* Preview ou Tabela Completa das Disciplinas */}
                    <div className="border border-slate-100 bg-slate-50/70 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-indigo-500" />
                          Grade de Unidades Curriculares:
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleExpandMatriz(matriz.id)}
                          className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          {isExpanded ? (
                            <>
                              <span>Recolher</span>
                              <ChevronUp className="w-3.5 h-3.5" />
                            </>
                          ) : (
                            <>
                              <span>Ver todas ({matriz.unidades.length})</span>
                              <ChevronDown className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      </div>

                      {isExpanded ? (
                        <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg bg-white">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200">
                                <th className="p-2 w-8 text-center">Nº</th>
                                <th className="p-2">Disciplina</th>
                                <th className="p-2 w-16 text-right">Carga</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {matriz.unidades.map((uc, i) => (
                                <tr key={i} className="hover:bg-slate-50">
                                  <td className="p-2 text-center text-slate-400 font-mono text-[10px]">
                                    {i + 1 < 10 ? `0${i + 1}` : i + 1}
                                  </td>
                                  <td className="p-2 font-medium text-slate-800">
                                    {uc.nome}
                                  </td>
                                  <td className="p-2 text-right font-mono font-bold text-slate-700">
                                    {uc.cargaHoraria}h
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {matriz.unidades.slice(0, 3).map((uc, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between text-xs py-1 px-2 rounded bg-white border border-slate-100 text-slate-700"
                            >
                              <span className="truncate pr-2 font-medium">
                                <strong className="text-slate-400 font-mono mr-1.5">{i + 1}.</strong>
                                {uc.nome}
                              </span>
                              <span className="font-mono text-[11px] font-bold text-slate-600 shrink-0">
                                {uc.cargaHoraria}h
                              </span>
                            </div>
                          ))}
                          {matriz.unidades.length > 3 && (
                            <div className="text-[11px] text-center text-slate-400 font-medium pt-1">
                              + {matriz.unidades.length - 3} outras disciplinas cadastradas
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions do Card */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (onDeleteMatriz) onDeleteMatriz(matriz.id);
                      }}
                      className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Excluir</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        id={`btn-editar-matriz-${matriz.id}`}
                        onClick={() => onOpenEditarMatriz && onOpenEditarMatriz(matriz)}
                        className="px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5 text-amber-700" />
                        <span>Editar Ementa</span>
                      </button>

                      {onCriarTurmaComMatriz && (
                        <button
                          type="button"
                          onClick={() => onCriarTurmaComMatriz(matriz)}
                          className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Criar Turma</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredMatrizes.length === 0 && (
              <div className="col-span-full bg-white rounded-xl border border-slate-200 p-8 text-center space-y-3">
                <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500">Nenhuma ementa encontrada para a busca.</p>
                <button
                  onClick={() => onOpenCadastrarMatriz && onOpenCadastrarMatriz()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Cadastrar Primeira Ementa
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

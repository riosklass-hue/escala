import React, { useState, useEffect } from 'react';
import {
  Turma,
  ComponenteDaTurma,
  Professor,
  Turno,
  DiaSemana,
  StatusComponente,
} from '../types/rios';
import {
  MATRIZES_CURSOS_OFICIAIS,
  MatrizCursoOficial,
  buscarMatrizPorNomeCurso,
} from '../data/matrizesCursos';
import {
  calcularDataFimSemFinaisDeSemana,
  extrairHorasPorDia,
} from '../utils/conflitoAgenda';
import {
  X,
  Plus,
  Trash2,
  BookOpen,
  Sparkles,
  School,
  Building,
  Calendar,
  Clock,
  GraduationCap,
  Save,
  CheckCircle2,
  PlayCircle,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';

interface ModalTurmaEmentaProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTurma: (turma: Turma) => void;
  turmaParaEditar?: Turma | null;
  matrizInicial?: MatrizCursoOficial | null;
  professores: Professor[];
  escolasExistentes: string[];
  matrizesDisponiveis?: MatrizCursoOficial[];
}

export const ModalTurmaEmenta: React.FC<ModalTurmaEmentaProps> = ({
  isOpen,
  onClose,
  onSaveTurma,
  turmaParaEditar,
  matrizInicial,
  professores,
  escolasExistentes,
  matrizesDisponiveis = MATRIZES_CURSOS_OFICIAIS,
}) => {
  const listaMatrizes = matrizesDisponiveis && matrizesDisponiveis.length > 0 ? matrizesDisponiveis : MATRIZES_CURSOS_OFICIAIS;
  if (!isOpen) return null;

  const isEditing = !!turmaParaEditar;

  // Form states
  const [codigo, setCodigo] = useState<string>(() => {
    if (turmaParaEditar?.codigo) return turmaParaEditar.codigo;
    if (matrizInicial) return `${matrizInicial.sigla}-01`;
    return '';
  });
  const [curso, setCurso] = useState<string>(() => {
    if (turmaParaEditar?.curso) return turmaParaEditar.curso;
    if (matrizInicial) return matrizInicial.nome;
    return 'Técnico em Recursos Humanos';
  });
  const [escola, setEscola] = useState<string>(
    turmaParaEditar?.escola || escolasExistentes[0] || 'Unidade Centro'
  );
  const [outraEscola, setOutraEscola] = useState<string>('');
  const [sala, setSala] = useState<string>(turmaParaEditar?.sala || 'Sala 01');
  const [turno, setTurno] = useState<Turno>(turmaParaEditar?.turno || 'NOITE');
  const [diaSemana, setDiaSemana] = useState<DiaSemana>(
    turmaParaEditar?.diaSemana || 'Segunda-feira'
  );
  const [horario, setHorario] = useState<string>(
    turmaParaEditar?.horario || '18:30 – 22:30'
  );
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);

  // Ementa components state
  const [componentes, setComponentes] = useState<ComponenteDaTurma[]>(() => {
    if (turmaParaEditar && turmaParaEditar.componentes.length > 0) {
      return JSON.parse(JSON.stringify(turmaParaEditar.componentes));
    }
    if (matrizInicial) {
      return matrizInicial.unidades.map((uc, idx) => ({
        id: `comp-${matrizInicial.sigla.toLowerCase()}-${Date.now()}-${idx}`,
        nome: uc.nome,
        cargaHoraria: uc.cargaHoraria,
        status: idx === 0 ? 'EM ANDAMENTO' : 'A MINISTRAR',
        professorId: idx === 0 ? (professores[0]?.id || '') : undefined,
        professorNome: idx === 0 ? (professores[0]?.nome || '') : undefined,
        dataInicio: idx === 0 ? new Date().toLocaleDateString('pt-BR') : undefined,
      }));
    }
    // Default: first matrix (Logística)
    const matrizPadrao = MATRIZES_CURSOS_OFICIAIS[0];
    return matrizPadrao.unidades.slice(0, 3).map((uc, idx) => ({
      id: `comp-${Date.now()}-${idx}`,
      nome: uc.nome,
      cargaHoraria: uc.cargaHoraria,
      status: idx === 0 ? 'EM ANDAMENTO' : 'A MINISTRAR',
      professorId: idx === 0 ? (professores[0]?.id || '') : undefined,
      professorNome: idx === 0 ? (professores[0]?.nome || '') : undefined,
      dataInicio: idx === 0 ? new Date().toLocaleDateString('pt-BR') : undefined,
    }));
  });

  const [novoCompNome, setNovoCompNome] = useState('');
  const [novoCompCarga, setNovoCompCarga] = useState<number>(40);
  const [menuMatrizesAberto, setMenuMatrizesAberto] = useState(false);

  // Preencher com qualquer uma das 5 Matrizes Oficiais (800h)
  const handleCarregarMatrizOficial = (matriz: MatrizCursoOficial) => {
    const novasUnidades: ComponenteDaTurma[] = matriz.unidades.map((uc, idx) => ({
      id: `comp-${matriz.sigla.toLowerCase()}-${Date.now()}-${idx}`,
      nome: uc.nome,
      cargaHoraria: uc.cargaHoraria,
      status: idx === 0 ? 'EM ANDAMENTO' : 'A MINISTRAR',
      professorId: idx === 0 ? (professores[0]?.id || '') : undefined,
      professorNome: idx === 0 ? (professores[0]?.nome || '') : undefined,
      dataInicio: idx === 0 ? new Date().toLocaleDateString('pt-BR') : undefined,
    }));
    setComponentes(novasUnidades);
    setCurso(matriz.nome);
    if (!codigo || codigo.trim() === '') {
      setCodigo(`${matriz.sigla}-01`);
    }
    setMenuMatrizesAberto(false);
  };

  const handleAdicionarComponente = () => {
    if (!novoCompNome.trim()) return;
    const novo: ComponenteDaTurma = {
      id: `comp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      nome: novoCompNome.trim(),
      cargaHoraria: Number(novoCompCarga) || 40,
      status: 'A MINISTRAR',
    };
    setComponentes((prev) => [...prev, novo]);
    setNovoCompNome('');
    setNovoCompCarga(40);
  };

  const handleRemoverComponente = (id: string) => {
    setComponentes((prev) => prev.filter((c) => c.id !== id));
  };

  const handleAtualizarComponente = (
    id: string,
    updates: Partial<ComponenteDaTurma>
  ) => {
    setComponentes((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const updated = { ...c, ...updates };
          // If professorId was changed, sync professorNome
          if (updates.professorId !== undefined) {
            if (updates.professorId === '') {
              updated.professorId = undefined;
              updated.professorNome = undefined;
            } else {
              const prof = professores.find((p) => p.id === updates.professorId);
              if (prof) {
                updated.professorNome = prof.nome;
              }
            }
          }
          // If status set to CONCLUÍDO and no dataConclusao, set today's date
          if (updates.status === 'CONCLUÍDO' && !updated.dataConclusao) {
            updated.dataConclusao = new Date().toLocaleDateString('pt-BR');
          }

          // Se alterou data de início ou carga horária e não especificou data final, calcula automaticamente sem finais de semana
          if (
            (updates.dataInicio !== undefined || updates.cargaHoraria !== undefined) &&
            updates.dataFim === undefined &&
            updated.dataInicio &&
            updated.cargaHoraria > 0
          ) {
            const hDia = extrairHorasPorDia(horario);
            updated.dataFim = calcularDataFimSemFinaisDeSemana(
              updated.dataInicio,
              updated.cargaHoraria,
              hDia
            );
          }

          return updated;
        }
        return c;
      })
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErroValidacao(null);
    if (!codigo.trim()) {
      setErroValidacao('Por favor, informe o código da turma (ex: RH-01).');
      return;
    }
    if (!curso.trim()) {
      setErroValidacao('Por favor, informe o nome do curso.');
      return;
    }
    if (componentes.length === 0) {
      setErroValidacao('A turma deve ter pelo menos um componente curricular em sua ementa.');
      return;
    }

    const escolaFinal = escola === 'OUTRA' ? outraEscola.trim() : escola;
    if (!escolaFinal) {
      setErroValidacao('Por favor, selecione ou informe a escola/unidade.');
      return;
    }

    const turmaFinal: Turma = {
      id: turmaParaEditar?.id || `turma-${codigo.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`,
      codigo: codigo.trim().toUpperCase(),
      curso: curso.trim(),
      escola: escolaFinal,
      sala: sala.trim(),
      turno,
      diaSemana,
      horario: horario.trim(),
      componentes,
    };

    onSaveTurma(turmaFinal);
    onClose();
  };

  const cargaTotal = componentes.reduce((acc, curr) => acc + (Number(curr.cargaHoraria) || 0), 0);
  const cargaConcluida = componentes
    .filter((c) => c.status === 'CONCLUÍDO')
    .reduce((acc, curr) => acc + (Number(curr.cargaHoraria) || 0), 0);
  const cargaEmAndamento = componentes
    .filter((c) => c.status === 'EM ANDAMENTO')
    .reduce((acc, curr) => acc + (Number(curr.cargaHoraria) || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isEditing ? `Editar Turma & Ementa: ${turmaParaEditar.codigo}` : 'Cadastrar Nova Turma & Ementa'}
              </h3>
              <p className="text-xs text-slate-500">
                Defina a estrutura fixa da turma e a matriz específica de componentes curriculares.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content with Scroll */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Dados Gerais da Turma */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <School className="w-4 h-4 text-indigo-600" />
              1. Estrutura Fixa da Turma
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Código da Turma *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: RH-01, ADM-02"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-bold"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome do Curso *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Técnico em Recursos Humanos"
                  value={curso}
                  onChange={(e) => setCurso(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Escola / Unidade *
                </label>
                <select
                  value={escola}
                  onChange={(e) => setEscola(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  {escolasExistentes.map((esc) => (
                    <option key={esc} value={esc}>
                      {esc}
                    </option>
                  ))}
                  <option value="OUTRA">+ Cadastrar Outra Unidade...</option>
                </select>
                {escola === 'OUTRA' && (
                  <input
                    type="text"
                    required
                    placeholder="Nome da nova unidade"
                    value={outraEscola}
                    onChange={(e) => setOutraEscola(e.target.value)}
                    className="w-full mt-2 px-3 py-1.5 text-xs rounded-lg border border-indigo-300"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sala de Aula *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Sala 04, Laboratório 2"
                  value={sala}
                  onChange={(e) => setSala(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Turno Fixo *
                </label>
                <select
                  value={turno}
                  onChange={(e) => setTurno(e.target.value as Turno)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="MANHÃ">MANHÃ (08:00 – 12:00)</option>
                  <option value="TARDE">TARDE (13:30 – 17:30)</option>
                  <option value="NOITE">NOITE (18:30 – 22:30)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Dia da Semana *
                </label>
                <select
                  value={diaSemana}
                  onChange={(e) => setDiaSemana(e.target.value as DiaSemana)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="Segunda-feira">Segunda-feira</option>
                  <option value="Terça-feira">Terça-feira</option>
                  <option value="Quarta-feira">Quarta-feira</option>
                  <option value="Quinta-feira">Quinta-feira</option>
                  <option value="Sexta-feira">Sexta-feira</option>
                  <option value="Sábado">Sábado</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Horário da Aula *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: 18:30 – 22:30"
                value={horario}
                onChange={(e) => setHorario(e.target.value)}
                className="w-full max-w-xs px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* Ementa e Matriz Curricular */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  2. Ementa & Componentes Curriculares da Turma
                </h4>
                <p className="text-xs text-slate-500">
                  Cada componente possui sua carga horária, status de avanço e o docente que o ministrou.
                </p>
              </div>

              {/* Botão Dropdown para importar Matriz Curricular Oficial (5 Cursos) */}
              <div className="relative">
                <button
                  type="button"
                  id="btn-abrir-menu-matrizes"
                  onClick={() => setMenuMatrizesAberto(!menuMatrizesAberto)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                  title="Carregar uma das 5 Matrizes Curriculares Oficiais (800h cada)"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Importar Matriz Oficial (800h)</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${menuMatrizesAberto ? 'rotate-180' : ''}`} />
                </button>

                {menuMatrizesAberto && (
                  <div className="absolute right-0 mt-1.5 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-1 text-[10px] font-black uppercase text-slate-400 border-b border-slate-100">
                      Escolha a Matriz do Curso ({listaMatrizes.length} cadastradas)
                    </div>
                    {listaMatrizes.map((mat) => (
                      <button
                        key={mat.id}
                        type="button"
                        onClick={() => handleCarregarMatrizOficial(mat)}
                        className="w-full px-3 py-2 text-left text-xs hover:bg-indigo-50 flex items-center justify-between gap-2 text-slate-700 hover:text-indigo-900 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-black bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                            {mat.sigla}
                          </span>
                          <span className="font-semibold">{mat.nome}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 font-bold">
                          {mat.unidades.length} UCs
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Totalizadores da Ementa */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Carga Total da Ementa</span>
                <span className="text-sm font-extrabold text-slate-900">{cargaTotal} horas</span>
                <span className="text-[10px] text-slate-500 block">({componentes.length} componentes)</span>
              </div>
              <div>
                <span className="text-emerald-600 block text-[10px] font-bold uppercase">Carga Concluída</span>
                <span className="text-sm font-extrabold text-emerald-800">{cargaConcluida} horas</span>
                <span className="text-[10px] text-slate-500 block">
                  ({cargaTotal > 0 ? Math.round((cargaConcluida / cargaTotal) * 100) : 0}%)
                </span>
              </div>
              <div>
                <span className="text-amber-600 block text-[10px] font-bold uppercase">Em Andamento</span>
                <span className="text-sm font-extrabold text-amber-800">{cargaEmAndamento} horas</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] font-bold uppercase">A Ministrar</span>
                <span className="text-sm font-extrabold text-slate-700">
                  {cargaTotal - cargaConcluida - cargaEmAndamento} horas
                </span>
              </div>
            </div>

            {/* Lista dos componentes da ementa */}
            <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
              {componentes.map((comp, idx) => {
                const isConcluido = comp.status === 'CONCLUÍDO';
                const isEmAndamento = comp.status === 'EM ANDAMENTO';

                return (
                  <div
                    key={comp.id}
                    className={`p-3 rounded-xl border transition-all text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isConcluido
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : isEmAndamento
                        ? 'bg-amber-50/50 border-amber-300 ring-1 ring-amber-200'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Index + Name */}
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-bold text-[11px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={comp.nome}
                          onChange={(e) =>
                            handleAtualizarComponente(comp.id, { nome: e.target.value })
                          }
                          className="w-full px-2 py-1 text-xs font-bold text-slate-900 border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded bg-transparent focus:bg-white"
                          title="Clique para editar o nome do componente"
                        />
                      </div>
                    </div>

                    {/* Carga Horária, Status e Professor */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {/* Carga Horária */}
                      <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-bold">Carga:</span>
                        <input
                          type="number"
                          min="1"
                          max="400"
                          value={comp.cargaHoraria}
                          onChange={(e) =>
                            handleAtualizarComponente(comp.id, {
                              cargaHoraria: Number(e.target.value) || 0,
                            })
                          }
                          className="w-12 bg-white text-center font-bold text-xs rounded border border-slate-200 px-1 py-0.5"
                        />
                        <span className="text-[10px] text-slate-600">h</span>
                      </div>

                      {/* Status */}
                      <select
                        value={comp.status}
                        onChange={(e) =>
                          handleAtualizarComponente(comp.id, {
                            status: e.target.value as StatusComponente,
                          })
                        }
                        className={`text-xs font-bold px-2.5 py-1 rounded border ${
                          isConcluido
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : isEmAndamento
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}
                      >
                        <option value="A MINISTRAR">A MINISTRAR</option>
                        <option value="EM ANDAMENTO">EM ANDAMENTO</option>
                        <option value="CONCLUÍDO">CONCLUÍDO</option>
                      </select>

                      {/* Professor que ministrou ou ministra */}
                      <div className="flex items-center gap-1">
                        <select
                          value={comp.professorId || ''}
                          onChange={(e) =>
                            handleAtualizarComponente(comp.id, {
                              professorId: e.target.value,
                            })
                          }
                          className="text-xs px-2 py-1 rounded border border-slate-300 bg-white max-w-[150px]"
                          title="Professor que ministrou / ministra este componente"
                        >
                          <option value="">-- Sem Docente --</option>
                          {professores.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nome}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Datas Início e Fim */}
                      <div className="flex items-center gap-1 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                        <input
                          type="text"
                          placeholder="Início"
                          value={comp.dataInicio || ''}
                          onChange={(e) =>
                            handleAtualizarComponente(comp.id, {
                              dataInicio: e.target.value,
                            })
                          }
                          className="w-20 px-1 py-0.5 text-[11px] font-semibold text-slate-800 rounded border border-slate-200"
                          title="Data de Início"
                        />
                        <span className="text-slate-400 text-[10px]">➔</span>
                        <input
                          type="text"
                          placeholder="Fim"
                          value={comp.dataFim || ''}
                          onChange={(e) =>
                            handleAtualizarComponente(comp.id, {
                              dataFim: e.target.value,
                            })
                          }
                          className="w-20 px-1 py-0.5 text-[11px] font-semibold text-slate-800 rounded border border-slate-200"
                          title="Data de Fim / Conclusão"
                        />
                      </div>

                      {/* Remover Componente */}
                      <button
                        type="button"
                        onClick={() => handleRemoverComponente(comp.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Remover este componente da ementa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Inclusão rápida de novo componente */}
            <div className="bg-slate-50 p-3 rounded-xl border border-dashed border-slate-300 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  placeholder="Nome do novo componente curricular..."
                  value={novoCompNome}
                  onChange={(e) => setNovoCompNome(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAdicionarComponente();
                    }
                  }}
                  className="w-full px-3 py-1.5 text-xs bg-white rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 font-bold">Carga:</span>
                <input
                  type="number"
                  min="10"
                  max="200"
                  value={novoCompCarga}
                  onChange={(e) => setNovoCompCarga(Number(e.target.value))}
                  className="w-16 px-2 py-1.5 text-xs bg-white rounded-lg border border-slate-300 text-center font-bold"
                />
                <span className="text-xs text-slate-500">horas</span>
              </div>

              <button
                type="button"
                onClick={handleAdicionarComponente}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar à Ementa</span>
              </button>
            </div>
          </div>

          {erroValidacao && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{erroValidacao}</span>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              id="btn-salvar-turma-ementa"
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm flex items-center gap-2 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{isEditing ? 'Salvar Alterações da Turma' : 'Cadastrar Turma com Ementa'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

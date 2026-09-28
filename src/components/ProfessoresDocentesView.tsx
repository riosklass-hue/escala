import React, { useState, useMemo } from 'react';
import { Professor, Turma, DiaSemana, Turno } from '../types/rios';
import {
  Users,
  UserCheck,
  Plus,
  Edit,
  Trash2,
  Calendar,
  Clock,
  School,
  GraduationCap,
  BookOpen,
  Search,
  Filter,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface ProfessoresDocentesViewProps {
  professores: Professor[];
  turmas: Turma[];
  onOpenCadastrarProfessor: () => void;
  onOpenEditarProfessor: (prof: Professor) => void;
  onDeleteProfessor: (profId: string) => void;
  onSelectTurma?: (turmaId: string) => void;
}

const DIAS_SEMANA_LISTA: DiaSemana[] = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

export const ProfessoresDocentesView: React.FC<ProfessoresDocentesViewProps> = ({
  professores,
  turmas,
  onOpenCadastrarProfessor,
  onOpenEditarProfessor,
  onDeleteProfessor,
  onSelectTurma,
}) => {
  const [busca, setBusca] = useState('');
  const [filtroDia, setFiltroDia] = useState<string>('TODOS');
  const [filtroTurno, setFiltroTurno] = useState<string>('TODOS');

  // Mapeamento de turmas e componentes por professor
  const alocacoesPorProfessor = useMemo(() => {
    const map: Record<
      string,
      Array<{
        turma: Turma;
        componenteNome: string;
        cargaHoraria: number;
      }>
    > = {};

    professores.forEach((p) => {
      map[p.id] = [];
    });

    turmas.forEach((t) => {
      t.componentes.forEach((c) => {
        if (c.professorId && map[c.professorId]) {
          map[c.professorId].push({
            turma: t,
            componenteNome: c.nome,
            cargaHoraria: c.cargaHoraria || 0,
          });
        }
      });
    });

    return map;
  }, [professores, turmas]);

  // Filtragem
  const professoresFiltrados = useMemo(() => {
    return professores.filter((p) => {
      const alocacoes = alocacoesPorProfessor[p.id] || [];

      // Filtro por dia da semana (aulas que ele já tem ou disponibilidade)
      if (filtroDia !== 'TODOS') {
        const temAulaNoDia = alocacoes.some((a) => a.turma.diaSemana === filtroDia);
        if (!temAulaNoDia) return false;
      }

      // Filtro por turno
      if (filtroTurno !== 'TODOS') {
        const temAulaNoTurno = alocacoes.some((a) => a.turma.turno === filtroTurno);
        if (!temAulaNoTurno) return false;
      }

      if (!busca.trim()) return true;
      const termo = busca.toLowerCase();
      const matchNome = p.nome.toLowerCase().includes(termo);
      const matchEmail = p.email?.toLowerCase().includes(termo);
      const matchTelefone = p.telefone?.toLowerCase().includes(termo);
      const matchComp = p.competencias?.some((c) => c.toLowerCase().includes(termo));
      const matchTurma = alocacoes.some(
        (a) =>
          a.turma.codigo.toLowerCase().includes(termo) ||
          a.turma.curso.toLowerCase().includes(termo) ||
          a.componenteNome.toLowerCase().includes(termo)
      );

      return matchNome || matchEmail || matchTelefone || matchComp || matchTurma;
    });
  }, [professores, alocacoesPorProfessor, busca, filtroDia, filtroTurno]);

  // Estatísticas
  const totalProfessores = professores.length;
  const professoresComTurma = useMemo(() => {
    return professores.filter((p) => (alocacoesPorProfessor[p.id] || []).length > 0).length;
  }, [professores, alocacoesPorProfessor]);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 leading-tight">
                  Professores & Disponibilidade de Aulas
                </h2>
                <p className="text-xs text-slate-500">
                  Corpo docente, dias e horários de aula, turmas atribuídas e controle de carga horária.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              id="btn-cadastrar-novo-professor"
              onClick={onOpenCadastrarProfessor}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Professor</span>
            </button>
          </div>
        </div>

        {/* Métricas Rápidas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-100">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Total de Professores
            </span>
            <span className="text-xl font-extrabold text-slate-900 mt-0.5 block">
              {totalProfessores}
            </span>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Em Sala de Aula
            </span>
            <span className="text-xl font-extrabold text-emerald-600 mt-0.5 block">
              {professoresComTurma}
            </span>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Disponíveis para Alocação
            </span>
            <span className="text-xl font-extrabold text-indigo-600 mt-0.5 block">
              {totalProfessores - professoresComTurma}
            </span>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Taxa de Ativação
            </span>
            <span className="text-xl font-extrabold text-slate-800 mt-0.5 block">
              {totalProfessores > 0
                ? `${Math.round((professoresComTurma / totalProfessores) * 100)}%`
                : '0%'}
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por professor, especialidade, e-mail, telefone ou turma atribuída..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
          <select
            value={filtroDia}
            onChange={(e) => setFiltroDia(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-hidden cursor-pointer"
          >
            <option value="TODOS">Todos os Dias de Aula</option>
            {DIAS_SEMANA_LISTA.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

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
        </div>
      </div>

      {/* Grid de Professores */}
      {professoresFiltrados.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center text-slate-500">
          <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="font-semibold text-base text-slate-800">Nenhum professor encontrado</p>
          <p className="text-xs text-slate-500 mt-1">
            Tente outros termos de busca ou cadastre um novo docente no botão acima.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {professoresFiltrados.map((prof) => {
            const alocacoes = alocacoesPorProfessor[prof.id] || [];
            const totalHorasAlocadas = alocacoes.reduce((acc, a) => acc + a.cargaHoraria, 0);
            const limiteHoras = prof.cargaHorariaMaxima || 40;

            // Agrupa os dias da semana em que ele dá aula
            const diasDeAula = Array.from(new Set(alocacoes.map((a) => a.turma.diaSemana)));

            return (
              <div
                key={prof.id}
                id={`card-prof-${prof.id}`}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-300 transition-all p-5 flex flex-col justify-between space-y-4"
              >
                <div>
                  {/* Topo do Card */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-700 font-bold text-base flex items-center justify-center shadow-xs shrink-0">
                        {prof.nome.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base leading-tight">
                          {prof.nome}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                          {prof.telefone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {prof.telefone}
                            </span>
                          )}
                          {prof.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400" />
                              {prof.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onOpenEditarProfessor(prof)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Editar Professor"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Tem certeza que deseja excluir o professor ${prof.nome}?`)) {
                            onDeleteProfessor(prof.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Excluir Professor"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Competências / Especialidades */}
                  {prof.competencias && prof.competencias.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {prof.competencias.map((comp, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200"
                        >
                          {comp}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Bloco de Datas e Horários de Aulas */}
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                        Dias com Aulas Atribuídas:
                      </span>
                      {diasDeAula.length > 0 ? (
                        <span className="font-bold text-slate-800">
                          {diasDeAula.join(', ')}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Nenhum dia alocado</span>
                      )}
                    </div>

                    {/* Turmas e Ementas sob responsabilidade deste docente */}
                    <div className="mt-2 space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Turmas & Disciplinas da Ementa ({alocacoes.length}):
                      </span>

                      {alocacoes.length === 0 ? (
                        <p className="text-xs text-slate-400 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                          Docente livre no momento (sem turmas alocadas).
                        </p>
                      ) : (
                        <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                          {alocacoes.map((item, idx) => (
                            <div
                              key={idx}
                              className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                            >
                              <div className="min-w-0 pr-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded text-[10px]">
                                    {item.turma.codigo}
                                  </span>
                                  <span className="font-semibold text-slate-800 truncate">
                                    {item.componenteNome}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                  <span>{item.turma.diaSemana}</span>
                                  <span>•</span>
                                  <span>{item.turma.turno} ({item.turma.horario})</span>
                                  <span>•</span>
                                  <span>{item.turma.sala}</span>
                                </div>
                              </div>

                              <span className="font-mono font-bold text-[10px] text-slate-600 shrink-0 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                {item.cargaHoraria}h
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Barra de Carga Horária */}
                <div className="pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-500 font-medium flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Carga Horária Alocada:
                    </span>
                    <span className="font-bold text-slate-900">
                      {totalHorasAlocadas}h{' '}
                      <span className="text-slate-400 font-normal">/ {limiteHoras}h máx</span>
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        totalHorasAlocadas > limiteHoras
                          ? 'bg-rose-500'
                          : totalHorasAlocadas === limiteHoras
                          ? 'bg-amber-500'
                          : 'bg-indigo-600'
                      }`}
                      style={{
                        width: `${Math.min(100, Math.round((totalHorasAlocadas / limiteHoras) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { AulaMinistradaRecord, HistoricoSubstituicao, Professor, Turma, Turno, DiaSemana } from '../types/rios';
import {
  FileCheck2,
  Search,
  Filter,
  Calendar,
  Clock,
  School,
  Building,
  UserCheck,
  Download,
  PlusCircle,
  History,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Printer,
  ChevronDown,
} from 'lucide-react';

interface HistoricoAulasMinistradasProps {
  aulasMinistradas: AulaMinistradaRecord[];
  historicoSubstituicoes: HistoricoSubstituicao[];
  professores: Professor[];
  turmas: Turma[];
  onRegistrarAula: (aula: Omit<AulaMinistradaRecord, 'id' | 'timestampRegistro'>) => void;
}

export const HistoricoAulasMinistradas: React.FC<HistoricoAulasMinistradasProps> = ({
  aulasMinistradas,
  historicoSubstituicoes,
  professores,
  turmas,
  onRegistrarAula,
}) => {
  const [subTab, setSubTab] = useState<'aulas' | 'substituicoes'>('aulas');
  
  // Filters for Aulas Ministradas
  const [busca, setBusca] = useState<string>('');
  const [filtroProf, setFiltroProf] = useState<string>('todos');
  const [filtroTurma, setFiltroTurma] = useState<string>('todas');
  const [filtroEscola, setFiltroEscola] = useState<string>('todas');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');

  // Modal State for Manual Class Registration
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [formTurmaId, setFormTurmaId] = useState<string>(turmas[0]?.id || '');
  const [formCompId, setFormCompId] = useState<string>('');
  const [formProfId, setFormProfId] = useState<string>(professores[0]?.id || '');
  const [formData, setFormData] = useState<string>('10/09/2026');
  const [formHorario, setFormHorario] = useState<string>('18:30 – 22:30');
  const [formTurno, setFormTurno] = useState<Turno>('NOITE');
  const [formDiaSemana, setFormDiaSemana] = useState<DiaSemana>('Terça-feira');
  const [formHoras, setFormHoras] = useState<number>(4);
  const [formConteudo, setFormConteudo] = useState<string>('');
  const [formObs, setFormObs] = useState<string>('');

  const selectedTurma = useMemo(() => {
    return turmas.find((t) => t.id === formTurmaId) || turmas[0];
  }, [turmas, formTurmaId]);

  // Filtered Aulas
  const aulasFiltradas = useMemo(() => {
    return aulasMinistradas.filter((a) => {
      const termo = busca.toLowerCase();
      const matchBusca =
        !busca ||
        a.turmaCodigo.toLowerCase().includes(termo) ||
        a.curso.toLowerCase().includes(termo) ||
        a.componenteNome.toLowerCase().includes(termo) ||
        a.professorNome.toLowerCase().includes(termo) ||
        a.escola.toLowerCase().includes(termo) ||
        a.sala.toLowerCase().includes(termo) ||
        (a.conteudoMinistrado && a.conteudoMinistrado.toLowerCase().includes(termo));

      const matchProf = filtroProf === 'todos' || a.professorId === filtroProf;
      const matchTurma = filtroTurma === 'todas' || a.turmaCodigo === filtroTurma;
      const matchEscola = filtroEscola === 'todas' || a.escola === filtroEscola;
      const matchStatus = filtroStatus === 'todos' || a.status === filtroStatus;

      return matchBusca && matchProf && matchTurma && matchEscola && matchStatus;
    });
  }, [aulasMinistradas, busca, filtroProf, filtroTurma, filtroEscola, filtroStatus]);

  // Statistics
  const totalHorasAuditadas = useMemo(() => {
    return aulasFiltradas.reduce((acc, a) => acc + a.horasMinistradas, 0);
  }, [aulasFiltradas]);

  const turmasDistintas = useMemo(() => {
    const s = new Set<string>();
    aulasFiltradas.forEach((a) => s.add(a.turmaCodigo));
    return s.size;
  }, [aulasFiltradas]);

  const professoresDistintos = useMemo(() => {
    const s = new Set<string>();
    aulasFiltradas.forEach((a) => s.add(a.professorId));
    return s.size;
  }, [aulasFiltradas]);

  // Handle Manual Submission
  const handleSubmitNovoRegistro = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTurma) return;

    const comp =
      selectedTurma.componentes.find((c) => c.id === formCompId) ||
      selectedTurma.componentes[0];

    const prof = professores.find((p) => p.id === formProfId) || professores[0];

    onRegistrarAula({
      data: formData,
      horario: formHorario,
      turno: formTurno,
      diaSemana: formDiaSemana,
      turmaCodigo: selectedTurma.codigo,
      curso: selectedTurma.curso,
      componenteNome: comp ? comp.nome : 'Componente Curricular',
      horasMinistradas: formHoras,
      professorId: prof.id,
      professorNome: prof.nome,
      escola: selectedTurma.escola,
      sala: selectedTurma.sala,
      conteudoMinistrado: formConteudo || 'Aula ministrada em conformidade com o cronograma pedagógico.',
      observacoes: formObs || 'Registro manual efetuado pela Coordenação.',
      status: 'CONFIRMADA',
      registradoPor: 'Coordenação de Ensino',
    });

    setModalOpen(false);
    setFormConteudo('');
    setFormObs('');
  };

  const handleExportCSV = () => {
    const header = [
      'Data',
      'Horário',
      'Turno',
      'Turma',
      'Curso',
      'Componente',
      'Carga Horária (h)',
      'Professor',
      'Escola',
      'Sala',
      'Status',
      'Conteúdo',
      'Registrado Por',
      'Timestamp',
    ];

    const rows = aulasFiltradas.map((a) => [
      `"${a.data}"`,
      `"${a.horario}"`,
      `"${a.turno}"`,
      `"${a.turmaCodigo}"`,
      `"${a.curso}"`,
      `"${a.componenteNome}"`,
      a.horasMinistradas,
      `"${a.professorNome}"`,
      `"${a.escola}"`,
      `"${a.sala}"`,
      `"${a.status}"`,
      `"${(a.conteudoMinistrado || '').replace(/"/g, '""')}"`,
      `"${a.registradoPor}"`,
      `"${a.timestampRegistro}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [header.join(';'), ...rows.map((r) => r.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `RIOS_historico_aulas_ministradas_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header & Sub-Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-indigo-50 text-indigo-700">
                <FileCheck2 className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900 leading-tight">
                  Histórico de Aulas Ministradas & Auditoria
                </h2>
                <p className="text-xs text-slate-500">
                  Registro cronológico detalhado de todas as aulas ministradas pelos professores para auditoria, cumprimento de matriz e acompanhamento de progresso.
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 flex items-center gap-1.5 transition-colors shadow-2xs"
              title="Exportar dados para planilha CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar CSV</span>
            </button>

            <button
              id="btn-abrir-registro-aula"
              onClick={() => setModalOpen(true)}
              className="px-3.5 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Registrar Aula Ministrada</span>
            </button>
          </div>
        </div>

        {/* View switcher tabs */}
        <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
          <button
            onClick={() => setSubTab('aulas')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
              subTab === 'aulas'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>Aulas Ministradas ({aulasMinistradas.length})</span>
          </button>

          <button
            onClick={() => setSubTab('substituicoes')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
              subTab === 'substituicoes'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Movimentações de Docentes ({historicoSubstituicoes.length})</span>
          </button>
        </div>
      </div>

      {subTab === 'aulas' ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Aulas Ministradas Registradas
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-indigo-700">{aulasFiltradas.length}</span>
                <span className="text-xs text-slate-400">registros auditados</span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Carga Horária Efetivada
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-700">{totalHorasAuditadas}h</span>
                <span className="text-xs text-slate-400">horas-aula cumpridas</span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Turmas Acompanhadas
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-800">{turmasDistintas}</span>
                <span className="text-xs text-slate-400">turmas ativas no log</span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Docentes com Registros
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-800">{professoresDistintos}</span>
                <span className="text-xs text-slate-400">professores atuantes</span>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="flex flex-col lg:flex-row items-center gap-3">
              {/* Search text */}
              <div className="w-full lg:flex-1 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  id="input-busca-aulas-ministradas"
                  type="text"
                  placeholder="Buscar por professor, turma, componente, escola, conteúdo..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Select filters */}
              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                <select
                  value={filtroProf}
                  onChange={(e) => setFiltroProf(e.target.value)}
                  className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 font-medium"
                >
                  <option value="todos">Todos os Professores</option>
                  {professores.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>

                <select
                  value={filtroTurma}
                  onChange={(e) => setFiltroTurma(e.target.value)}
                  className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 font-medium"
                >
                  <option value="todas">Todas as Turmas</option>
                  {turmas.map((t) => (
                    <option key={t.id} value={t.codigo}>
                      Turma {t.codigo}
                    </option>
                  ))}
                </select>

                <select
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value)}
                  className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 font-medium"
                >
                  <option value="todos">Todos os Status</option>
                  <option value="CONFIRMADA">CONFIRMADA</option>
                  <option value="MINISTRADA">MINISTRADA</option>
                  <option value="SUBSTITUÍDA">SUBSTITUÍDA</option>
                </select>
              </div>
            </div>
          </div>

          {/* Historical Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 text-slate-600 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Data & Horário</th>
                    <th className="px-4 py-3">Professor</th>
                    <th className="px-3 py-3">Turma (Fixa)</th>
                    <th className="px-4 py-3">Componente Curricular (Fixo)</th>
                    <th className="px-4 py-3">Localização (Fixa)</th>
                    <th className="px-3 py-3 text-center">Horas</th>
                    <th className="px-4 py-3">Conteúdo & Auditoria</th>
                    <th className="px-3 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {aulasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                        Nenhum registro de aula ministrada encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    aulasFiltradas.map((aula) => (
                      <tr key={aula.id} className="hover:bg-slate-50 transition-colors">
                        {/* Data & Horário */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-bold text-slate-900">{aula.data}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {aula.horario} • <span className="font-semibold">{aula.turno}</span>
                          </div>
                        </td>

                        {/* Professor */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0">
                              {aula.professorNome.charAt(0)}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block leading-tight">
                                {aula.professorNome}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                Docente responsável
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Turma */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            {aula.turmaCodigo}
                          </span>
                          <span className="text-[11px] text-slate-500 block mt-0.5 max-w-[120px] truncate" title={aula.curso}>
                            {aula.curso}
                          </span>
                        </td>

                        {/* Componente */}
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">
                            {aula.componenteNome}
                          </div>
                        </td>

                        {/* Local */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-slate-800 font-medium flex items-center gap-1">
                            <School className="w-3.5 h-3.5 text-slate-400" />
                            <span>{aula.escola}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Building className="w-3 h-3 text-slate-400" />
                            <span>{aula.sala}</span>
                          </div>
                        </td>

                        {/* Horas */}
                        <td className="px-3 py-3 text-center whitespace-nowrap font-bold text-slate-800">
                          {aula.horasMinistradas}h
                        </td>

                        {/* Conteúdo & Auditoria */}
                        <td className="px-4 py-3 max-w-xs">
                          {aula.conteudoMinistrado && (
                            <p className="text-slate-700 font-medium truncate" title={aula.conteudoMinistrado}>
                              {aula.conteudoMinistrado}
                            </p>
                          )}
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Por: {aula.registradoPor} • {aula.timestampRegistro}
                          </p>
                        </td>

                        {/* Status */}
                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              aula.status === 'CONFIRMADA'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : aula.status === 'SUBSTITUÍDA'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}
                          >
                            {aula.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Teacher Substitutions Audit Log */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Histórico de Substituições e Movimentação de Professores
              </h3>
              <p className="text-xs text-slate-500">
                Auditoria de conformidade com a Regra Fundamental: todas as alterações de docentes preservando a estrutura da turma.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-600 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Data e Hora</th>
                  <th className="px-3 py-3">Turma (Fixa)</th>
                  <th className="px-4 py-3">Componente Curricular (Fixo)</th>
                  <th className="px-4 py-3">Docente Anterior</th>
                  <th className="px-4 py-3">Novo Docente Alocado</th>
                  <th className="px-5 py-3">Justificativa / Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {historicoSubstituicoes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      Nenhum registro de substituição docente cadastrado.
                    </td>
                  </tr>
                ) : (
                  historicoSubstituicoes.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-500 whitespace-nowrap">
                        {item.dataAlteracao}
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                          {item.turmaCodigo}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {item.componenteNome}
                      </td>
                      <td className="px-4 py-3 text-rose-700 font-medium">
                        {item.professorAnteriorNome}
                      </td>
                      <td className="px-4 py-3 text-emerald-700 font-bold">
                        {item.professorNovoNome}
                      </td>
                      <td className="px-5 py-3 text-slate-600 max-w-xs truncate" title={item.motivo}>
                        {item.motivo}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Registrar Aula Ministrada Manualmente */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-indigo-50 text-indigo-700">
                  <PlusCircle className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Lançar Aula Ministrada (Auditoria)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Registrar aula executada para o histórico de cumprimento pedagógico.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitNovoRegistro} className="space-y-3.5 text-xs">
              {/* Turma Selection */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Turma (Estrutura Fixa):
                </label>
                <select
                  value={formTurmaId}
                  onChange={(e) => {
                    setFormTurmaId(e.target.value);
                    const t = turmas.find((item) => item.id === e.target.value);
                    if (t) {
                      setFormHorario(t.horario);
                      setFormTurno(t.turno);
                      setFormDiaSemana(t.diaSemana);
                    }
                  }}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-slate-50 font-medium"
                >
                  {turmas.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.codigo} – {t.curso} ({t.escola} • {t.sala})
                    </option>
                  ))}
                </select>
              </div>

              {/* Componente Curricular Selection */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Componente Curricular da Turma:
                </label>
                <select
                  value={formCompId}
                  onChange={(e) => setFormCompId(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white font-medium"
                >
                  {selectedTurma?.componentes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} ({c.cargaHoraria}h) – Status: {c.status}
                    </option>
                  ))}
                </select>
              </div>

              {/* Professor Selection */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Professor que Ministrou:
                </label>
                <select
                  value={formProfId}
                  onChange={(e) => setFormProfId(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white font-medium"
                >
                  {professores.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} ({p.escolasHabituais.join(', ')})
                    </option>
                  ))}
                </select>
              </div>

              {/* Data & Horário */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Data:</label>
                  <input
                    type="text"
                    value={formData}
                    onChange={(e) => setFormData(e.target.value)}
                    placeholder="Ex: 10/09/2026"
                    className="w-full p-2 rounded-lg border border-slate-300"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Horário:</label>
                  <input
                    type="text"
                    value={formHorario}
                    onChange={(e) => setFormHorario(e.target.value)}
                    placeholder="Ex: 18:30 – 22:30"
                    className="w-full p-2 rounded-lg border border-slate-300"
                    required
                  />
                </div>
              </div>

              {/* Turno & Carga Horária */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Turno:</label>
                  <select
                    value={formTurno}
                    onChange={(e) => setFormTurno(e.target.value as Turno)}
                    className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="MANHÃ">MANHÃ</option>
                    <option value="TARDE">TARDE</option>
                    <option value="NOITE">NOITE</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Carga Ministrada (h):</label>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={formHoras}
                    onChange={(e) => setFormHoras(parseInt(e.target.value, 10) || 4)}
                    className="w-full p-2 rounded-lg border border-slate-300"
                    required
                  />
                </div>
              </div>

              {/* Conteúdo Ministrado */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Conteúdo / Tema Ministrado:
                </label>
                <textarea
                  rows={2}
                  value={formConteudo}
                  onChange={(e) => setFormConteudo(e.target.value)}
                  placeholder="Ex: Aula teórica sobre teorias motivacionais e estudo de caso prático..."
                  className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Observações */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Observações de Auditoria:
                </label>
                <input
                  type="text"
                  value={formObs}
                  onChange={(e) => setFormObs(e.target.value)}
                  placeholder="Ex: Presença integral da turma. Sem intercorrências."
                  className="w-full p-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-white font-bold bg-indigo-600 hover:bg-indigo-700 shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Salvar Registro no Histórico</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  X,
  RefreshCw,
  ExternalLink,
  Plus,
  Send,
  CheckCircle2,
  AlertCircle,
  Users,
  BookOpen,
  MessageSquare,
  Sparkles,
  Link as LinkIcon,
  LogOut,
  Calendar,
} from 'lucide-react';
import {
  signInWithGoogleClassroom,
  disconnectGoogleClassroom,
  fetchClassroomCourses,
  fetchCourseTeachers,
  postCourseAnnouncement,
  convertClassroomCourseToTurma,
  getClassroomAccessToken,
  getClassroomUser,
  ClassroomCourse,
  ClassroomTeacher,
} from '../services/googleClassroomService';
import { Turma, Professor, Escola } from '../types/rios';

interface GoogleClassroomModalProps {
  isOpen: boolean;
  onClose: () => void;
  turmasExistentes: Turma[];
  escolas: Escola[];
  professores: Professor[];
  onImportarTurmas: (novasTurmas: Turma[]) => void;
  onVincularTurma?: (turmaId: string, classroomId: string, link: string) => void;
}

export const GoogleClassroomModal: React.FC<GoogleClassroomModalProps> = ({
  isOpen,
  onClose,
  turmasExistentes,
  escolas,
  professores,
  onImportarTurmas,
}) => {
  const [activeTab, setActiveTab] = useState<'cursos' | 'comunicados' | 'docentes'>('cursos');
  const [conectado, setConectado] = useState<boolean>(false);
  const [carregandoAuth, setCarregandoAuth] = useState<boolean>(false);
  const [carregandoCursos, setCarregandoCursos] = useState<boolean>(false);
  const [cursos, setCursos] = useState<ClassroomCourse[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [sucessoMsg, setSucessoMsg] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [busca, setBusca] = useState<string>('');

  // Estados para Mural / Comunicados
  const [cursoSelecionadoId, setCursoSelecionadoId] = useState<string>('');
  const [textoComunicado, setTextoComunicado] = useState<string>('');
  const [enviandoComunicado, setEnviandoComunicado] = useState<boolean>(false);
  const [modalConfirmacaoAviso, setModalConfirmacaoAviso] = useState<boolean>(false);

  // Estados para visualização de docentes
  const [docentesPorCurso, setDocentesPorCurso] = useState<Record<string, ClassroomTeacher[]>>({});
  const [carregandoDocentes, setCarregandoDocentes] = useState<boolean>(false);

  // Escola padrão selecionada para importação
  const [escolaIdSelecionada, setEscolaIdSelecionada] = useState<string>(
    escolas[0]?.nome || 'Unidade Centro'
  );

  // Verifica estado inicial de conexão
  useEffect(() => {
    if (isOpen) {
      const token = getClassroomAccessToken();
      const user = getClassroomUser();
      if (token && user) {
        setConectado(true);
        setUserEmail(user.email || null);
        carregarCursos(token);
      } else {
        setConectado(false);
      }
    }
  }, [isOpen]);

  const carregarCursos = async (token?: string) => {
    setCarregandoCursos(true);
    setErro(null);
    try {
      const lista = await fetchClassroomCourses(token);
      setCursos(lista);
      if (lista.length > 0 && !cursoSelecionadoId) {
        setCursoSelecionadoId(lista[0].id);
      }
    } catch (err: any) {
      setErro(err.message || 'Falha ao carregar turmas do Google Classroom.');
      if (err.message?.includes('expirada') || err.message?.includes('login')) {
        setConectado(false);
      }
    } finally {
      setCarregandoCursos(false);
    }
  };

  const handleConectarGoogle = async () => {
    setCarregandoAuth(true);
    setErro(null);
    try {
      const result = await signInWithGoogleClassroom();
      setConectado(true);
      setUserEmail(result.user.email || 'Conta Google Conectada');
      await carregarCursos(result.accessToken);
    } catch (err: any) {
      setErro(err.message || 'Não foi possível conectar com o Google Classroom.');
    } finally {
      setCarregandoAuth(false);
    }
  };

  const handleDesconectar = async () => {
    await disconnectGoogleClassroom();
    setConectado(false);
    setCursos([]);
    setUserEmail(null);
    setSucessoMsg('Desconectado do Google Classroom com sucesso.');
    setTimeout(() => setSucessoMsg(null), 3000);
  };

  // Carrega professores das turmas para a aba Docentes
  const handleCarregarDocentes = async () => {
    if (cursos.length === 0) return;
    setCarregandoDocentes(true);
    const mapa: Record<string, ClassroomTeacher[]> = {};

    try {
      for (const curso of cursos.slice(0, 10)) {
        const professoresCurso = await fetchCourseTeachers(curso.id);
        mapa[curso.id] = professoresCurso;
      }
      setDocentesPorCurso(mapa);
    } catch (err: any) {
      console.warn('Erro ao carregar docentes das turmas:', err);
    } finally {
      setCarregandoDocentes(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'docentes' && conectado && cursos.length > 0 && Object.keys(docentesPorCurso).length === 0) {
      handleCarregarDocentes();
    }
  }, [activeTab, conectado, cursos]);

  // Importa um curso individual
  const handleImportarCurso = (curso: ClassroomCourse) => {
    const novaTurma = convertClassroomCourseToTurma(curso, escolaIdSelecionada);
    onImportarTurmas([novaTurma]);
    setSucessoMsg(`Turma "${curso.name}" importada com sucesso para o RIOS!`);
    setTimeout(() => setSucessoMsg(null), 4000);
  };

  // Importa todas as turmas não importadas
  const handleImportarTodas = () => {
    const turmasParaImportar = cursos
      .filter((c) => !isCursoJaImportado(c))
      .map((c) => convertClassroomCourseToTurma(c, escolaIdSelecionada));

    if (turmasParaImportar.length === 0) {
      setSucessoMsg('Todas as turmas do Classroom já constam no RIOS.');
      setTimeout(() => setSucessoMsg(null), 3000);
      return;
    }

    onImportarTurmas(turmasParaImportar);
    setSucessoMsg(`${turmasParaImportar.length} turmas importadas com sucesso para o RIOS!`);
    setTimeout(() => setSucessoMsg(null), 4000);
  };

  const isCursoJaImportado = (curso: ClassroomCourse) => {
    return turmasExistentes.some(
      (t) =>
        t.googleClassroomId === curso.id ||
        t.curso.toLowerCase().trim() === curso.name.toLowerCase().trim()
    );
  };

  // Publicação com confirmação obrigatória
  const handleConfirmarPublicacao = async () => {
    if (!cursoSelecionadoId || !textoComunicado.trim()) return;

    setEnviandoComunicado(true);
    setErro(null);
    try {
      await postCourseAnnouncement(cursoSelecionadoId, textoComunicado);
      setModalConfirmacaoAviso(false);
      setTextoComunicado('');
      const cursoAlvo = cursos.find((c) => c.id === cursoSelecionadoId);
      setSucessoMsg(
        `Comunicado publicado com sucesso no mural da turma "${cursoAlvo?.name || 'Classroom'}"!`
      );
      setTimeout(() => setSucessoMsg(null), 5000);
    } catch (err: any) {
      setErro(err.message || 'Falha ao publicar comunicado no Google Classroom.');
    } finally {
      setEnviandoComunicado(false);
    }
  };

  if (!isOpen) return null;

  const cursosFiltrados = cursos.filter((c) =>
    c.name.toLowerCase().includes(busca.toLowerCase()) ||
    (c.section && c.section.toLowerCase().includes(busca.toLowerCase())) ||
    (c.room && c.room.toLowerCase().includes(busca.toLowerCase()))
  );

  const cursoAlvoAtual = cursos.find((c) => c.id === cursoSelecionadoId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Top Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">Plugin Google Classroom</h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-400/20 text-emerald-100 border border-emerald-300/30">
                  Google Workspace
                </span>
              </div>
              <p className="text-xs text-emerald-100">
                Sincronize turmas, publique avisos no mural e integre a gestão docente
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {conectado && (
              <button
                onClick={handleDesconectar}
                title="Desconectar conta Google"
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-emerald-100 transition-colors flex items-center gap-1.5 text-xs font-medium"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Desconectar</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                conectado ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
              }`}
            />
            <span className="font-semibold text-slate-700">
              {conectado ? 'Conectado ao Google Classroom' : 'Desconectado'}
            </span>
            {userEmail && (
              <span className="text-slate-500 font-normal">({userEmail})</span>
            )}
          </div>

          {conectado && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => carregarCursos()}
                disabled={carregandoCursos}
                className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 transition-colors"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${carregandoCursos ? 'animate-spin' : ''}`}
                />
                Atualizar dados
              </button>
              <span className="text-slate-300">|</span>
              <span className="text-slate-600">
                {cursos.length} turma(s) encontrada(s)
              </span>
            </div>
          )}
        </div>

        {/* Mensagens de Sucesso ou Erro */}
        {sucessoMsg && (
          <div className="mx-6 mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2 shadow-sm animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{sucessoMsg}</span>
          </div>
        )}

        {erro && (
          <div className="mx-6 mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center gap-2 shadow-sm animate-fade-in">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span className="flex-1">{erro}</span>
          </div>
        )}

        {/* Corpo Principal */}
        <div className="p-6 flex-1 overflow-y-auto">
          {!conectado ? (
            /* Estado Inicial: Conectar com Google Classroom */
            <div className="text-center py-8 px-4 max-w-xl mx-auto">
              <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-emerald-50 flex items-center justify-center border border-emerald-100 shadow-sm">
                <GraduationCap className="w-10 h-10 text-emerald-600" />
              </div>

              <h3 className="text-xl font-bold text-slate-800 mb-2">
                Conectar com o Google Classroom
              </h3>
              <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                Autorize o sistema a acessar suas salas de aula virtuais para importar turmas,
                vincular professores da escola e emitir avisos de substituição e cronograma no mural.
              </p>

              {/* Botão Oficial Sign in with Google (Padrão Google Identity Services) */}
              <div className="flex justify-center mb-8">
                <button
                  type="button"
                  onClick={handleConectarGoogle}
                  disabled={carregandoAuth}
                  className="gsi-material-button relative inline-flex items-center justify-center bg-white border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 font-semibold px-6 py-3 rounded-full shadow-sm hover:shadow transition-all disabled:opacity-50"
                  style={{ minWidth: '240px' }}
                >
                  <div className="flex items-center gap-3">
                    <svg
                      version="1.1"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 48 48"
                      className="w-5 h-5 block"
                    >
                      <path
                        fill="#EA4335"
                        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                      />
                      <path
                        fill="#34A853"
                        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                      />
                      <path fill="none" d="M0 0h48v48H0z" />
                    </svg>
                    <span>
                      {carregandoAuth ? 'Conectando ao Google...' : 'Entrar com o Google Classroom'}
                    </span>
                  </div>
                </button>
              </div>

              {/* Destaques dos Recursos */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-left">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2 font-bold">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 mb-1">Importar Turmas</h4>
                  <p className="text-xs text-slate-500">
                    Traga as salas do Classroom para o RIOS sem redigitar nada.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-2 font-bold">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 mb-1">Mural & Avisos</h4>
                  <p className="text-xs text-slate-500">
                    Publique avisos de substituição e início de módulos com 1 clique.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center mb-2 font-bold">
                    <Users className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 mb-1">Gestão Docente</h4>
                  <p className="text-xs text-slate-500">
                    Identifique quais professores já atuam nas salas virtuais.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Estado Conectado: Abas de Recursos */
            <div className="space-y-5">
              {/* Abas Superiores */}
              <div className="flex border-b border-slate-200">
                <button
                  onClick={() => setActiveTab('cursos')}
                  className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
                    activeTab === 'cursos'
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  Turmas do Classroom ({cursos.length})
                </button>
                <button
                  onClick={() => setActiveTab('comunicados')}
                  className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
                    activeTab === 'comunicados'
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  Publicar no Mural
                </button>
                <button
                  onClick={() => setActiveTab('docentes')}
                  className={`pb-3 px-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
                    activeTab === 'docentes'
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Docentes do Classroom
                </button>
              </div>

              {/* ABA 1: CURSOS / TURMAS */}
              {activeTab === 'cursos' && (
                <div className="space-y-4">
                  {/* Controles de Busca e Importação em Massa */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <input
                      type="text"
                      placeholder="Filtrar turmas do Classroom..."
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      className="w-full sm:w-72 px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500"
                    />

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <span>Escola:</span>
                        <select
                          value={escolaIdSelecionada}
                          onChange={(e) => setEscolaIdSelecionada(e.target.value)}
                          className="px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:outline-none"
                        >
                          {escolas.map((esc) => (
                            <option key={esc.id} value={esc.nome}>
                              {esc.nome}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        onClick={handleImportarTodas}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Importar Todas
                      </button>
                    </div>
                  </div>

                  {carregandoCursos ? (
                    <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
                      <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
                      <span className="text-sm">Buscando turmas no Google Classroom...</span>
                    </div>
                  ) : cursosFiltrados.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <GraduationCap className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                      <p className="text-sm font-semibold text-slate-700">
                        Nenhuma turma ativa encontrada no Google Classroom.
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Crie uma turma no Google Classroom ou tente atualizar a lista.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {cursosFiltrados.map((curso) => {
                        const jaImportado = isCursoJaImportado(curso);

                        return (
                          <div
                            key={curso.id}
                            className={`p-4 rounded-xl border transition-all ${
                              jaImportado
                                ? 'bg-emerald-50/50 border-emerald-200'
                                : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-sm'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div>
                                <h4 className="font-bold text-sm text-slate-800 line-clamp-1">
                                  {curso.name}
                                </h4>
                                {curso.section && (
                                  <span className="text-xs font-medium text-slate-500">
                                    Seção: {curso.section}
                                  </span>
                                )}
                              </div>

                              {jaImportado ? (
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-300 flex items-center gap-1 shrink-0">
                                  <CheckCircle2 className="w-3 h-3" />
                                  No RIOS
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 shrink-0">
                                  Classroom
                                </span>
                              )}
                            </div>

                            <div className="space-y-1 text-xs text-slate-600 mb-4">
                              {curso.room && (
                                <div>
                                  <span className="text-slate-400">Sala:</span> {curso.room}
                                </div>
                              )}
                              {curso.enrollmentCode && (
                                <div>
                                  <span className="text-slate-400">Código de convite:</span>{' '}
                                  <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono text-[11px]">
                                    {curso.enrollmentCode}
                                  </code>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2">
                              {curso.alternateLink ? (
                                <a
                                  href={curso.alternateLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  Abrir sala
                                </a>
                              ) : (
                                <span />
                              )}

                              {!jaImportado ? (
                                <button
                                  onClick={() => handleImportarCurso(curso)}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  Importar Turma
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setCursoSelecionadoId(curso.id);
                                    setActiveTab('comunicados');
                                  }}
                                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                                >
                                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                                  Postar no Mural
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ABA 2: MURAL E COMUNICADOS */}
              {activeTab === 'comunicados' && (
                <div className="space-y-4 max-w-2xl mx-auto">
                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800 flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Publicação Direta no Mural do Aluno:</span>
                      <p className="mt-0.5 text-blue-700">
                        Envie avisos oficiais sobre alocações de professores, substituições emergenciais
                        ou atualizações de cronograma direto para as salas virtuais.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Selecione a Turma de Destino:
                    </label>
                    <select
                      value={cursoSelecionadoId}
                      onChange={(e) => setCursoSelecionadoId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium text-slate-800 focus:outline-none focus:border-emerald-500"
                    >
                      {cursos.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.section ? `(${c.section})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Modelos Rápidos */}
                  <div>
                    <span className="text-xs font-semibold text-slate-600 mb-1.5 block">
                      Modelos de Mensagem Pronta:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setTextoComunicado(
                            `📢 COMUNICADO DE ESCALA (RIOS):\nInformamos que as aulas do componente curricular da turma contarão com o novo cronograma oficial. Qualquer dúvida, consulte a coordenação pedagógica.`
                          )
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
                      >
                        📢 Novo Cronograma
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setTextoComunicado(
                            `🔄 COMUNICADO DE SUBSTITUIÇÃO (RIOS):\nInformamos que para o próximo encontro teremos a atuação docente de substituição devidamente alocada pela gestão de escalas.`
                          )
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
                      >
                        🔄 Substituição de Docente
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setTextoComunicado(
                            `🎓 INÍCIO DE NOVO MÓDULO (RIOS):\nBem-vindos ao novo componente curricular! Confiram o cronograma e os materiais das aulas nos tópicos do Classroom.`
                          )
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
                      >
                        🎓 Início de Módulo
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Mensagem do Comunicado:
                    </label>
                    <textarea
                      rows={5}
                      value={textoComunicado}
                      onChange={(e) => setTextoComunicado(e.target.value)}
                      placeholder="Digite o texto que será publicado no mural do Google Classroom para os alunos e professores desta turma..."
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      disabled={!cursoSelecionadoId || !textoComunicado.trim()}
                      onClick={() => setModalConfirmacaoAviso(true)}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow transition-colors disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      Publicar no Classroom
                    </button>
                  </div>
                </div>
              )}

              {/* ABA 3: DOCENTES */}
              {activeTab === 'docentes' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">
                        Professores Identificados no Google Classroom
                      </h4>
                      <p className="text-xs text-slate-500">
                        Docentes proprietários e auxiliares nas salas virtuais sincronizadas
                      </p>
                    </div>

                    <button
                      onClick={handleCarregarDocentes}
                      disabled={carregandoDocentes}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${carregandoDocentes ? 'animate-spin' : ''}`}
                      />
                      Recarregar Docentes
                    </button>
                  </div>

                  {carregandoDocentes ? (
                    <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
                      <span className="text-sm">Consultando docentes vinculados...</span>
                    </div>
                  ) : Object.keys(docentesPorCurso).length === 0 ? (
                    <div className="py-10 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <Users className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                      <p className="text-xs font-semibold text-slate-700">
                        Nenhum docente carregado no momento.
                      </p>
                      <button
                        onClick={handleCarregarDocentes}
                        className="mt-2 px-3 py-1 bg-emerald-600 text-white text-xs font-semibold rounded-lg"
                      >
                        Carregar agora
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {cursos.slice(0, 10).map((curso) => {
                        const docentes = docentesPorCurso[curso.id] || [];

                        return (
                          <div
                            key={curso.id}
                            className="p-4 rounded-xl border border-slate-200 bg-white"
                          >
                            <h5 className="font-bold text-xs text-slate-800 mb-2 flex items-center gap-2">
                              <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                              {curso.name}
                            </h5>

                            {docentes.length === 0 ? (
                              <p className="text-xs text-slate-400 italic">
                                Nenhum perfil de docente retornado pela API para esta turma.
                              </p>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {docentes.map((docente) => (
                                  <div
                                    key={docente.userId}
                                    className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center gap-2.5"
                                  >
                                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs shrink-0">
                                      {docente.profile?.name?.fullName?.[0] || 'P'}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-slate-800 truncate">
                                        {docente.profile?.name?.fullName || `ID: ${docente.userId}`}
                                      </p>
                                      {docente.profile?.emailAddress && (
                                        <p className="text-[11px] text-slate-500 truncate">
                                          {docente.profile.emailAddress}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal de Confirmação Obrigatória (Exigência das Diretrizes Workspace) */}
        {modalConfirmacaoAviso && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 animate-scale-up">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                <Send className="w-6 h-6" />
              </div>

              <h4 className="text-lg font-bold text-slate-800 mb-1">
                Confirmar Publicação no Mural?
              </h4>
              <p className="text-xs text-slate-500 mb-4">
                Esta ação publicará uma mensagem oficial no mural do Google Classroom para a turma:
                <strong className="text-slate-800 block mt-1 text-sm">
                  {cursoAlvoAtual?.name || 'Turma Selecionada'}
                </strong>
              </p>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 mb-5 max-h-40 overflow-y-auto">
                <span className="text-[11px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">
                  Prévia da Mensagem:
                </span>
                <p className="text-xs text-slate-700 whitespace-pre-wrap">{textoComunicado}</p>
              </div>

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalConfirmacaoAviso(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={enviandoComunicado}
                  onClick={handleConfirmarPublicacao}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow transition-colors disabled:opacity-50"
                >
                  {enviandoComunicado ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Publicando...
                    </>
                  ) : (
                    'Sim, Publicar no Classroom'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4 text-emerald-600" />
            <span>Google Classroom API v1 • Sincronização Segura</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

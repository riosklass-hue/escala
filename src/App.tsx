import React, { useState, useEffect } from 'react';
import {
  Turma,
  Professor,
  HistoricoSubstituicao,
  ComponenteDaTurma,
  AulaMinistradaRecord,
  Usuario,
  Escola,
  PerfilUsuario,
} from './types/rios';
import { Header, ActiveTab } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { TurmasEmentasView } from './components/TurmasEmentasView';
import { ProfessoresDocentesView } from './components/ProfessoresDocentesView';
import { GradeDatasHorariosView } from './components/GradeDatasHorariosView';
import { GradeEscalaHub } from './components/GradeEscalaHub';
import { OperacionalHub } from './components/OperacionalHub';
import { DashboardView } from './components/DashboardView';
import { MapaOperacional } from './components/MapaOperacional';
import { TurmasTimeline } from './components/TurmasTimeline';
import { ProfessorPorDiaView } from './components/ProfessorPorDiaView';
import { VisaoProfessor } from './components/VisaoProfessor';
import { VisaoPorData } from './components/VisaoPorData';
import { HistoricoAulasMinistradas } from './components/HistoricoAulasMinistradas';
import { RelatoriosView } from './components/RelatoriosView';
import { CenariosView } from './components/CenariosView';
import { HistoricoMovimentacoes } from './components/HistoricoMovimentacoes';
import { ModalSubstituicao } from './components/ModalSubstituicao';
import { ModalTurmaEmenta } from './components/ModalTurmaEmenta';
import { ModalProfessor } from './components/ModalProfessor';
import { ModalEscola } from './components/ModalEscola';
import { ModalEditarComponente } from './components/ModalEditarComponente';
import { GestaoCadastrosEmentas } from './components/GestaoCadastrosEmentas';
import {
  MatrizCursoOficial,
  obterMatrizesIniciais,
  salvarMatrizesNoStorage,
  MATRIZES_CURSOS_OFICIAIS,
} from './data/matrizesCursos';
import {
  INITIAL_TURMAS,
  INITIAL_PROFESSORES,
  INITIAL_ESCOLAS,
  INITIAL_USUARIOS,
} from './data/initialData';
import {
  salvarTudoNaHostinger,
  carregarDaHostinger,
  obterStatusHostinger,
} from './services/hostingerStorage';
import { MatrizesCursosModal } from './components/MatrizesCursosModal';
import { TelaLogin } from './components/TelaLogin';
import { ModalGerenciamentoSenhas } from './components/ModalGerenciamentoSenhas';
import { ModalHostingerDeploy } from './components/ModalHostingerDeploy';
import { MobileProfessorView } from './components/MobileProfessorView';
import { AIAssistantDrawer } from './components/AIAssistantDrawer';
import { AppDocente } from './components/AppDocente';
import { GoogleClassroomModal } from './components/GoogleClassroomModal';
import { Sparkles, CheckCircle2, ShieldCheck, X, Loader2 } from 'lucide-react';
import {
  testFirebaseConnection,
  subscribeColecao,
  subscribeDocumento,
  subscribeAulasDocente,
  syncSalvarDocumento,
  syncSalvarLote,
  syncDeletarDocumento,
  listarIdsDocumentos,
  auth,
  signOut,
  signInAnonymously,
  onAuthStateChanged,
  obterOuCriarPerfilUsuario,
  USUARIO_PADRAO_SISTEMA,
} from './lib/firebase';
import { registrarLogAuditoria } from './lib/auditLogger';

export default function App() {
  const [usuarioLogado, setUsuarioLogado] = useState<Usuario | null>(USUARIO_PADRAO_SISTEMA);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [mensagemAvisoLogin, setMensagemAvisoLogin] = useState<string | null>(null);

  const [firebaseStatus, setFirebaseStatus] = useState<'conectando' | 'conectado' | 'offline'>('conectando');

  const [activeTab, setActiveTab] = useState<ActiveTab>('turmas');

  const [isMobileSimOpen, setIsMobileSimOpen] = useState<boolean>(false);
  const [isAIOpen, setIsAIOpen] = useState<boolean>(false);
  const [isGerenciarSenhasOpen, setIsGerenciarSenhasOpen] = useState<boolean>(false);
  const [selectedProfId, setSelectedProfId] = useState<string>('');

  // Estados em memória com dados iniciais completos para renderização instantânea
  const [usuarios, setUsuarios] = useState<Usuario[]>(() => INITIAL_USUARIOS);
  const [turmas, setTurmas] = useState<Turma[]>(() => INITIAL_TURMAS);
  const [professores, setProfessores] = useState<Professor[]>(() => INITIAL_PROFESSORES);
  const [escolas, setEscolas] = useState<Escola[]>(() => INITIAL_ESCOLAS);
  const [matrizes, setMatrizes] = useState<MatrizCursoOficial[]>(() => obterMatrizesIniciais());
  const [historico, setHistorico] = useState<HistoricoSubstituicao[]>([]);
  const [aulasMinistradas, setAulasMinistradas] = useState<AulaMinistradaRecord[]>([]);

  // Estados de Persistência no Servidor Hostinger
  const [hostingerSalvando, setHostingerSalvando] = useState<boolean>(false);
  const [hostingerUltimoSalvo, setHostingerUltimoSalvo] = useState<string | null>(null);

  // Carrega e sincroniza dados persistidos diretamente no servidor Hostinger (esc.riossistem.com.br)
  useEffect(() => {
    let ativo = true;

    const carregarHostinger = async () => {
      try {
        const dadosHostinger = await carregarDaHostinger();
        if (!ativo) return;

        if (dadosHostinger && typeof dadosHostinger === 'object') {
          let teveDados = false;
          if (Array.isArray(dadosHostinger.turmas) && dadosHostinger.turmas.length > 0) {
            setTurmas(dadosHostinger.turmas);
            teveDados = true;
          }
          if (Array.isArray(dadosHostinger.professores) && dadosHostinger.professores.length > 0) {
            setProfessores(dadosHostinger.professores);
            teveDados = true;
          }
          if (Array.isArray(dadosHostinger.escolas) && dadosHostinger.escolas.length > 0) {
            setEscolas(dadosHostinger.escolas);
            teveDados = true;
          }
          if (Array.isArray(dadosHostinger.matrizes) && dadosHostinger.matrizes.length > 0) {
            setMatrizes(dadosHostinger.matrizes);
          }
          if (Array.isArray(dadosHostinger.aulasMinistradas) && dadosHostinger.aulasMinistradas.length > 0) {
            setAulasMinistradas(dadosHostinger.aulasMinistradas);
          }
          if (Array.isArray(dadosHostinger.historico) && dadosHostinger.historico.length > 0) {
            setHistorico(dadosHostinger.historico);
          }
          if (Array.isArray(dadosHostinger.usuarios) && dadosHostinger.usuarios.length > 0) {
            setUsuarios(dadosHostinger.usuarios);
          }

          if (dadosHostinger.ultimaAtualizacao) {
            const dt = new Date(dadosHostinger.ultimaAtualizacao);
            setHostingerUltimoSalvo(
              dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            );
          } else if (teveDados) {
            setHostingerUltimoSalvo(
              new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            );
          }
        } else {
          // Inicializa dados padrão na Hostinger se o arquivo ainda estiver zerado
          setTurmas(INITIAL_TURMAS);
          setProfessores(INITIAL_PROFESSORES);
          setEscolas(INITIAL_ESCOLAS);
          setUsuarios(INITIAL_USUARIOS);
          setMatrizes(MATRIZES_CURSOS_OFICIAIS);

          salvarTudoNaHostinger({
            turmas: INITIAL_TURMAS,
            professores: INITIAL_PROFESSORES,
            escolas: INITIAL_ESCOLAS,
            matrizes: MATRIZES_CURSOS_OFICIAIS,
            historico: [],
            aulasMinistradas: [],
            usuarios: INITIAL_USUARIOS,
          }).then((res) => {
            if (res.success && ativo) {
              setHostingerUltimoSalvo(
                new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
              );
            }
          });
        }
      } catch (err) {
        console.warn('[Hostinger Storage] Falha ao sincronizar dados iniciais:', err);
      }
    };

    carregarHostinger();
    return () => {
      ativo = false;
    };
  }, []);

  // Salvamento automático contínuo na Hostinger: qualquer alteração feita no sistema é gravada
  useEffect(() => {
    if (turmas.length === 0 && professores.length === 0) return;

    const timer = setTimeout(() => {
      salvarTudoNaHostinger({
        turmas,
        professores,
        escolas,
        matrizes,
        historico,
        aulasMinistradas,
        usuarios,
      }).then((res) => {
        if (res.success) {
          setHostingerUltimoSalvo(
            new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          );
        }
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [turmas, professores, escolas, matrizes, historico, aulasMinistradas]);

  // Limpeza de caches legados de versões anteriores (sem apagar dados de negócio do Firestore)
  useEffect(() => {
    try {
      const chavesAntigas = [
        'rios_usuarios_v1',
        'rios_turmas_v1',
        'rios_professores_v1',
        'rios_escolas_v1',
        'rios_historico_v1',
        'rios_aulas_ministradas_v1',
        'rios_usuario_logado_v1',
        'rios_usuario_logado_v2',
      ];
      chavesAntigas.forEach((chave) => localStorage.removeItem(chave));
    } catch {
      // Ignora falhas de storage
    }
  }, []);

  // Modal States
  const [modalSubstituicao, setModalSubstituicao] = useState<{
    isOpen: boolean;
    turma: Turma | null;
    componente: ComponenteDaTurma | null;
  }>({
    isOpen: false,
    turma: null,
    componente: null,
  });

  const [modalTurma, setModalTurma] = useState<{
    isOpen: boolean;
    turmaParaEditar?: Turma | null;
    matrizInicial?: MatrizCursoOficial | null;
  }>({
    isOpen: false,
    turmaParaEditar: null,
    matrizInicial: null,
  });

  const [modalProfessor, setModalProfessor] = useState<{
    isOpen: boolean;
    profParaEditar?: Professor | null;
  }>({
    isOpen: false,
    profParaEditar: null,
  });

  const [modalEscola, setModalEscola] = useState<{
    isOpen: boolean;
    escolaParaEditar?: Escola | null;
  }>({
    isOpen: false,
    escolaParaEditar: null,
  });

  const [modalComponente, setModalComponente] = useState<{
    isOpen: boolean;
    turma: Turma | null;
    componente: ComponenteDaTurma | null;
  }>({
    isOpen: false,
    turma: null,
    componente: null,
  });

  const [modalMatrizState, setModalMatrizState] = useState<{
    isOpen: boolean;
    matrizId?: string;
    iniciarModoEdicao?: boolean;
    iniciarModoNovo?: boolean;
  }>({
    isOpen: false,
  });

  const [isHostingerModalOpen, setIsHostingerModalOpen] = useState<boolean>(false);
  const [isGoogleClassroomOpen, setIsGoogleClassroomOpen] = useState<boolean>(false);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Limpa estados de dados protegidos
  const limparDadosProtegidos = () => {
    setTurmas([]);
    setProfessores([]);
    setEscolas([]);
    setUsuarios([]);
    setHistorico([]);
    setAulasMinistradas([]);
    setSelectedProfId('');
    setIsAIOpen(false);
    setIsMobileSimOpen(false);
    setIsGerenciarSenhasOpen(false);
    setIsHostingerModalOpen(false);
    setModalSubstituicao({ isOpen: false, turma: null, componente: null });
    setModalTurma({ isOpen: false, turmaParaEditar: null, matrizInicial: null });
    setModalProfessor({ isOpen: false, profParaEditar: null });
    setModalEscola({ isOpen: false, escolaParaEditar: null });
    setModalComponente({ isOpen: false, turma: null, componente: null });
    setModalMatrizState({ isOpen: false });
    setToastMessage(null);
    setActiveTab('turmas');
  };

  // Listener oficial de autenticação Firebase Auth com acesso direto liberado sem travamento
  useEffect(() => {
    let activeAuthUid: string | null = null;
    let unsubPerfilDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      // Cancela listener de perfil anterior caso exista
      if (unsubPerfilDoc) {
        unsubPerfilDoc();
        unsubPerfilDoc = null;
      }

      if (!fbUser) {
        activeAuthUid = null;
        // Se ainda não houver sessão Firebase, tenta autenticar anônimo em segundo plano para persistência do Firestore
        try {
          await signInAnonymously(auth);
          return;
        } catch {
          // Se anônimo não estiver ativo no console, mantém o acesso aberto com usuário padrão
          setUsuarioLogado(USUARIO_PADRAO_SISTEMA);
          setAuthLoading(false);
          return;
        }
      }

      activeAuthUid = fbUser.uid;
      const currentUid = fbUser.uid;

      try {
        const perfilInicial = await obterOuCriarPerfilUsuario(fbUser);
        if (activeAuthUid !== currentUid) return;

        setUsuarioLogado(perfilInicial || USUARIO_PADRAO_SISTEMA);
        setMensagemAvisoLogin(null);
        if (perfilInicial?.perfil === 'PROFESSOR' && perfilInicial.professorId) {
          setSelectedProfId(perfilInicial.professorId);
        }

        // Observa o documento de usuário em tempo real
        unsubPerfilDoc = subscribeDocumento<Usuario>(
          'usuarios',
          currentUid,
          (perfilAtualizado) => {
            if (activeAuthUid !== currentUid) return;
            if (perfilAtualizado) {
              setUsuarioLogado(perfilAtualizado);
              if (perfilAtualizado.professorId) {
                setSelectedProfId(perfilAtualizado.professorId);
              }
            }
          },
          (err) => {
            console.warn('[Auth] Aviso no monitoramento em tempo real:', err);
          }
        );
      } catch (err) {
        console.warn('[Auth] Falha não crítica ao carregar perfil do usuário:', err);
        setUsuarioLogado(USUARIO_PADRAO_SISTEMA);
      } finally {
        setAuthLoading(false);
      }
    });

    return () => {
      activeAuthUid = null;
      if (unsubPerfilDoc) unsubPerfilDoc();
      unsubscribeAuth();
    };
  }, []);

  // Mantém a projeção segura de agenda para cada professor (executado por gestores e admins)
  // Limpa também projeções antigas de docentes que não possuem mais nenhum componente
  const sincronizarProjecaoAgenda = async (listaTurmas: Turma[]) => {
    try {
      const profIds = new Set<string>();
      listaTurmas.forEach((t) => {
        t.componentes.forEach((c) => {
          if (c.professorId) profIds.add(c.professorId);
        });
      });

      // 1. Atualiza ou cria a projeção para cada docente com componentes atribuídos
      for (const pId of profIds) {
        const turmasDoProf: Turma[] = [];
        listaTurmas.forEach((t) => {
          const compDoProf = t.componentes.filter((c) => c.professorId === pId);
          if (compDoProf.length > 0) {
            turmasDoProf.push({
              ...t,
              componentes: compDoProf,
            });
          }
        });

        await syncSalvarDocumento('agendaDocente', {
          id: pId,
          professorId: pId,
          turmas: turmasDoProf,
          ultimaAtualizacao: new Date().toISOString(),
        });
      }

      // 2. Limpa projeções antigas de docentes sem componentes para não vazar agenda revogada
      try {
        const idsExistentes = await listarIdsDocumentos('agendaDocente');
        for (const docId of idsExistentes) {
          if (!profIds.has(docId)) {
            await syncDeletarDocumento('agendaDocente', docId);
          }
        }
      } catch (errClean) {
        console.warn('[Firebase] Aviso ao limpar projeções de agenda antigas:', errClean);
      }
    } catch (err) {
      console.error('[Firebase] Erro ao sincronizar projeções de agenda:', err);
    }
  };

  // Sincronização em Tempo Real com o Banco em Nuvem (Firebase Firestore)
  // CRÍTICO: Executa SOMENTE após o usuário estar devidamente autenticado e ativo
  // Aplica princípio do menor privilégio: professores acessam apenas seus próprios dados e aulas atribuídas
  useEffect(() => {
    if (!usuarioLogado || !usuarioLogado.ativo) {
      return;
    }

    // 1. Testa a conexão com o Firestore
    testFirebaseConnection()
      .then(() => setFirebaseStatus('conectado'))
      .catch(() => setFirebaseStatus('offline'));

    const unsubs: (() => void)[] = [];

    // Se o usuário logado for PROFESSOR:
    // Não carrega coleções completas. Conecta apenas aos próprios dados, agenda projetada e aulas atribuídas
    if (usuarioLogado.perfil === 'PROFESSOR') {
      const docenteId = usuarioLogado.professorId || usuarioLogado.id;

      // 1. Escuta a projeção segura de agenda/futuras aulas atribuídas a este docente
      const unsubAgenda = subscribeDocumento<{ id: string; professorId: string; turmas: Turma[] }>(
        'agendaDocente',
        docenteId,
        (projecao) => {
          if (projecao && Array.isArray(projecao.turmas)) {
            setTurmas(projecao.turmas);
          } else {
            setTurmas([]);
          }
        },
        () => {
          setTurmas([]);
          showToast('Aviso: Não foi possível carregar a agenda projetada do docente.');
        }
      );
      unsubs.push(unsubAgenda);

      // 2. Escuta o próprio documento de professor se houver vínculo
      if (usuarioLogado.professorId) {
        const unsubProf = subscribeDocumento<Professor>(
          'professores',
          usuarioLogado.professorId,
          (prof) => {
            if (prof) setProfessores([prof]);
            else setProfessores([]);
          },
          () => {
            setProfessores([]);
            showToast('Aviso: Não foi possível carregar os dados vinculados do docente.');
          }
        );
        unsubs.push(unsubProf);
      }

      // 3. Escuta apenas as aulas atribuídas ao professor
      const unsubAulas = subscribeAulasDocente(
        docenteId,
        (dados) => {
          setAulasMinistradas(Array.isArray(dados) ? (dados as AulaMinistradaRecord[]) : []);
        },
        () => {
          setAulasMinistradas([]);
          showToast('Erro de permissão ao sincronizar diário de aulas.');
        }
      );
      unsubs.push(unsubAulas);
    } else {
      // Gestor, Coordenador e Administrador
      const unsubTurmas = subscribeColecao<Turma>(
        'turmas',
        (dados) => {
          const lista = Array.isArray(dados) ? dados : [];
          setTurmas(lista);
          // Aceita snapshots vazios e sincroniza sempre a projeção (inclusive para limpar projeções antigas se lista estiver vazia)
          sincronizarProjecaoAgenda(lista);
        },
        () => {
          setTurmas([]);
          showToast('Acesso negado ou restrito na coleção de turmas.');
        }
      );
      unsubs.push(unsubTurmas);

      const unsubProfs = subscribeColecao<Professor>(
        'professores',
        (dados) => {
          setProfessores(Array.isArray(dados) ? dados : []);
        },
        () => {
          setProfessores([]);
          showToast('Acesso negado ou restrito na coleção de professores.');
        }
      );
      unsubs.push(unsubProfs);

      const unsubEscolas = subscribeColecao<Escola>(
        'escolas',
        (dados) => {
          setEscolas(Array.isArray(dados) ? dados : []);
        },
        () => {
          setEscolas([]);
          showToast('Acesso negado ou restrito na coleção de escolas.');
        }
      );
      unsubs.push(unsubEscolas);

      const unsubAulas = subscribeColecao<AulaMinistradaRecord>(
        'aulasMinistradas',
        (dados) => {
          setAulasMinistradas(Array.isArray(dados) ? dados : []);
        },
        () => {
          setAulasMinistradas([]);
          showToast('Acesso restrito no diário de aulas.');
        }
      );
      unsubs.push(unsubAulas);

      const unsubHist = subscribeColecao<HistoricoSubstituicao>(
        'historico',
        (dados) => {
          setHistorico(Array.isArray(dados) ? dados : []);
        },
        () => {
          setHistorico([]);
          showToast('Acesso restrito no histórico de movimentações.');
        }
      );
      unsubs.push(unsubHist);

      // SOMENTE Administrador gerencia e sincroniza a coleção inteira de usuários
      if (usuarioLogado.perfil === 'ADMIN') {
        const unsubUsers = subscribeColecao<Usuario>(
          'usuarios',
          (dados) => {
            setUsuarios(Array.isArray(dados) ? dados : []);
          },
          () => {
            setUsuarios([]);
            showToast('Acesso restrito na coleção de usuários.');
          }
        );
        unsubs.push(unsubUsers);
      }
    }

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [usuarioLogado?.id, usuarioLogado?.ativo, usuarioLogado?.perfil, usuarioLogado?.professorId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 4500);
  };

  const handleRegistrarAulaMinistrada = async (
    aula: Omit<AulaMinistradaRecord, 'id' | 'timestampRegistro'>
  ) => {
    const novoRegistro: AulaMinistradaRecord = {
      ...aula,
      id: `aula-${Date.now()}`,
      timestampRegistro: new Date().toLocaleString('pt-BR'),
    };
    try {
      await syncSalvarDocumento('aulasMinistradas', novoRegistro);
      setAulasMinistradas((prev) => [novoRegistro, ...prev]);
      showToast(
        `Aula de "${aula.componenteNome}" do(a) Prof. ${aula.professorNome} na turma ${aula.turmaCodigo} homologada com sucesso no histórico de auditoria!`
      );
    } catch (err) {
      console.error('[Firebase] Erro ao registrar aula ministrada:', err);
      showToast('Falha ao registrar aula ministrada no banco de dados.');
    }
  };

  const handleOpenSubstituicao = (turma: Turma, componente: ComponenteDaTurma) => {
    setModalSubstituicao({
      isOpen: true,
      turma,
      componente,
    });
  };

  const handleConfirmarSubstituicao = async (
    turmaId: string,
    componenteId: string,
    novoProfessor: Professor,
    motivo: string
  ) => {
    const targetTurma = turmas.find((t) => t.id === turmaId);
    if (!targetTurma) return;

    const compAnterior = targetTurma.componentes.find((c) => c.id === componenteId);
    const profAnteriorNome = compAnterior?.professorNome || 'Sem professor';
    const nomeTurma = targetTurma.codigo;
    const nomeComp = compAnterior?.nome || '';

    const updatedComponentes = targetTurma.componentes.map((c) => {
      if (c.id !== componenteId) return c;
      return {
        ...c,
        professorId: novoProfessor.id,
        professorNome: novoProfessor.nome,
      };
    });

    const turmaAtualizada: Turma = {
      ...targetTurma,
      componentes: updatedComponentes,
    };

    const novoRegistro: HistoricoSubstituicao = {
      id: `hist-${Date.now()}`,
      turmaCodigo: nomeTurma,
      componenteNome: nomeComp,
      escola: modalSubstituicao.turma?.escola || targetTurma.escola,
      sala: modalSubstituicao.turma?.sala || targetTurma.sala,
      horario: modalSubstituicao.turma?.horario || targetTurma.horario,
      professorAnteriorId: compAnterior?.professorId || '',
      professorAnteriorNome: profAnteriorNome,
      professorNovoId: novoProfessor.id,
      professorNovoNome: novoProfessor.nome,
      dataAlteracao: new Date().toLocaleString('pt-BR'),
      motivo,
    };

    try {
      await syncSalvarDocumento('turmas', turmaAtualizada);
      await syncSalvarDocumento('historico', novoRegistro);

      setTurmas((prev) => prev.map((t) => (t.id === turmaId ? turmaAtualizada : t)));
      setHistorico((prev) => [novoRegistro, ...prev]);

      showToast(
        `Professor(a) ${novoProfessor.nome} assumiu "${nomeComp}" na turma ${nomeTurma}. Estrutura da turma mantida intacta.`
      );
    } catch (err) {
      console.error('[Firebase] Erro ao registrar substituição:', err);
      showToast('Falha ao registrar substituição no banco de dados.');
    }
  };

  const handleConcluirComponente = async (turmaId: string, compId: string) => {
    const targetTurma = turmas.find((t) => t.id === turmaId);
    if (!targetTurma) return;

    const compIndex = targetTurma.componentes.findIndex((c) => c.id === compId);
    if (compIndex === -1) return;

    const updated = [...targetTurma.componentes];
    const dataHoje = new Date().toLocaleDateString('pt-BR');

    // Marca atual como concluído
    updated[compIndex] = {
      ...updated[compIndex],
      status: 'CONCLUÍDO',
      dataConclusao: dataHoje,
      escolaConclusao: targetTurma.escola,
      salaConclusao: targetTurma.sala,
    };

    // Inicia o próximo componente se houver
    if (compIndex + 1 < updated.length) {
      updated[compIndex + 1] = {
        ...updated[compIndex + 1],
        status: 'EM ANDAMENTO',
        dataInicio: dataHoje,
        professorId: updated[compIndex].professorId,
        professorNome: updated[compIndex].professorNome,
      };
    }

    const turmaAtualizada: Turma = {
      ...targetTurma,
      componentes: updated,
    };

    try {
      await syncSalvarDocumento('turmas', turmaAtualizada);
      setTurmas((prev) => prev.map((t) => (t.id === turmaId ? turmaAtualizada : t)));
      showToast(`Componente concluído com sucesso. Próximo componente da matriz ativado!`);
    } catch (err) {
      console.error('[Firebase] Erro ao concluir componente:', err);
      showToast('Falha ao concluir componente no banco de dados.');
    }
  };

  const handleSaveTurma = async (turmaSalva: Turma) => {
    try {
      await syncSalvarDocumento('turmas', turmaSalva);
      setTurmas((prev) => {
        const exists = prev.some((t) => t.id === turmaSalva.id);
        if (exists) {
          return prev.map((t) => (t.id === turmaSalva.id ? turmaSalva : t));
        }
        return [turmaSalva, ...prev];
      });
      showToast(`Turma ${turmaSalva.codigo} (${turmaSalva.curso}) salva com sucesso com sua ementa!`);
    } catch (err) {
      console.error('[Firebase] Erro ao salvar turma:', err);
      showToast('Falha ao salvar turma no banco de dados.');
    }
  };

  const handleDeleteTurma = async (turmaId: string) => {
    const targetTurma = turmas.find((t) => t.id === turmaId);
    try {
      await syncDeletarDocumento('turmas', turmaId);
      setTurmas((prev) => prev.filter((t) => t.id !== turmaId));
      showToast(`Turma removida com sucesso.`);

      // Registra evento de auditoria no Firestore
      await registrarLogAuditoria({
        acao: 'Exclusão de Turma',
        categoria: 'TURMAS',
        detalhes: targetTurma
          ? `Turma ${targetTurma.codigo} (${targetTurma.curso}) da unidade ${targetTurma.escola} foi excluída permanentemente.`
          : `Turma com ID ${turmaId} foi excluída.`,
        usuarioAtual: usuarioLogado,
        targetId: turmaId,
        targetNome: targetTurma ? `${targetTurma.codigo} - ${targetTurma.curso}` : turmaId,
      });
    } catch (err) {
      console.error('[Firebase] Erro ao remover turma:', err);
      showToast('Falha ao remover turma no banco de dados.');
    }
  };

  const handleSaveProfessor = async (profSalvo: Professor) => {
    try {
      await syncSalvarDocumento('professores', profSalvo);
      setProfessores((prev) => {
        const exists = prev.some((p) => p.id === profSalvo.id);
        if (exists) {
          return prev.map((p) => (p.id === profSalvo.id ? profSalvo : p));
        }
        return [profSalvo, ...prev];
      });

      // Atualiza nome nos componentes onde o professor está alocado
      const turmasAtualizadas: Turma[] = [];
      turmas.forEach((t) => {
        let changed = false;
        const updatedComponentes = t.componentes.map((c) => {
          if (c.professorId === profSalvo.id && c.professorNome !== profSalvo.nome) {
            changed = true;
            return { ...c, professorNome: profSalvo.nome };
          }
          return c;
        });
        if (changed) {
          turmasAtualizadas.push({ ...t, componentes: updatedComponentes });
        }
      });

      for (const t of turmasAtualizadas) {
        await syncSalvarDocumento('turmas', t);
      }
      if (turmasAtualizadas.length > 0) {
        setTurmas((prev) =>
          prev.map((t) => {
            const found = turmasAtualizadas.find((item) => item.id === t.id);
            return found || t;
          })
        );
      }

      showToast(`Professor(a) ${profSalvo.nome} salvo(a) com sucesso!`);
    } catch (err) {
      console.error('[Firebase] Erro ao salvar professor:', err);
      showToast('Falha ao salvar professor no banco de dados.');
    }
  };

  const handleDeleteProfessor = async (profId: string) => {
    try {
      await syncDeletarDocumento('professores', profId);
      setProfessores((prev) => prev.filter((p) => p.id !== profId));

      // Desvincula professor excluído dos componentes de turmas para evitar dados órfãos
      const turmasDesvinculadas: Turma[] = [];
      turmas.forEach((t) => {
        let changed = false;
        const updatedComponentes = t.componentes.map((c) => {
          if (c.professorId === profId) {
            changed = true;
            return {
              ...c,
              professorId: undefined,
              professorNome: undefined,
              status: c.status === 'EM ANDAMENTO' ? 'A MINISTRAR' : c.status,
            };
          }
          return c;
        });
        if (changed) {
          turmasDesvinculadas.push({ ...t, componentes: updatedComponentes });
        }
      });

      for (const t of turmasDesvinculadas) {
        await syncSalvarDocumento('turmas', t);
      }
      if (turmasDesvinculadas.length > 0) {
        setTurmas((prev) =>
          prev.map((t) => {
            const found = turmasDesvinculadas.find((item) => item.id === t.id);
            return found || t;
          })
        );
      }

      // Limpa a projeção de agenda do professor excluído para não vazar dados
      try {
        await syncDeletarDocumento('agendaDocente', profId);
      } catch {
        // Ignora se não havia projeção
      }

      showToast(`Professor desvinculado e removido do sistema com sucesso.`);
    } catch (err) {
      console.error('[Firebase] Erro ao remover professor:', err);
      showToast('Falha ao remover professor no banco de dados.');
    }
  };

  const handleImportarTurmasClassroom = async (novasTurmas: Turma[]) => {
    if (!novasTurmas || novasTurmas.length === 0) return;
    try {
      const idsExistentes = new Set(turmas.map((t) => t.id));
      const turmasNovas = novasTurmas.filter((t) => !idsExistentes.has(t.id));

      if (turmasNovas.length === 0) {
        showToast('As turmas selecionadas já constam cadastradas no RIOS.');
        return;
      }

      setTurmas((prev) => [...prev, ...turmasNovas]);
      await syncSalvarLote('turmas', turmasNovas);

      registrarLogAuditoria({
        usuarioAtual: usuarioLogado,
        acao: 'CRIAR',
        categoria: 'TURMAS',
        detalhes: `Importadas ${turmasNovas.length} turmas diretamente do Google Classroom.`,
      });

      showToast(`${turmasNovas.length} turma(s) do Google Classroom sincronizada(s) com sucesso!`);
    } catch (err) {
      console.error('[Google Classroom] Erro ao salvar turmas importadas:', err);
      showToast('Erro ao gravar turmas importadas no banco de dados.');
    }
  };

  const handleOpenCadastrarEscola = () => {
    setModalEscola({ isOpen: true, escolaParaEditar: null });
  };

  const handleOpenEditarEscola = (escola: Escola) => {
    setModalEscola({ isOpen: true, escolaParaEditar: escola });
  };

  const handleSaveEscola = async (escolaSalva: Escola) => {
    const escolaExistente = escolas.find((e) => e.id === escolaSalva.id);
    const nomeAntigo = escolaExistente?.nome;

    try {
      await syncSalvarDocumento('escolas', escolaSalva);
      setEscolas((prev) => {
        const idx = prev.findIndex((e) => e.id === escolaSalva.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = escolaSalva;
          return next;
        }
        return [...prev, escolaSalva];
      });

      // Se o nome da escola mudou, sincroniza em turmas e escolas habituais dos professores
      if (nomeAntigo && nomeAntigo !== escolaSalva.nome) {
        const turmasAtualizadas: Turma[] = [];
        turmas.forEach((t) => {
          if (t.escola === nomeAntigo) {
            turmasAtualizadas.push({ ...t, escola: escolaSalva.nome });
          }
        });
        for (const t of turmasAtualizadas) {
          await syncSalvarDocumento('turmas', t);
        }
        if (turmasAtualizadas.length > 0) {
          setTurmas((prev) =>
            prev.map((t) => (t.escola === nomeAntigo ? { ...t, escola: escolaSalva.nome } : t))
          );
        }

        const profsAtualizados: Professor[] = [];
        professores.forEach((p) => {
          if (p.escolasHabituais.includes(nomeAntigo)) {
            profsAtualizados.push({
              ...p,
              escolasHabituais: p.escolasHabituais.map((esc) =>
                esc === nomeAntigo ? escolaSalva.nome : esc
              ),
            });
          }
        });
        for (const p of profsAtualizados) {
          await syncSalvarDocumento('professores', p);
        }
        if (profsAtualizados.length > 0) {
          setProfessores((prev) =>
            prev.map((p) => {
              const found = profsAtualizados.find((item) => item.id === p.id);
              return found || p;
            })
          );
        }
      }
      showToast(`Escola "${escolaSalva.nome}" salva e sincronizada com sucesso!`);
    } catch (err) {
      console.error('[Firebase] Erro ao salvar escola:', err);
      showToast('Falha ao salvar escola no banco de dados.');
    }
  };

  const handleDeleteEscola = async (escolaId: string) => {
    const esc = escolas.find((e) => e.id === escolaId);
    try {
      await syncDeletarDocumento('escolas', escolaId);
      setEscolas((prev) => prev.filter((e) => e.id !== escolaId));
      showToast(`Escola "${esc?.nome || ''}" removida com sucesso.`);
    } catch (err) {
      console.error('[Firebase] Erro ao remover escola:', err);
      showToast('Falha ao remover escola no banco de dados.');
    }
  };

  const handleSaveMatriz = (matrizSalva: MatrizCursoOficial) => {
    setMatrizes((prev) => {
      const idx = prev.findIndex((m) => m.id === matrizSalva.id);
      let next: MatrizCursoOficial[];
      if (idx >= 0) {
        next = [...prev];
        next[idx] = matrizSalva;
      } else {
        next = [...prev, matrizSalva];
      }
      salvarMatrizesNoStorage(next);
      return next;
    });
    showToast(`Matriz curricular "${matrizSalva.nome}" salva com sucesso!`);
  };

  const handleDeleteMatriz = (matrizId: string) => {
    const m = matrizes.find((item) => item.id === matrizId);
    setMatrizes((prev) => {
      const next = prev.filter((item) => item.id !== matrizId);
      salvarMatrizesNoStorage(next);
      return next;
    });
    showToast(`Ementa "${m?.nome || ''}" excluída com sucesso.`);
  };

  const handleRestaurarMatrizesPadrao = () => {
    setMatrizes(MATRIZES_CURSOS_OFICIAIS);
    salvarMatrizesNoStorage(MATRIZES_CURSOS_OFICIAIS);
    showToast('Ementas restauradas para as matrizes curriculares oficiais padrão!');
  };

  const handleSaveComponente = async (
    turmaId: string,
    updatedComp: ComponenteDaTurma,
    registrarAuditoria?: boolean
  ) => {
    const targetTurma = turmas.find((t) => t.id === turmaId);
    if (!targetTurma) return;

    const turmaAtualizada: Turma = {
      ...targetTurma,
      componentes: targetTurma.componentes.map((c) => (c.id === updatedComp.id ? updatedComp : c)),
    };

    try {
      await syncSalvarDocumento('turmas', turmaAtualizada);
      setTurmas((prev) => prev.map((t) => (t.id === turmaId ? turmaAtualizada : t)));

      // Se marcado como concluído com opção de auditoria
      if (registrarAuditoria && updatedComp.status === 'CONCLUÍDO') {
        const prof = professores.find((p) => p.id === updatedComp.professorId);
        await handleRegistrarAulaMinistrada({
          data: updatedComp.dataConclusao || new Date().toLocaleDateString('pt-BR'),
          horario: targetTurma.horario,
          turno: targetTurma.turno,
          diaSemana: targetTurma.diaSemana,
          turmaCodigo: targetTurma.codigo,
          curso: targetTurma.curso,
          componenteNome: updatedComp.nome,
          horasMinistradas: updatedComp.cargaHoraria,
          professorId: prof ? prof.id : 'prof-sistema',
          professorNome: updatedComp.professorNome || prof?.nome || 'Docente Concluinte',
          escola: targetTurma.escola,
          sala: targetTurma.sala,
          conteudoMinistrado: `Componente curricular finalizado e homologado com ${updatedComp.cargaHoraria} horas ministradas.`,
          observacoes: `Ministração concluída pelo(a) Prof. ${updatedComp.professorNome || 'Docente'}.`,
          status: 'CONFIRMADA',
          registradoPor: 'Coordenação Pedagógica',
        });
      }

      showToast(`Componente "${updatedComp.nome}" atualizado com sucesso!`);
    } catch (err) {
      console.error('[Firebase] Erro ao atualizar componente:', err);
      showToast('Falha ao atualizar componente no banco de dados.');
    }
  };

  const handleLoginSuccess = (user: Usuario) => {
    setUsuarioLogado(user);
    if (user.perfil === 'PROFESSOR') {
      setActiveTab('app-docente');
      if (user.professorId) {
        setSelectedProfId(user.professorId);
      }
    }
    showToast(`Bem-vindo(a) ao RIOS, ${user.nome}!`);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('[Auth] Aviso ao encerrar sessão Firebase:', err);
    }
    setUsuarioLogado(USUARIO_PADRAO_SISTEMA);
    showToast('Sessão redefinida para o acesso padrão do sistema.');
  };

  const handleAlterarPerfilUsuario = async (usuarioId: string, novoPerfil: PerfilUsuario) => {
    if (usuarioLogado?.perfil !== 'ADMIN') {
      showToast('Apenas administradores podem alterar perfis de usuários.');
      return;
    }
    const user = usuarios.find((u) => u.id === usuarioId);
    if (!user) return;
    const perfilAnterior = user.perfil;
    const updated = { ...user, perfil: novoPerfil };
    try {
      await syncSalvarDocumento('usuarios', updated);
      setUsuarios((prev) => prev.map((u) => (u.id === usuarioId ? updated : u)));
      showToast(`Perfil do usuário atualizado para ${novoPerfil}.`);

      // Registra evento de auditoria no Firestore
      await registrarLogAuditoria({
        acao: 'Alteração de Permissões',
        categoria: 'PERMISSOES',
        detalhes: `Perfil de acesso de ${user.nome} (${user.email}) alterado de ${perfilAnterior} para ${novoPerfil}.`,
        usuarioAtual: usuarioLogado,
        targetId: usuarioId,
        targetNome: `${user.nome} (${novoPerfil})`,
      });
    } catch (err) {
      console.error('[Firebase] Erro ao atualizar perfil:', err);
      showToast('Falha ao atualizar perfil do usuário no banco de dados.');
    }
  };

  const handleVincularProfessor = async (usuarioId: string, professorId: string | undefined) => {
    if (usuarioLogado?.perfil !== 'ADMIN') {
      showToast('Apenas administradores podem vincular contas a docentes.');
      return;
    }
    const user = usuarios.find((u) => u.id === usuarioId);
    if (!user) return;
    const updated = { ...user, professorId };
    try {
      await syncSalvarDocumento('usuarios', updated);
      setUsuarios((prev) => prev.map((u) => (u.id === usuarioId ? updated : u)));
      showToast('Vínculo com docente atualizado com sucesso.');
    } catch (err) {
      console.error('[Firebase] Erro ao vincular docente:', err);
      showToast('Falha ao vincular docente no banco de dados.');
    }
  };

  const handleToggleStatusUsuario = async (usuarioId: string) => {
    if (usuarioLogado?.perfil !== 'ADMIN') {
      showToast('Apenas administradores podem aprovar ou suspender contas.');
      return;
    }
    const user = usuarios.find((u) => u.id === usuarioId);
    if (!user) return;
    const novoStatus = !user.ativo;
    const updated = { ...user, ativo: novoStatus };
    try {
      await syncSalvarDocumento('usuarios', updated);
      setUsuarios((prev) => prev.map((u) => (u.id === usuarioId ? updated : u)));
      showToast(`Status de acesso do usuário atualizado (${updated.ativo ? 'Ativo' : 'Inativo'}).`);

      // Registra evento de auditoria no Firestore
      await registrarLogAuditoria({
        acao: novoStatus ? 'Aprovação de Conta' : 'Suspensão de Conta',
        categoria: 'PERMISSOES',
        detalhes: `Acesso do usuário ${user.nome} (${user.email}) foi ${novoStatus ? 'ativado/aprovado' : 'suspenso/inativado'}.`,
        usuarioAtual: usuarioLogado,
        targetId: usuarioId,
        targetNome: user.nome,
      });
    } catch (err) {
      console.error('[Firebase] Erro ao alterar status do usuário:', err);
      showToast('Falha ao atualizar status do usuário no banco de dados.');
    }
  };

  const handleDeleteUsuario = async (usuarioId: string) => {
    if (usuarioLogado?.perfil !== 'ADMIN') {
      showToast('Apenas administradores podem remover contas.');
      return;
    }
    const user = usuarios.find((u) => u.id === usuarioId);
    try {
      await syncDeletarDocumento('usuarios', usuarioId);
      setUsuarios((prev) => prev.filter((u) => u.id !== usuarioId));
      showToast('Usuário removido do sistema.');

      // Registra evento de auditoria no Firestore
      await registrarLogAuditoria({
        acao: 'Exclusão de Conta de Usuário',
        categoria: 'PERMISSOES',
        detalhes: `Conta de ${user?.nome || usuarioId} (${user?.email || ''}, perfil: ${user?.perfil || 'N/A'}) foi excluída permanentemente do sistema.`,
        usuarioAtual: usuarioLogado,
        targetId: usuarioId,
        targetNome: user?.nome || usuarioId,
      });
    } catch (err) {
      console.error('[Firebase] Erro ao excluir usuário:', err);
      showToast('Falha ao remover usuário no banco de dados.');
    }
  };

  const handleSalvarHostingerManual = async () => {
    setHostingerSalvando(true);
    try {
      const res = await salvarTudoNaHostinger({
        turmas,
        professores,
        escolas,
        matrizes,
        historico,
        aulasMinistradas,
        usuarios,
      });
      if (res.success) {
        const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        setHostingerUltimoSalvo(hora);
        showToast(
          `Sucesso! Todas as informações (${turmas.length} turmas, ${professores.length} docentes, ${escolas.length} escolas, ementas e diário) foram salvas no servidor Hostinger (esc.riossistem.com.br)!`
        );
      } else {
        showToast(`Aviso Hostinger: ${res.message}`);
      }
    } catch {
      showToast('Erro ao contatar o servidor Hostinger para salvar.');
    } finally {
      setHostingerSalvando(false);
    }
  };

  const handleDownloadBackup = () => {
    try {
      const backupData = {
        sistema: 'RIOS - Gestão de Escalas',
        versao: '2.0',
        dataExportacao: new Date().toISOString(),
        usuarioExportador: usuarioLogado ? `${usuarioLogado.nome} (${usuarioLogado.role})` : 'Administrador',
        estatisticas: {
          totalTurmas: turmas.length,
          totalProfessores: professores.length,
          totalEscolas: escolas.length,
          totalUsuarios: usuarios.length,
          totalSubstituicoes: historico.length,
          totalAulasMinistradas: aulasMinistradas.length,
        },
        dados: {
          turmas,
          professores,
          escolas,
          usuarios,
          historico,
          aulasMinistradas,
        },
      };

      const jsonBlob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(jsonBlob);
      const downloadAnchor = document.createElement('a');
      const now = new Date();
      const dataStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}h${String(now.getMinutes()).padStart(2, '0')}`;
      downloadAnchor.href = url;
      downloadAnchor.download = `backup_rios_gestao_escalas_${dataStr}.json`;
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);
      URL.revokeObjectURL(url);

      showToast(`Backup baixado com sucesso! (${turmas.length} turmas, ${professores.length} docentes, ${escolas.length} escolas salvas).`);
    } catch (err) {
      console.error('Erro ao gerar backup:', err);
      showToast('Erro ao gerar arquivo de backup.');
    }
  };

  const handleSelectProfessor = (profId: string) => {
    setSelectedProfId(profId);
    setActiveTab('visao-professor');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen w-full bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-sm">
            R
          </div>
          <span className="text-xl font-bold tracking-tight text-blue-600">
            RIOS GESTÃO
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
          <span>Verificando autenticação segura...</span>
        </div>
      </div>
    );
  }

  // Se porventura o usuário não estiver inicializado, exibe Tela de Login com acesso direto sem senha
  if (!usuarioLogado) {
    return (
      <TelaLogin
        mensagemAviso={mensagemAvisoLogin}
        onLimparAviso={() => setMensagemAvisoLogin(null)}
        onEntrarDireto={(user) => {
          setUsuarioLogado(user || USUARIO_PADRAO_SISTEMA);
          setMensagemAvisoLogin(null);
        }}
      />
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 flex items-center gap-3 text-xs max-w-md animate-in slide-in-from-top duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="flex-1">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Sleek Desktop Sidebar */}
      <div className="hidden md:flex shrink-0">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isMobileSimOpen={isMobileSimOpen}
          setIsMobileSimOpen={setIsMobileSimOpen}
          isAIOpen={isAIOpen}
          setIsAIOpen={setIsAIOpen}
          onDownloadBackup={handleDownloadBackup}
          onOpenHostingerModal={() => setIsHostingerModalOpen(true)}
          totalSubstituicoes={historico.length}
          totalAulasMinistradas={aulasMinistradas.length}
          usuarioLogado={usuarioLogado}
          onOpenGerenciarSenhas={() => setIsGerenciarSenhasOpen(true)}
          onLogout={handleLogout}
          onOpenGoogleClassroom={() => setIsGoogleClassroomOpen(true)}
        />
      </div>

      {/* Main Workspace Area */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isMobileSimOpen={isMobileSimOpen}
          setIsMobileSimOpen={setIsMobileSimOpen}
          isAIOpen={isAIOpen}
          setIsAIOpen={setIsAIOpen}
          onDownloadBackup={handleDownloadBackup}
          onOpenHostingerModal={() => setIsHostingerModalOpen(true)}
          onSalvarHostinger={handleSalvarHostingerManual}
          hostingerSalvando={hostingerSalvando}
          hostingerUltimoSalvo={hostingerUltimoSalvo}
          totalSubstituicoes={historico.length}
          totalAulasMinistradas={aulasMinistradas.length}
          onOpenNovaTurmaModal={() => setModalTurma({ isOpen: true, turmaParaEditar: null })}
          usuarioLogado={usuarioLogado}
          onOpenGerenciarSenhas={() => setIsGerenciarSenhasOpen(true)}
          onLogout={handleLogout}
          firebaseStatus={firebaseStatus}
          onOpenGoogleClassroom={() => setIsGoogleClassroomOpen(true)}
        />

        <section className="flex-1 p-4 sm:p-6 flex flex-col gap-6 overflow-y-auto h-full">
          {activeTab === 'turmas' && (
            <TurmasEmentasView
              turmas={turmas}
              professores={professores}
              matrizes={matrizes}
              onSaveMatriz={handleSaveMatriz}
              onDeleteMatriz={handleDeleteMatriz}
              onRestaurarMatrizesPadrao={handleRestaurarMatrizesPadrao}
              onOpenGoogleClassroom={() => setIsGoogleClassroomOpen(true)}
              onOpenCadastrarTurma={() =>
                setModalTurma({ isOpen: true, turmaParaEditar: null, matrizInicial: null })
              }
              onOpenCadastrarTurmaComMatriz={(matriz) =>
                setModalTurma({ isOpen: true, turmaParaEditar: null, matrizInicial: matriz })
              }
              onOpenEditarTurma={(t) =>
                setModalTurma({ isOpen: true, turmaParaEditar: t, matrizInicial: null })
              }
              onDeleteTurma={handleDeleteTurma}
              onOpenSubstituicao={handleOpenSubstituicao}
              onOpenEditarComponente={(t, comp) =>
                setModalComponente({ isOpen: true, turma: t, componente: comp })
              }
              onConcluirComponente={handleConcluirComponente}
              onAdicionarComponente={(t) => {
                setModalComponente({
                  isOpen: true,
                  turma: t,
                  componente: {
                    id: `comp-${Date.now()}`,
                    nome: '',
                    cargaHoraria: 40,
                    status: 'A MINISTRAR',
                  },
                });
              }}
            />
          )}

          {activeTab === 'professores' && (
            <ProfessoresDocentesView
              professores={professores}
              turmas={turmas}
              onOpenCadastrarProfessor={() =>
                setModalProfessor({ isOpen: true, profParaEditar: null })
              }
              onOpenEditarProfessor={(p) =>
                setModalProfessor({ isOpen: true, profParaEditar: p })
              }
              onDeleteProfessor={handleDeleteProfessor}
              onSelectTurma={(turmaId) => {
                setActiveTab('turmas');
              }}
            />
          )}

          {activeTab === 'datas-horarios' && (
            <GradeEscalaHub
              turmas={turmas}
              professores={professores}
              selectedProfId={selectedProfId}
              onSelectProfessor={setSelectedProfId}
              onOpenSubstituicao={handleOpenSubstituicao}
              onOpenEditarComponente={(t, comp) =>
                setModalComponente({ isOpen: true, turma: t, componente: comp })
              }
              onConcluirComponente={handleConcluirComponente}
              onOpenCadastrarTurma={() => setModalTurma({ isOpen: true, turmaParaEditar: null })}
              onOpenEditarTurma={(t) => setModalTurma({ isOpen: true, turmaParaEditar: t })}
            />
          )}

          {activeTab === 'dashboard' && (
            <DashboardView
              turmas={turmas}
              professores={professores}
              escolas={escolas}
              aulasMinistradas={aulasMinistradas}
              historico={historico}
              usuarioAtual={usuarioLogado}
              onSelectProfessor={handleSelectProfessor}
            />
          )}

          {activeTab === 'mapa-operacional' && (
            <OperacionalHub
              turmas={turmas}
              professores={professores}
              historico={historico}
              aulasMinistradas={aulasMinistradas}
              onOpenSubstituicao={handleOpenSubstituicao}
              onSelectProfessor={handleSelectProfessor}
              onRegistrarAula={handleRegistrarAulaMinistrada}
            />
          )}

          {activeTab === 'turmas-timeline' && (
            <TurmasTimeline
              turmas={turmas}
              professores={professores}
              onOpenSubstituicao={handleOpenSubstituicao}
              onConcluirComponente={handleConcluirComponente}
              onOpenCadastrarTurma={() => setModalTurma({ isOpen: true, turmaParaEditar: null })}
              onOpenEditarTurma={(t) => setModalTurma({ isOpen: true, turmaParaEditar: t })}
              onOpenEditarComponente={(t, comp) =>
                setModalComponente({ isOpen: true, turma: t, componente: comp })
              }
            />
          )}

          {activeTab === 'gestao-cadastros' && (
            <GestaoCadastrosEmentas
              turmas={turmas}
              professores={professores}
              escolas={escolas}
              matrizes={matrizes}
              onOpenCadastrarTurma={() => setModalTurma({ isOpen: true, turmaParaEditar: null })}
              onOpenEditarTurma={(t) => setModalTurma({ isOpen: true, turmaParaEditar: t })}
              onDeleteTurma={handleDeleteTurma}
              onOpenCadastrarProfessor={() =>
                setModalProfessor({ isOpen: true, profParaEditar: null })
              }
              onOpenEditarProfessor={(p) =>
                setModalProfessor({ isOpen: true, profParaEditar: p })
              }
              onDeleteProfessor={handleDeleteProfessor}
              onOpenEditarComponente={(t, comp) =>
                setModalComponente({ isOpen: true, turma: t, componente: comp })
              }
              onOpenCadastrarEscola={handleOpenCadastrarEscola}
              onOpenEditarEscola={handleOpenEditarEscola}
              onDeleteEscola={handleDeleteEscola}
              onOpenCadastrarMatriz={() =>
                setModalMatrizState({ isOpen: true, iniciarModoNovo: true })
              }
              onOpenEditarMatriz={(m) =>
                setModalMatrizState({ isOpen: true, matrizId: m.id, iniciarModoEdicao: true })
              }
              onDeleteMatriz={handleDeleteMatriz}
              onCriarTurmaComMatriz={(m) =>
                setModalTurma({ isOpen: true, turmaParaEditar: null, matrizInicial: m })
              }
            />
          )}

          {activeTab === 'professor-dia' && (
            <ProfessorPorDiaView
              professores={professores}
              turmas={turmas}
              aulasMinistradas={aulasMinistradas}
              selectedProfessorId={selectedProfId}
              onSelectProfessor={setSelectedProfId}
              onOpenSubstituicao={handleOpenSubstituicao}
              onRegistrarAulaMinistrada={handleRegistrarAulaMinistrada}
            />
          )}

          {activeTab === 'visao-professor' && (
            <VisaoProfessor
              professores={professores}
              turmas={turmas}
              selectedProfessorId={selectedProfId}
              onSelectProfessor={setSelectedProfId}
              onIrParaVisaoPorDia={(profId) => {
                setSelectedProfId(profId);
                setActiveTab('professor-dia');
              }}
            />
          )}

          {activeTab === 'visao-data' && (
            <VisaoPorData
              professores={professores}
              turmas={turmas}
              onOpenSubstituicao={handleOpenSubstituicao}
              onOpenEditarComponente={(t, comp) =>
                setModalComponente({ isOpen: true, turma: t, componente: comp })
              }
            />
          )}

          {activeTab === 'aulas-ministradas' && (
            <HistoricoAulasMinistradas
              aulasMinistradas={aulasMinistradas}
              historicoSubstituicoes={historico}
              professores={professores}
              turmas={turmas}
              onRegistrarAula={handleRegistrarAulaMinistrada}
            />
          )}

          {activeTab === 'app-docente' && (
            <AppDocente
              usuarioLogado={usuarioLogado}
              professores={professores}
              turmas={turmas}
              aulasMinistradas={aulasMinistradas}
              onRegistrarAulaMinistrada={handleRegistrarAulaMinistrada}
              onLogout={handleLogout}
              onOpenGerenciarSenhas={() => setIsGerenciarSenhasOpen(true)}
              isAdminOrGestor={usuarioLogado.perfil !== 'PROFESSOR'}
              onVoltarPainelGeral={() => setActiveTab('mapa-operacional')}
              onSimularProfessor={(profId) => setSelectedProfId(profId)}
              activeProfessorId={selectedProfId}
            />
          )}

          {activeTab === 'relatorios' && (
            <RelatoriosView turmas={turmas} professores={professores} />
          )}

          {activeTab === 'cenarios' && (
            <CenariosView turmas={turmas} professores={professores} />
          )}

          {activeTab === 'historico' && (
            <HistoricoMovimentacoes historico={historico} />
          )}
        </section>
      </main>

      {/* Floating AI Assistant Trigger */}
      <button
        id="btn-floating-ai"
        onClick={() => setIsAIOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-indigo-600 hover:bg-indigo-700 text-white p-3.5 rounded-2xl shadow-xl flex items-center gap-2 font-bold text-xs transition-transform hover:scale-105"
        title="Abrir Assistente RIOS"
      >
        <Sparkles className="w-5 h-5 text-amber-300" />
        <span className="hidden sm:inline">Assistente RIOS AI</span>
      </button>

      {/* Substitution Modal */}
      <ModalSubstituicao
        isOpen={modalSubstituicao.isOpen}
        onClose={() => setModalSubstituicao({ isOpen: false, turma: null, componente: null })}
        turma={modalSubstituicao.turma}
        componente={modalSubstituicao.componente}
        professores={professores}
        todasTurmas={turmas}
        onConfirmarSubstituicao={handleConfirmarSubstituicao}
      />

      {/* Modal de Cadastrar / Editar Turma e Ementa */}
      <ModalTurmaEmenta
        isOpen={modalTurma.isOpen}
        onClose={() => setModalTurma({ isOpen: false, turmaParaEditar: null, matrizInicial: null })}
        onSaveTurma={handleSaveTurma}
        turmaParaEditar={modalTurma.turmaParaEditar}
        matrizInicial={modalTurma.matrizInicial}
        professores={professores}
        escolasExistentes={escolas.map((e) => e.nome)}
        matrizesDisponiveis={matrizes}
      />

      {/* Modal de Gestão Completa de Ementas e Matrizes (CRUD) */}
      <MatrizesCursosModal
        isOpen={modalMatrizState.isOpen}
        onClose={() =>
          setModalMatrizState({
            isOpen: false,
            matrizId: undefined,
            iniciarModoEdicao: false,
            iniciarModoNovo: false,
          })
        }
        matrizes={matrizes}
        onSaveMatriz={handleSaveMatriz}
        onDeleteMatriz={handleDeleteMatriz}
        onRestaurarPadrao={handleRestaurarMatrizesPadrao}
        matrizInicialId={modalMatrizState.matrizId}
        iniciarModoEdicao={modalMatrizState.iniciarModoEdicao}
        iniciarModoNovo={modalMatrizState.iniciarModoNovo}
        onCriarTurmaComMatriz={(matriz) => {
          setModalTurma({ isOpen: true, turmaParaEditar: null, matrizInicial: matriz });
          setModalMatrizState({ isOpen: false });
        }}
      />

      {/* Modal de Cadastrar / Editar Professor */}
      <ModalProfessor
        isOpen={modalProfessor.isOpen}
        onClose={() => setModalProfessor({ isOpen: false, profParaEditar: null })}
        onSaveProfessor={handleSaveProfessor}
        professorParaEditar={modalProfessor.profParaEditar}
        escolasExistentes={escolas.map((e) => e.nome)}
      />

      {/* Modal de Cadastrar / Editar Escola */}
      <ModalEscola
        isOpen={modalEscola.isOpen}
        onClose={() => setModalEscola({ isOpen: false, escolaParaEditar: null })}
        onSaveEscola={handleSaveEscola}
        escolaParaEditar={modalEscola.escolaParaEditar}
      />

      {/* Modal de Edição Direta de Componente da Ementa */}
      {modalComponente.turma && modalComponente.componente && (
        <ModalEditarComponente
          isOpen={modalComponente.isOpen}
          onClose={() =>
            setModalComponente({ isOpen: false, turma: null, componente: null })
          }
          turma={modalComponente.turma}
          componente={modalComponente.componente}
          professores={professores}
          todasTurmas={turmas}
          onSaveComponente={handleSaveComponente}
        />
      )}

      {/* Mobile Professor Simulator */}
      <MobileProfessorView
        isOpen={isMobileSimOpen}
        onClose={() => setIsMobileSimOpen(false)}
        professores={professores}
        turmas={turmas}
        onCheckInAula={(turmaCodigo, compNome) => {
          const t = turmas.find((item) => item.codigo === turmaCodigo);
          const c = t?.componentes.find((item) => item.nome === compNome);
          const prof = professores.find((p) => p.id === c?.professorId);
          if (t && c && prof) {
            handleRegistrarAulaMinistrada({
              data: new Date().toLocaleDateString('pt-BR'),
              horario: t.horario,
              turno: t.turno,
              diaSemana: t.diaSemana,
              turmaCodigo: t.codigo,
              curso: t.curso,
              componenteNome: c.nome,
              horasMinistradas: 4,
              professorId: prof.id,
              professorNome: prof.nome,
              escola: t.escola,
              sala: t.sala,
              conteudoMinistrado: `Aula iniciada e confirmada via Check-in Mobile pelo docente.`,
              observacoes: `Validação por geolocalização e biometria digital.`,
              status: 'CONFIRMADA',
              registradoPor: `${prof.nome} (App Docente)`,
            });
          } else {
            showToast(`Check-in confirmado pelo docente na turma ${turmaCodigo} (${compNome})!`);
          }
        }}
      />

      {/* AI Assistant Drawer */}
      <AIAssistantDrawer
        isOpen={isAIOpen}
        onClose={() => setIsAIOpen(false)}
        turmas={turmas}
        professores={professores}
        historico={historico}
      />

      {/* Modal de Gerenciamento de Contas e Usuários (RBAC) */}
      <ModalGerenciamentoSenhas
        isOpen={isGerenciarSenhasOpen}
        onClose={() => setIsGerenciarSenhasOpen(false)}
        usuarioAtual={usuarioLogado}
        usuarios={usuarios}
        professores={professores}
        onToggleStatusUsuario={handleToggleStatusUsuario}
        onAlterarPerfilUsuario={handleAlterarPerfilUsuario}
        onVincularProfessor={handleVincularProfessor}
        onDeleteUsuario={handleDeleteUsuario}
      />

      {/* Modal de Instruções e Download para Hostinger */}
      <ModalHostingerDeploy
        isOpen={isHostingerModalOpen}
        onClose={() => setIsHostingerModalOpen(false)}
      />

      {/* Plugin de Integração Oficial com o Google Classroom */}
      <GoogleClassroomModal
        isOpen={isGoogleClassroomOpen}
        onClose={() => setIsGoogleClassroomOpen(false)}
        turmasExistentes={turmas}
        escolas={escolas}
        professores={professores}
        onImportarTurmas={handleImportarTurmasClassroom}
      />
    </div>
  );
}

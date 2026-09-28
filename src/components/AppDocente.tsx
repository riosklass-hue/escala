import React, { useState, useMemo } from 'react';
import {
  Professor,
  Turma,
  ComponenteDaTurma,
  AulaMinistradaRecord,
  Usuario,
  Turno,
  DiaSemana,
} from '../types/rios';
import {
  Calendar,
  Clock,
  School,
  Building,
  CheckCircle2,
  BookOpen,
  DollarSign,
  AlertCircle,
  FileText,
  User,
  GraduationCap,
  Sparkles,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  LogOut,
  KeyRound,
  Send,
  Plus,
  ArrowRight,
  ShieldCheck,
  Award,
  Layers,
  HelpCircle,
  Users,
  MapPin,
  Check,
  Briefcase,
  TrendingUp,
} from 'lucide-react';
import {
  parseDataBR,
  formatarDataBR,
  getDiasDaSemana,
  getDiaSemanaPorData,
  isDataNoIntervalo,
} from '../utils/conflitoAgenda';

interface AppDocenteProps {
  usuarioLogado: Usuario;
  professores: Professor[];
  turmas: Turma[];
  aulasMinistradas: AulaMinistradaRecord[];
  onRegistrarAulaMinistrada: (aula: Omit<AulaMinistradaRecord, 'id' | 'timestampRegistro'>) => void;
  onLogout: () => void;
  onOpenGerenciarSenhas?: () => void;
  isAdminOrGestor?: boolean;
  onVoltarPainelGeral?: () => void;
  onSimularProfessor?: (profId: string) => void;
  activeProfessorId?: string;
}

export type AbaAppDocente =
  | 'agenda'
  | 'turmas'
  | 'diario'
  | 'extrato'
  | 'substituicao'
  | 'perfil';

const DIAS_SEMANA_ORDEM: DiaSemana[] = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

const TURNOS_HORARIOS: Record<Turno, string> = {
  'MANHÃ': '07:30 – 11:30',
  'TARDE': '13:30 – 17:30',
  'NOITE': '18:30 – 22:30',
};

export const AppDocente: React.FC<AppDocenteProps> = ({
  usuarioLogado,
  professores,
  turmas,
  aulasMinistradas,
  onRegistrarAulaMinistrada,
  onLogout,
  onOpenGerenciarSenhas,
  isAdminOrGestor = false,
  onVoltarPainelGeral,
  onSimularProfessor,
  activeProfessorId,
}) => {
  // Aba ativa do app docente
  const [abaAtiva, setAbaAtiva] = useState<AbaAppDocente>('agenda');

  // Modo de visualização: 'desktop' ou 'mobile-frame'
  const [visualizacaoMobile, setVisualizacaoMobile] = useState<boolean>(false);

  // Professor selecionado (para gestores testando ou o professor logado)
  const [professorIdSelecionado, setProfessorIdSelecionado] = useState<string>(() => {
    if (activeProfessorId) return activeProfessorId;
    if (usuarioLogado.professorId) return usuarioLogado.professorId;
    const matchByEmail = professores.find(
      (p) => p.email.toLowerCase().trim() === usuarioLogado.email.toLowerCase().trim()
    );
    if (matchByEmail) return matchByEmail.id;
    const matchByName = professores.find(
      (p) => p.nome.toLowerCase().trim() === usuarioLogado.nome.toLowerCase().trim()
    );
    if (matchByName) return matchByName.id;
    return professores[0]?.id || 'prof-ana';
  });

  // Atualiza se mudar externamente
  React.useEffect(() => {
    if (activeProfessorId && activeProfessorId !== professorIdSelecionado) {
      setProfessorIdSelecionado(activeProfessorId);
    }
  }, [activeProfessorId]);

  const professor = useMemo(() => {
    return (
      professores.find((p) => p.id === professorIdSelecionado) ||
      professores[0] || {
        id: 'prof-default',
        nome: usuarioLogado.nome,
        email: usuarioLogado.email,
        telefone: usuarioLogado.telefone || '(11) 98888-0000',
        competencias: ['Docência Geral'],
        cargaHorariaMaxima: 140,
        valorHora: 32,
        escolasHabituais: ['Unidade Centro'],
      }
    );
  }, [professores, professorIdSelecionado, usuarioLogado]);

  // Controle de Navegação Semanal (Base: 07/09/2026)
  const [dataBaseSemana, setDataBaseSemana] = useState<Date>(() => new Date(2026, 8, 7));

  const diasDaSemanaAtiva = useMemo(() => {
    return getDiasDaSemana(dataBaseSemana, true); // Segunda a Sábado
  }, [dataBaseSemana]);

  const intervaloSemanaLabel = useMemo(() => {
    if (diasDaSemanaAtiva.length === 0) return '';
    const inicio = formatarDataBR(diasDaSemanaAtiva[0]);
    const fim = formatarDataBR(diasDaSemanaAtiva[diasDaSemanaAtiva.length - 1]);
    return `Semana de ${inicio} a ${fim}`;
  }, [diasDaSemanaAtiva]);

  // Check-in efetuado hoje (estado local)
  const [checkInsFeitos, setCheckInsFeitos] = useState<Record<string, boolean>>({});

  // Modal para lançar aula no Diário de Classe
  const [modalDiarioAberto, setModalDiarioAberto] = useState<boolean>(false);
  const [erroDiario, setErroDiario] = useState<string | null>(null);
  const [erroSubst, setErroSubst] = useState<string | null>(null);
  const [dadosFormDiario, setDadosFormDiario] = useState<{
    turmaId: string;
    componenteId: string;
    data: string;
    horas: number;
    conteudo: string;
    observacoes: string;
  }>({
    turmaId: '',
    componenteId: '',
    data: new Date().toLocaleDateString('pt-BR'),
    horas: 4,
    conteudo: '',
    observacoes: '',
  });

  // Notificação de solicitação de substituição enviada
  const [solicitacaoEnviada, setSolicitacaoEnviada] = useState<boolean>(false);
  const [motivoSubstituicao, setMotivoSubstituicao] = useState<string>('');
  const [turmaSubstituicaoId, setTurmaSubstituicaoId] = useState<string>('');
  const [dataSubstituicao, setDataSubstituicao] = useState<string>('');

  // =========================================================================
  // EXTRAÇÃO DAS AULAS E TURMAS DIRECIONADAS A ESTE PROFESSOR
  // =========================================================================
  const minhasTurmasEComponentes = useMemo(() => {
    const lista: Array<{
      turma: Turma;
      componente: ComponenteDaTurma;
      totalHorasMinistradas: number;
      percentualConcluido: number;
    }> = [];

    turmas.forEach((t) => {
      t.componentes.forEach((c) => {
        if (c.professorId === professor.id) {
          // Calcula quantas horas já foram registradas para esse componente nesta turma
          const aulasDesteComp = aulasMinistradas.filter(
            (a) =>
              a.turmaCodigo === t.codigo &&
              a.componenteNome.toLowerCase().trim() === c.nome.toLowerCase().trim() &&
              a.professorId === professor.id
          );
          const totalHoras = aulasDesteComp.reduce((acc, curr) => acc + (curr.horasMinistradas || 4), 0);
          const percentual = Math.min(100, Math.round((totalHoras / c.cargaHoraria) * 100));

          lista.push({
            turma: t,
            componente: c,
            totalHorasMinistradas: totalHoras,
            percentualConcluido: percentual,
          });
        }
      });
    });

    return lista;
  }, [turmas, professor.id, aulasMinistradas]);

  // Turmas únicas
  const minhasTurmasUnicas = useMemo(() => {
    const ids = new Set<string>();
    const list: Turma[] = [];
    minhasTurmasEComponentes.forEach((item) => {
      if (!ids.has(item.turma.id)) {
        ids.add(item.turma.id);
        list.push(item.turma);
      }
    });
    return list;
  }, [minhasTurmasEComponentes]);

  // =========================================================================
  // GRADE SEMANAL DO PROFESSOR (Segunda a Sábado)
  // =========================================================================
  const gradeSemanalDocente = useMemo(() => {
    return DIAS_SEMANA_ORDEM.map((diaNome, idxDia) => {
      const dataCorrespondente = diasDaSemanaAtiva[idxDia];
      const dataStr = dataCorrespondente ? formatarDataBR(dataCorrespondente) : '';

      const aulasDoDia: Array<{
        turma: Turma;
        componente: ComponenteDaTurma;
        turno: Turno;
        horario: string;
        escola: string;
        sala: string;
        emVigencia: boolean;
      }> = [];

      minhasTurmasEComponentes.forEach(({ turma, componente }) => {
        if (turma.diaSemana === diaNome) {
          let vigente = true;
          if (dataCorrespondente && componente.dataInicio) {
            vigente = isDataNoIntervalo(
              dataCorrespondente,
              componente.dataInicio,
              componente.dataFim || componente.dataConclusao
            );
          }
          aulasDoDia.push({
            turma,
            componente,
            turno: turma.turno,
            horario: turma.horario,
            escola: turma.escola,
            sala: turma.sala,
            emVigencia: vigente || componente.status === 'EM ANDAMENTO',
          });
        }
      });

      // Ordena por turno: MANHÃ -> TARDE -> NOITE
      const ordemTurno: Record<Turno, number> = { MANHÃ: 1, TARDE: 2, NOITE: 3 };
      aulasDoDia.sort((a, b) => ordemTurno[a.turno] - ordemTurno[b.turno]);

      // Verifica alerta de deslocamento (escolas distintas no mesmo dia)
      const escolasNoDia = Array.from(new Set(aulasDoDia.map((a) => a.escola)));
      const temAlertaDeslocamento = escolasNoDia.length > 1;

      return {
        diaNome,
        dataStr,
        dataObj: dataCorrespondente,
        aulas: aulasDoDia,
        temAlertaDeslocamento,
        escolasNoDia,
      };
    });
  }, [DIAS_SEMANA_ORDEM, diasDaSemanaAtiva, minhasTurmasEComponentes]);

  // Aulas do professor no dia atual (ex: Terça-feira)
  const diaSimuladoHoje: DiaSemana = 'Terça-feira';
  const aulasDeHoje = useMemo(() => {
    const diaEncontrado = gradeSemanalDocente.find((g) => g.diaNome === diaSimuladoHoje);
    return diaEncontrado ? diaEncontrado.aulas : [];
  }, [gradeSemanalDocente, diaSimuladoHoje]);

  // Aula em destaque (aula da noite de hoje ou primeira aula ativa)
  const aulaDestaque = useMemo(() => {
    if (aulasDeHoje.length > 0) {
      return aulasDeHoje[0];
    }
    // Senão pega a primeira aula cadastrada
    for (const d of gradeSemanalDocente) {
      if (d.aulas.length > 0) {
        return d.aulas[0];
      }
    }
    return null;
  }, [aulasDeHoje, gradeSemanalDocente]);

  // =========================================================================
  // HISTÓRICO DE AULAS MINISTRADAS POR ESTE DOCENTE
  // =========================================================================
  const minhasAulasMinistradas = useMemo(() => {
    return aulasMinistradas.filter(
      (a) =>
        a.professorId === professor.id ||
        a.professorNome.toLowerCase().trim() === professor.nome.toLowerCase().trim()
    );
  }, [aulasMinistradas, professor]);

  // =========================================================================
  // MÉTRICAS CONSOLIDADAS DO DOCENTE (Horas, Saldo, Remuneração)
  // =========================================================================
  const metricas = useMemo(() => {
    // Total de aulas na semana
    let aulasNaSemanaCount = 0;
    gradeSemanalDocente.forEach((dia) => {
      dia.aulas.forEach((a) => {
        if (a.emVigencia) aulasNaSemanaCount++;
      });
    });

    const horasSemanais = aulasNaSemanaCount * 4;
    const remuneracaoSemanal = horasSemanais * professor.valorHora;

    // Horas mensais estimadas (4.33 semanas)
    const horasMensaisEstimadas = horasSemanais * 4;
    const remuneracaoMensalEstimada = horasMensaisEstimadas * professor.valorHora;

    // Horas já homologadas no histórico deste mês
    const horasHomologadas = minhasAulasMinistradas.reduce(
      (acc, curr) => acc + (curr.horasMinistradas || 4),
      0
    );

    const tetoContratual = professor.cargaHorariaMaxima || 140;
    const percentualTeto = Math.min(100, Math.round((horasMensaisEstimadas / tetoContratual) * 100));
    const saldoHorasLivres = Math.max(0, tetoContratual - horasMensaisEstimadas);

    return {
      aulasNaSemanaCount,
      horasSemanais,
      remuneracaoSemanal,
      horasMensaisEstimadas,
      remuneracaoMensalEstimada,
      horasHomologadas,
      tetoContratual,
      percentualTeto,
      saldoHorasLivres,
      totalTurmas: minhasTurmasUnicas.length,
      totalComponentes: minhasTurmasEComponentes.length,
    };
  }, [gradeSemanalDocente, professor, minhasAulasMinistradas, minhasTurmasUnicas, minhasTurmasEComponentes]);

  // =========================================================================
  // HANDLER: REGISTRAR CHECK-IN
  // =========================================================================
  const handleFazerCheckIn = (chaveAula: string, turmaCodigo: string, componenteNome: string) => {
    setCheckInsFeitos((prev) => ({ ...prev, [chaveAula]: true }));
    const t = turmas.find((item) => item.codigo === turmaCodigo);
    if (t) {
      onRegistrarAulaMinistrada({
        data: new Date().toLocaleDateString('pt-BR'),
        horario: t.horario,
        turno: t.turno,
        diaSemana: t.diaSemana,
        turmaCodigo: t.codigo,
        curso: t.curso,
        componenteNome: componenteNome,
        horasMinistradas: 4,
        professorId: professor.id,
        professorNome: professor.nome,
        escola: t.escola,
        sala: t.sala,
        conteudoMinistrado: `Check-in de presença realizado pelo docente no App Docente. Aula iniciada no horário.`,
        observacoes: `Validação por autenticação individual do docente no RIOS.`,
        status: 'CONFIRMADA',
        registradoPor: `${professor.nome} (App Docente)`,
      });
    }
  };

  // =========================================================================
  // HANDLER: SALVAR DIÁRIO DE CLASSE
  // =========================================================================
  const handleAbrirModalDiario = (turmaId?: string, componenteId?: string) => {
    const turmaAlvo = turmas.find((t) => t.id === turmaId) || minhasTurmasUnicas[0];
    const compAlvo =
      turmaAlvo?.componentes.find((c) => c.id === componenteId) ||
      turmaAlvo?.componentes.find((c) => c.professorId === professor.id) ||
      turmaAlvo?.componentes[0];

    setDadosFormDiario({
      turmaId: turmaAlvo ? turmaAlvo.id : '',
      componenteId: compAlvo ? compAlvo.id : '',
      data: new Date().toLocaleDateString('pt-BR'),
      horas: 4,
      conteudo: '',
      observacoes: '',
    });
    setErroDiario(null);
    setModalDiarioAberto(true);
  };

  const handleSalvarDiario = (e: React.FormEvent) => {
    e.preventDefault();
    setErroDiario(null);
    const targetTurma = turmas.find((t) => t.id === dadosFormDiario.turmaId);
    const targetComp = targetTurma?.componentes.find((c) => c.id === dadosFormDiario.componenteId);

    if (!targetTurma || !targetComp) {
      setErroDiario('Selecione uma turma e disciplina válidas.');
      return;
    }

    if (!dadosFormDiario.conteudo.trim()) {
      setErroDiario('Por favor, informe o conteúdo trabalhado na aula.');
      return;
    }

    onRegistrarAulaMinistrada({
      data: dadosFormDiario.data,
      horario: targetTurma.horario,
      turno: targetTurma.turno,
      diaSemana: targetTurma.diaSemana,
      turmaCodigo: targetTurma.codigo,
      curso: targetTurma.curso,
      componenteNome: targetComp.nome,
      horasMinistradas: Number(dadosFormDiario.horas) || 4,
      professorId: professor.id,
      professorNome: professor.nome,
      escola: targetTurma.escola,
      sala: targetTurma.sala,
      conteudoMinistrado: dadosFormDiario.conteudo,
      observacoes: dadosFormDiario.observacoes || 'Lançamento efetuado via Diário de Classe Digital.',
      status: 'CONFIRMADA',
      registradoPor: `${professor.nome} (App Docente)`,
    });

    setModalDiarioAberto(false);
  };

  // =========================================================================
  // HANDLER: ENVIAR SOLICITAÇÃO DE SUBSTITUIÇÃO
  // =========================================================================
  const handleEnviarSolicitacaoSubstituicao = (e: React.FormEvent) => {
    e.preventDefault();
    setErroSubst(null);
    if (!turmaSubstituicaoId || !motivoSubstituicao.trim()) {
      setErroSubst('Por favor, selecione a turma e descreva o motivo do pedido.');
      return;
    }
    setSolicitacaoEnviada(true);
    setTimeout(() => {
      setSolicitacaoEnviada(false);
      setMotivoSubstituicao('');
      setTurmaSubstituicaoId('');
      setDataSubstituicao('');
      setAbaAtiva('agenda');
    }, 3500);
  };

  return (
    <div className="w-full flex flex-col gap-5">
      {/* Top Banner for Admin/Gestor test-switching between professors */}
      {isAdminOrGestor && (
        <div className="bg-indigo-950 text-white p-3.5 rounded-xl border border-indigo-800/80 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <span className="font-bold text-indigo-200 uppercase tracking-wider text-[10px] block">
                Modo de Visualização da Gestão • App Docente Individual
              </span>
              <span className="text-slate-300 text-xs">
                Você está visualizando as aulas direcionadas para o(a) professor(a):
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              id="select-simular-professor"
              value={professorIdSelecionado}
              onChange={(e) => {
                const novoId = e.target.value;
                setProfessorIdSelecionado(novoId);
                if (onSimularProfessor) onSimularProfessor(novoId);
              }}
              className="bg-indigo-900 border border-indigo-700 text-white font-bold rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-indigo-400 focus:outline-none"
            >
              {professores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} ({p.escolasHabituais[0] || 'Docente'})
                </option>
              ))}
            </select>

            {onVoltarPainelGeral && (
              <button
                type="button"
                onClick={onVoltarPainelGeral}
                className="px-3 py-1.5 rounded-lg bg-white text-indigo-950 font-bold hover:bg-slate-100 transition-colors shadow-2xs"
              >
                Voltar ao Painel Geral
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Teacher Profile Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs relative overflow-hidden">
        {/* Background gradient accent */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          {/* Professor Identification */}
          <div className="flex items-start sm:items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white font-black text-2xl flex items-center justify-center shadow-md">
                {professor.nome
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')}
              </div>
              <span
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white"
                title="Conta Ativa no Portal Docente"
              >
                <Check className="w-3 h-3" />
              </span>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 leading-tight">
                  {professor.nome}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  Portal do Professor • RIOS
                </span>
              </div>

              <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1 font-medium text-slate-600">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  Docente Titular
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-slate-600">
                  <School className="w-3.5 h-3.5 text-slate-400" />
                  {professor.escolasHabituais.join(', ')}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-slate-600">
                  <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                  R$ {professor.valorHora},00 / hora-aula
                </span>
              </p>

              <div className="mt-2 text-xs font-semibold text-emerald-700 flex items-center gap-1.5 bg-emerald-50/70 border border-emerald-200/80 px-2.5 py-1 rounded-lg w-fit">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>
                  Status Atual: <strong>Em Aula (Sala 04 • Unidade Centro)</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              id="btn-lancar-diario-rapido"
              type="button"
              onClick={() => handleAbrirModalDiario()}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Lançar Diário de Aula</span>
            </button>

            <button
              type="button"
              onClick={() => setVisualizacaoMobile(!visualizacaoMobile)}
              className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                visualizacaoMobile
                  ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Smartphone className="w-4 h-4 text-slate-500" />
              <span>{visualizacaoMobile ? 'Modo Desktop' : 'Modo Celular (App)'}</span>
            </button>

            {onOpenGerenciarSenhas && (
              <button
                type="button"
                onClick={onOpenGerenciarSenhas}
                className="p-2 rounded-xl border border-slate-300 text-slate-600 hover:text-orange-600 hover:bg-orange-50/40 transition-colors"
                title="Minha Senha e Acesso"
              >
                <KeyRound className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onLogout}
              className="p-2 rounded-xl border border-slate-300 text-slate-600 hover:text-rose-600 hover:bg-rose-50/50 transition-colors"
              title="Sair do App Docente"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick KPI Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 mt-5 border-t border-slate-100">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
              Minhas Turmas Atribuídas
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-slate-900">{metricas.totalTurmas}</span>
              <span className="text-xs text-slate-500 font-medium">turmas em curso</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
              Carga Semanal Direcionada
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-indigo-700">{metricas.horasSemanais}h</span>
              <span className="text-xs text-slate-500 font-medium">/ semana</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
              Ocupação Mensal vs. Teto
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-blue-700">{metricas.horasMensaisEstimadas}h</span>
              <span className="text-xs text-slate-500 font-medium">/ {metricas.tetoContratual}h</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
              Remuneração Estimada (Mês)
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-emerald-700">
                R$ {metricas.remuneracaoMensalEstimada.toLocaleString('pt-BR')},00
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs for the Teacher Portal */}
        <div className="flex flex-wrap items-center gap-1.5 pt-4 mt-4 border-t border-slate-100 overflow-x-auto no-scrollbar">
          <button
            id="tab-docente-agenda"
            onClick={() => setAbaAtiva('agenda')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              abaAtiva === 'agenda'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Minha Agenda & Grade Semanal</span>
          </button>

          <button
            id="tab-docente-turmas"
            onClick={() => setAbaAtiva('turmas')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              abaAtiva === 'turmas'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Minhas Turmas & Componentes ({minhasTurmasEComponentes.length})</span>
          </button>

          <button
            id="tab-docente-diario"
            onClick={() => setAbaAtiva('diario')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              abaAtiva === 'diario'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Diário de Classe & Histórico ({minhasAulasMinistradas.length})</span>
          </button>

          <button
            id="tab-docente-extrato"
            onClick={() => setAbaAtiva('extrato')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              abaAtiva === 'extrato'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Extrato Financeiro & Carga Horária</span>
          </button>

          <button
            id="tab-docente-substituicao"
            onClick={() => setAbaAtiva('substituicao')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              abaAtiva === 'substituicao'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Solicitar Substituição / Ausência</span>
          </button>

          <button
            id="tab-docente-perfil"
            onClick={() => setAbaAtiva('perfil')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              abaAtiva === 'perfil'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Meu Perfil & Acesso</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* ABA 1: MINHA AGENDA & GRADE SEMANAL (Aulas Direcionadas)              */}
      {/* ===================================================================== */}
      {abaAtiva === 'agenda' && (
        <div className="space-y-6">
          {/* Card: Aula em Destaque de Hoje */}
          {aulaDestaque && (
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-5 sm:p-6 text-white shadow-md relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping" />
                      Próxima Aula Direcionada
                    </span>
                    <span className="text-xs text-indigo-200 font-semibold">
                      {diaSimuladoHoje} • Turno {aulaDestaque.turno} ({aulaDestaque.horario})
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                    {aulaDestaque.componente.nome}
                  </h2>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-indigo-100 pt-1">
                    <span className="flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-indigo-300" />
                      Turma: <strong>{aulaDestaque.turma.codigo}</strong> ({aulaDestaque.turma.curso})
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1.5">
                      <School className="w-4 h-4 text-indigo-300" />
                      {aulaDestaque.escola}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1.5">
                      <Building className="w-4 h-4 text-indigo-300" />
                      {aulaDestaque.sala}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    id="btn-checkin-hoje"
                    onClick={() =>
                      handleFazerCheckIn(
                        `${aulaDestaque.turma.id}-${aulaDestaque.componente.id}`,
                        aulaDestaque.turma.codigo,
                        aulaDestaque.componente.nome
                      )
                    }
                    disabled={checkInsFeitos[`${aulaDestaque.turma.id}-${aulaDestaque.componente.id}`]}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-sm ${
                      checkInsFeitos[`${aulaDestaque.turma.id}-${aulaDestaque.componente.id}`]
                        ? 'bg-emerald-500 text-white cursor-default'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {checkInsFeitos[`${aulaDestaque.turma.id}-${aulaDestaque.componente.id}`]
                        ? 'Check-in Confirmado!'
                        : 'Fazer Check-in de Presença'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleAbrirModalDiario(aulaDestaque.turma.id, aulaDestaque.componente.id)
                    }
                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-amber-300" />
                    <span>Registrar Aula no Diário</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Week Navigation Header */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setDataBaseSemana((prev) => {
                    const d = new Date(prev);
                    d.setDate(d.getDate() - 7);
                    return d;
                  });
                }}
                className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700"
                title="Semana Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setDataBaseSemana(new Date(2026, 8, 7))}
                className="px-3 py-1 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold"
              >
                Semana Atual
              </button>

              <button
                type="button"
                onClick={() => {
                  setDataBaseSemana((prev) => {
                    const d = new Date(prev);
                    d.setDate(d.getDate() + 7);
                    return d;
                  });
                }}
                className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700"
                title="Próxima Semana"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <span className="text-xs font-black text-indigo-900 ml-2">
                {intervaloSemanaLabel}
              </span>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Grade curricular oficial dos 6 dias úteis letivos (Segunda a Sábado)
            </div>
          </div>

          {/* Monday-to-Saturday Weekly Schedule Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {gradeSemanalDocente.map((diaItem, idx) => {
              const temAulas = diaItem.aulas.length > 0;
              const isHoje = diaItem.diaNome === diaSimuladoHoje;

              return (
                <div
                  key={idx}
                  className={`rounded-2xl border transition-all flex flex-col ${
                    isHoje
                      ? 'bg-blue-50/40 border-blue-300 shadow-sm ring-1 ring-blue-300'
                      : 'bg-white border-slate-200 shadow-xs hover:border-slate-300'
                  }`}
                >
                  {/* Header of the Day */}
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 text-sm">{diaItem.diaNome}</span>
                        {isHoje && (
                          <span className="px-2 py-0.2 rounded-full bg-blue-600 text-white text-[9px] font-black uppercase">
                            Hoje
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {diaItem.dataStr || 'Dia Letivo'}
                      </span>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        temAulas
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {temAulas
                        ? `${diaItem.aulas.length} aula(s) • ${diaItem.aulas.length * 4}h`
                        : 'Livre'}
                    </span>
                  </div>

                  {/* Day Content */}
                  <div className="p-4 flex-1 space-y-3">
                    {/* Dislocation Alert */}
                    {diaItem.temAlertaDeslocamento && (
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-start gap-1.5 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span>
                          <strong>Atenção ao Deslocamento:</strong> Aulas em escolas distintas neste dia (
                          {diaItem.escolasNoDia.join(' e ')}).
                        </span>
                      </div>
                    )}

                    {!temAulas ? (
                      <div className="py-8 text-center text-slate-400 text-xs">
                        <Clock className="w-6 h-6 mx-auto mb-1.5 text-slate-300 stroke-1" />
                        Nenhuma aula direcionada neste dia
                      </div>
                    ) : (
                      diaItem.aulas.map((aula, i) => (
                        <div
                          key={i}
                          className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/70 hover:bg-slate-100/80 transition-colors space-y-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800">
                              {aula.turno} ({aula.horario})
                            </span>
                            <span className="text-xs font-black text-blue-700">
                              Turma {aula.turma.codigo}
                            </span>
                          </div>

                          <div>
                            <h4 className="font-bold text-slate-900 text-xs leading-snug">
                              {aula.componente.nome}
                            </h4>
                            <p className="text-[11px] text-slate-500">{aula.turma.curso}</p>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-600 pt-1 border-t border-slate-200/60">
                            <span className="flex items-center gap-1">
                              <School className="w-3 h-3 text-slate-400" />
                              {aula.escola}
                            </span>
                            <span className="flex items-center gap-1 font-semibold text-slate-700">
                              <Building className="w-3 h-3 text-slate-400" />
                              {aula.sala}
                            </span>
                          </div>

                          <div className="pt-2 flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleAbrirModalDiario(aula.turma.id, aula.componente.id)
                              }
                              className="w-full py-1.5 px-2.5 rounded-lg bg-white border border-slate-300 hover:border-indigo-400 text-slate-700 hover:text-indigo-600 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Lançar Diário</span>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* ABA 2: MINHAS TURMAS & COMPONENTES CURRICULARES                       */}
      {/* ===================================================================== */}
      {abaAtiva === 'turmas' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 leading-tight">
              Turmas & Matrizes Curriculares sob Minha Responsabilidade
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Acompanhamento de carga horária cumprida, período de vigência e cronograma de cada turma atribuída.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {minhasTurmasEComponentes.map((item, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 hover:border-indigo-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md text-xs font-black bg-indigo-100 text-indigo-800">
                        Turma {item.turma.codigo}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.componente.status === 'CONCLUÍDO'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.componente.status === 'EM ANDAMENTO'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {item.componente.status}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 mt-1.5 leading-snug">
                      {item.componente.nome}
                    </h4>
                    <p className="text-xs text-slate-500">{item.turma.curso}</p>
                  </div>
                </div>

                {/* Logistics Badges */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Escola / Sala Fixa
                    </span>
                    <span className="font-semibold text-slate-800">
                      {item.turma.escola} • {item.turma.sala}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Turno / Horário
                    </span>
                    <span className="font-semibold text-slate-800">
                      {item.turma.diaSemana} • {item.turma.turno}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Período de Aulas
                    </span>
                    <span className="font-medium text-slate-700">
                      {item.componente.dataInicio || 'Início'} a{' '}
                      {item.componente.dataFim || item.componente.dataConclusao || 'Fim previsto'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Carga do Componente
                    </span>
                    <span className="font-bold text-indigo-700">
                      {item.componente.cargaHoraria} horas totais
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-600">Progresso de Aulas Ministradas:</span>
                    <span className="text-indigo-700">
                      {item.totalHorasMinistradas}h / {item.componente.cargaHoraria}h ({item.percentualConcluido}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div
                      className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-300"
                      style={{ width: `${item.percentualConcluido}%` }}
                    />
                  </div>
                </div>

                {/* Action button */}
                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleAbrirModalDiario(item.turma.id, item.componente.id)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Lançar Aula Nesta Turma</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* ABA 3: DIÁRIO DE CLASSE & HISTÓRICO DE MINISTRAÇÕES                   */}
      {/* ===================================================================== */}
      {abaAtiva === 'diario' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">
                Diário de Classe & Registro de Aulas Ministradas
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Histórico de conteúdos lecionados, frequência e comprovação pedagógica com auditoria.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleAbrirModalDiario()}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 transition-colors shadow-2xs shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Lançar Nova Aula no Diário</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {minhasAulasMinistradas.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-1" />
                Nenhum diário de aula lançado até o momento. Clique em "Lançar Nova Aula no Diário" para registrar.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Data & Turno</th>
                      <th className="px-3 py-3">Turma & Curso</th>
                      <th className="px-4 py-3">Componente / Disciplina</th>
                      <th className="px-3 py-3">Escola / Sala</th>
                      <th className="px-3 py-3">Carga</th>
                      <th className="px-4 py-3">Conteúdo Ministrado</th>
                      <th className="px-3 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {minhasAulasMinistradas.map((aula, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                          {aula.data}
                          <span className="block text-[10px] text-slate-400 font-normal">
                            {aula.turno} ({aula.horario})
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className="font-bold text-indigo-700 block">{aula.turmaCodigo}</span>
                          <span className="text-[10px] text-slate-500">{aula.curso}</span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {aula.componenteNome}
                        </td>
                        <td className="px-3 py-3 text-slate-600 whitespace-nowrap">
                          {aula.escola}
                          <span className="block text-[10px] text-slate-400">{aula.sala}</span>
                        </td>
                        <td className="px-3 py-3 font-bold text-slate-900 whitespace-nowrap">
                          {aula.horasMinistradas}h
                        </td>
                        <td className="px-4 py-3 text-slate-700 max-w-xs truncate">
                          {aula.conteudoMinistrado || 'Conteúdo padrão do plano de ensino.'}
                          {aula.observacoes && (
                            <span className="block text-[10px] text-slate-400 italic truncate">
                              Obs: {aula.observacoes}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            {aula.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* ABA 4: EXTRATO FINANCEIRO & CARGA HORÁRIA                             */}
      {/* ===================================================================== */}
      {abaAtiva === 'extrato' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 leading-tight">
              Extrato Individual de Carga Horária e Remuneração
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Demonstrativo transparente de horas ministradas, teto de horas contratual e valor a receber.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Valor da Hora-Aula Contratual
              </span>
              <div className="text-2xl font-black text-slate-900">
                R$ {professor.valorHora},00
              </div>
              <p className="text-[11px] text-slate-500">
                Valor bruto por hora letiva ministrada conforme tabela docente.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Horas Programadas no Mês
              </span>
              <div className="text-2xl font-black text-indigo-700">
                {metricas.horasMensaisEstimadas}h
              </div>
              <p className="text-[11px] text-slate-500">
                Total de {metricas.horasSemanais} horas por semana distribuídas na grade.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Previsão de Folha do Mês
              </span>
              <div className="text-2xl font-black text-emerald-700">
                R$ {metricas.remuneracaoMensalEstimada.toLocaleString('pt-BR')},00
              </div>
              <p className="text-[11px] text-slate-500">
                Calculado com base nas aulas direcionadas para o mês vigente.
              </p>
            </div>
          </div>

          {/* Detailed Contract Capacity Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Aproveitamento do Teto Contratual Mensal
            </h4>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-700">
                  {metricas.horasMensaisEstimadas}h alocadas de {metricas.tetoContratual}h permitidas
                </span>
                <span className="text-indigo-700">{metricas.percentualTeto}% da capacidade</span>
              </div>

              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    metricas.percentualTeto >= 95
                      ? 'bg-rose-500'
                      : metricas.percentualTeto >= 75
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${metricas.percentualTeto}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>Saldo disponível para novas atribuições: <strong>{metricas.saldoHorasLivres}h livres</strong></span>
                <span>Teto Máximo: <strong>{metricas.tetoContratual}h / mês</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* ABA 5: SOLICITAR SUBSTITUIÇÃO / COMUNICAR AUSÊNCIA                    */}
      {/* ===================================================================== */}
      {abaAtiva === 'substituicao' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs max-w-2xl mx-auto space-y-5">
          <div>
            <h3 className="text-base font-bold text-slate-900 leading-tight">
              Solicitar Substituição / Comunicar Ausência
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Caso precise se ausentar por motivo médico, viagem ou imprevisto, notifique a coordenação através deste canal oficial para acionamento do banco de substitutos.
            </p>
          </div>

          {solicitacaoEnviada ? (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-sm font-bold">Solicitação Enviada com Sucesso!</strong>
                A coordenação acadêmica foi notificada e o motor de compatibilidade do RIOS já está localizando docentes qualificados e sem choque de horário para cobrir sua aula.
              </div>
            </div>
          ) : (
            <form onSubmit={handleEnviarSolicitacaoSubstituicao} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Turma e Disciplina a ser Substituída: *
                </label>
                <select
                  required
                  value={turmaSubstituicaoId}
                  onChange={(e) => setTurmaSubstituicaoId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                >
                  <option value="">Selecione uma turma atribuída a você...</option>
                  {minhasTurmasEComponentes.map((item, idx) => (
                    <option key={idx} value={item.turma.id}>
                      {item.turma.codigo} – {item.componente.nome} ({item.turma.diaSemana} • {item.turma.turno})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Data Prevista da Ausência: *
                </label>
                <input
                  type="date"
                  required
                  value={dataSubstituicao}
                  onChange={(e) => setDataSubstituicao(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Motivo e Justificativa da Solicitação: *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Ex: Consulta médica agendada, atestado prévio, participação em banca de mestrado..."
                  value={motivoSubstituicao}
                  onChange={(e) => setMotivoSubstituicao(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {erroSubst && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{erroSubst}</span>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAbaAtiva('agenda')}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar Solicitação à Coordenação</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* ABA 6: MEU PERFIL & SEGURANÇA DE ACESSO                              */}
      {/* ===================================================================== */}
      {abaAtiva === 'perfil' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs max-w-2xl mx-auto space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white font-black text-2xl flex items-center justify-center shadow-md">
              {professor.nome
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 leading-tight">
                {professor.nome}
              </h3>
              <p className="text-xs text-slate-500">Docente Cadastrado no Sistema RIOS</p>
              <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Perfil: Docente Ativo
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-4 border-t border-slate-100">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                E-mail Institucional
              </span>
              <span className="font-semibold text-slate-800">{professor.email}</span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Telefone / WhatsApp
              </span>
              <span className="font-semibold text-slate-800">{professor.telefone}</span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Unidades / Escolas de Atuação
              </span>
              <span className="font-semibold text-slate-800">
                {professor.escolasHabituais.join(', ')}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Carga Horária Máxima Permitida
              </span>
              <span className="font-semibold text-slate-800">
                {professor.cargaHorariaMaxima} horas mensais
              </span>
            </div>
          </div>

          <div className="pt-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Disciplinas e Competências Habilitadas
            </span>
            <div className="flex flex-wrap gap-1.5">
              {professor.competencias.map((comp, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200"
                >
                  {comp}
                </span>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            {onOpenGerenciarSenhas && (
              <button
                type="button"
                onClick={onOpenGerenciarSenhas}
                className="px-4 py-2 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
                <span>Alterar Minha Senha de Acesso</span>
              </button>
            )}

            <button
              type="button"
              onClick={onLogout}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Desconectar Minha Conta</span>
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: LANÇAR AULA NO DIÁRIO DE CLASSE                                */}
      {/* ===================================================================== */}
      {modalDiarioAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xl max-w-lg w-full space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">
                    Lançar Diário de Aula Ministrada
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Docente: <strong>{professor.nome}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalDiarioAberto(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSalvarDiario} className="space-y-3.5 text-xs">
              {erroDiario && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{erroDiario}</span>
                </div>
              )}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Turma Atribuída: *
                </label>
                <select
                  required
                  value={dadosFormDiario.turmaId}
                  onChange={(e) => {
                    const novaTurmaId = e.target.value;
                    const t = turmas.find((item) => item.id === novaTurmaId);
                    const comp =
                      t?.componentes.find((c) => c.professorId === professor.id) ||
                      t?.componentes[0];
                    setDadosFormDiario((prev) => ({
                      ...prev,
                      turmaId: novaTurmaId,
                      componenteId: comp ? comp.id : '',
                    }));
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-semibold"
                >
                  {minhasTurmasUnicas.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.codigo} – {t.curso} ({t.escola} • {t.turno})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Componente / Disciplina: *
                </label>
                <select
                  required
                  value={dadosFormDiario.componenteId}
                  onChange={(e) =>
                    setDadosFormDiario((prev) => ({ ...prev, componenteId: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-semibold"
                >
                  {turmas
                    .find((t) => t.id === dadosFormDiario.turmaId)
                    ?.componentes.filter(
                      (c) => c.professorId === professor.id || !c.professorId
                    )
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome} ({c.cargaHoraria}h)
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Data da Aula: *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 10/09/2026"
                    value={dadosFormDiario.data}
                    onChange={(e) =>
                      setDadosFormDiario((prev) => ({ ...prev, data: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Horas Ministradas: *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={8}
                    value={dadosFormDiario.horas}
                    onChange={(e) =>
                      setDadosFormDiario((prev) => ({
                        ...prev,
                        horas: parseInt(e.target.value, 10) || 4,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Conteúdo Trabalhado / Tópico Ministrado: *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Ex: Teoria de feedback 360 graus, dinâmicas de equipe e resolução de estudos de caso."
                  value={dadosFormDiario.conteudo}
                  onChange={(e) =>
                    setDadosFormDiario((prev) => ({ ...prev, conteudo: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Observações Pedagógicas (Opcional):
                </label>
                <input
                  type="text"
                  placeholder="Ex: Frequência de 100% dos alunos; atividade entregue no prazo."
                  value={dadosFormDiario.observacoes}
                  onChange={(e) =>
                    setDadosFormDiario((prev) => ({ ...prev, observacoes: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-900"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalDiarioAberto(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Salvar no Diário de Classe</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

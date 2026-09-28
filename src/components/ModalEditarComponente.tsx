import React, { useState, useMemo, useEffect } from 'react';
import { ComponenteDaTurma, Professor, StatusComponente, Turma } from '../types/rios';
import {
  X,
  CheckCircle2,
  PlayCircle,
  Clock,
  UserCheck,
  Calendar,
  Save,
  FileCheck2,
  AlertTriangle,
  CalendarDays,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  Calculator,
} from 'lucide-react';
import {
  verificarConflitoProfessor,
  calcularDataFimSemFinaisDeSemana,
  extrairHorasPorDia,
} from '../utils/conflitoAgenda';

interface ModalEditarComponenteProps {
  isOpen: boolean;
  onClose: () => void;
  turma: Turma;
  componente: ComponenteDaTurma;
  professores: Professor[];
  todasTurmas?: Turma[];
  onSaveComponente: (
    turmaId: string,
    updatedComp: ComponenteDaTurma,
    registrarAuditoria?: boolean
  ) => void;
}

export const ModalEditarComponente: React.FC<ModalEditarComponenteProps> = ({
  isOpen,
  onClose,
  turma,
  componente,
  professores,
  todasTurmas = [],
  onSaveComponente,
}) => {
  if (!isOpen) return null;

  const horasPorDiaTurma = useMemo(() => extrairHorasPorDia(turma.horario), [turma.horario]);

  const [nome, setNome] = useState<string>(componente.nome);
  const [cargaHoraria, setCargaHoraria] = useState<number>(componente.cargaHoraria);
  const [status, setStatus] = useState<StatusComponente>(componente.status);
  const [professorId, setProfessorId] = useState<string>(
    componente.professorId || ''
  );
  const [dataInicio, setDataInicio] = useState<string>(
    componente.dataInicio || new Date().toLocaleDateString('pt-BR')
  );

  const [horasPorDia, setHorasPorDia] = useState<number>(horasPorDiaTurma || 4);
  const [autoCalcularFim, setAutoCalcularFim] = useState<boolean>(true);
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);

  // Inicializa dataFim: se já existir mantém, caso contrário calcula automaticamente pelas horas sem fins de semana
  const [dataFim, setDataFim] = useState<string>(() => {
    if (componente.dataFim && componente.dataFim.trim()) {
      return componente.dataFim;
    }
    const inicio = componente.dataInicio || new Date().toLocaleDateString('pt-BR');
    return calcularDataFimSemFinaisDeSemana(inicio, componente.cargaHoraria, horasPorDiaTurma || 4);
  });

  const [dataConclusao, setDataConclusao] = useState<string>(
    componente.dataConclusao || new Date().toLocaleDateString('pt-BR')
  );
  const [ignorarConflito, setIgnorarConflito] = useState<boolean>(false);
  const [registrarAuditoria, setRegistrarAuditoria] = useState<boolean>(
    componente.status !== 'CONCLUÍDO'
  );

  // Dias úteis necessários calculados
  const diasUteisNecessarios = useMemo(() => {
    const h = Math.max(1, Number(cargaHoraria) || 0);
    const hd = Math.max(1, Number(horasPorDia) || 4);
    return Math.ceil(h / hd);
  }, [cargaHoraria, horasPorDia]);

  // Função para recalcular a data final
  const recalcularDataFim = (
    inicioStr: string = dataInicio,
    carga: number = cargaHoraria,
    hDia: number = horasPorDia
  ) => {
    const fimCalculado = calcularDataFimSemFinaisDeSemana(inicioStr, carga, hDia);
    if (fimCalculado) {
      setDataFim(fimCalculado);
    }
  };

  // Se o componente abriu sem data final definida, calcula automaticamente
  useEffect(() => {
    if (!dataFim && dataInicio && cargaHoraria > 0) {
      recalcularDataFim(dataInicio, cargaHoraria, horasPorDia);
    }
  }, []);

  const handleCargaHorariaChange = (novaCarga: number) => {
    setCargaHoraria(novaCarga);
    if (autoCalcularFim && dataInicio) {
      recalcularDataFim(dataInicio, novaCarga, horasPorDia);
    }
  };

  const handleDataInicioChange = (novoInicio: string) => {
    setDataInicio(novoInicio);
    if (autoCalcularFim && novoInicio) {
      recalcularDataFim(novoInicio, cargaHoraria, horasPorDia);
    }
  };

  const handleHorasPorDiaChange = (novasHoras: number) => {
    setHorasPorDia(novasHoras);
    if (autoCalcularFim && dataInicio) {
      recalcularDataFim(dataInicio, cargaHoraria, novasHoras);
    }
  };

  // Verificação de conflito em tempo real
  const conflitoAtual = useMemo(() => {
    if (!professorId) return null;
    const prof = professores.find((p) => p.id === professorId);
    const resultado = verificarConflitoProfessor({
      professorId,
      professorNome: prof?.nome,
      dataInicio,
      dataFim: dataFim || (status === 'CONCLUÍDO' ? dataConclusao : undefined),
      diaSemanaTurma: turma.diaSemana,
      turnoTurma: turma.turno,
      horarioTurma: turma.horario,
      turmaIdAtual: turma.id,
      componenteIdAtual: componente.id,
      todasTurmas,
    });
    return resultado.temConflito ? resultado : null;
  }, [
    professorId,
    dataInicio,
    dataFim,
    dataConclusao,
    status,
    turma,
    componente.id,
    professores,
    todasTurmas,
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErroValidacao(null);

    if (conflitoAtual && conflitoAtual.tipo === 'CHOQUE_DIRETO' && !ignorarConflito) {
      setErroValidacao(
        `ATENÇÃO: Não é possível salvar sem confirmação devido a um conflito direto de agenda do docente. Marque a caixa de ciência abaixo no alerta de conflito para forçar a alocação planejada.`
      );
      return;
    }

    const prof = professores.find((p) => p.id === professorId);

    const updatedComp: ComponenteDaTurma = {
      ...componente,
      nome: nome.trim(),
      cargaHoraria: Number(cargaHoraria) || 40,
      status,
      professorId: prof ? prof.id : undefined,
      professorNome: prof ? prof.nome : undefined,
      dataInicio: dataInicio.trim() ? dataInicio.trim() : undefined,
      dataFim: dataFim.trim() ? dataFim.trim() : undefined,
      dataConclusao: status === 'CONCLUÍDO' ? dataConclusao : undefined,
      escolaConclusao: status === 'CONCLUÍDO' ? turma.escola : undefined,
      salaConclusao: status === 'CONCLUÍDO' ? turma.sala : undefined,
    };

    onSaveComponente(
      turma.id,
      updatedComp,
      status === 'CONCLUÍDO' && registrarAuditoria
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div>
            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              Turma {turma.codigo} — {turma.curso}
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-1">
              Editar Componente & Datas da Ementa
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
          {erroValidacao && (
            <div className="p-3.5 bg-rose-50 border border-rose-300 text-rose-800 rounded-xl font-medium flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{erroValidacao}</span>
            </div>
          )}

          {/* Alerta de Conflito de Horário do Professor */}
          {conflitoAtual && (
            <div
              className={`p-4 rounded-xl border animate-in slide-in-from-top-2 duration-200 ${
                conflitoAtual.tipo === 'CHOQUE_DIRETO'
                  ? 'bg-rose-50/90 border-rose-300 text-rose-950'
                  : 'bg-amber-50/90 border-amber-300 text-amber-950'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <ShieldAlert
                  className={`w-5 h-5 shrink-0 mt-0.5 ${
                    conflitoAtual.tipo === 'CHOQUE_DIRETO'
                      ? 'text-rose-600'
                      : 'text-amber-600'
                  }`}
                />
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs">
                      {conflitoAtual.tipo === 'CHOQUE_DIRETO'
                        ? '🚨 ALERTA CRÍTICO: PROFESSOR JÁ ALOCADO NESTA DATA!'
                        : '⚠️ AVISO DE LOGÍSTICA: OUTRO TURNO NO MESMO DIA'}
                    </h4>
                    <span
                      className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                        conflitoAtual.tipo === 'CHOQUE_DIRETO'
                          ? 'bg-rose-200 text-rose-900'
                          : 'bg-amber-200 text-amber-900'
                      }`}
                    >
                      {conflitoAtual.tipo === 'CHOQUE_DIRETO' ? 'Choque Direto' : 'Turno Distinto'}
                    </span>
                  </div>

                  <p className="text-[11px] leading-relaxed">
                    {conflitoAtual.mensagem}
                  </p>

                  {conflitoAtual.detalhes && (
                    <div className="mt-2 p-2 rounded-lg bg-white/80 border border-slate-200 text-[11px] space-y-1 text-slate-800">
                      <div>
                        <strong>Turma Conflitante:</strong>{' '}
                        <span className="font-bold text-indigo-700">
                          {conflitoAtual.detalhes.turmaCodigo}
                        </span>{' '}
                        ({conflitoAtual.detalhes.turmaCurso})
                      </div>
                      <div>
                        <strong>Local & Horário:</strong>{' '}
                        {conflitoAtual.detalhes.escola} ({conflitoAtual.detalhes.sala}) —{' '}
                        <span className="font-semibold text-rose-700">
                          {conflitoAtual.detalhes.diaSemana}, {conflitoAtual.detalhes.turno} (
                          {conflitoAtual.detalhes.horario})
                        </span>
                      </div>
                      <div>
                        <strong>Componente:</strong> {conflitoAtual.detalhes.componenteNome}
                      </div>
                      {conflitoAtual.detalhes.dataInicio && (
                        <div>
                          <strong>Período:</strong> {conflitoAtual.detalhes.dataInicio}
                          {conflitoAtual.detalhes.dataFim
                            ? ` até ${conflitoAtual.detalhes.dataFim}`
                            : ''}
                        </div>
                      )}
                    </div>
                  )}

                  {conflitoAtual.tipo === 'CHOQUE_DIRETO' && (
                    <label className="flex items-center gap-2 pt-1.5 cursor-pointer font-bold text-rose-900">
                      <input
                        type="checkbox"
                        checked={ignorarConflito}
                        onChange={(e) => setIgnorarConflito(e.target.checked)}
                        className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                      />
                      <span className="text-[11px]">
                        Estou ciente da sobreposição de escala e confirmo a alteração
                      </span>
                    </label>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Nome da Unidade */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Nome da Unidade Curricular / Componente *
            </label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-900"
            />
          </div>

          {/* Carga Horária e Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-700">
                  Carga Horária (Horas) *
                </label>
                {autoCalcularFim && (
                  <span className="text-[10px] text-indigo-600 font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Auto-data fim
                  </span>
                )}
              </div>
              <input
                type="number"
                required
                min="1"
                max="400"
                value={cargaHoraria}
                onChange={(e) => handleCargaHorariaChange(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Status da Etapa *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusComponente)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold bg-white"
              >
                <option value="A MINISTRAR">A MINISTRAR</option>
                <option value="EM ANDAMENTO">EM ANDAMENTO</option>
                <option value="CONCLUÍDO">CONCLUÍDO</option>
              </select>
            </div>
          </div>

          {/* Professor que Ministrou / Ministra */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-bold text-slate-700">
                {status === 'CONCLUÍDO'
                  ? 'Professor que MINISTROU o Componente *'
                  : 'Professor Responsável / em Aula'}
              </label>
              {conflitoAtual && (
                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                  ⚠️ Conflito Detectado
                </span>
              )}
            </div>
            <select
              value={professorId}
              onChange={(e) => {
                setProfessorId(e.target.value);
                setIgnorarConflito(false);
              }}
              className={`w-full px-3 py-2 text-sm rounded-lg border bg-white font-medium text-slate-900 transition-colors ${
                conflitoAtual?.tipo === 'CHOQUE_DIRETO'
                  ? 'border-rose-400 ring-1 ring-rose-300'
                  : 'border-slate-300'
              }`}
            >
              <option value="">-- Docente a definir --</option>
              {professores.map((p) => {
                // Checagem prévia rápida se o professor possui conflito neste componente
                const temConflitoPrevio = verificarConflitoProfessor({
                  professorId: p.id,
                  professorNome: p.nome,
                  dataInicio,
                  dataFim: dataFim || dataConclusao,
                  diaSemanaTurma: turma.diaSemana,
                  turnoTurma: turma.turno,
                  horarioTurma: turma.horario,
                  turmaIdAtual: turma.id,
                  componenteIdAtual: componente.id,
                  todasTurmas,
                });

                return (
                  <option key={p.id} value={p.id}>
                    {temConflitoPrevio.temConflito
                      ? `⚠️ [CONFLITO] ${p.nome}`
                      : p.nome}{' '}
                    (R$ {p.valorHora}/h — Limite: {p.cargaHorariaMaxima}h)
                  </option>
                );
              })}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              O sistema verifica automaticamente se o docente já está alocado em outra turma no mesmo dia/turno no período.
            </p>
          </div>

          {/* O PRINCIPAL: DATA INÍCIO E DATA FIM COM CÁLCULO AUTOMÁTICO SEM FINAIS DE SEMANA */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                <CalendarDays className="w-4 h-4 text-indigo-600" />
                <span>Período Oficial do Componente (Principal)</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                Não conta fins de semana
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1 text-xs">
                  Data de Início *
                </label>
                <input
                  type="text"
                  placeholder="DD/MM/AAAA"
                  value={dataInicio}
                  onChange={(e) => handleDataInicioChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700 text-xs">
                    Data de Fim / Previsão *
                  </label>
                  <button
                    type="button"
                    onClick={() => recalcularDataFim()}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    title="Recalcular data de término com base nas horas ministradas sem finais de semana"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Recalcular</span>
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="DD/MM/AAAA"
                  value={dataFim}
                  onChange={(e) => {
                    setDataFim(e.target.value);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-indigo-300 font-bold text-indigo-950 bg-indigo-50/40 text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Painel Informativo do Cálculo Automático sem Finais de Semana */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-1.5 text-slate-700">
                  <Calculator className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>
                    <strong>{cargaHoraria} horas</strong> ministradas ÷{' '}
                    <span className="font-bold text-indigo-700">{horasPorDia}h/dia</span> ={' '}
                    <strong className="text-emerald-700">{diasUteisNecessarios} dias úteis</strong> de aula
                  </span>
                </div>

                {/* Seletor rápido de horas por dia */}
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 text-[10px]">Horas/dia:</span>
                  {[4, 2, 5, 8].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => handleHorasPorDiaChange(h)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                        horasPorDia === h
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {h}h
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10.5px]">
                <label className="flex items-center gap-1.5 text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoCalcularFim}
                    onChange={(e) => setAutoCalcularFim(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                  />
                  <span>Recalcular término automaticamente ao mudar início ou horas</span>
                </label>
                <span className="text-slate-400">Sábados e domingos desconsiderados</span>
              </div>
            </div>

            {status === 'CONCLUÍDO' && (
              <div className="pt-2 border-t border-slate-200">
                <label className="block font-bold text-emerald-800 mb-1 text-xs">
                  Data Efetiva de Conclusão *
                </label>
                <input
                  type="text"
                  placeholder="DD/MM/AAAA"
                  value={dataConclusao}
                  onChange={(e) => setDataConclusao(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50/50 font-bold text-emerald-950 text-xs"
                />
              </div>
            )}
          </div>

          {/* Opção de Auditoria ao Concluir */}
          {status === 'CONCLUÍDO' && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-emerald-900">
                <input
                  type="checkbox"
                  checked={registrarAuditoria}
                  onChange={(e) => setRegistrarAuditoria(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span>Lançar no Histórico de Aulas Ministradas</span>
              </label>
              <p className="text-[10px] text-emerald-700 leading-tight">
                Registra a conclusão do componente de {cargaHoraria}h pelo(a) docente no histórico de auditoria acadêmica.
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              id="btn-confirmar-edicao-componente"
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Alterações</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

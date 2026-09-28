import React, { useState, useMemo } from 'react';
import {
  Turma,
  ComponenteDaTurma,
  Professor,
  CompatibilidadeSubstituto,
} from '../types/rios';
import { calcularCompatibilidadeSubstitutos } from '../services/riosEngine';
import {
  X,
  Lock,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  School,
  Building,
  Clock,
  BookOpen,
  Calendar,
  Sparkles,
  CalendarDays,
  ShieldAlert,
} from 'lucide-react';
import { verificarConflitoProfessor } from '../utils/conflitoAgenda';

interface ModalSubstituicaoProps {
  isOpen: boolean;
  onClose: () => void;
  turma: Turma | null;
  componente: ComponenteDaTurma | null;
  professores: Professor[];
  todasTurmas: Turma[];
  onConfirmarSubstituicao: (
    turmaId: string,
    componenteId: string,
    novoProfessor: Professor,
    motivo: string
  ) => void;
}

export const ModalSubstituicao: React.FC<ModalSubstituicaoProps> = ({
  isOpen,
  onClose,
  turma,
  componente,
  professores,
  todasTurmas,
  onConfirmarSubstituicao,
}) => {
  const [selectedProfId, setSelectedProfId] = useState<string>('');
  const [motivo, setMotivo] = useState<string>('Remanejamento operacional de escala');
  const [ignorarConflito, setIgnorarConflito] = useState<boolean>(false);
  const [erro, setErro] = useState<string>('');

  if (!isOpen || !turma || !componente) return null;

  const candidatos: CompatibilidadeSubstituto[] = calcularCompatibilidadeSubstitutos(
    turma,
    componente,
    professores,
    todasTurmas
  );

  const professorEscolhido = candidatos.find((c) => c.professor.id === selectedProfId);

  // Conflito do professor escolhido no período do componente
  const conflitoEscolhido = useMemo(() => {
    if (!selectedProfId || !professorEscolhido) return null;
    const resultado = verificarConflitoProfessor({
      professorId: selectedProfId,
      professorNome: professorEscolhido.professor.nome,
      dataInicio: componente.dataInicio,
      dataFim: componente.dataFim,
      diaSemanaTurma: turma.diaSemana,
      turnoTurma: turma.turno,
      horarioTurma: turma.horario,
      turmaIdAtual: turma.id,
      componenteIdAtual: componente.id,
      todasTurmas,
    });
    return resultado.temConflito ? resultado : null;
  }, [selectedProfId, professorEscolhido, componente, turma, todasTurmas]);

  const handleConfirmar = () => {
    if (!selectedProfId || !professorEscolhido) {
      setErro('Por favor, selecione um professor substituto da lista.');
      return;
    }

    if (conflitoEscolhido && conflitoEscolhido.tipo === 'CHOQUE_DIRETO' && !ignorarConflito) {
      setErro(
        `CONFLITO CRÍTICO: O docente ${professorEscolhido.professor.nome} já possui aula na Turma ${conflitoEscolhido.detalhes?.turmaCodigo} neste mesmo dia e horário. Confirme o termo de ciência abaixo para prosseguir.`
      );
      return;
    }

    if (!motivo.trim()) {
      setErro('Informe o motivo da substituição para registro de auditoria.');
      return;
    }

    onConfirmarSubstituicao(turma.id, componente.id, professorEscolhido.professor, motivo);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Substituição de Professor</h2>
              <p className="text-xs text-slate-300">
                Alocação assistida por IA respeitando a imutabilidade da estrutura física e acadêmica.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Immutability Banner */}
          <div className="bg-slate-100 rounded-xl p-4 border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span>ESTRUTURA FIXA (IMUTÁVEL NO PROCESSO DE SUBSTITUIÇÃO)</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-medium">Turma / Curso:</span>
                <span className="font-bold text-slate-900">{turma.codigo}</span>
                <span className="text-[10px] text-slate-500 block truncate">{turma.curso}</span>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-medium">Escola & Sala:</span>
                <span className="font-bold text-slate-900">{turma.escola}</span>
                <span className="text-[10px] text-slate-600 block">{turma.sala}</span>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-medium">Dia & Horário:</span>
                <span className="font-bold text-slate-900">{turma.horario}</span>
                <span className="text-[10px] text-slate-600 block">{turma.diaSemana} ({turma.turno})</span>
              </div>
            </div>

            {/* Período Oficial do Componente */}
            <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-[10px] font-semibold text-indigo-700 uppercase block">Componente a ser assumido:</span>
                <span className="font-bold text-slate-900 text-sm">{componente.nome}</span>
                <span className="text-slate-500 ml-2 font-medium">({componente.cargaHoraria} horas)</span>
                
                <div className="mt-1 flex items-center gap-1 text-[11px] text-indigo-900 font-bold">
                  <CalendarDays className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Período: {componente.dataInicio || 'Início a definir'} ➔ {componente.dataFim || 'Fim a definir'}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Docente Atual:</span>
                <span className="font-bold text-rose-700">{componente.professorNome || 'Não alocado'}</span>
              </div>
            </div>
          </div>

          {/* Ranking of Substitutes */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Docentes Candidatos Ranqueados por Compatibilidade:</span>
              </label>
              <span className="text-[11px] text-slate-500">
                {candidatos.length} professores avaliados
              </span>
            </div>

            <div className="space-y-2">
              {candidatos.map((item) => {
                const isSelected = selectedProfId === item.professor.id;
                const isRecommended = item.score >= 80;

                // Verificação de conflito para este candidato específico
                const conflitoCandidato = verificarConflitoProfessor({
                  professorId: item.professor.id,
                  professorNome: item.professor.nome,
                  dataInicio: componente.dataInicio,
                  dataFim: componente.dataFim,
                  diaSemanaTurma: turma.diaSemana,
                  turnoTurma: turma.turno,
                  horarioTurma: turma.horario,
                  turmaIdAtual: turma.id,
                  componenteIdAtual: componente.id,
                  todasTurmas,
                });

                return (
                  <div
                    key={item.professor.id}
                    onClick={() => {
                      setSelectedProfId(item.professor.id);
                      setErro('');
                    }}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? conflitoCandidato.temConflito && conflitoCandidato.tipo === 'CHOQUE_DIRETO'
                          ? 'border-rose-500 bg-rose-50/60 ring-2 ring-rose-500/20'
                          : 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="substituto"
                          checked={isSelected}
                          onChange={() => {
                            setSelectedProfId(item.professor.id);
                            setErro('');
                          }}
                          className="mt-1 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-slate-900">
                              {item.professor.nome}
                            </span>
                            {isRecommended && !conflitoCandidato.temConflito && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                Altamente Recomendado
                              </span>
                            )}
                            {conflitoCandidato.temConflito && (
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                  conflitoCandidato.tipo === 'CHOQUE_DIRETO'
                                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                                }`}
                              >
                                <AlertTriangle className="w-3 h-3" />
                                {conflitoCandidato.tipo === 'CHOQUE_DIRETO'
                                  ? '⚠️ Choque de Agenda'
                                  : '⚠️ Outro Turno no Dia'}
                              </span>
                            )}
                          </div>
                          
                          <p className="text-xs text-slate-600 mt-1">{item.justificativa}</p>

                          {conflitoCandidato.temConflito && (
                            <p className="text-[11px] font-medium text-rose-700 bg-rose-50/80 p-1.5 rounded mt-1.5 border border-rose-200">
                              {conflitoCandidato.mensagem}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-slate-500">
                            <span>Valor/Hora: R$ {item.professor.valorHora},00</span>
                            <span>•</span>
                            <span>Carga Máx: {item.professor.cargaHorariaMaxima}h</span>
                          </div>
                        </div>
                      </div>

                      {/* Compatibility Badge */}
                      <div className="text-right shrink-0">
                        <div
                          className={`text-sm font-black px-2.5 py-1 rounded-lg border ${
                            conflitoCandidato.temConflito && conflitoCandidato.tipo === 'CHOQUE_DIRETO'
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : item.score >= 85
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : item.score >= 60
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {conflitoCandidato.temConflito && conflitoCandidato.tipo === 'CHOQUE_DIRETO'
                            ? 'CONFLITO'
                            : `${item.score}%`}
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Compatibilidade</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Alerta de conflito se o professor selecionado tem choque direto */}
          {conflitoEscolhido && (
            <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl space-y-2 text-xs">
              <div className="flex items-start gap-2 text-rose-950 font-bold">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>ALERTA DE CONFLITO DE HORÁRIO</span>
              </div>
              <p className="text-rose-800 text-[11px] leading-relaxed">
                {conflitoEscolhido.mensagem}
              </p>
              {conflitoEscolhido.tipo === 'CHOQUE_DIRETO' && (
                <label className="flex items-center gap-2 pt-1 font-bold text-rose-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ignorarConflito}
                    onChange={(e) => setIgnorarConflito(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                  />
                  <span className="text-[11px]">
                    Estou ciente da sobreposição de turma e confirmo a substituição mesmo assim
                  </span>
                </label>
              )}
            </div>
          )}

          {/* Justification / Reason */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800">
              Motivo da Substituição (Obrigatório para Auditoria):
            </label>
            <textarea
              id="input-motivo-substituicao"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={2}
              className="w-full text-xs p-3 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-slate-900 bg-slate-50"
              placeholder="Ex: Licença médica, permuta autorizada, ajuste operacional..."
            />
          </div>

          {erro && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{erro}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Estrutura física e horários mantidos integralmente.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              id="btn-confirmar-substituicao-modal"
              onClick={handleConfirmar}
              className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-xs flex items-center gap-2"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Confirmar Substituição</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

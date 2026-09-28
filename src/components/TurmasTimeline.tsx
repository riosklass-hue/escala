import React, { useState } from 'react';
import { Turma, ComponenteDaTurma, Professor } from '../types/rios';
import { calcularMetricasTurma } from '../services/riosEngine';
import {
  CheckCircle2,
  PlayCircle,
  Clock,
  ArrowRightLeft,
  Calendar,
  School,
  Building,
  GraduationCap,
  ChevronRight,
  ShieldAlert,
  Plus,
  Edit,
  UserCheck,
  CalendarDays,
  AlertTriangle,
} from 'lucide-react';
import { verificarConflitoProfessor } from '../utils/conflitoAgenda';

interface TurmasTimelineProps {
  turmas: Turma[];
  professores: Professor[];
  onOpenSubstituicao: (turma: Turma, componente: ComponenteDaTurma) => void;
  onConcluirComponente: (turmaId: string, compId: string) => void;
  onOpenCadastrarTurma?: () => void;
  onOpenEditarTurma?: (turma: Turma) => void;
  onOpenEditarComponente?: (turma: Turma, componente: ComponenteDaTurma) => void;
}

export const TurmasTimeline: React.FC<TurmasTimelineProps> = ({
  turmas,
  professores,
  onOpenSubstituicao,
  onConcluirComponente,
  onOpenCadastrarTurma,
  onOpenEditarTurma,
  onOpenEditarComponente,
}) => {
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>(turmas[0]?.id || '');


  const turmaAtual = turmas.find((t) => t.id === selectedTurmaId) || turmas[0];
  const metricas = turmaAtual ? calcularMetricasTurma(turmaAtual) : null;

  return (
    <div className="space-y-6">
      {/* Golden Rule Notice */}
      <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
        <div className="text-xs text-amber-900 leading-relaxed">
          <strong className="font-bold text-amber-950">REGRA DE IMUTABILIDADE DA ESTRUTURA: </strong>
          A matriz curricular, sequência de componentes, escola, sala, turno e horários da turma são{' '}
          <strong>ESTRUTURA FIXA</strong>. Substituições de docentes ou conclusões de módulos não alteram o local nem a turma.
        </div>
      </div>

      {/* Turmas Tab Selector & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar flex-1">
          {turmas.map((t) => {
            const isSelected = t.id === turmaAtual?.id;
            const m = calcularMetricasTurma(t);
            return (
              <button
                key={t.id}
                id={`tab-turma-${t.codigo.toLowerCase()}`}
                onClick={() => setSelectedTurmaId(t.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left min-w-[210px] ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
                    isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  {t.codigo}
                </div>
                <div className="overflow-hidden">
                  <div className="font-bold text-xs truncate">{t.codigo} — {t.curso}</div>
                  <div className={`text-[11px] truncate mt-0.5 ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>
                    {m.percentualConcluido}% concluído ({m.cargaMinistrada}h de {m.cargaTotal}h)
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Buttons to Create or Edit Turma */}
        <div className="flex items-center gap-2 shrink-0">
          {turmaAtual && onOpenEditarTurma && (
            <button
              id="btn-timeline-editar-turma"
              onClick={() => onOpenEditarTurma(turmaAtual)}
              className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
              title="Editar estrutura fixa e ementa completa desta turma"
            >
              <Edit className="w-3.5 h-3.5 text-slate-500" />
              <span>Editar Turma & Ementa</span>
            </button>
          )}

          {onOpenCadastrarTurma && (
            <button
              id="btn-timeline-nova-turma"
              onClick={onOpenCadastrarTurma}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nova Turma</span>
            </button>
          )}
        </div>
      </div>

      {turmaAtual && metricas && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Turma Details & Fixed Structure Card */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    {turmaAtual.codigo}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-1">{turmaAtual.curso}</h3>
                </div>
              </div>

              {/* Fixed Structure Details */}
              <div className="space-y-2.5 text-xs">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Estrutura Fixa Imutável:
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <School className="w-3.5 h-3.5 text-slate-400" /> Escola:
                  </span>
                  <span className="font-bold text-slate-900">{turmaAtual.escola}</span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-slate-400" /> Sala de Aula:
                  </span>
                  <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                    {turmaAtual.sala}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> Dia e Turno:
                  </span>
                  <span className="font-bold text-slate-900">
                    {turmaAtual.diaSemana} ({turmaAtual.turno})
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" /> Horário Fixo:
                  </span>
                  <span className="font-bold text-slate-900">{turmaAtual.horario}</span>
                </div>
              </div>

              {/* Progress Summary */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Progresso Geral</span>
                  <span className="font-bold text-blue-600">{metricas.percentualConcluido}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                  <div
                    className="bg-emerald-500 h-full transition-all"
                    style={{
                      width: `${(metricas.cargaMinistrada / metricas.cargaTotal) * 100}%`,
                    }}
                    title={`Concluído: ${metricas.cargaMinistrada}h`}
                  ></div>
                  <div
                    className="bg-amber-500 h-full transition-all"
                    style={{
                      width: `${(metricas.cargaEmAndamento / metricas.cargaTotal) * 100}%`,
                    }}
                    title={`Em Andamento: ${metricas.cargaEmAndamento}h`}
                  ></div>
                  <div
                    className="bg-slate-200 h-full transition-all"
                    style={{
                      width: `${(metricas.cargaPendente / metricas.cargaTotal) * 100}%`,
                    }}
                    title={`Pendente: ${metricas.cargaPendente}h`}
                  ></div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-2">
                  <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                    <div className="text-[10px] text-emerald-700 font-medium">Concluído</div>
                    <div className="text-xs font-bold text-emerald-900">{metricas.cargaMinistrada}h</div>
                  </div>
                  <div className="bg-amber-50 p-2 rounded-lg border border-amber-100">
                    <div className="text-[10px] text-amber-700 font-medium">Em Andamento</div>
                    <div className="text-xs font-bold text-amber-900">{metricas.cargaEmAndamento}h</div>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <div className="text-[10px] text-slate-600 font-medium">A Ministrar</div>
                    <div className="text-xs font-bold text-slate-800">{metricas.cargaPendente}h</div>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs mt-3">
                  <span className="text-slate-500 text-[11px] block">Próximo Componente Previsto:</span>
                  <span className="font-bold text-slate-800 block mt-0.5">{metricas.proximoComponente}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Academic Timeline & Components List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Linha do Tempo dos Componentes Curriculares
                  </h3>
                  <p className="text-xs text-slate-500">
                    Acompanhamento de status, carga horária e docente alocado.
                  </p>
                </div>
              </div>

              {/* Timeline Items */}
              <div className="space-y-3 relative before:absolute before:inset-0 before:left-5 before:w-0.5 before:bg-slate-200">
                {turmaAtual.componentes.map((comp, index) => {
                  const isConcluido = comp.status === 'CONCLUÍDO';
                  const isEmAndamento = comp.status === 'EM ANDAMENTO';
                  const isPendente = comp.status === 'A MINISTRAR';

                  return (
                    <div
                      key={comp.id}
                      className={`relative flex items-start gap-4 p-4 rounded-xl border transition-all ${
                        isEmAndamento
                          ? 'bg-amber-50/60 border-amber-300 ring-1 ring-amber-200'
                          : isConcluido
                          ? 'bg-slate-50/80 border-slate-200 opacity-95'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      {/* Status Icon */}
                      <div className="relative z-10 shrink-0 mt-0.5">
                        {isConcluido && (
                          <div className="w-8 h-8 rounded-full bg-emerald-100 border-2 border-emerald-500 flex items-center justify-center text-emerald-600">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        )}
                        {isEmAndamento && (
                          <div className="w-8 h-8 rounded-full bg-amber-100 border-2 border-amber-500 flex items-center justify-center text-amber-600 animate-pulse">
                            <PlayCircle className="w-4 h-4" />
                          </div>
                        )}
                        {isPendente && (
                          <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-slate-300 flex items-center justify-center text-slate-400">
                            <Clock className="w-4 h-4" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-slate-400">
                              #{String(index + 1).padStart(2, '0')}
                            </span>
                            <h4 className="text-sm font-bold text-slate-900">{comp.nome}</h4>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              {comp.cargaHoraria} horas
                            </span>
                          </div>

                          {/* Status Badge */}
                          <div>
                            {isConcluido && (
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                CONCLUÍDO
                              </span>
                            )}
                            {isEmAndamento && (
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                                EM ANDAMENTO
                              </span>
                            )}
                            {isPendente && (
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                A MINISTRAR
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Bloco Principal: Período Oficial (Data de Início e Data de Fim) */}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50/80 border border-indigo-200 text-indigo-950 text-xs font-semibold shadow-2xs">
                            <CalendarDays className="w-3.5 h-3.5 text-indigo-600" />
                            <span className="text-[10px] text-indigo-700 font-extrabold uppercase tracking-wider">Período:</span>
                            <span className="font-bold text-slate-900">
                              {comp.dataInicio ? `Início: ${comp.dataInicio}` : 'Início a definir'}
                            </span>
                            <span className="text-indigo-400 font-bold">➔</span>
                            <span className="font-bold text-slate-900">
                              {comp.dataFim
                                ? `Fim: ${comp.dataFim}`
                                : comp.dataConclusao
                                ? `Fim: ${comp.dataConclusao}`
                                : 'Previsão de Fim a definir'}
                            </span>
                          </div>

                          {comp.dataConclusao && (
                            <span className="text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Concluído em: {comp.dataConclusao}
                            </span>
                          )}
                        </div>

                        {/* Alerta de Conflito de Agenda do Professor (se houver) */}
                        {(() => {
                          const conflitoDocente = comp.professorId
                            ? verificarConflitoProfessor({
                                professorId: comp.professorId,
                                professorNome: comp.professorNome,
                                dataInicio: comp.dataInicio,
                                dataFim: comp.dataFim || comp.dataConclusao,
                                diaSemanaTurma: turmaAtual.diaSemana,
                                turnoTurma: turmaAtual.turno,
                                horarioTurma: turmaAtual.horario,
                                turmaIdAtual: turmaAtual.id,
                                componenteIdAtual: comp.id,
                                todasTurmas: turmas,
                              })
                            : null;

                          if (!conflitoDocente || !conflitoDocente.temConflito) return null;

                          return (
                            <div
                              className={`mt-2 p-2.5 rounded-lg border text-xs flex items-start gap-2 animate-in fade-in duration-150 ${
                                conflitoDocente.tipo === 'CHOQUE_DIRETO'
                                  ? 'bg-rose-50 border-rose-300 text-rose-950'
                                  : 'bg-amber-50 border-amber-300 text-amber-950'
                              }`}
                            >
                              <AlertTriangle
                                className={`w-4 h-4 shrink-0 mt-0.5 ${
                                  conflitoDocente.tipo === 'CHOQUE_DIRETO'
                                    ? 'text-rose-600 animate-pulse'
                                    : 'text-amber-600'
                                }`}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-extrabold text-[11px] uppercase tracking-wide">
                                    {conflitoDocente.tipo === 'CHOQUE_DIRETO'
                                      ? '🚨 Choque de Agenda: Docente Já Alocado em Outra Turma!'
                                      : '⚠️ Atenção de Logística: Outro Turno no Mesmo Dia'}
                                  </span>
                                  <span
                                    className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                                      conflitoDocente.tipo === 'CHOQUE_DIRETO'
                                        ? 'bg-rose-200 text-rose-900'
                                        : 'bg-amber-200 text-amber-900'
                                    }`}
                                  >
                                    {conflitoDocente.tipo === 'CHOQUE_DIRETO'
                                      ? 'Conflito Crítico'
                                      : 'Deslocamento'}
                                  </span>
                                </div>
                                <p className="text-[11px] leading-relaxed mt-0.5">
                                  {conflitoDocente.mensagem}
                                </p>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Teacher and Execution info */}
                        <div className="mt-2.5 pt-2.5 border-t border-slate-100/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                          <div>
                            {isConcluido ? (
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  Ministrado por:
                                </span>
                                <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                                  {comp.professorNome || 'Docente Concluinte'}
                                </span>
                                {comp.dataConclusao && (
                                  <span className="text-slate-500 text-[11px]">
                                    (Concluído em {comp.dataConclusao})
                                  </span>
                                )}
                              </div>
                            ) : comp.professorNome ? (
                              <div className="flex items-center gap-2">
                                <span className="text-slate-500 font-semibold">Professor(a):</span>
                                <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                  {comp.professorNome}
                                </span>
                                {isEmAndamento && comp.dataInicio && (
                                  <span className="text-slate-500 text-[11px]">
                                    (Iniciado em {comp.dataInicio})
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="text-slate-400 italic">
                                Docente ainda não vinculado (a definir na etapa de início)
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2">
                            {isEmAndamento && (
                              <>
                                <button
                                  id={`btn-timeline-substituir-${comp.id}`}
                                  onClick={() => onOpenSubstituicao(turmaAtual, comp)}
                                  className="px-2.5 py-1 rounded bg-amber-600 text-white hover:bg-amber-700 font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-xs"
                                >
                                  <ArrowRightLeft className="w-3.5 h-3.5" />
                                  <span>Substituir Professor</span>
                                </button>
                                <button
                                  id={`btn-concluir-${comp.id}`}
                                  onClick={() => onConcluirComponente(turmaAtual.id, comp.id)}
                                  className="px-2.5 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 font-semibold text-xs transition-colors flex items-center gap-1 shadow-xs"
                                  title="Marcar componente como ministrado e avançar a matriz"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Concluir Componente</span>
                                </button>
                              </>
                            )}

                            {onOpenEditarComponente && (
                              <button
                                id={`btn-timeline-editar-${comp.id}`}
                                onClick={() => onOpenEditarComponente(turmaAtual, comp)}
                                className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors flex items-center gap-1 shadow-2xs"
                                title="Editar nome, carga horária, status ou docente que ministrou"
                              >
                                <Edit className="w-3 h-3 text-slate-500" />
                                <span>Editar</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

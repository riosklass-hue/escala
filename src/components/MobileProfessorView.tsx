import React, { useState } from 'react';
import { Professor, Turma, Turno, DiaSemana } from '../types/rios';
import { obterStatusDocenteNoTurno } from '../services/riosEngine';
import {
  Smartphone,
  X,
  Calendar,
  Clock,
  School,
  Building,
  CheckCircle2,
  PlayCircle,
  Bell,
  User,
  ShieldCheck,
  Award,
} from 'lucide-react';

interface MobileProfessorViewProps {
  isOpen: boolean;
  onClose: () => void;
  professores: Professor[];
  turmas: Turma[];
  onCheckInAula?: (turmaCodigo: string, componenteNome: string) => void;
}

export const MobileProfessorView: React.FC<MobileProfessorViewProps> = ({
  isOpen,
  onClose,
  professores,
  turmas,
  onCheckInAula,
}) => {
  const [selectedProfId, setSelectedProfId] = useState<string>(professores[0]?.id || '');
  const [checkInEfetuado, setCheckInEfetuado] = useState<boolean>(false);

  if (!isOpen) return null;

  const professor = professores.find((p) => p.id === selectedProfId) || professores[0];
  const diaSemana: DiaSemana = 'Terça-feira';

  const turnos = [
    { turno: 'MANHÃ' as Turno, horario: '07:30 – 11:30' },
    { turno: 'TARDE' as Turno, horario: '13:30 – 17:30' },
    { turno: 'NOITE' as Turno, horario: '18:30 – 22:30' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Close Button Top Right */}
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 sm:-right-10 text-white hover:text-slate-300 p-2 rounded-full bg-slate-800/80 transition-colors"
          title="Fechar Simulador Celular"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Smartphone Shell */}
        <div className="w-[340px] sm:w-[380px] h-[680px] bg-slate-900 rounded-[44px] p-3.5 shadow-2xl border-4 border-slate-800 flex flex-col relative overflow-hidden ring-1 ring-slate-700">
          {/* Top Notch & Status Bar */}
          <div className="flex items-center justify-between px-6 pt-2 pb-3 text-[11px] font-bold text-white z-20">
            <span>18:30</span>
            <div className="w-24 h-4 bg-black rounded-full mx-auto"></div>
            <div className="flex items-center gap-1.5">
              <span>5G</span>
              <div className="w-4 h-2 border border-white rounded-xs p-0.5 flex items-center">
                <div className="w-full h-full bg-white rounded-2xs"></div>
              </div>
            </div>
          </div>

          {/* Screen Content */}
          <div className="flex-1 bg-slate-50 rounded-[32px] overflow-y-auto p-4 flex flex-col space-y-4 text-slate-800 text-xs no-scrollbar">
            {/* Top Bar with Teacher Switcher */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                  {professor.nome.charAt(0)}
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Visão Docente</div>
                  <div className="font-bold text-slate-900 text-xs">{professor.nome}</div>
                </div>
              </div>

              {/* Selector */}
              <select
                value={selectedProfId}
                onChange={(e) => {
                  setSelectedProfId(e.target.value);
                  setCheckInEfetuado(false);
                }}
                className="text-[10px] bg-white border border-slate-300 rounded-lg px-2 py-1 font-semibold text-slate-700"
              >
                {professores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome.split(' ')[0]}
                  </option>
                ))}
              </select>
            </div>

            {/* Notification Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2.5">
              <Bell className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <div className="text-[11px] text-blue-900 leading-tight">
                <strong>Escala Atualizada:</strong> A turma, sala e horário são fixos. Realize o check-in no início da aula.
              </div>
            </div>

            {/* Today's Schedule */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-800 uppercase tracking-wider">
                  Minha Agenda de Hoje ({diaSemana})
                </span>
                <span className="text-slate-400">3 Turnos</span>
              </div>

              {turnos.map((item) => {
                const statusInfo = obterStatusDocenteNoTurno(
                  professor,
                  turmas,
                  diaSemana,
                  item.turno
                );
                const isEmAula = statusInfo.status === 'EM AULA';
                const aula = statusInfo.aulaAtual;

                return (
                  <div
                    key={item.turno}
                    className={`p-3 rounded-xl border transition-all ${
                      isEmAula
                        ? 'bg-white border-blue-300 shadow-xs ring-1 ring-blue-100'
                        : 'bg-white/60 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[11px] text-slate-700 flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {item.turno} ({item.horario})
                      </span>
                      {isEmAula ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {checkInEfetuado ? 'CHECK-IN FEITO' : 'EM ESCALA'}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          LIVRE
                        </span>
                      )}
                    </div>

                    {aula ? (
                      <div className="mt-2 space-y-1.5">
                        <div className="font-bold text-slate-900 text-xs">
                          {aula.componenteNome}
                        </div>
                        <div className="text-[11px] text-slate-600 flex flex-wrap gap-1.5 items-center">
                          <span className="font-bold text-blue-700 bg-blue-50 px-1.5 rounded border border-blue-200">
                            {aula.turmaCodigo}
                          </span>
                          <span>•</span>
                          <span>{aula.escola}</span>
                          <span>•</span>
                          <span className="font-semibold bg-slate-100 px-1.5 rounded">
                            {aula.sala}
                          </span>
                        </div>

                        {/* Interactive Check-in Button */}
                        <div className="pt-2">
                          <button
                            onClick={() => {
                              setCheckInEfetuado(!checkInEfetuado);
                              if (onCheckInAula) {
                                onCheckInAula(aula.turmaCodigo, aula.componenteNome);
                              }
                            }}
                            className={`w-full py-1.5 rounded-lg font-bold text-[11px] transition-colors flex items-center justify-center gap-1.5 shadow-xs ${
                              checkInEfetuado
                                ? 'bg-emerald-600 text-white'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                          >
                            {checkInEfetuado ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Aula Iniciada (Presença Registrada)</span>
                              </>
                            ) : (
                              <>
                                <PlayCircle className="w-3.5 h-3.5" />
                                <span>Fazer Check-in nesta Aula</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 mt-1">
                        Nenhuma turma agendada neste turno.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Quick Metrics */}
            <div className="bg-white rounded-xl p-3 border border-slate-200 space-y-2">
              <span className="font-bold text-[11px] text-slate-700 uppercase tracking-wider block">
                Resumo Operacional Docente
              </span>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-400 block">Valor Hora</span>
                  <span className="font-bold text-slate-900 text-xs">R$ {professor.valorHora},00</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-400 block">Carga Máxima</span>
                  <span className="font-bold text-slate-900 text-xs">{professor.cargaHorariaMaxima}h</span>
                </div>
              </div>
            </div>

            {/* Bottom Safe Area Space */}
            <div className="pt-2 text-center text-[10px] text-slate-400">
              RIOS Docente v2.4 • Conexão Segura
            </div>
          </div>

          {/* Bottom Navigation Indicator Bar */}
          <div className="w-32 h-1 bg-white/70 rounded-full mx-auto mt-2"></div>
        </div>
      </div>
    </div>
  );
};

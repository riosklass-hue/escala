import React, { useState } from 'react';
import { Turma, Professor, ComponenteDaTurma, AulaMinistradaRecord } from '../types/rios';
import { GradeDatasHorariosView } from './GradeDatasHorariosView';
import { VisaoProfessor } from './VisaoProfessor';
import { VisaoPorData } from './VisaoPorData';
import { TurmasTimeline } from './TurmasTimeline';
import { CalendarDays, User, Calendar, Clock, Layers } from 'lucide-react';

interface GradeEscalaHubProps {
  turmas: Turma[];
  professores: Professor[];
  selectedProfId: string;
  onSelectProfessor: (profId: string) => void;
  onOpenSubstituicao: (turma: Turma, componente: ComponenteDaTurma) => void;
  onOpenEditarComponente?: (turma: Turma, componente: ComponenteDaTurma) => void;
  onConcluirComponente: (turma: Turma, componente: ComponenteDaTurma) => void;
  onOpenCadastrarTurma?: () => void;
  onOpenEditarTurma?: (t: Turma) => void;
  subVisaoInicial?: 'grade-semanal' | 'por-docente' | 'por-data' | 'timeline';
}

export const GradeEscalaHub: React.FC<GradeEscalaHubProps> = ({
  turmas,
  professores,
  selectedProfId,
  onSelectProfessor,
  onOpenSubstituicao,
  onOpenEditarComponente,
  onConcluirComponente,
  onOpenCadastrarTurma,
  onOpenEditarTurma,
  subVisaoInicial = 'grade-semanal',
}) => {
  const [subVisao, setSubVisao] = useState<'grade-semanal' | 'por-docente' | 'por-data' | 'timeline'>(
    subVisaoInicial
  );

  return (
    <div className="space-y-4">
      {/* Barra de Seleção de Visões Unificadas */}
      <div className="bg-white rounded-2xl p-2.5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <CalendarDays className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Grade & Escalas Unificadas
            </h3>
            <p className="text-[11px] text-slate-500">
              Alterne entre as perspectivas da grade sem sair da tela
            </p>
          </div>
        </div>

        {/* Segmented Control */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setSubVisao('grade-semanal')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              subVisao === 'grade-semanal'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Grade Semanal</span>
          </button>

          <button
            type="button"
            onClick={() => setSubVisao('por-docente')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              subVisao === 'por-docente'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Por Professor</span>
          </button>

          <button
            type="button"
            onClick={() => setSubVisao('por-data')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              subVisao === 'por-data'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Por Data</span>
          </button>

          <button
            type="button"
            onClick={() => setSubVisao('timeline')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              subVisao === 'timeline'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Linha do Tempo</span>
          </button>
        </div>
      </div>

      {/* Conteúdo Conforme a Sub-Visão Ativa */}
      {subVisao === 'grade-semanal' && (
        <GradeDatasHorariosView
          turmas={turmas}
          professores={professores}
          onOpenSubstituicao={onOpenSubstituicao}
          onOpenEditarComponente={onOpenEditarComponente}
        />
      )}

      {subVisao === 'por-docente' && (
        <VisaoProfessor
          professores={professores}
          turmas={turmas}
          selectedProfessorId={selectedProfId}
          onSelectProfessor={onSelectProfessor}
        />
      )}

      {subVisao === 'por-data' && (
        <VisaoPorData
          professores={professores}
          turmas={turmas}
          onOpenSubstituicao={onOpenSubstituicao}
          onOpenEditarComponente={onOpenEditarComponente}
        />
      )}

      {subVisao === 'timeline' && (
        <TurmasTimeline
          turmas={turmas}
          professores={professores}
          onOpenSubstituicao={onOpenSubstituicao}
          onConcluirComponente={onConcluirComponente}
          onOpenCadastrarTurma={onOpenCadastrarTurma}
          onOpenEditarTurma={onOpenEditarTurma}
          onOpenEditarComponente={onOpenEditarComponente}
        />
      )}
    </div>
  );
};

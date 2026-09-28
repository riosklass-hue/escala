import React, { useState } from 'react';
import {
  Turma,
  Professor,
  ComponenteDaTurma,
  HistoricoSubstituicao,
  AulaMinistradaRecord,
} from '../types/rios';
import { MapaOperacional } from './MapaOperacional';
import { HistoricoAulasMinistradas } from './HistoricoAulasMinistradas';
import { HistoricoMovimentacoes } from './HistoricoMovimentacoes';
import { MapPin, FileCheck2, History } from 'lucide-react';

interface OperacionalHubProps {
  turmas: Turma[];
  professores: Professor[];
  historico: HistoricoSubstituicao[];
  aulasMinistradas: AulaMinistradaRecord[];
  onOpenSubstituicao: (turma: Turma, componente: ComponenteDaTurma) => void;
  onSelectProfessor: (profId: string) => void;
  onRegistrarAula: (aula: Omit<AulaMinistradaRecord, 'id' | 'timestampRegistro'>) => void;
  subVisaoInicial?: 'tempo-real' | 'diario' | 'auditoria';
}

export const OperacionalHub: React.FC<OperacionalHubProps> = ({
  turmas,
  professores,
  historico,
  aulasMinistradas,
  onOpenSubstituicao,
  onSelectProfessor,
  onRegistrarAula,
  subVisaoInicial = 'tempo-real',
}) => {
  const [subVisao, setSubVisao] = useState<'tempo-real' | 'diario' | 'auditoria'>(subVisaoInicial);

  return (
    <div className="space-y-4">
      {/* Barra de Seleção Operacional */}
      <div className="bg-white rounded-2xl p-2.5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Operacional do Dia
            </h3>
            <p className="text-[11px] text-slate-500">
              Acompanhamento de salas, registro do diário e auditoria de trocas
            </p>
          </div>
        </div>

        {/* Segmented Control */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setSubVisao('tempo-real')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              subVisao === 'tempo-real'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Salas & Substituições</span>
          </button>

          <button
            type="button"
            onClick={() => setSubVisao('diario')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              subVisao === 'diario'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>Diário de Aulas ({aulasMinistradas.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubVisao('auditoria')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              subVisao === 'auditoria'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Histórico de Trocas ({historico.length})</span>
          </button>
        </div>
      </div>

      {/* Conteúdo Conforme a Sub-Visão Ativa */}
      {subVisao === 'tempo-real' && (
        <MapaOperacional
          turmas={turmas}
          professores={professores}
          historico={historico}
          onOpenSubstituicao={onOpenSubstituicao}
          onSelectProfessor={onSelectProfessor}
        />
      )}

      {subVisao === 'diario' && (
        <HistoricoAulasMinistradas
          aulasMinistradas={aulasMinistradas}
          historicoSubstituicoes={historico}
          professores={professores}
          turmas={turmas}
          onRegistrarAula={onRegistrarAula}
        />
      )}

      {subVisao === 'auditoria' && (
        <HistoricoMovimentacoes historico={historico} />
      )}
    </div>
  );
};

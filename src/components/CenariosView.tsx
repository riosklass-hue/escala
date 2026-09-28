import React, { useState } from 'react';
import { Turma, Professor } from '../types/rios';
import { GitFork, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

interface CenariosViewProps {
  turmas: Turma[];
  professores: Professor[];
}

export const CenariosView: React.FC<CenariosViewProps> = ({ turmas, professores }) => {
  const [cenarioSimulado, setCenarioSimulado] = useState<'A' | 'B'>('A');

  // Cenário A: Alocação com foco em proximidade geográfica e minimização de deslocamento
  // Cenário B: Alocação com foco em balanceamento estrito de carga horária entre os docentes
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Análise e Simulação de Cenários de Movimentação Docente
            </h2>
            <p className="text-xs text-slate-500">
              Simule reconfigurações do corpo docente mantendo 100% fixa a matriz e horários de cada turma.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCenarioSimulado('A')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                cenarioSimulado === 'A'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Cenário A: Otimização por Proximidade
            </button>
            <button
              onClick={() => setCenarioSimulado('B')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                cenarioSimulado === 'B'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Cenário B: Balanceamento de Horas
            </button>
          </div>
        </div>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cenário Atual */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Configuração Vigente
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              Cenário Atual Ativo
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
              <span className="font-bold text-slate-800 block">Turma RH-01 (Centro • Sala 04)</span>
              <div className="text-slate-600 flex justify-between">
                <span>Docente Titular:</span>
                <span className="font-bold text-slate-900">Ana Silva</span>
              </div>
              <div className="text-slate-600 flex justify-between">
                <span>Deslocamento no dia:</span>
                <span className="text-amber-700 font-semibold">Tarde (Centro) → Noite (Centro) [0 km]</span>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
              <span className="font-bold text-slate-800 block">Turma LOG-01 (Zona Sul • Sala 02)</span>
              <div className="text-slate-600 flex justify-between">
                <span>Docente Titular:</span>
                <span className="font-bold text-slate-900">Carlos Souza</span>
              </div>
              <div className="text-slate-600 flex justify-between">
                <span>Deslocamento no dia:</span>
                <span className="text-emerald-700 font-semibold">Sem deslocamento entre escolas</span>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
              <span className="font-bold text-slate-800 block">Turma ENF-01 (Norte • Sala 01)</span>
              <div className="text-slate-600 flex justify-between">
                <span>Docente Titular:</span>
                <span className="font-bold text-slate-900">Beatriz Lima</span>
              </div>
              <div className="text-slate-600 flex justify-between">
                <span>Carga programada:</span>
                <span className="text-slate-900 font-bold">80h / 160h</span>
              </div>
            </div>
          </div>
        </div>

        {/* Cenário Proposto */}
        <div className="bg-white rounded-xl border border-blue-200 shadow-xs p-5 space-y-4 ring-1 ring-blue-100">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
              Proposta Simulada
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              {cenarioSimulado === 'A' ? 'Cenário A (Proximidade)' : 'Cenário B (Balanceamento)'}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            {cenarioSimulado === 'A' ? (
              <>
                <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-200 space-y-1">
                  <span className="font-bold text-slate-800 block">Turma RH-01 (Centro • Sala 04)</span>
                  <div className="text-slate-600 flex justify-between">
                    <span>Docente Proposto:</span>
                    <span className="font-bold text-blue-900">Maria Santos (Substituição)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Liberaria Ana Silva para coordenar reuniões pedagógicas na Zona Sul.
                  </p>
                </div>

                <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-200 text-emerald-950 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Benefício da Simulação:</span>
                  </div>
                  <p className="text-xs text-emerald-800">
                    Redução de 100% do risco de trânsito entre regiões distantes no horário de pico.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-200 space-y-1">
                  <span className="font-bold text-slate-800 block">Turma RH-01 & ADM-01</span>
                  <div className="text-slate-600 flex justify-between">
                    <span>Redistribuição:</span>
                    <span className="font-bold text-indigo-900">João Pereira assume Rotinas na RH-01</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Equilibra as horas de João Pereira (atualmente com menor carga horária do corpo docente).
                  </p>
                </div>

                <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-200 text-emerald-950 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Benefício da Simulação:</span>
                  </div>
                  <p className="text-xs text-emerald-800">
                    O desvio padrão de horas entre docentes cai de 32h para apenas 8h mensais.
                  </p>
                </div>
              </>
            )}

            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <span>
                <strong>Confirmação de Integridade:</strong> Todas as propostas respeitam a imutabilidade
                das escolas, turmas, matrizes e salas.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

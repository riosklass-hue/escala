import React, { useState } from 'react';
import { Professor, Turma, Turno, DiaSemana } from '../types/rios';
import {
  obterStatusDocenteNoTurno,
  calcularHorasAtuaisProfessor,
} from '../services/riosEngine';
import {
  User,
  Clock,
  School,
  Building,
  CheckCircle2,
  Calendar,
  Award,
  DollarSign,
  AlertCircle,
} from 'lucide-react';

interface VisaoProfessorProps {
  professores: Professor[];
  turmas: Turma[];
  selectedProfessorId?: string;
  onSelectProfessor: (id: string) => void;
  onIrParaVisaoPorDia?: (id: string) => void;
}

export const VisaoProfessor: React.FC<VisaoProfessorProps> = ({
  professores,
  turmas,
  selectedProfessorId,
  onSelectProfessor,
  onIrParaVisaoPorDia,
}) => {
  const [selectedProfId, setSelectedProfId] = useState<string>(
    selectedProfessorId || professores[0]?.id || ''
  );
  const [diaSelecionado, setDiaSelecionado] = useState<DiaSemana>('Terça-feira');

  const professor = professores.find((p) => p.id === selectedProfId) || professores[0];

  const dias: DiaSemana[] = [
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado',
  ];

  const turnos: { turno: Turno; horario: string }[] = [
    { turno: 'MANHÃ', horario: '07:30 – 11:30' },
    { turno: 'TARDE', horario: '13:30 – 17:30' },
    { turno: 'NOITE', horario: '18:30 – 22:30' },
  ];

  if (!professor) return null;

  const horasProgramadas = calcularHorasAtuaisProfessor(professor.id, turmas);
  const horasLivres = Math.max(0, professor.cargaHorariaMaxima - horasProgramadas);
  const valorEstimado = horasProgramadas * professor.valorHora;

  // Obter todos os componentes vinculados a este professor em todas as turmas
  const componentesVinculados: {
    turmaCodigo: string;
    curso: string;
    escola: string;
    sala: string;
    nome: string;
    cargaHoraria: number;
    status: string;
    dataConclusao?: string;
  }[] = [];

  turmas.forEach((t) => {
    t.componentes.forEach((c) => {
      if (c.professorId === professor.id) {
        componentesVinculados.push({
          turmaCodigo: t.codigo,
          curso: t.curso,
          escola: t.escola,
          sala: t.sala,
          nome: c.nome,
          cargaHoraria: c.cargaHoraria,
          status: c.status,
          dataConclusao: c.dataConclusao,
        });
      }
    });
  });

  return (
    <div className="space-y-6">
      {/* Teacher Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {professores.map((p) => {
          const isSelected = p.id === professor.id;
          return (
            <button
              key={p.id}
              id={`tab-prof-${p.id}`}
              onClick={() => {
                setSelectedProfId(p.id);
                onSelectProfessor(p.id);
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left min-w-[200px] ${
                isSelected
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                  isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {p.nome.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <div className="font-bold text-xs truncate">{p.nome}</div>
                <div className={`text-[11px] truncate ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>
                  {p.competencias.length} competências
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Teacher Profile & Day Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Teacher Card & Workload */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xl flex items-center justify-center shadow-md">
                {professor.nome.charAt(0)}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">{professor.nome}</h3>
                <p className="text-xs text-slate-500">{professor.email}</p>
                <p className="text-xs text-slate-500">{professor.telefone}</p>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500 text-[11px] block">Horas Programadas:</span>
                <span className="text-lg font-bold text-blue-700">{horasProgramadas}h</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">de {professor.cargaHorariaMaxima}h limite</span>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500 text-[11px] block">Horas Livres:</span>
                <span className="text-lg font-bold text-emerald-700">{horasLivres}h</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">capacidade mensal</span>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500 text-[11px] block">Valor / Hora:</span>
                <span className="text-base font-bold text-slate-900">R$ {professor.valorHora},00</span>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500 text-[11px] block">Remuneração Est.:</span>
                <span className="text-base font-bold text-slate-900">R$ {valorEstimado.toLocaleString('pt-BR')},00</span>
              </div>
            </div>

            {/* Competencies */}
            <div className="pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <Award className="w-3.5 h-3.5 text-blue-600" />
                <span>Competências Curriculares:</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {professor.competencias.map((c, i) => (
                  <span
                    key={i}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-blue-50 text-blue-800 border border-blue-100"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>

            {/* Habitual Schools */}
            <div className="pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <School className="w-3.5 h-3.5 text-slate-500" />
                <span>Escolas de Atuação Habitual:</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {professor.escolasHabituais.map((e, i) => (
                  <span
                    key={i}
                    className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
                  >
                    {e}
                  </span>
                ))}
              </div>
            </div>

            {onIrParaVisaoPorDia && (
              <div className="pt-3 border-t border-slate-100">
                <button
                  id="btn-link-professor-por-dia"
                  onClick={() => onIrParaVisaoPorDia(professor.id)}
                  className="w-full py-2 px-3 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 flex items-center justify-center gap-2 transition-colors"
                >
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <span>Ver Visão por Período (Semana / Mês / Ano)</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Center & Right Columns: Daily Shift Timeline for this teacher */}
        <div className="lg:col-span-2 space-y-4">
          {/* Day Picker */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Grade Diária por Turno
              </h4>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                Escala de {professor.nome} em {diaSelecionado}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <select
                id="select-dia-professor"
                value={diaSelecionado}
                onChange={(e) => setDiaSelecionado(e.target.value as DiaSemana)}
                className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-lg px-3 py-1.5 font-semibold focus:ring-blue-500 focus:border-blue-500"
              >
                {dias.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Shift Schedule Cards */}
          <div className="space-y-3">
            {turnos.map((item) => {
              const statusInfo = obterStatusDocenteNoTurno(
                professor,
                turmas,
                diaSelecionado,
                item.turno
              );
              const isEmAula = statusInfo.status === 'EM AULA';
              const aula = statusInfo.aulaAtual;

              return (
                <div
                  key={item.turno}
                  className={`p-4 rounded-xl border transition-all ${
                    isEmAula
                      ? 'bg-emerald-50/50 border-emerald-300 shadow-xs'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-start sm:items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          isEmAula
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        <Clock className="w-5 h-5" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            Turno {item.turno} ({item.horario})
                          </span>
                          {isEmAula ? (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                              EM AULA
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                              LIVRE
                            </span>
                          )}
                        </div>

                        {aula ? (
                          <div className="mt-2 text-xs space-y-1">
                            <div className="font-bold text-slate-900 text-sm">
                              {aula.componenteNome}
                            </div>
                            <div className="text-slate-600 flex flex-wrap items-center gap-2">
                              <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                                {aula.turmaCodigo}
                              </span>
                              <span>•</span>
                              <span>{aula.curso}</span>
                              <span>•</span>
                              <span className="font-medium text-slate-800">{aula.escola}</span>
                              <span>•</span>
                              <span className="bg-slate-100 px-1.5 py-0.2 rounded font-medium">
                                {aula.sala}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 mt-1">
                            Docente disponível para escala ou atividades extraclasse neste horário.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Academic History with this Teacher */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
              Componentes Vinculados a {professor.nome}
            </h4>
            <div className="divide-y divide-slate-100 text-xs">
              {componentesVinculados.length === 0 ? (
                <p className="text-slate-400 py-3 text-center">Nenhum componente vinculado.</p>
              ) : (
                componentesVinculados.map((comp, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-slate-900">{comp.nome}</div>
                      <div className="text-slate-500 text-[11px] mt-0.5">
                        {comp.turmaCodigo} • {comp.curso} • {comp.escola} ({comp.sala})
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          comp.status === 'CONCLUÍDO'
                            ? 'bg-emerald-100 text-emerald-800'
                            : comp.status === 'EM ANDAMENTO'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {comp.status}
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        {comp.cargaHoraria}h
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

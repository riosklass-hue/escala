import React, { useState } from 'react';
import { HistoricoSubstituicao } from '../types/rios';
import { History, Search, ArrowRight, ShieldCheck, FileText } from 'lucide-react';

interface HistoricoMovimentacoesProps {
  historico: HistoricoSubstituicao[];
}

export const HistoricoMovimentacoes: React.FC<HistoricoMovimentacoesProps> = ({ historico }) => {
  const [busca, setBusca] = useState<string>('');

  const filtrados = historico.filter((item) => {
    const termo = busca.toLowerCase();
    return (
      !busca ||
      item.turmaCodigo.toLowerCase().includes(termo) ||
      item.componenteNome.toLowerCase().includes(termo) ||
      item.professorAnteriorNome.toLowerCase().includes(termo) ||
      item.professorNovoNome.toLowerCase().includes(termo) ||
      item.motivo.toLowerCase().includes(termo)
    );
  });

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Histórico de Auditoria e Movimentações Docentes</h2>
            <p className="text-xs text-slate-500">
              Registro cronológico de todas as substituições efetuadas no sistema com motivo e data.
            </p>
          </div>

          <div className="w-full sm:w-72 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              id="input-busca-historico"
              type="text"
              placeholder="Buscar por turma, professor, motivo..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 text-slate-600 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Data e Hora</th>
                <th className="px-3 py-3">Turma (Fixa)</th>
                <th className="px-4 py-3">Componente Curricular (Fixo)</th>
                <th className="px-4 py-3">Professor Anterior</th>
                <th className="px-4 py-3">Novo Professor</th>
                <th className="px-5 py-3">Motivo Registrado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Nenhum registro de movimentação encontrado.
                  </td>
                </tr>
              ) : (
                filtrados.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-500 whitespace-nowrap">
                      {item.dataAlteracao}
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {item.turmaCodigo}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {item.componenteNome}
                    </td>
                    <td className="px-4 py-3 text-rose-700 font-medium">
                      {item.professorAnteriorNome}
                    </td>
                    <td className="px-4 py-3 text-emerald-700 font-bold flex items-center gap-1.5">
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      <span>{item.professorNovoNome}</span>
                    </td>
                    <td className="px-5 py-3 text-slate-600 max-w-xs truncate" title={item.motivo}>
                      {item.motivo}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

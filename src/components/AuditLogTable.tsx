import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  FileText,
  Download,
  Lock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Info,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { LogAuditoria, Usuario, CategoriaLogAuditoria } from '../types/rios';
import { subscribeColecao } from '../lib/firebase';
import { registrarLogAuditoria } from '../lib/auditLogger';

interface AuditLogTableProps {
  usuarioAtual?: Usuario | null;
}

const CATEGORIAS_CONFIG: Record<
  CategoriaLogAuditoria,
  { label: string; bg: string; text: string; border: string }
> = {
  TURMAS: {
    label: 'Turmas',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  PERMISSOES: {
    label: 'Permissões & Contas',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
  },
  PROFESSORES: {
    label: 'Docentes',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  ESCOLAS: {
    label: 'Escolas',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  AUTENTICACAO: {
    label: 'Autenticação',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
  },
  SISTEMA: {
    label: 'Sistema',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
  },
};

export const AuditLogTable: React.FC<AuditLogTableProps> = ({ usuarioAtual }) => {
  const isAdmin = usuarioAtual?.perfil === 'ADMIN';

  const [logs, setLogs] = useState<LogAuditoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [erroPermissao, setErroPermissao] = useState<string | null>(null);
  const [filtroCategoria, setFiltroCategoria] = useState<string>('TODAS');
  const [buscaTexto, setBuscaTexto] = useState('');
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(10);
  const [gerandoTeste, setGerandoTeste] = useState(false);

  // Escuta em tempo real da coleção 'logs' com validação estrita de autorização
  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErroPermissao(null);

    const unsubscribe = subscribeColecao<LogAuditoria>(
      'logs',
      (dados) => {
        // Ordena do mais recente para o mais antigo por timestamp ISO
        const ordenados = [...dados].sort((a, b) => {
          const timeA = new Date(a.timestamp || 0).getTime();
          const timeB = new Date(b.timestamp || 0).getTime();
          return timeB - timeA;
        });
        setLogs(ordenados);
        setLoading(false);
      },
      (err) => {
        console.error('[AuditLog] Erro ao carregar logs de auditoria:', err);
        setErroPermissao('Acesso negado às regras de auditoria ou falha na sincronização.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isAdmin]);

  // Filtragem dos logs
  const logsFiltrados = useMemo(() => {
    return logs.filter((item) => {
      const matchCategoria =
        filtroCategoria === 'TODAS' || item.categoria === filtroCategoria;

      const textoBusca = buscaTexto.toLowerCase().trim();
      if (!textoBusca) return matchCategoria;

      const matchTexto =
        (item.acao || '').toLowerCase().includes(textoBusca) ||
        (item.detalhes || '').toLowerCase().includes(textoBusca) ||
        (item.usuarioNome || '').toLowerCase().includes(textoBusca) ||
        (item.usuarioEmail || '').toLowerCase().includes(textoBusca) ||
        (item.targetNome || '').toLowerCase().includes(textoBusca) ||
        (item.targetId || '').toLowerCase().includes(textoBusca);

      return matchCategoria && matchTexto;
    });
  }, [logs, filtroCategoria, buscaTexto]);

  // Paginação
  const totalPaginas = Math.max(1, Math.ceil(logsFiltrados.length / itensPorPagina));
  const logsPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    return logsFiltrados.slice(inicio, inicio + itensPorPagina);
  }, [logsFiltrados, paginaAtual, itensPorPagina]);

  // Contadores de métricas
  const metricas = useMemo(() => {
    const total = logs.length;
    const permissoes = logs.filter((l) => l.categoria === 'PERMISSOES').length;
    const turmas = logs.filter((l) => l.categoria === 'TURMAS').length;
    const ultimas24h = logs.filter((l) => {
      const logDate = new Date(l.timestamp || 0).getTime();
      return Date.now() - logDate <= 24 * 60 * 60 * 1000;
    }).length;
    return { total, permissoes, turmas, ultimas24h };
  }, [logs]);

  // Exportar dados como CSV para conformidade e relatórios
  const handleExportarCSV = () => {
    if (logsFiltrados.length === 0) return;

    const colunas = [
      'Data e Hora',
      'Categoria',
      'Acao',
      'Detalhes',
      'Usuario Nome',
      'Usuario Email',
      'Perfil',
      'Recurso Afetado',
    ];

    const linhas = logsFiltrados.map((log) => [
      `"${log.dataHoraFormatada || log.timestamp}"`,
      `"${log.categoria}"`,
      `"${(log.acao || '').replace(/"/g, '""')}"`,
      `"${(log.detalhes || '').replace(/"/g, '""')}"`,
      `"${(log.usuarioNome || '').replace(/"/g, '""')}"`,
      `"${log.usuarioEmail || ''}"`,
      `"${log.usuarioPerfil || ''}"`,
      `"${(log.targetNome || log.targetId || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [colunas.join(';'), ...linhas.map((e) => e.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `rios_logs_auditoria_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Gerar evento de auditoria de teste pelo Administrador
  const handleGerarEventoTeste = async () => {
    if (!usuarioAtual || gerandoTeste) return;
    setGerandoTeste(true);
    try {
      await registrarLogAuditoria({
        acao: 'Verificação de Integridade de Auditoria',
        categoria: 'SISTEMA',
        detalhes: 'Teste de integridade e registro no Firestore executado com sucesso.',
        usuarioAtual,
        targetNome: 'Módulo de Auditoria',
      });
    } catch (err) {
      console.error('Falha ao gerar teste:', err);
    } finally {
      setGerandoTeste(false);
    }
  };

  // Se o usuário não for ADMIN, não exibir o componente (acesso exclusivo garantido)
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden mt-8 transition-all">
      {/* Top Header do Componente com indicador de Acesso Restrito */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold tracking-tight">Log de Auditoria e Governança</h3>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black tracking-wide bg-amber-400/20 text-amber-300 border border-amber-400/30 inline-flex items-center gap-1">
                <Lock className="w-3 h-3" />
                ACESSO EXCLUSIVO: ADMIN
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Rastreamento cronológico de ações críticas, deleções e alterações de permissões na coleção <code className="text-amber-300 bg-slate-800/80 px-1 py-0.5 rounded text-[11px] font-mono">logs</code>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportarCSV}
            disabled={logsFiltrados.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer"
            title="Exportar registros filtrados para planilha CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>

          <button
            type="button"
            onClick={handleGerarEventoTeste}
            disabled={gerandoTeste}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            title="Registra um log de verificação para testar a gravação no banco"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{gerandoTeste ? 'Gravando...' : 'Log de Teste'}</span>
          </button>
        </div>
      </div>

      {/* Cards de Métricas de Auditoria */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 bg-slate-50/60 border-b border-slate-200/80">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Total de Registros
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-slate-900">{metricas.total}</span>
            <span className="text-[11px] text-slate-500">eventos</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-purple-100 shadow-2xs">
          <span className="text-[11px] font-semibold text-purple-600 uppercase tracking-wider block">
            Permissões & Contas
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-purple-900">{metricas.permissoes}</span>
            <span className="text-[11px] text-purple-600">alterações</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-blue-100 shadow-2xs">
          <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider block">
            Eventos em Turmas
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-blue-900">{metricas.turmas}</span>
            <span className="text-[11px] text-blue-600">modificações</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-emerald-100 shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block">
            Últimas 24 Horas
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-emerald-900">{metricas.ultimas24h}</span>
            <span className="text-[11px] text-emerald-600">atividades</span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            Categoria:
          </span>
          {(['TODAS', 'PERMISSOES', 'TURMAS', 'PROFESSORES', 'ESCOLAS', 'SISTEMA'] as const).map(
            (cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setFiltroCategoria(cat);
                  setPaginaAtual(1);
                }}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  filtroCategoria === cat
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {cat === 'TODAS'
                  ? 'Todas'
                  : CATEGORIAS_CONFIG[cat as CategoriaLogAuditoria]?.label || cat}
              </button>
            )
          )}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por ação, usuário, turma..."
            value={buscaTexto}
            onChange={(e) => {
              setBuscaTexto(e.target.value);
              setPaginaAtual(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800"
          />
        </div>
      </div>

      {/* Erro de Permissão ou Conexão */}
      {erroPermissao && (
        <div className="mx-5 mb-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-3 text-xs">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{erroPermissao}</span>
        </div>
      )}

      {/* Tabela de Eventos */}
      <div className="overflow-x-auto border-t border-slate-100">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">Data / Horário</th>
              <th className="py-3 px-4">Usuário Responsável</th>
              <th className="py-3 px-4">Categoria</th>
              <th className="py-3 px-4">Ação Executada</th>
              <th className="py-3 px-4">Detalhes e Impacto</th>
              <th className="py-3 px-4 text-right">Recurso</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  <div className="inline-flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                    <span>Carregando registros de auditoria em tempo real...</span>
                  </div>
                </td>
              </tr>
            ) : logsPaginados.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <FileText className="w-8 h-8 text-slate-300" />
                    <p className="font-semibold text-slate-700 text-sm">
                      Nenhum evento registrado ainda
                    </p>
                    <p className="text-xs text-slate-500 max-w-md">
                      Ações administrativas (como exclusão de turmas, alteração de permissões ou aprovação de usuários) aparecerão aqui automaticamente.
                    </p>
                    <button
                      type="button"
                      onClick={handleGerarEventoTeste}
                      disabled={gerandoTeste}
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg border border-indigo-200 transition-colors text-xs cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Gerar Primeiro Evento de Teste</span>
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              logsPaginados.map((log) => {
                const configCat =
                  CATEGORIAS_CONFIG[log.categoria] || CATEGORIAS_CONFIG.SISTEMA;
                const isDelecao = (log.acao || '').toLowerCase().includes('exclusão');
                const isPermissao = log.categoria === 'PERMISSOES';

                return (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50/70 transition-colors group"
                  >
                    {/* Data / Hora */}
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{log.dataHoraFormatada || log.timestamp}</span>
                      </div>
                    </td>

                    {/* Usuário Responsável */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <span>{log.usuarioNome}</span>
                        {log.usuarioPerfil === 'ADMIN' && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-indigo-100 text-indigo-800 border border-indigo-200">
                            ADMIN
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {log.usuarioEmail}
                      </div>
                    </td>

                    {/* Categoria */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${configCat.bg} ${configCat.text} ${configCat.border}`}
                      >
                        {configCat.label}
                      </span>
                    </td>

                    {/* Ação */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        {isDelecao ? (
                          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                        ) : isPermissao ? (
                          <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        )}
                        <span
                          className={`font-semibold ${
                            isDelecao ? 'text-rose-700' : 'text-slate-900'
                          }`}
                        >
                          {log.acao}
                        </span>
                      </div>
                    </td>

                    {/* Detalhes */}
                    <td className="py-3 px-4 max-w-md">
                      <p className="text-slate-700 leading-relaxed text-xs">
                        {log.detalhes}
                      </p>
                    </td>

                    {/* Recurso / Alvo */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {log.targetNome ? (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-mono border border-slate-200">
                          {log.targetNome}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação e Resumo */}
      {logsFiltrados.length > 0 && (
        <div className="p-4 bg-slate-50/80 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span>
              Exibindo{' '}
              <strong>
                {Math.min(
                  (paginaAtual - 1) * itensPorPagina + 1,
                  logsFiltrados.length
                )}
              </strong>{' '}
              a{' '}
              <strong>
                {Math.min(paginaAtual * itensPorPagina, logsFiltrados.length)}
              </strong>{' '}
              de <strong>{logsFiltrados.length}</strong> eventos
            </span>

            <select
              value={itensPorPagina}
              onChange={(e) => {
                setItensPorPagina(Number(e.target.value));
                setPaginaAtual(1);
              }}
              className="ml-2 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-hidden"
            >
              <option value={10}>10 por página</option>
              <option value={25}>25 por página</option>
              <option value={50}>50 por página</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              type="button"
              disabled={paginaAtual <= 1}
              onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 transition-colors cursor-pointer"
              title="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-semibold text-slate-800">
              {paginaAtual} de {totalPaginas}
            </span>
            <button
              type="button"
              disabled={paginaAtual >= totalPaginas}
              onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 transition-colors cursor-pointer"
              title="Próxima página"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

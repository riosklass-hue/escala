/**
 * ==============================================================================
 * RIOS – GESTÃO DE ESCALAS | SERVIÇO DE SINCRONIZAÇÃO E PERSISTÊNCIA HOSTINGER
 * ==============================================================================
 * Garante que todas as informações digitadas no sistema (Turmas, Professores,
 * Escolas, Matrizes, Horários, Substituições e Aulas) sejam gravadas diretamente
 * no disco e na API do servidor Hostinger (esc.riossistem.com.br).
 */

import { Turma, Professor, Escola, HistoricoSubstituicao, AulaMinistradaRecord, Usuario } from '../types/rios';
import { MatrizCursoOficial } from '../data/matrizesCursos';

export interface SistemaCompletoDados {
  turmas: Turma[];
  professores: Professor[];
  escolas: Escola[];
  matrizes: MatrizCursoOficial[];
  historico: HistoricoSubstituicao[];
  aulasMinistradas: AulaMinistradaRecord[];
  usuarios?: Usuario[];
  auditoria?: any[];
  ultimaAtualizacao?: string;
  servidorOrigem?: string;
}

export interface HostingerStorageStatus {
  online: boolean;
  ultimaAtualizacao: string | null;
  totalRegistros: number;
  mensagem: string;
}

const ENDPOINTS = ['/api/dados.php', '/api/dados', '/api/storage.php'];

async function fetchWithFallback(options: RequestInit, pathSuffix = ''): Promise<Response> {
  let lastError: any = null;
  for (const base of ENDPOINTS) {
    try {
      const url = `${base}${pathSuffix}`;
      const res = await fetch(url, options);
      if (res.ok) {
        return res;
      }
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('Não foi possível conectar ao serviço de armazenamento Hostinger.');
}

/**
 * Salva todo o banco de dados do sistema diretamente na Hostinger
 */
export async function salvarTudoNaHostinger(dados: SistemaCompletoDados): Promise<{ success: boolean; message: string }> {
  try {
    const payload = {
      action: 'save_all',
      data: {
        ...dados,
        ultimaAtualizacao: new Date().toISOString(),
        servidorOrigem: window.location.hostname || 'esc.riossistem.com.br',
      },
    };

    const res = await fetchWithFallback(
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    const json = await res.json();
    return {
      success: !!json.success,
      message: json.message || 'Dados salvos com sucesso na Hostinger!',
    };
  } catch (err: any) {
    console.warn('[Hostinger Storage] Aviso ao salvar dados gerais:', err);
    return {
      success: false,
      message: err?.message || 'Falha ao salvar na Hostinger.',
    };
  }
}

/**
 * Salva um documento individual na Hostinger (chamado a cada edição ou criação)
 */
export async function salvarDocNaHostinger(collection: string, doc: any): Promise<boolean> {
  if (!collection || !doc || !doc.id) return false;
  try {
    const payload = {
      action: 'save_doc',
      collection,
      doc,
    };

    const res = await fetchWithFallback(
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    const json = await res.json();
    return !!json.success;
  } catch (err) {
    console.warn(`[Hostinger Storage] Aviso ao salvar documento em ${collection}:`, err);
    return false;
  }
}

/**
 * Deleta um documento individual da Hostinger
 */
export async function deletarDocNaHostinger(collection: string, id: string): Promise<boolean> {
  if (!collection || !id) return false;
  try {
    const payload = {
      action: 'delete_doc',
      collection,
      id,
    };

    const res = await fetchWithFallback(
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    const json = await res.json();
    return !!json.success;
  } catch (err) {
    console.warn(`[Hostinger Storage] Aviso ao remover documento de ${collection}:`, err);
    return false;
  }
}

/**
 * Carrega todos os dados gravados no servidor Hostinger
 */
export async function carregarDaHostinger(): Promise<SistemaCompletoDados | null> {
  try {
    const res = await fetchWithFallback({ method: 'GET' }, '?action=load');
    const json = await res.json();
    if (json.success && json.data) {
      return json.data as SistemaCompletoDados;
    }
    return null;
  } catch (err) {
    console.warn('[Hostinger Storage] Aviso ao carregar dados do servidor:', err);
    return null;
  }
}

/**
 * Obtém o status da persistência e tamanho do arquivo na Hostinger
 */
export async function obterStatusHostinger(): Promise<HostingerStorageStatus> {
  try {
    const res = await fetchWithFallback({ method: 'GET' }, '?action=status');
    const json = await res.json();
    if (json.success) {
      const stats = json.stats || {};
      const total =
        (stats.totalTurmas || 0) +
        (stats.totalProfessores || 0) +
        (stats.totalEscolas || 0) +
        (stats.totalMatrizes || 0) +
        (stats.totalAulasMinistradas || 0);

      return {
        online: true,
        ultimaAtualizacao: json.lastUpdated || null,
        totalRegistros: total,
        mensagem: 'Armazenamento Hostinger ativo e sincronizado.',
      };
    }
  } catch {
    // fallback
  }

  return {
    online: false,
    ultimaAtualizacao: null,
    totalRegistros: 0,
    mensagem: 'Hostinger offline ou modo estático.',
  };
}

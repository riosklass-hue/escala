import { db } from './firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { LogAuditoria, PerfilUsuario, CategoriaLogAuditoria } from '../types/rios';

export interface RegistrarLogParams {
  acao: string;
  categoria: CategoriaLogAuditoria;
  detalhes: string;
  usuarioAtual?: {
    id: string;
    nome: string;
    email: string;
    perfil: PerfilUsuario;
  } | null;
  targetId?: string;
  targetNome?: string;
}

/**
 * Registra um evento imutável na coleção 'logs' do Firestore para auditoria administrativa.
 */
export async function registrarLogAuditoria(params: RegistrarLogParams): Promise<LogAuditoria | null> {
  try {
    const logsCol = collection(db, 'logs');
    const newDocRef = doc(logsCol);
    const agora = new Date();

    const novoLog: LogAuditoria = {
      id: newDocRef.id,
      acao: params.acao,
      categoria: params.categoria,
      detalhes: params.detalhes,
      usuarioId: params.usuarioAtual?.id || 'sistema',
      usuarioNome: params.usuarioAtual?.nome || 'Administrador',
      usuarioEmail: params.usuarioAtual?.email || 'admin@rios.edu.br',
      usuarioPerfil: params.usuarioAtual?.perfil || 'ADMIN',
      timestamp: agora.toISOString(),
      dataHoraFormatada: agora.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      targetId: params.targetId,
      targetNome: params.targetNome,
    };

    await setDoc(newDocRef, novoLog);
    return novoLog;
  } catch (error) {
    console.error('[Auditoria] Falha ao registrar log de auditoria no Firestore:', error);
    return null;
  }
}

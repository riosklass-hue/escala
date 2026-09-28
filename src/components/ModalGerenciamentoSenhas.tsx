import React, { useState } from 'react';
import { Usuario, PerfilUsuario, Professor } from '../types/rios';
import {
  X,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Mail,
  UserCheck,
  UserX,
  Link as LinkIcon,
  Send,
  Loader2,
} from 'lucide-react';
import { sendPasswordResetEmail, auth } from '../lib/firebase';

interface ModalGerenciamentoSenhasProps {
  isOpen: boolean;
  onClose: () => void;
  usuarioAtual: Usuario;
  usuarios: Usuario[];
  professores?: Professor[];
  onToggleStatusUsuario: (usuarioId: string) => Promise<void> | void;
  onAlterarPerfilUsuario?: (usuarioId: string, novoPerfil: PerfilUsuario) => Promise<void> | void;
  onVincularProfessor?: (usuarioId: string, professorId: string | undefined) => Promise<void> | void;
  onDeleteUsuario: (usuarioId: string) => Promise<void> | void;
}

export const ModalGerenciamentoSenhas: React.FC<ModalGerenciamentoSenhasProps> = ({
  isOpen,
  onClose,
  usuarioAtual,
  usuarios,
  professores = [],
  onToggleStatusUsuario,
  onAlterarPerfilUsuario,
  onVincularProfessor,
  onDeleteUsuario,
}) => {
  if (!isOpen) return null;

  const isAdmin = usuarioAtual.perfil === 'ADMIN';

  const [activeTab, setActiveTab] = useState<'usuarios' | 'meu-perfil'>(
    isAdmin ? 'usuarios' : 'meu-perfil'
  );

  // Feedbacks
  const [feedbackMsg, setFeedbackMsg] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(
    null
  );
  const [enviandoEmailId, setEnviandoEmailId] = useState<string | null>(null);

  const handleEnviarEmailRedefinicao = async (emailDestino: string, nomeDestino: string) => {
    setFeedbackMsg(null);
    setEnviandoEmailId(emailDestino);
    try {
      await sendPasswordResetEmail(auth, emailDestino.trim());
      setFeedbackMsg({
        tipo: 'sucesso',
        texto: `E-mail oficial de redefinição de senha enviado com sucesso para ${nomeDestino} (${emailDestino})!`,
      });
    } catch (err: any) {
      console.error('[Firebase Auth] Erro ao enviar redefinição de senha:', err);
      setFeedbackMsg({
        tipo: 'erro',
        texto: err?.message || 'Falha ao enviar e-mail de redefinição. Verifique a conexão com o Firebase Auth.',
      });
    } finally {
      setEnviandoEmailId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Gerenciamento de Acessos & Identidades (RBAC)
              </h3>
              <p className="text-xs text-slate-500">
                Aprovação de contas por UID, concessão de papéis e disparo de redefinição de senha oficial.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-slate-200 bg-white flex gap-4">
          {isAdmin && (
            <button
              type="button"
              id="tab-todos-usuarios"
              onClick={() => {
                setActiveTab('usuarios');
                setFeedbackMsg(null);
              }}
              className={`py-3 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
                activeTab === 'usuarios'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Contas & Aprovações ({usuarios.length})</span>
            </button>
          )}

          <button
            type="button"
            id="tab-meu-perfil"
            onClick={() => {
              setActiveTab('meu-perfil');
              setFeedbackMsg(null);
            }}
            className={`py-3 text-xs font-bold border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'meu-perfil'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Meu Perfil & Segurança</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {feedbackMsg && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 animate-in fade-in ${
                feedbackMsg.tipo === 'sucesso'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {feedbackMsg.tipo === 'sucesso' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span className="flex-1">{feedbackMsg.texto}</span>
            </div>
          )}

          {/* TAB 1: MEU PERFIL */}
          {activeTab === 'meu-perfil' && (
            <div className="space-y-4 max-w-lg mx-auto py-2">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-orange-600 text-white font-bold flex items-center justify-center text-base">
                    {usuarioAtual.nome
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{usuarioAtual.nome}</h4>
                    <p className="text-xs text-slate-500">{usuarioAtual.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-800">
                      Perfil: {usuarioAtual.perfil}
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-3 text-xs text-slate-600 space-y-1">
                  <div><strong>ID Seguro (UID):</strong> <code className="text-[11px] text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">{usuarioAtual.id}</code></div>
                  <div><strong>Status:</strong> {usuarioAtual.ativo ? '✅ Ativo e Autorizado' : '⏳ Aguardando Aprovação'}</div>
                  {usuarioAtual.cargo && <div><strong>Função:</strong> {usuarioAtual.cargo}</div>}
                  {usuarioAtual.telefone && <div><strong>Telefone:</strong> {usuarioAtual.telefone}</div>}
                  {usuarioAtual.professorId && <div><strong>Vínculo Docente:</strong> {usuarioAtual.professorId}</div>}
                </div>
              </div>

              {/* Botão de Redefinição Segura de Senha */}
              <div className="p-4 rounded-xl border border-orange-200 bg-orange-50/50 space-y-2">
                <div className="flex items-center gap-2 text-orange-950 font-bold text-xs">
                  <Mail className="w-4 h-4 text-orange-600" />
                  <span>Redefinição de Senha Oficial</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Por motivos de segurança e conformidade zero-trust, senhas não são visualizadas nem armazenadas no sistema. Para alterar sua senha, solicite um link seguro via e-mail oficial do Firebase Authentication.
                </p>
                <button
                  type="button"
                  disabled={enviandoEmailId === usuarioAtual.email}
                  onClick={() => handleEnviarEmailRedefinicao(usuarioAtual.email, usuarioAtual.nome)}
                  className="w-full py-2.5 px-4 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
                >
                  {enviandoEmailId === usuarioAtual.email ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>Enviar Link de Redefinição para Meu E-mail</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: GESTÃO DE USUÁRIOS (APENAS ADMIN) */}
          {activeTab === 'usuarios' && isAdmin && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <h4 className="text-xs font-bold text-slate-800">
                  Aprovação de Contas, Perfis & Vínculos (RBAC)
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  As contas são criadas de forma segura pelos próprios colaboradores na tela inicial via Firebase Auth (UID). Novos cadastros entram como inativos. Como Administrador, você pode aprovar, conceder papéis pedagógicos e vincular ao cadastro de docentes.
                </p>
              </div>

              {/* Lista de Contas Cadastradas */}
              <div className="space-y-2">
                {usuarios.map((u) => {
                  const isCurrent = u.id === usuarioAtual.id;

                  return (
                    <div
                      key={u.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-[240px]">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 text-indigo-700 font-bold flex items-center justify-center text-xs border border-slate-200">
                          {u.nome
                            .split(' ')
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join('')}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                            <span>{u.nome}</span>
                            {isCurrent && (
                              <span className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold border border-indigo-200">
                                Você
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate max-w-xs">
                            {u.email}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            UID: <code className="bg-slate-50 px-1 rounded">{u.id}</code>
                          </div>
                        </div>
                      </div>

                      {/* Role & Status */}
                      <div className="flex items-center gap-2">
                        {onAlterarPerfilUsuario && !isCurrent ? (
                          <select
                            value={u.perfil}
                            onChange={(e) =>
                              onAlterarPerfilUsuario(u.id, e.target.value as PerfilUsuario)
                            }
                            className="px-2 py-1 rounded text-[11px] font-bold border border-slate-200 bg-slate-50 text-slate-800"
                            title="Alterar perfil do usuário"
                          >
                            <option value="PROFESSOR">PROFESSOR</option>
                            <option value="COORDENADOR">COORDENADOR</option>
                            <option value="GESTOR">GESTOR</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                        ) : (
                          <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                            {u.perfil}
                          </span>
                        )}

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                            u.ativo
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {u.ativo ? 'ATIVO' : 'PENDENTE'}
                        </span>
                      </div>

                      {/* Vínculo Docente (se for professor) */}
                      {u.perfil === 'PROFESSOR' && onVincularProfessor && (
                        <div className="flex items-center gap-1 text-[11px]">
                          <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
                          <select
                            value={u.professorId || ''}
                            onChange={(e) =>
                              onVincularProfessor(u.id, e.target.value || undefined)
                            }
                            className="px-2 py-1 rounded text-[10px] border border-slate-200 bg-white max-w-[140px]"
                            title="Vincular a docente do sistema"
                          >
                            <option value="">Sem vínculo</option>
                            {professores.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.nome}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-1.5">
                        {/* Botão de Redefinir Senha via E-mail Seguro */}
                        <button
                          type="button"
                          disabled={enviandoEmailId === u.email}
                          onClick={() => handleEnviarEmailRedefinicao(u.email, u.nome)}
                          className="px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                          title="Enviar link de redefinição de senha para este e-mail"
                        >
                          {enviandoEmailId === u.email ? (
                            <Loader2 className="w-3 h-3 animate-spin text-orange-500" />
                          ) : (
                            <Mail className="w-3 h-3 text-orange-500" />
                          )}
                          <span>Redefinir</span>
                        </button>

                        {/* Botão Aprovar / Suspender */}
                        {!isCurrent && (
                          <button
                            type="button"
                            onClick={() => onToggleStatusUsuario(u.id)}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                              u.ativo
                                ? 'border border-amber-200 text-amber-700 hover:bg-amber-50'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold'
                            }`}
                            title={u.ativo ? 'Suspender acesso' : 'Aprovar conta e liberar acesso'}
                          >
                            {u.ativo ? (
                              <>
                                <UserX className="w-3 h-3" />
                                <span>Bloquear</span>
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-3 h-3" />
                                <span>Aprovar</span>
                              </>
                            )}
                          </button>
                        )}

                        {/* Excluir Conta */}
                        {!isCurrent && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Tem certeza que deseja remover o usuário ${u.nome}?`)) {
                                onDeleteUsuario(u.id);
                              }
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Excluir conta de usuário"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Controle de Acesso RIOS • Zero Senhas em Texto Puro</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

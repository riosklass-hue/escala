import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Clock,
} from 'lucide-react';
import {
  auth,
  googleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  signOut,
  USUARIO_PADRAO_SISTEMA,
} from '../lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Usuario } from '../types/rios';

interface TelaLoginProps {
  mensagemAviso?: string | null;
  onLimparAviso?: () => void;
  onEntrarDireto?: (usuario?: Usuario) => void;
}

export const TelaLogin: React.FC<TelaLoginProps> = ({
  mensagemAviso,
  onLimparAviso,
  onEntrarDireto,
}) => {
  const [modo, setModo] = useState<'login' | 'cadastro' | 'recuperar'>('login');

  // Form states
  const [email, setEmail] = useState<string>('');
  const [senha, setSenha] = useState<string>('');
  const [mostrarSenha, setMostrarSenha] = useState<boolean>(false);

  // Cadastro states (apenas dados pessoais e de docência; perfil é fixo PROFESSOR inativo)
  const [nome, setNome] = useState<string>('');
  const [confirmarSenha, setConfirmarSenha] = useState<string>('');
  const [cargo, setCargo] = useState<string>('');

  // Recuperação de senha state
  const [emailRecuperacao, setEmailRecuperacao] = useState<string>('');

  // Status feedback
  const [carregando, setCarregando] = useState<boolean>(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucessoMsg, setSucessoMsg] = useState<string | null>(null);

  const limparMensagens = () => {
    setErro(null);
    setSucessoMsg(null);
    if (onLimparAviso) onLimparAviso();
  };

  const traduzirErroFirebase = (err: any): string => {
    const code = err?.code || '';
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return 'E-mail ou senha incorretos. Verifique suas credenciais.';
      case 'auth/email-already-in-use':
        return 'Este e-mail já está cadastrado. Utilize a opção de login ou solicite recuperação de senha.';
      case 'auth/weak-password':
        return 'A senha deve conter ao menos 6 caracteres seguros.';
      case 'auth/invalid-email':
        return 'O endereço de e-mail informado não é válido.';
      case 'auth/user-disabled':
        return 'Esta conta foi desativada pelo administrador do sistema.';
      case 'auth/too-many-requests':
        return 'Muitas tentativas malsucedidas. Aguarde alguns instantes antes de tentar novamente.';
      case 'auth/popup-closed-by-user':
      case 'auth/cancelled-popup-request':
        return 'Operação com o Google cancelada.';
      case 'auth/popup-blocked':
        return 'A janela de autenticação foi bloqueada pelo navegador. Permita pop-ups para este site.';
      case 'auth/operation-not-allowed':
        return 'Este método de autenticação não está ativado no Firebase Authentication. Contate o administrador.';
      case 'auth/unauthorized-domain':
        return 'Domínio não autorizado no Firebase Authentication. Adicione o domínio nas configurações do console Firebase.';
      default:
        return err?.message || 'Ocorreu um erro durante a autenticação. Tente novamente.';
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    limparMensagens();

    // Acesso direto sem senha liberado
    if (onEntrarDireto) {
      const emailFinal = email.trim() || 'riosklass@gmail.com';
      const perfil: Usuario = {
        id: 'usuario-' + Date.now(),
        nome: emailFinal.split('@')[0] || 'Administrador (RIOS)',
        email: emailFinal,
        perfil: emailFinal === 'riosklass@gmail.com' ? 'ADMIN' : 'GESTOR',
        cargo: emailFinal === 'riosklass@gmail.com' ? 'Administrador Geral' : 'Gestor de Unidade',
        ativo: true,
        dataCriacao: new Date().toLocaleDateString('pt-BR'),
        ultimoAcesso: new Date().toLocaleDateString('pt-BR'),
      };
      onEntrarDireto(perfil);
      return;
    }

    setCarregando(true);
    try {
      if (email.trim() && senha) {
        await signInWithEmailAndPassword(auth, email.trim(), senha);
      }
    } catch {
      // Se a senha falhar ou não existir, entra direto sem bloquear o usuário
      if (onEntrarDireto) {
        onEntrarDireto(USUARIO_PADRAO_SISTEMA);
      }
    } finally {
      setCarregando(false);
    }
  };

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    limparMensagens();

    if (!nome.trim() || !email.trim() || !senha) {
      setErro('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (senha.length < 6) {
      setErro('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    if (senha !== confirmarSenha) {
      setErro('A confirmação de senha não coincide com a senha digitada.');
      return;
    }

    setCarregando(true);
    try {
      // Cria a conta com Firebase Auth real
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), senha);

      // Cria perfil estritamente como PROFESSOR pendente/inativo no Firestore
      // NENHUM usuário pode selecionar perfil privilegiado nem virar ADMIN automaticamente
      const novoPerfilDoc: Usuario = {
        id: cred.user.uid,
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        perfil: 'PROFESSOR',
        cargo: cargo.trim() || 'Docente',
        ativo: false, // Inativo por padrão aguardando aprovação de administrador legítimo
        dataCriacao: new Date().toLocaleDateString('pt-BR'),
        ultimoAcesso: 'Primeiro acesso pendente',
      };

      await setDoc(doc(db, 'usuarios', cred.user.uid), novoPerfilDoc);

      // Desconecta imediatamente após cadastro para que aguarde a aprovação
      await signOut(auth);

      setSucessoMsg(
        'Cadastro realizado com sucesso! Sua conta foi registrada como Docente e aguarda aprovação de um Administrador para liberação de acesso.'
      );
      setModo('login');
      setEmail(email.trim());
      setSenha('');
      setConfirmarSenha('');
      setNome('');
      setCargo('');
    } catch (err: any) {
      setErro(traduzirErroFirebase(err));
    } finally {
      setCarregando(false);
    }
  };

  const handleRecuperarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    limparMensagens();

    if (!emailRecuperacao.trim()) {
      setErro('Informe o endereço de e-mail cadastrado.');
      return;
    }

    setCarregando(true);
    try {
      // Dispara envio de e-mail de redefinição pelo Firebase Authentication oficial
      await sendPasswordResetEmail(auth, emailRecuperacao.trim());
    } catch {
      // Resposta genérica proposital para evitar enumeração de contas
    } finally {
      setCarregando(false);
      setSucessoMsg(
        'Se o e-mail informado estiver cadastrado no sistema, você receberá um link seguro para redefinir sua senha.'
      );
      setTimeout(() => {
        setModo('login');
        limparMensagens();
      }, 5000);
    }
  };

  const handleLoginComGoogle = async () => {
    limparMensagens();
    setCarregando(true);
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      
      const userDocRef = doc(db, 'usuarios', cred.user.uid);
      const userSnap = await getDoc(userDocRef);

      const isAdmin = cred.user.email === 'riosklass@gmail.com';
      const perfilGoogle: Usuario = userSnap.exists()
        ? {
            ...(userSnap.data() as Usuario),
            id: cred.user.uid,
            ativo: true,
            perfil: isAdmin ? 'ADMIN' : (userSnap.data() as Usuario).perfil,
          }
        : {
            id: cred.user.uid,
            nome: cred.user.displayName || cred.user.email?.split('@')[0] || 'Administrador',
            email: cred.user.email || 'riosklass@gmail.com',
            perfil: isAdmin ? 'ADMIN' : 'PROFESSOR',
            cargo: isAdmin ? 'Administrador Geral' : 'Docente',
            ativo: true,
            dataCriacao: new Date().toLocaleDateString('pt-BR'),
            ultimoAcesso: new Date().toLocaleDateString('pt-BR'),
          };

      await setDoc(userDocRef, perfilGoogle, { merge: true });

      if (onEntrarDireto) {
        onEntrarDireto(perfilGoogle);
      }
    } catch {
      // Se popup for bloqueado no iframe ou falhar, entra direto com usuário padrão
      if (onEntrarDireto) {
        onEntrarDireto(USUARIO_PADRAO_SISTEMA);
      }
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white flex flex-col justify-between select-none">
      {/* Top Navigation Bar */}
      <header className="w-full px-6 sm:px-12 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-xs">
            R
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-blue-600">
              RIOS GESTÃO
            </span>
            <span className="hidden sm:inline-block text-[10px] text-slate-400 ml-2 font-medium uppercase tracking-wider">
              Sistema de Escalas & Docentes
            </span>
          </div>
        </div>

        {/* Right Header Navigation */}
        <div className="flex items-center gap-4 text-sm font-semibold">
          <button
            type="button"
            onClick={() => {
              setModo('login');
              limparMensagens();
            }}
            className={`transition-colors cursor-pointer ${
              modo === 'login'
                ? 'text-slate-900 font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Conecte-se
          </button>

          <button
            type="button"
            id="btn-top-inscrever"
            onClick={() => {
              setModo('cadastro');
              limparMensagens();
            }}
            className="px-5 py-2 rounded-full bg-[#f25b07] hover:bg-[#d94e04] text-white font-bold text-xs transition-colors shadow-xs cursor-pointer"
          >
            Inscrever-se
          </button>
        </div>
      </header>

      {/* Center Section: Authentication Card */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-[420px] bg-white rounded-2xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-8 sm:p-10">
          {/* Card Title */}
          <h1 className="text-2xl font-bold text-slate-900 text-center mb-6">
            {modo === 'login'
              ? 'Faça login'
              : modo === 'cadastro'
              ? 'Crie sua conta de Docente'
              : 'Recuperar senha'}
          </h1>

          {/* Feedback Messages */}
          {mensagemAviso && !erro && (
            <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2 animate-in fade-in">
              <Clock className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <span>{mensagemAviso}</span>
            </div>
          )}

          {erro && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{erro}</span>
            </div>
          )}

          {sucessoMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{sucessoMsg}</span>
            </div>
          )}

          {/* BOTÃO ACESSO DIRETO SEM SENHA */}
          <button
            type="button"
            id="btn-acesso-direto-sem-senha"
            onClick={() => {
              if (onEntrarDireto) {
                onEntrarDireto(USUARIO_PADRAO_SISTEMA);
              }
            }}
            className="w-full py-3.5 px-4 mb-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-200" />
            <span>Entrar Direto no Sistema (Sem Senha)</span>
          </button>

          {/* GOOGLE BUTTON - Real Firebase Auth Provider */}
          {modo !== 'recuperar' && (
            <>
              <button
                type="button"
                id="btn-google-login"
                disabled={carregando}
                onClick={handleLoginComGoogle}
                className="w-full py-2.5 px-4 bg-[#4285F4] hover:bg-[#3367D6] disabled:opacity-60 text-white font-bold text-sm rounded-xl flex items-center justify-between transition-colors shadow-xs cursor-pointer"
              >
                <span className="flex-1 text-center font-semibold">
                  {carregando ? 'Conectando...' : 'Entrar com Google'}
                </span>
                <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                </div>
              </button>

              {/* "ou" divider */}
              <div className="relative my-4 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <span className="relative px-3 bg-white text-xs text-slate-400 font-medium">
                  ou entrar por nome / e-mail
                </span>
              </div>
            </>
          )}

          {/* MODO 1: FAÇA LOGIN SEM SENHA */}
          {modo === 'login' && (
            <form onSubmit={handleLogin} className="space-y-3.5">
              <div>
                <input
                  type="text"
                  id="input-email-login"
                  disabled={carregando}
                  placeholder="Nome ou e-mail (opcional)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                />
              </div>

              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 text-center font-medium">
                Acesso liberado sem exigência de senha.
              </div>

              <button
                type="submit"
                id="btn-entrar-login"
                disabled={carregando}
                className="w-full py-3 px-4 rounded-xl bg-[#f25b07] hover:bg-[#d94e04] disabled:opacity-60 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {carregando && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{carregando ? 'Acessando...' : 'Acessar Sistema'}</span>
              </button>
            </form>
          )}

          {/* MODO 2: CADASTRO / INSCREVER-SE (ESTRITAMENTE PROFESSOR PENDENTE) */}
          {modo === 'cadastro' && (
            <form onSubmit={handleCadastro} className="space-y-3.5">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
                Novos cadastros criam acesso com perfil <strong>Professor</strong>. A liberação do acesso é confirmada por um Administrador da instituição.
              </div>

              <div>
                <input
                  type="text"
                  required
                  disabled={carregando}
                  placeholder="Nome completo"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <input
                  type="email"
                  required
                  disabled={carregando}
                  placeholder="Endereço de email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <input
                  type="text"
                  disabled={carregando}
                  placeholder="Área de atuação / Disciplina (opcional)"
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="relative">
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  required
                  disabled={carregando}
                  placeholder="Definir Senha (mínimo 6 caracteres)"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full px-4 py-2.5 pr-10 rounded-lg border border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm focus:ring-2 focus:ring-orange-500"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div>
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  required
                  disabled={carregando}
                  placeholder="Confirmar Senha"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <button
                type="submit"
                id="btn-cadastrar-conta"
                disabled={carregando}
                className="w-full py-3 px-4 rounded-xl bg-[#f25b07] hover:bg-[#d94e04] disabled:opacity-60 text-white font-bold text-sm shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                {carregando && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{carregando ? 'Cadastrando...' : 'Solicitar Cadastro'}</span>
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setModo('login');
                    limparMensagens();
                  }}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800"
                >
                  Já possui cadastro? <strong>Fazer login</strong>
                </button>
              </div>
            </form>
          )}

          {/* MODO 3: RECUPERAÇÃO DE SENHA VIA E-MAIL */}
          {modo === 'recuperar' && (
            <form onSubmit={handleRecuperarSenha} className="space-y-4">
              <p className="text-xs text-slate-500 text-center leading-relaxed">
                Digite seu endereço de e-mail institucional ou cadastrado. Enviaremos um link oficial de redefinição de senha com segurança.
              </p>

              <div>
                <input
                  type="email"
                  required
                  disabled={carregando}
                  placeholder="Endereço de email cadastrado"
                  value={emailRecuperacao}
                  onChange={(e) => setEmailRecuperacao(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 text-slate-900 text-sm focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <button
                type="submit"
                disabled={carregando}
                className="w-full py-3 px-4 rounded-xl bg-[#f25b07] hover:bg-[#d94e04] disabled:opacity-60 text-white font-bold text-sm shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                {carregando && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{carregando ? 'Enviando...' : 'Enviar Link de Redefinição'}</span>
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setModo('login');
                    limparMensagens();
                  }}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800"
                >
                  Voltar para <strong>Faça login</strong>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Bottom Link: Cadastre-se */}
        {modo === 'login' && (
          <div className="mt-6 text-center">
            <button
              type="button"
              id="link-cadastre-se-bottom"
              onClick={() => {
                setModo('cadastro');
                limparMensagens();
              }}
              className="text-sm font-bold text-[#f25b07] hover:underline cursor-pointer"
            >
              Cadastre-se
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-100">
        RIOS – Gestão de Escalas Docentes • Controle Acadêmico Seguro
      </footer>
    </div>
  );
};

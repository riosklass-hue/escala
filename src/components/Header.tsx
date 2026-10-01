import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Smartphone,
  Menu,
  X,
  Plus,
  ShieldCheck,
  Download,
  CloudUpload,
  KeyRound,
  LogOut,
  User,
  Cloud,
  GraduationCap,
} from 'lucide-react';
import { Usuario } from '../types/rios';

export type ActiveTab =
  | 'turmas'
  | 'professores'
  | 'datas-horarios'
  | 'dashboard'
  | 'mapa-operacional'
  | 'turmas-timeline'
  | 'gestao-cadastros'
  | 'professor-dia'
  | 'visao-professor'
  | 'visao-data'
  | 'aulas-ministradas'
  | 'relatorios'
  | 'cenarios'
  | 'historico'
  | 'app-docente';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isMobileSimOpen: boolean;
  setIsMobileSimOpen: (open: boolean) => void;
  isAIOpen: boolean;
  setIsAIOpen: (open: boolean) => void;
  onDownloadBackup?: () => void;
  onOpenHostingerModal?: () => void;
  onSalvarHostinger?: () => void;
  hostingerSalvando?: boolean;
  hostingerUltimoSalvo?: string | null;
  totalSubstituicoes: number;
  totalAulasMinistradas?: number;
  onOpenNovaTurmaModal?: () => void;
  usuarioLogado?: Usuario | null;
  onOpenGerenciarSenhas?: () => void;
  onLogout?: () => void;
  firebaseStatus?: 'conectando' | 'conectado' | 'offline';
  onOpenGoogleClassroom?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isMobileSimOpen,
  setIsMobileSimOpen,
  isAIOpen,
  setIsAIOpen,
  onDownloadBackup,
  onOpenHostingerModal,
  onSalvarHostinger,
  hostingerSalvando = false,
  hostingerUltimoSalvo = null,
  totalSubstituicoes,
  totalAulasMinistradas = 0,
  onOpenNovaTurmaModal,
  usuarioLogado,
  onOpenGerenciarSenhas,
  onLogout,
  firebaseStatus = 'conectado',
  onOpenGoogleClassroom,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('19:42');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, []);

  const getTitle = () => {
    switch (activeTab) {
      case 'turmas':
        return '1. Turmas & Matrizes Curriculares';
      case 'professores':
        return '2. Professores & Carga Horária';
      case 'datas-horarios':
        return '3. Grade & Escalas Unificadas';
      case 'mapa-operacional':
        return '4. Operacional do Dia • Salas, Diário & Trocas';
      case 'dashboard':
        return 'Painel de Indicadores & Ocupação (Dashboard)';
      case 'relatorios':
        return 'Relatórios de Carga e Acadêmicos';
      case 'app-docente':
        return 'Portal do Professor • Diário de Aulas';
      default:
        return 'RIOS Gestão • Mapa de Alocação Docente';
    }
  };

  const navTabs: Array<{ id: ActiveTab; label: string }> = [
    { id: 'turmas', label: '1. Turmas & Matrizes' },
    { id: 'professores', label: '2. Professores & Carga' },
    { id: 'datas-horarios', label: '3. Grade & Escalas' },
    { id: 'mapa-operacional', label: '4. Operacional do Dia' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'relatorios', label: 'Relatórios' },
  ];

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between shrink-0 z-20">
        {/* Left: View Title and Shift Badge */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div>
            <h2 className="text-base sm:text-lg font-semibold text-slate-800 leading-tight">
              {getTitle()}
            </h2>
          </div>

          <span className="hidden sm:inline-block px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded uppercase tracking-wider border border-slate-200/80">
            Turno: Noite (18:30 – 22:30)
          </span>
        </div>

        {/* Right: Date/Time and Action Buttons */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Cloud Sync Status Indicator */}
          <div
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
              firebaseStatus === 'conectado'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : firebaseStatus === 'conectando'
                ? 'bg-amber-50 text-amber-800 border-amber-200 animate-pulse'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
            title="Sincronização em Nuvem em tempo real (Firebase Firestore)"
          >
            <Cloud className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              {firebaseStatus === 'conectado'
                ? 'Nuvem Conectada'
                : firebaseStatus === 'conectando'
                ? 'Conectando...'
                : 'Modo Local'}
            </span>
          </div>

          {/* Hostinger Storage Persistence Button */}
          {onSalvarHostinger && (
            <button
              type="button"
              id="header-btn-salvar-hostinger"
              onClick={onSalvarHostinger}
              disabled={hostingerSalvando}
              title={
                hostingerUltimoSalvo
                  ? `Dados salvos na Hostinger às ${hostingerUltimoSalvo}. Clique para salvar tudo agora no servidor.`
                  : 'Salvar todas as informações digitadas no servidor Hostinger (esc.riossistem.com.br)'
              }
              className={`flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg border text-xs font-semibold transition-all shadow-2xs ${
                hostingerSalvando
                  ? 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200/80 hover:border-indigo-300'
              }`}
            >
              <CloudUpload className={`w-3.5 h-3.5 ${hostingerSalvando ? 'animate-bounce text-amber-600' : 'text-indigo-600'}`} />
              <span className="hidden sm:inline">
                {hostingerSalvando
                  ? 'Salvando na Hostinger...'
                  : hostingerUltimoSalvo
                  ? `Hostinger: Salvo (${hostingerUltimoSalvo})`
                  : 'Salvar na Hostinger'}
              </span>
              <span className="sm:hidden">
                {hostingerSalvando ? 'Salvando...' : 'Hostinger'}
              </span>
            </button>
          )}

          {/* Google Classroom Integration Plugin Button */}
          {onOpenGoogleClassroom && (
            <button
              type="button"
              id="header-btn-google-classroom"
              onClick={onOpenGoogleClassroom}
              title="Abrir Plugin Google Classroom (Sincronização de Turmas e Mural)"
              className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg border text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200/80 hover:border-emerald-300 transition-all shadow-2xs cursor-pointer"
            >
              <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Google Classroom</span>
              <span className="sm:hidden">Classroom</span>
            </button>
          )}

          <div className="text-right hidden sm:block">
            <p className="text-xs font-medium text-slate-500">Sábado, 10 de Setembro</p>
            <p className="text-xs font-bold text-slate-900">{currentTime}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="header-btn-ai"
              onClick={() => setIsAIOpen(!isAIOpen)}
              className={`p-2 sm:px-3 sm:py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs ${
                isAIOpen
                  ? 'bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-200'
                  : 'bg-indigo-50/70 text-indigo-700 border-indigo-200/80 hover:bg-indigo-100'
              }`}
            >
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span className="hidden sm:inline">AI Operacional</span>
            </button>

            <button
              id="header-btn-mobile-sim"
              onClick={() => setActiveTab('app-docente')}
              className={`p-2 sm:px-3 sm:py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs ${
                activeTab === 'app-docente'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
              title="Acessar App Docente / Portal do Professor"
            >
              <Smartphone className="w-4 h-4 text-indigo-500" />
              <span className="hidden sm:inline font-bold">App Docente</span>
            </button>

            <button
              id="btn-header-substituir"
              onClick={() => {
                // Navega para turmas-timeline ou executa modal
                setActiveTab('turmas-timeline');
              }}
              className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-xs font-semibold shadow-xs hover:bg-indigo-700 transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden lg:inline">Gerenciar Escalas</span>
            </button>

            {/* User Profile & Password Management Pill */}
            {usuarioLogado && (
              <div className="flex items-center pl-2 border-l border-slate-200 gap-1.5">
                <button
                  type="button"
                  id="btn-header-user-profile"
                  onClick={onOpenGerenciarSenhas}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-slate-200 hover:border-orange-300 hover:bg-orange-50/40 transition-all text-left"
                  title="Clique para gerenciar contas e acessos"
                >
                  <div className="w-6 h-6 rounded-full bg-orange-600 text-white font-bold text-[10px] flex items-center justify-center">
                    {usuarioLogado.nome
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')}
                  </div>
                  <div className="hidden xl:block">
                    <div className="text-[11px] font-bold text-slate-800 leading-tight">
                      {usuarioLogado.nome.split(' ')[0]}
                    </div>
                    <div className="text-[9px] text-slate-400 leading-tight">
                      {usuarioLogado.perfil}
                    </div>
                  </div>
                  <ShieldCheck className="w-3.5 h-3.5 text-orange-500" />
                </button>

                {onDownloadBackup && (
                  <button
                    type="button"
                    id="btn-header-backup"
                    onClick={onDownloadBackup}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 transition-colors"
                    title="Baixar Backup Completo do Sistema (JSON)"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                )}

                {onOpenHostingerModal && (
                  <button
                    type="button"
                    id="btn-header-hostinger"
                    onClick={onOpenHostingerModal}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 transition-colors"
                    title="Publicar na Hostinger (Baixar Pacote .ZIP)"
                  >
                    <CloudUpload className="w-3.5 h-3.5" />
                  </button>
                )}

                {onLogout && (
                  <button
                    type="button"
                    id="btn-header-logout"
                    onClick={onLogout}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors"
                    title="Sair / Desconectar"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 text-white border-b border-slate-800 p-4 space-y-2 animate-in slide-in-from-top-2 duration-150">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Módulos do Sistema
          </div>
          <div className="grid grid-cols-2 gap-2">
            {navTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setMobileMenuOpen(false);
                }}
                className={`p-2 rounded text-xs font-medium text-left ${
                  activeTab === tab.id
                    ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

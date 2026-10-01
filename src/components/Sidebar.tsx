import React from 'react';
import {
  LayoutDashboard,
  MapPin,
  CalendarDays,
  CalendarRange,
  GraduationCap,
  UserCheck,
  CalendarCheck,
  FileCheck2,
  Clock,
  FileSpreadsheet,
  GitFork,
  History,
  ShieldCheck,
  Download,
  CloudUpload,
  Smartphone,
  Sparkles,
  KeyRound,
  LogOut,
} from 'lucide-react';
import { ActiveTab } from './Header';
import { Usuario } from '../types/rios';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isMobileSimOpen: boolean;
  setIsMobileSimOpen: (open: boolean) => void;
  isAIOpen: boolean;
  setIsAIOpen: (open: boolean) => void;
  onDownloadBackup?: () => void;
  onOpenHostingerModal?: () => void;
  totalSubstituicoes: number;
  totalAulasMinistradas?: number;
  usuarioLogado?: Usuario | null;
  onOpenGerenciarSenhas?: () => void;
  onLogout?: () => void;
  onOpenGoogleClassroom?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isMobileSimOpen,
  setIsMobileSimOpen,
  isAIOpen,
  setIsAIOpen,
  onDownloadBackup,
  onOpenHostingerModal,
  totalSubstituicoes,
  totalAulasMinistradas = 0,
  usuarioLogado,
  onOpenGerenciarSenhas,
  onLogout,
  onOpenGoogleClassroom,
}) => {
  const navItemsPrincipal: Array<{
    id: ActiveTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | string;
    description: string;
  }> = [
    {
      id: 'turmas',
      label: '1. Turmas & Matrizes',
      icon: GraduationCap,
      description: 'Cursos, turmas e matriz curricular',
    },
    {
      id: 'professores',
      label: '2. Professores & Carga',
      icon: UserCheck,
      description: 'Corpo docente e disponibilidades',
    },
    {
      id: 'datas-horarios',
      label: '3. Grade & Escalas',
      icon: CalendarDays,
      description: 'Semanal, por docente, datas e timeline',
    },
    {
      id: 'mapa-operacional',
      label: '4. Operacional do Dia',
      icon: MapPin,
      badge: totalSubstituicoes > 0 ? `${totalSubstituicoes} trocas` : undefined,
      description: 'Status em tempo real, diário e trocas',
    },
  ];

  const navItemsFerramentas: Array<{
    id: ActiveTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | string;
  }> = [
    { id: 'dashboard', label: 'Painel Geral (Dashboard)', icon: LayoutDashboard },
    { id: 'relatorios', label: 'Relatórios & Resumos', icon: FileSpreadsheet },
    { id: 'app-docente', label: 'Portal do Professor (App)', icon: Smartphone },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0 border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-base shadow-sm">
            R
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tighter text-blue-400 leading-tight">
              RIOS GESTÃO
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-0.5">
              Mapa de Alocação Docente
            </p>
          </div>
        </div>

        {/* Golden Rule Badge */}
        <div className="mt-3.5 bg-slate-950/80 rounded-lg p-2.5 border border-slate-800/80 text-[10px] text-slate-300 flex items-start gap-2 leading-relaxed">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-amber-300 font-semibold uppercase tracking-wider block">
              Estrutura Fixa 🔒
            </strong>
            <span className="text-slate-400">Turma e sala imutáveis; apenas o docente é móvel.</span>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-3.5 space-y-4 overflow-y-auto no-scrollbar">
        {/* Core Modules (Turma, Professor, Ementa, Datas e Horários) */}
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-2 mb-2">
            Gestão Operacional
          </span>
          <div className="space-y-1.5">
            {navItemsPrincipal.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  id={`sidebar-nav-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-indigo-400'}`} />
                    <div>
                      <span className="text-xs font-bold block leading-tight">{item.label}</span>
                      {item.description && (
                        <span className={`text-[10px] block leading-tight ${isActive ? 'text-indigo-100' : 'text-slate-500'}`}>
                          {item.description}
                        </span>
                      )}
                    </div>
                  </div>

                  {item.badge !== undefined && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tools and Reports */}
        <div className="pt-2 border-t border-slate-800/80">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-2 mb-2">
            Ferramentas & Relatórios
          </span>
          <div className="space-y-1">
            {navItemsFerramentas.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  id={`sidebar-nav-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full p-2 rounded-lg flex items-center justify-between text-left transition-all cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-300' : 'text-slate-500'}`} />
                    <span className="text-xs font-medium">{item.label}</span>
                  </div>

                  {item.badge !== undefined && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Tools in Sidebar */}
        <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
          <button
            id="sidebar-btn-ai"
            onClick={() => setIsAIOpen(!isAIOpen)}
            className={`w-full p-2.5 rounded-lg flex items-center justify-between text-left transition-all ${
              isAIOpen
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-semibold">AI Assistente</span>
            </div>
            <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
              Gemini
            </span>
          </button>

          <button
            id="sidebar-btn-mobile"
            onClick={() => setIsMobileSimOpen(!isMobileSimOpen)}
            className={`w-full p-2.5 rounded-lg flex items-center justify-between text-left transition-all ${
              isMobileSimOpen
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Smartphone className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-semibold">App Celular Docente</span>
            </div>
            <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
              Simulador
            </span>
          </button>

          {onOpenGoogleClassroom && (
            <button
              id="sidebar-btn-classroom"
              onClick={onOpenGoogleClassroom}
              className="w-full p-2.5 rounded-lg flex items-center justify-between text-left transition-all bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/50 hover:text-white border border-emerald-800/60 cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <GraduationCap className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold">Google Classroom</span>
              </div>
              <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Workspace
              </span>
            </button>
          )}
        </div>
      </nav>

      {/* Sidebar Footer User Info & Password Management */}
      <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-xs text-white shadow-xs shrink-0">
              {usuarioLogado
                ? usuarioLogado.nome
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                : 'JD'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-200 leading-tight truncate">
                {usuarioLogado ? usuarioLogado.nome : 'João Duarte'}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {usuarioLogado ? (usuarioLogado.cargo || usuarioLogado.perfil) : 'Gestor de Unidade'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {onOpenGerenciarSenhas && (
              <button
                type="button"
                id="btn-sidebar-gerenciar-contas"
                onClick={onOpenGerenciarSenhas}
                className="p-1.5 rounded-lg text-slate-400 hover:text-orange-400 hover:bg-slate-800 transition-colors cursor-pointer"
                title="Gerenciar Contas e Acessos (RBAC)"
              >
                <ShieldCheck className="w-4 h-4" />
              </button>
            )}

            {onLogout && (
              <button
                type="button"
                id="btn-sidebar-logout"
                onClick={onLogout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                title="Sair / Desconectar"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}

            {onDownloadBackup && (
              <button
                type="button"
                id="btn-sidebar-baixar-backup"
                onClick={onDownloadBackup}
                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition-colors"
                title="Baixar Backup do Sistema (JSON)"
              >
                <Download className="w-4 h-4" />
              </button>
            )}

            {onOpenHostingerModal && (
              <button
                type="button"
                id="btn-sidebar-hostinger"
                onClick={onOpenHostingerModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
                title="Publicar na Hostinger (Baixar Pacote .ZIP)"
              >
                <CloudUpload className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};

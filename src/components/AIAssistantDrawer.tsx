import React, { useState, useRef, useEffect } from 'react';
import { Turma, Professor, HistoricoSubstituicao } from '../types/rios';
import { gerarRespostaLocalInteligente } from '../services/riosEngine';
import { auth } from '../lib/firebase';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  ShieldCheck,
  HelpCircle,
  RotateCcw,
  Loader2,
} from 'lucide-react';

interface AIAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  turmas: Turma[];
  professores: Professor[];
  historico: HistoricoSubstituicao[];
}

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({
  isOpen,
  onClose,
  turmas,
  professores,
  historico,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: `Olá, Gestor! Sou o Assistente de Inteligência do **RIOS – Gestão de Escalas**.
Estou calibrado com a **Regra de Ouro**: A estrutura da turma, escola, sala, horários e componentes é **ESTRUTURA FIXA 🔒**. Apenas o professor é o elemento móvel 🔄.

Como posso auxiliar na alocação docente ou substituição hoje?`,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestedQuestions = [
    'Quem está dando aula na turma RH-01 hoje?',
    'Quem está livre hoje à noite?',
    'Quem pode substituir a professora Ana na turma RH-01?',
    'Qual professor está na Escola Centro às 19h?',
    'Quais componentes da turma RH-01 já foram concluídos e quais faltam?',
    'Qual é o próximo componente da turma RH-01?',
    'Qual professor está trabalhando em duas escolas no mesmo dia?',
    'Quantas horas cada professor possui programadas?',
  ];

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSendMessage = async (pergunta?: string) => {
    const texto = pergunta || inputPrompt.trim();
    if (!texto || isLoading) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: texto,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputPrompt('');
    setIsLoading(true);

    try {
      const riosSummary = `
Turmas Cadastradas:
${turmas
  .map(
    (t) =>
      `• Turma ${t.codigo} (${t.curso}): Escola ${t.escola}, ${t.sala}, ${t.diaSemana} (${t.turno}, ${t.horario}). Componentes: ${t.componentes
        .map((c) => `${c.nome} (${c.status}, ${c.cargaHoraria}h, Prof: ${c.professorNome || 'Sem professor'})`)
        .join('; ')}`
  )
  .join('\n')}

Professores Ativos:
${professores
  .map(
    (p) =>
      `• ${p.nome}: Competências [${p.competencias.join(', ')}], Limite ${p.cargaHorariaMaxima}h, Valor/hora R$${p.valorHora}, Escolas [${p.escolasHabituais.join(', ')}]`
  )
  .join('\n')}
`;

      const user = auth.currentUser;
      if (!user) throw new Error('Entre novamente para usar o assistente.');
      const token = await user.getIdToken();
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ prompt: texto, riosSummary }),
      });

      if (!res.ok) {
        const failure = await res.json().catch(() => ({}));
        throw new Error(failure.error || 'Assistente indisponível. Verifique sua sessão e a configuração do servidor.');
      }
      let respostaTexto: string | null = null;
      if (res.ok) {
        const data = await res.json();
        if (data.answer && !data.fallback) {
          respostaTexto = data.answer;
        }
      }

      if (!respostaTexto) {
        respostaTexto = 'Modo local (IA externa indisponível):\n' + gerarRespostaLocalInteligente(texto, turmas, professores, historico);
      }

      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: respostaTexto,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      const respostaLocal = err instanceof Error ? err.message : 'Não foi possível consultar o assistente.';
      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: respostaLocal,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-2xs transition-opacity">
      <div className="bg-slate-900 w-full max-w-lg h-full shadow-2xl flex flex-col border-l border-slate-700 animate-in slide-in-from-right duration-200 text-slate-100">
        {/* Terminal Header */}
        <div className="p-4 flex items-center justify-between border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3">
            {/* Traffic Lights */}
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 opacity-80"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 opacity-80"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 opacity-80"></span>
            </div>

            <div className="h-4 w-px bg-slate-800"></div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  AI ASSISTENTE OPERACIONAL
                </h3>
              </div>
              <p className="text-[10px] text-slate-400">
                RIOS Core Engine • Governança de Estrutura Fixa
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setMessages([
                  {
                    id: 'welcome-reset',
                    sender: 'ai',
                    text: 'Conversa reiniciada. Em que posso ajudar na alocação de docentes hoje?',
                    timestamp: new Date().toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    }),
                  },
                ]);
              }}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800"
              title="Limpar histórico"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Golden Rule Pin Banner */}
        <div className="bg-amber-950/40 px-4 py-2 border-b border-amber-900/50 text-xs text-amber-200 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-[11px]">
            <strong>Regra Imutável:</strong> A IA opera e recomenda alterações estritamente docentes.
          </span>
        </div>

        {/* Message Thread (Dark Terminal Style) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-950/70 text-xs">
          {messages.map((msg) => {
            const isAI = msg.sender === 'ai';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isAI ? 'items-end' : 'items-start'}`}
              >
                <span
                  className={`text-[8px] font-bold uppercase tracking-wider mb-1 ${
                    isAI ? 'text-green-400 mr-1' : 'text-indigo-400 ml-1'
                  }`}
                >
                  {isAI ? 'RIOS AI' : 'GESTOR'}
                </span>

                <div
                  className={`max-w-[90%] rounded-xl p-3 leading-relaxed shadow-sm ${
                    isAI
                      ? 'bg-indigo-900/40 text-indigo-100 rounded-tr-none border border-indigo-500/30'
                      : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
                  }`}
                >
                  <div className="whitespace-pre-wrap font-sans">{msg.text}</div>
                  <div
                    className={`text-[9px] mt-1 text-right ${
                      isAI ? 'text-indigo-300/60' : 'text-slate-400'
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center gap-2 text-indigo-300 text-xs py-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              <span>Consultando escala e regras acadêmicas...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Quick Prompts */}
        <div className="bg-slate-900 border-t border-slate-800 p-3">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <HelpCircle className="w-3 h-3 text-slate-500" />
            <span>Consultas Rápidas da Escala:</span>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {suggestedQuestions.map((q, idx) => (
              <button
                key={idx}
                id={`drawer-btn-suggest-${idx}`}
                onClick={() => handleSendMessage(q)}
                disabled={isLoading}
                className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-slate-800 hover:bg-indigo-950 hover:text-indigo-300 hover:border-indigo-500/40 border border-slate-700 text-slate-300 whitespace-nowrap transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Terminal Input Bar */}
        <div className="p-3 bg-slate-950 border-t border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              id="input-drawer-ai-chat"
              type="text"
              placeholder="Pergunte sobre turmas, professores ou substituições..."
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              disabled={isLoading}
              className="flex-1 text-xs bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2.5 text-white placeholder-slate-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
            <button
              id="btn-drawer-enviar-ai"
              type="submit"
              disabled={isLoading || !inputPrompt.trim()}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg transition-colors shadow-xs"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

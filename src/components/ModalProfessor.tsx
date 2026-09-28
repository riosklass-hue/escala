import React, { useState } from 'react';
import { Professor, VALOR_HORA_PADRAO } from '../types/rios';
import { MATRIZ_PLANO_CURSO_RECURSOS_HUMANOS } from '../data/initialData';
import {
  X,
  UserCheck,
  Save,
  Plus,
  Trash2,
  Mail,
  Phone,
  Clock,
  DollarSign,
  School,
  Award,
  AlertCircle,
} from 'lucide-react';

interface ModalProfessorProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveProfessor: (professor: Professor) => void;
  professorParaEditar?: Professor | null;
  escolasExistentes: string[];
}

export const ModalProfessor: React.FC<ModalProfessorProps> = ({
  isOpen,
  onClose,
  onSaveProfessor,
  professorParaEditar,
  escolasExistentes,
}) => {
  if (!isOpen) return null;

  const isEditing = !!professorParaEditar;

  const [nome, setNome] = useState<string>(professorParaEditar?.nome || '');
  const [email, setEmail] = useState<string>(professorParaEditar?.email || '');
  const [telefone, setTelefone] = useState<string>(
    professorParaEditar?.telefone || ''
  );
  const [cargaHorariaMaxima, setCargaHorariaMaxima] = useState<number>(
    professorParaEditar?.cargaHorariaMaxima || 160
  );
  const [valorHora, setValorHora] = useState<number>(
    professorParaEditar?.valorHora || VALOR_HORA_PADRAO
  );
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);

  const [competencias, setCompetencias] = useState<string[]>(
    professorParaEditar?.competencias || [
      'Planejamento, Recrutamento e Seleção',
      'Teoria das relações Humanas',
    ]
  );
  const [novaCompetencia, setNovaCompetencia] = useState('');

  const [escolasHabituais, setEscolasHabituais] = useState<string[]>(
    professorParaEditar?.escolasHabituais || [escolasExistentes[0] || 'Unidade Centro']
  );

  const handleToggleEscola = (esc: string) => {
    setEscolasHabituais((prev) =>
      prev.includes(esc) ? prev.filter((e) => e !== esc) : [...prev, esc]
    );
  };

  const handleAddCompetencia = () => {
    if (!novaCompetencia.trim()) return;
    if (!competencias.includes(novaCompetencia.trim())) {
      setCompetencias((prev) => [...prev, novaCompetencia.trim()]);
    }
    setNovaCompetencia('');
  };

  const handleRemoveCompetencia = (comp: string) => {
    setCompetencias((prev) => prev.filter((c) => c !== comp));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErroValidacao(null);
    if (!nome.trim()) {
      setErroValidacao('Por favor, informe o nome do professor.');
      return;
    }

    const profFinal: Professor = {
      id:
        professorParaEditar?.id ||
        `prof-${nome.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`,
      nome: nome.trim(),
      email: email.trim(),
      telefone: telefone.trim(),
      competencias,
      cargaHorariaMaxima: Number(cargaHorariaMaxima) || 160,
      valorHora: Number(valorHora) || VALOR_HORA_PADRAO,
      escolasHabituais:
        escolasHabituais.length > 0 ? escolasHabituais : [escolasExistentes[0] || 'Unidade Centro'],
    };

    onSaveProfessor(profFinal);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isEditing ? `Editar Professor: ${professorParaEditar.nome}` : 'Cadastrar Novo Professor'}
              </h3>
              <p className="text-xs text-slate-500">
                Informações docentes, valor hora, carga máxima e competências curriculares.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
          {erroValidacao && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{erroValidacao}</span>
            </div>
          )}

          {/* Nome */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Nome Completo do(a) Professor(a) *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Prof. Roberto Albuquerque"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900"
            />
          </div>

          {/* Email e Telefone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" /> E-mail Institucional
              </label>
              <input
                type="email"
                placeholder="nome.sobrenome@escola.edu.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" /> WhatsApp / Telefone
              </label>
              <input
                type="text"
                placeholder="(11) 98765-4321"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
              />
            </div>
          </div>

          {/* Carga Máxima e Valor Hora */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" /> Carga Horária Máxima (Horas/Mês) *
              </label>
              <input
                type="number"
                min="20"
                max="300"
                value={cargaHorariaMaxima}
                onChange={(e) => setCargaHorariaMaxima(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-700 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-slate-400" /> Valor da Hora/Aula (R$) *
                </label>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                  Padrão R$ 32/h (todos os turnos)
                </span>
              </div>
              <input
                type="number"
                min="10"
                max="500"
                value={valorHora}
                onChange={(e) => setValorHora(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Valor padrão institucional unificado de R$ 32,00 por hora-aula, independente do turno (Manhã, Tarde ou Noite).
              </p>
            </div>
          </div>

          {/* Escolas Habituais */}
          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
              <School className="w-3.5 h-3.5 text-slate-400" /> Unidades / Escolas de Atuação
            </label>
            <div className="flex flex-wrap gap-2 pt-1">
              {escolasExistentes.map((esc) => {
                const isSelected = escolasHabituais.includes(esc);
                return (
                  <button
                    type="button"
                    key={esc}
                    onClick={() => handleToggleEscola(esc)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {esc}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Competências Curriculares */}
          <div className="space-y-2">
            <label className="block font-bold text-slate-700 flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-slate-400" /> Competências Curriculares & Matérias Habilitadas
            </label>

            {/* Chips de competências ativas */}
            <div className="flex flex-wrap gap-1.5 min-h-[40px] p-2 bg-slate-50 rounded-lg border border-slate-200">
              {competencias.length === 0 ? (
                <span className="text-slate-400 text-xs italic">Nenhuma competência cadastrada ainda.</span>
              ) : (
                competencias.map((comp) => (
                  <span
                    key={comp}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-300 rounded-md text-[11px] font-semibold text-slate-800 shadow-2xs"
                  >
                    {comp}
                    <button
                      type="button"
                      onClick={() => handleRemoveCompetencia(comp)}
                      className="text-slate-400 hover:text-rose-600 ml-0.5"
                    >
                      &times;
                    </button>
                  </span>
                ))
              )}
            </div>

            {/* Inclusão manual de competência */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Digitar nova competência curricular..."
                value={novaCompetencia}
                onChange={(e) => setNovaCompetencia(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCompetencia();
                  }
                }}
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
              />
              <button
                type="button"
                onClick={handleAddCompetencia}
                className="px-3 py-1.5 bg-slate-800 text-white rounded-lg font-bold text-xs hover:bg-slate-900"
              >
                Adicionar
              </button>
            </div>

            {/* Sugestões rápidas baseadas no Plano de Curso RH */}
            <div className="pt-1">
              <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Sugestões da Matriz de Recursos Humanos:
              </span>
              <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto p-1 bg-slate-100 rounded border border-slate-200">
                {MATRIZ_PLANO_CURSO_RECURSOS_HUMANOS.slice(0, 10).map((uc) => (
                  <button
                    type="button"
                    key={uc.nome}
                    onClick={() => {
                      if (!competencias.includes(uc.nome)) {
                        setCompetencias((prev) => [...prev, uc.nome]);
                      }
                    }}
                    className="text-[10px] bg-white hover:bg-indigo-50 hover:text-indigo-700 px-2 py-0.5 rounded border border-slate-200 text-slate-700 transition-colors"
                  >
                    + {uc.nome}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              id="btn-salvar-professor"
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{isEditing ? 'Salvar Alterações do Professor' : 'Cadastrar Professor'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Escola, Sala } from '../types/rios';
import {
  X,
  School,
  Building,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  MapPin,
  Layers,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

interface ModalEscolaProps {
  isOpen: boolean;
  onClose: () => void;
  escolaParaEditar?: Escola | null;
  onSaveEscola: (escola: Escola) => void;
}

export const ModalEscola: React.FC<ModalEscolaProps> = ({
  isOpen,
  onClose,
  escolaParaEditar,
  onSaveEscola,
}) => {
  if (!isOpen) return null;

  const [nome, setNome] = useState<string>('');
  const [regiao, setRegiao] = useState<string>('Região Central');
  const [salas, setSalas] = useState<Sala[]>([]);
  const [novaSalaNome, setNovaSalaNome] = useState<string>('');
  const [novaSalaBloco, setNovaSalaBloco] = useState<string>('Bloco Principal');
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (escolaParaEditar) {
      setNome(escolaParaEditar.nome);
      setRegiao(escolaParaEditar.regiao);
      setSalas(escolaParaEditar.salas ? [...escolaParaEditar.salas] : []);
    } else {
      setNome('');
      setRegiao('Região Central');
      setSalas([
        { id: `s-${Date.now()}-1`, nome: 'Sala 01', bloco: 'Bloco A' },
        { id: `s-${Date.now()}-2`, nome: 'Sala 02', bloco: 'Bloco A' },
        { id: `s-${Date.now()}-3`, nome: 'Sala 03', bloco: 'Bloco B' },
      ]);
    }
    setErro(null);
  }, [escolaParaEditar, isOpen]);

  const handleAddSala = () => {
    if (!novaSalaNome.trim()) {
      setErro('Informe o nome da sala para adicionar.');
      return;
    }
    const nova: Sala = {
      id: `sala-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      nome: novaSalaNome.trim(),
      bloco: novaSalaBloco.trim() || 'Bloco Principal',
    };
    setSalas([...salas, nova]);
    setNovaSalaNome('');
    setErro(null);
  };

  const handleRemoveSala = (id: string) => {
    if (salas.length <= 1) {
      setErro('A escola deve possuir pelo menos 1 sala cadastrada.');
      return;
    }
    setSalas(salas.filter((s) => s.id !== id));
    setErro(null);
  };

  const handleUpdateSala = (id: string, campo: 'nome' | 'bloco', valor: string) => {
    setSalas(
      salas.map((s) => (s.id === id ? { ...s, [campo]: valor } : s))
    );
  };

  const handleGerarSalasSequenciais = (quantidade: number = 3) => {
    const inicio = salas.length + 1;
    const novas: Sala[] = [];
    for (let i = 0; i < quantidade; i++) {
      const num = String(inicio + i).padStart(2, '0');
      novas.push({
        id: `sala-${Date.now()}-${i}`,
        nome: `Sala ${num}`,
        bloco: 'Bloco A',
      });
    }
    setSalas([...salas, ...novas]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim()) {
      setErro('O nome da escola / unidade é obrigatório.');
      return;
    }

    if (salas.length === 0) {
      setErro('Cadastre ao menos uma sala de aula.');
      return;
    }

    const escolaSalva: Escola = {
      id: escolaParaEditar ? escolaParaEditar.id : `esc-${Date.now()}`,
      nome: nome.trim(),
      regiao: regiao.trim() || 'Região Central',
      salas: salas.map((s) => ({
        ...s,
        nome: s.nome.trim() || 'Sala',
        bloco: s.bloco?.trim() || 'Principal',
      })),
    };

    onSaveEscola(escolaSalva);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100">
              <School className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                {escolaParaEditar ? 'Editar Escola & Salas' : 'Cadastrar Nova Escola'}
              </h3>
              <p className="text-xs text-slate-500">
                Configure a unidade escolar, polo de atendimento e as salas de aula físicas.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {erro && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {/* Dados Principais da Escola */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <School className="w-3.5 h-3.5 text-indigo-600" />
                Nome da Escola / Unidade <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Unidade Centro, Polo Leste, Escola SENAI"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl font-semibold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                Região / Localidade
              </label>
              <select
                value={regiao}
                onChange={(e) => setRegiao(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Região Central">Região Central</option>
                <option value="Zona Sul">Zona Sul</option>
                <option value="Zona Norte">Zona Norte</option>
                <option value="Zona Leste">Zona Leste</option>
                <option value="Zona Oeste">Zona Oeste</option>
                <option value="Região Metropolitana">Região Metropolitana</option>
                <option value="Unidade Remota / Online">Unidade Remota / Online</option>
              </select>
            </div>
          </div>

          {/* Seção de Salas da Escola */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                <Building className="w-3.5 h-3.5 text-indigo-600" />
                Salas de Aula Cadastradas ({salas.length})
              </label>

              <button
                type="button"
                onClick={() => handleGerarSalasSequenciais(2)}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 transition-colors flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-indigo-500" />
                +2 Salas Auto
              </button>
            </div>

            {/* Input para adicionar nova sala */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
              <span className="text-[11px] font-bold text-slate-600">Adicionar Nova Sala:</span>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                <input
                  type="text"
                  placeholder="Nome (ex: Sala 05, Lab Info 1)"
                  value={novaSalaNome}
                  onChange={(e) => setNovaSalaNome(e.target.value)}
                  className="sm:col-span-3 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 font-medium"
                />
                <input
                  type="text"
                  placeholder="Bloco (ex: Bloco A)"
                  value={novaSalaBloco}
                  onChange={(e) => setNovaSalaBloco(e.target.value)}
                  className="sm:col-span-2 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 font-medium"
                />
              </div>
              <button
                type="button"
                onClick={handleAddSala}
                className="w-full sm:w-auto px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar Sala
              </button>
            </div>

            {/* Lista de Salas Existentes */}
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {salas.map((sala, idx) => (
                <div
                  key={sala.id}
                  className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-all text-xs"
                >
                  <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-[10px] shrink-0">
                    {idx + 1}
                  </span>

                  <input
                    type="text"
                    value={sala.nome}
                    onChange={(e) => handleUpdateSala(sala.id, 'nome', e.target.value)}
                    placeholder="Nome da sala"
                    className="flex-1 px-2.5 py-1 text-xs border border-slate-200 rounded-lg font-bold text-slate-900 focus:ring-1 focus:ring-indigo-500"
                  />

                  <input
                    type="text"
                    value={sala.bloco || ''}
                    onChange={(e) => handleUpdateSala(sala.id, 'bloco', e.target.value)}
                    placeholder="Bloco"
                    className="w-28 px-2.5 py-1 text-xs border border-slate-200 rounded-lg text-slate-600 font-medium focus:ring-1 focus:ring-indigo-500"
                  />

                  <button
                    type="button"
                    onClick={() => handleRemoveSala(sala.id)}
                    title="Excluir Sala"
                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              {escolaParaEditar ? 'Salvar Alterações' : 'Cadastrar Escola'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

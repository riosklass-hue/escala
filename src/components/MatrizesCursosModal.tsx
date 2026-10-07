import React, { useState, useEffect } from 'react';
import {
  MATRIZES_CURSOS_OFICIAIS,
  MatrizCursoOficial,
  UnidadeCurricularMatriz,
} from '../data/matrizesCursos';
import {
  BookOpen,
  X,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  Plus,
  Copy,
  Check,
  Search,
  GraduationCap,
  FileSpreadsheet,
  Edit,
  Trash2,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Save,
  AlertTriangle,
  Loader2,
  Upload,
  FileText,
  ChevronDown,
  ChevronUp,
  Wand2,
} from 'lucide-react';
import { processarEmentaComIA } from '../services/aiEmentaParser';

interface MatrizesCursosModalProps {
  isOpen: boolean;
  onClose: () => void;
  matrizes?: MatrizCursoOficial[];
  onSaveMatriz?: (matriz: MatrizCursoOficial) => void;
  onDeleteMatriz?: (matrizId: string) => void;
  onRestaurarPadrao?: () => void;
  onCriarTurmaComMatriz: (matriz: MatrizCursoOficial) => void;
  matrizInicialId?: string;
  iniciarModoEdicao?: boolean;
  iniciarModoNovo?: boolean;
}

export const MatrizesCursosModal: React.FC<MatrizesCursosModalProps> = ({
  isOpen,
  onClose,
  matrizes = MATRIZES_CURSOS_OFICIAIS,
  onSaveMatriz,
  onDeleteMatriz,
  onRestaurarPadrao,
  onCriarTurmaComMatriz,
  matrizInicialId,
  iniciarModoEdicao = false,
  iniciarModoNovo = false,
}) => {
  const listaMatrizes = matrizes && matrizes.length > 0 ? matrizes : MATRIZES_CURSOS_OFICIAIS;

  const [cursoSelecionadoId, setCursoSelecionadoId] = useState<string>(() => {
    return matrizInicialId || listaMatrizes[0]?.id || MATRIZES_CURSOS_OFICIAIS[0].id;
  });

  const [filtroTexto, setFiltroTexto] = useState<string>('');
  const [copiado, setCopiado] = useState<boolean>(false);
  const [sucessoMsg, setSucessoMsg] = useState<string | null>(null);

  // Estados de Edição / Cadastro
  const [modoEdicao, setModoEdicao] = useState<boolean>(false);
  const [isCriandoNova, setIsCriandoNova] = useState<boolean>(false);

  const [editId, setEditId] = useState<string>('');
  const [editNome, setEditNome] = useState<string>('');
  const [editSigla, setEditSigla] = useState<string>('');
  const [editModalidade, setEditModalidade] = useState<string>('Concomitante e Subsequente');
  const [editDescricao, setEditDescricao] = useState<string>('');
  const [editUnidades, setEditUnidades] = useState<Array<{ id: string; nome: string; cargaHoraria: number }>>([]);
  const [novoUcNome, setNovoUcNome] = useState<string>('');
  const [novoUcCarga, setNovoUcCarga] = useState<number>(40);
  const [erroForm, setErroForm] = useState<string | null>(null);

  // Estados da Importação Inteligente de Ementas com IA
  const [isImportAIOpen, setIsImportAIOpen] = useState<boolean>(true);
  const [textoEmentaIA, setTextoEmentaIA] = useState<string>('');
  const [instrucoesIA, setInstrucoesIA] = useState<string>('');
  const [processandoIA, setProcessandoIA] = useState<boolean>(false);
  const [sucessoIAMsg, setSucessoIAMsg] = useState<string | null>(null);
  const [erroIAMsg, setErroIAMsg] = useState<string | null>(null);

  const EXEMPLO_ENFERMAGEM = `CURSO TÉCNICO EM ENFERMAGEM (ENF)
Modalidade: Concomitante e Subsequente - Carga Horária: 800 horas

Módulo I - Fundamentos do Cuidado:
- Anatomia e Fisiologia Humana (80h)
- Microbiologia, Parasitologia e Imunologia (40h)
- Fundamentos e Procedimentos de Enfermagem (100h)
- Ética, Bioética e Legislação Profissional (40h)
- Saúde Coletiva e Políticas Públicas do SUS (60h)

Módulo II - Assistência Clínica e Cirúrgica:
- Enfermagem em Clínica Médica (80h)
- Enfermagem em Clínica Cirúrgica e Centro Cirúrgico (80h)
- Farmacologia Aplicada à Enfermagem (60h)
- Urgência, Emergência e Atendimento Pré-Hospitalar (60h)
- Enfermagem em Saúde Mental e Psiquiatria (40h)

Módulo III - Saúde Especializada e Estágio:
- Assistência à Saúde da Mulher, Materno e Obstetrícia (60h)
- Assistência à Saúde da Criança e do Adolescente (60h)
- Enfermagem em Saúde do Idoso (40h)
- Prática Profissional e Estágio Curricular Supervisionado (200h)`;

  const EXEMPLO_LOGISTICA = `CURSO TÉCNICO EM LOGÍSTICA (LOG)
Carga Horária Total: 800h - Nível Médio Técnico

Grade Curricular:
1. Fundamentos da Cadeia de Suprimentos e Logística Integrada - 80 horas
2. Gestão de Compras e Negociação com Fornecedores - 60 horas
3. Armazenagem, Embalagem e Movimentação de Materiais - 80 horas
4. Gestão e Controle de Estoques - 80 horas
5. Modais de Transporte e Roteirização de Entregas - 80 horas
6. Custos Logísticos e Formação de Preços - 60 horas
7. Logística Internacional e Comércio Exterior - 60 horas
8. Logística Reversa e Sustentabilidade Empresarial - 40 horas
9. Sistemas de Informação Logística (ERP, WMS e TMS) - 60 horas
10. Legislação Tributária e Fiscal Aplicada aos Transportes - 40 horas
11. Gestão da Qualidade e Indicadores de Desempenho (KPIs) - 60 horas
12. Projeto Integrador em Operações Logísticas - 100 horas`;

  const handleProcessarEmentaIA = async () => {
    if (!textoEmentaIA.trim()) {
      setErroIAMsg('Por favor, cole ou digite o texto da ementa do curso para que a IA possa analisar.');
      return;
    }
    setErroIAMsg(null);
    setSucessoIAMsg(null);
    setProcessandoIA(true);

    try {
      const resultado = await processarEmentaComIA(textoEmentaIA, instrucoesIA);
      if (resultado.nome) setEditNome(resultado.nome);
      if (resultado.sigla) setEditSigla(resultado.sigla);
      if (resultado.modalidade) setEditModalidade(resultado.modalidade);
      if (resultado.descricao) setEditDescricao(resultado.descricao);
      if (Array.isArray(resultado.unidades) && resultado.unidades.length > 0) {
        setEditUnidades(
          resultado.unidades.map((u, i) => ({
            id: u.id || `uc-ai-${Date.now()}-${i}`,
            nome: u.nome,
            cargaHoraria: Number(u.cargaHoraria) || 40,
          }))
        );
      }
      setSucessoIAMsg(
        `✨ A Inteligência Artificial organizou a grade com sucesso! Curso "${resultado.nome}" (${resultado.sigla}) com ${resultado.unidades.length} disciplinas identificadas e ${resultado.cargaHorariaTotal}h totais calculadas.`
      );
    } catch (err: any) {
      console.error('[IA Ementa]', err);
      setErroIAMsg(err?.message || 'Erro ao processar ementa com Inteligência Artificial.');
    } finally {
      setProcessandoIA(false);
    }
  };

  const handleCarregarArquivoTexto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const conteudo = (event.target?.result as string) || '';
      setTextoEmentaIA(conteudo);
      setErroIAMsg(null);
      setSucessoIAMsg(`Arquivo "${file.name}" carregado. Clique em "Processar & Organizar com IA" para estruturar a grade.`);
    };
    reader.onerror = () => {
      setErroIAMsg('Não foi possível ler o arquivo selecionado.');
    };
    reader.readAsText(file);
  };

  // Atualiza seleção ou modo caso mude externamente
  useEffect(() => {
    if (matrizInicialId) {
      setCursoSelecionadoId(matrizInicialId);
    }
  }, [matrizInicialId]);

  useEffect(() => {
    if (!isOpen) {
      setModoEdicao(false);
      setIsCriandoNova(false);
      setErroForm(null);
      setSucessoMsg(null);
      return;
    }

    if (iniciarModoNovo) {
      handleIniciarCriacaoNova();
    } else if (iniciarModoEdicao) {
      const targetId = matrizInicialId || cursoSelecionadoId;
      const targetMatriz = listaMatrizes.find((m) => m.id === targetId) || listaMatrizes[0];
      if (targetMatriz) {
        setCursoSelecionadoId(targetMatriz.id);
        setIsCriandoNova(false);
        setModoEdicao(true);
        setEditId(targetMatriz.id);
        setEditNome(targetMatriz.nome);
        setEditSigla(targetMatriz.sigla);
        setEditModalidade(targetMatriz.modalidade || 'Concomitante e Subsequente');
        setEditDescricao(targetMatriz.descricao || '');
        setEditUnidades(
          (targetMatriz.unidades || []).map((uc, i) => ({
            id: uc.id || `uc-${targetMatriz.id}-${i}-${Date.now()}`,
            nome: uc.nome,
            cargaHoraria: uc.cargaHoraria || 40,
          }))
        );
        setNovoUcNome('');
        setNovoUcCarga(40);
        setErroForm(null);
      }
    }
  }, [isOpen, iniciarModoNovo, iniciarModoEdicao, matrizInicialId]);

  if (!isOpen) return null;

  const matrizAtual =
    listaMatrizes.find((m) => m.id === cursoSelecionadoId) ||
    listaMatrizes[0] ||
    MATRIZES_CURSOS_OFICIAIS[0];

  const unidadesFiltradas = (matrizAtual.unidades || []).filter((uc) =>
    filtroTexto.trim()
      ? uc.nome.toLowerCase().includes(filtroTexto.toLowerCase())
      : true
  );

  // Iniciar criação de nova matriz/ementa
  const handleIniciarCriacaoNova = () => {
    setIsCriandoNova(true);
    setModoEdicao(true);
    setEditId(`matriz-${Date.now()}`);
    setEditNome('');
    setEditSigla('');
    setEditModalidade('Concomitante e Subsequente');
    setEditDescricao('');
    setEditUnidades([
      { id: `uc-${Date.now()}-1`, nome: 'Introdução à Formação Profissional', cargaHoraria: 40 },
      { id: `uc-${Date.now()}-2`, nome: 'Comunicação e Relações Humanas', cargaHoraria: 40 },
      { id: `uc-${Date.now()}-3`, nome: 'Projeto Integrador', cargaHoraria: 100 },
    ]);
    setNovoUcNome('');
    setNovoUcCarga(40);
    setErroForm(null);
  };

  // Iniciar edição da matriz selecionada
  const handleIniciarEdicaoAtual = () => {
    setIsCriandoNova(false);
    setModoEdicao(true);
    setEditId(matrizAtual.id);
    setEditNome(matrizAtual.nome);
    setEditSigla(matrizAtual.sigla);
    setEditModalidade(matrizAtual.modalidade || 'Concomitante e Subsequente');
    setEditDescricao(matrizAtual.descricao || '');
    setEditUnidades(
      (matrizAtual.unidades || []).map((uc, i) => ({
        id: uc.id || `uc-${matrizAtual.id}-${i}-${Date.now()}`,
        nome: uc.nome,
        cargaHoraria: uc.cargaHoraria || 40,
      }))
    );
    setNovoUcNome('');
    setNovoUcCarga(40);
    setErroForm(null);
  };

  // Cancelar edição
  const handleCancelarEdicao = () => {
    setModoEdicao(false);
    setIsCriandoNova(false);
    setErroForm(null);
  };

  // Adicionar unidade à ementa em edição
  const handleAdicionarUnidadeEdit = () => {
    if (!novoUcNome.trim()) {
      setErroForm('Digite o nome da unidade curricular.');
      return;
    }
    const carga = Number(novoUcCarga) || 40;
    setEditUnidades((prev) => [
      ...prev,
      {
        id: `uc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        nome: novoUcNome.trim(),
        cargaHoraria: carga,
      },
    ]);
    setNovoUcNome('');
    setNovoUcCarga(40);
    setErroForm(null);
  };

  // Remover unidade na edição
  const handleRemoverUnidadeEdit = (index: number) => {
    setEditUnidades((prev) => prev.filter((_, i) => i !== index));
  };

  // Mover unidade para cima
  const handleMoverUnidadeCima = (index: number) => {
    if (index === 0) return;
    setEditUnidades((prev) => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  // Mover unidade para baixo
  const handleMoverUnidadeBaixo = (index: number) => {
    if (index >= editUnidades.length - 1) return;
    setEditUnidades((prev) => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  // Salvar matriz editada ou nova
  const handleSalvarEmenta = () => {
    if (!editNome.trim()) {
      setErroForm('O nome do curso é obrigatório.');
      return;
    }
    if (!editSigla.trim()) {
      setErroForm('A sigla do curso é obrigatória (ex: LOG, SEC, ADM).');
      return;
    }
    if (editUnidades.length === 0) {
      setErroForm('Adicione ao menos uma unidade curricular à ementa.');
      return;
    }

    const cargaTotalCalculada = editUnidades.reduce(
      (acc, u) => acc + (Number(u.cargaHoraria) || 0),
      0
    );

    const matrizFinal: MatrizCursoOficial = {
      id: editId || `matriz-${Date.now()}`,
      nome: editNome.trim(),
      sigla: editSigla.trim().toUpperCase(),
      modalidade: editModalidade.trim() || 'Concomitante e Subsequente',
      cargaHorariaTotal: cargaTotalCalculada,
      descricao:
        editDescricao.trim() ||
        `Matriz Curricular – ${editNome.trim()} (${cargaTotalCalculada}h)`,
      unidades: editUnidades.map((u) => ({
        id: u.id,
        nome: u.nome.trim(),
        cargaHoraria: Number(u.cargaHoraria) || 40,
      })),
    };

    if (onSaveMatriz) {
      onSaveMatriz(matrizFinal);
    }

    setCursoSelecionadoId(matrizFinal.id);
    setModoEdicao(false);
    setIsCriandoNova(false);
    setSucessoMsg(`Ementa de "${matrizFinal.nome}" salva com sucesso!`);
    setTimeout(() => setSucessoMsg(null), 3500);
  };

  // Excluir ementa
  const handleExcluirEmenta = () => {
    if (listaMatrizes.length <= 1) {
      alert('Não é possível excluir a única matriz existente.');
      return;
    }
    const confirma = window.confirm(
      `Deseja realmente excluir a matriz e ementa do curso "${matrizAtual.nome}"?`
    );
    if (!confirma) return;

    if (onDeleteMatriz) {
      onDeleteMatriz(matrizAtual.id);
    }
    const proxima = listaMatrizes.find((m) => m.id !== matrizAtual.id);
    if (proxima) {
      setCursoSelecionadoId(proxima.id);
    }
    setSucessoMsg(`Ementa de "${matrizAtual.nome}" removida.`);
    setTimeout(() => setSucessoMsg(null), 3000);
  };

  // Copiar ementa formatada
  const handleCopiarEmenta = () => {
    const texto = [
      `CURSO: ${matrizAtual.nome} (${matrizAtual.cargaHorariaTotal}h)`,
      `Sigla: ${matrizAtual.sigla}`,
      `Modalidade: ${matrizAtual.modalidade}`,
      `Total de Unidades: ${matrizAtual.unidades.length}`,
      '----------------------------------------',
      ...matrizAtual.unidades.map(
        (uc, i) => `${i + 1 < 10 ? '0' + (i + 1) : i + 1}. ${uc.nome} - ${uc.cargaHoraria}h`
      ),
      '----------------------------------------',
      `TOTAL: ${matrizAtual.cargaHorariaTotal} horas`,
    ].join('\n');

    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  // Total de horas no modo de edição
  const totalHorasEmEdicao = editUnidades.reduce(
    (acc, u) => acc + (Number(u.cargaHoraria) || 0),
    0
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Principal */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold flex items-center gap-2 text-white leading-tight">
                Gestão de Ementas & Matrizes Curriculares
              </h3>
              <p className="text-xs text-slate-300">
                Cadastre novas ementas de cursos, edite disciplinas e personalize as matrizes oficiais (800h).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!modoEdicao && (
              <>
                <button
                  type="button"
                  id="btn-importar-com-ia-topo"
                  onClick={() => {
                    handleIniciarCriacaoNova();
                    setIsImportAIOpen(true);
                  }}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                  title="Importar ementa completa usando Inteligência Artificial"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Importar Ementa com IA</span>
                </button>
                <button
                  type="button"
                  id="btn-cadastrar-nova-ementa-topo"
                  onClick={handleIniciarCriacaoNova}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Nova Ementa</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback de Notificação */}
        {sucessoMsg && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2.5 text-xs text-emerald-800 font-semibold flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{sucessoMsg}</span>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODO DE EDIÇÃO / CADASTRO DE EMENTA */}
        {/* ============================================================== */}
        {modoEdicao ? (
          <div className="flex-1 overflow-y-auto flex flex-col">
            {/* Banner de Edição */}
            <div className="bg-amber-50/80 border-b border-amber-200 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-200 text-amber-900 border border-amber-300">
                    {isCriandoNova ? 'Cadastro de Nova Ementa' : 'Editando Ementa Existente'}
                  </span>
                  <span className="text-xs text-amber-800 font-medium">
                    Preencha os dados do curso e ajuste as disciplinas da grade
                  </span>
                </div>
                <h4 className="text-base font-bold text-slate-900 mt-1">
                  {editNome || (isCriandoNova ? 'Novo Curso Técnico' : 'Editar Curso')}
                </h4>
              </div>

              {/* Totalizador de Carga Horária em Tempo Real */}
              <div className="flex items-center gap-3">
                <div className="bg-white px-3.5 py-2 rounded-xl border border-amber-200 shadow-2xs text-right">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Total Disciplinas
                  </div>
                  <div className="text-base font-extrabold text-slate-800 font-mono">
                    {editUnidades.length} UCs
                  </div>
                </div>

                <div className="bg-white px-4 py-2 rounded-xl border border-indigo-200 shadow-2xs text-right">
                  <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
                    Carga Horária Total
                  </div>
                  <div className="text-lg font-black text-indigo-700 font-mono">
                    {totalHorasEmEdicao}h
                  </div>
                </div>
              </div>
            </div>

            {/* Mensagem de Erro se houver */}
            {erroForm && (
              <div className="bg-rose-50 border-b border-rose-200 px-5 py-2.5 text-xs text-rose-700 font-semibold flex items-center gap-2 shrink-0">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{erroForm}</span>
              </div>
            )}

            {/* Corpo do Formulário */}
            <div className="p-5 space-y-6 flex-1">

              {/* CARD DESTACADO: IMPORTADOR DE EMENTA COM INTELIGÊNCIA ARTIFICIAL */}
              <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-indigo-500/40 relative overflow-hidden">
                {/* Glow decorativo de fundo */}
                <div className="absolute -top-12 -right-12 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white shadow-md shrink-0">
                      <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold flex items-center gap-2 text-white">
                        <span>Importar Ementa com Inteligência Artificial</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider bg-purple-500/30 text-purple-200 border border-purple-400/40 uppercase">
                          Gemini AI
                        </span>
                      </h4>
                      <p className="text-xs text-indigo-200/90 mt-0.5">
                        Cole o documento, PPC ou plano de curso. A IA identifica o nome, sigla, disciplinas, calcula as cargas horárias e preenche toda a grade.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    id="btn-toggle-importador-ia"
                    onClick={() => setIsImportAIOpen(!isImportAIOpen)}
                    className="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-indigo-800/80 hover:bg-indigo-700 text-xs font-bold text-indigo-100 border border-indigo-600/60 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    <span>{isImportAIOpen ? 'Recolher Painel' : 'Abrir Importador IA'}</span>
                    {isImportAIOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {isImportAIOpen && (
                  <div className="space-y-4 pt-4 border-t border-indigo-800/80 mt-4 relative z-10 animate-in fade-in duration-150">
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <label className="text-xs font-bold text-indigo-200 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Cole o texto da ementa, matriz curricular ou documento do curso:</span>
                        </label>

                        {/* Botão de Carregar Arquivo */}
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-800/90 hover:bg-indigo-700 text-xs font-semibold text-indigo-100 border border-indigo-600/70 cursor-pointer transition-colors shadow-2xs self-start sm:self-auto">
                          <Upload className="w-3.5 h-3.5 text-indigo-300" />
                          <span>Carregar Arquivo (.txt, .pdf, .csv, .doc)</span>
                          <input
                            type="file"
                            accept=".txt,.pdf,.csv,.doc,.docx"
                            onChange={handleCarregarArquivoTexto}
                            className="hidden"
                          />
                        </label>
                      </div>

                      <textarea
                        rows={6}
                        placeholder={`Exemplo de ementa que você pode colar aqui:\n\nCURSO TÉCNICO EM ENFERMAGEM (ENF) - 800h\n1. Anatomia e Fisiologia Humana (80h)\n2. Microbiologia e Parasitologia (40h)\n3. Fundamentos de Enfermagem (100h)\n4. Farmacologia Aplicada à Enfermagem (60h)\n5. Saúde Coletiva e SUS (60h)\n6. Urgência e Emergência (60h)...`}
                        value={textoEmentaIA}
                        onChange={(e) => setTextoEmentaIA(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs bg-slate-950/90 border border-indigo-700/70 rounded-xl text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-purple-400 focus:outline-hidden font-mono leading-relaxed"
                      />
                    </div>

                    {/* Modelos de Exemplo e Ações de Limpeza */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-indigo-300 font-semibold text-xs flex items-center gap-1">
                        <Wand2 className="w-3 h-3 text-amber-300" />
                        Modelos de teste rápido:
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setTextoEmentaIA(EXEMPLO_ENFERMAGEM);
                          setErroIAMsg(null);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-indigo-900/80 hover:bg-indigo-800 text-xs font-medium text-indigo-200 border border-indigo-700/60 transition-colors cursor-pointer"
                      >
                        Técnico em Enfermagem (800h)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTextoEmentaIA(EXEMPLO_LOGISTICA);
                          setErroIAMsg(null);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-indigo-900/80 hover:bg-indigo-800 text-xs font-medium text-indigo-200 border border-indigo-700/60 transition-colors cursor-pointer"
                      >
                        Técnico em Logística (800h)
                      </button>
                      {textoEmentaIA && (
                        <button
                          type="button"
                          onClick={() => {
                            setTextoEmentaIA('');
                            setErroIAMsg(null);
                            setSucessoIAMsg(null);
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer ml-auto"
                        >
                          Limpar Texto
                        </button>
                      )}
                    </div>

                    {/* Alertas de Sucesso ou Erro da IA */}
                    {sucessoIAMsg && (
                      <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-xs text-emerald-200 flex items-start gap-2.5 animate-in fade-in duration-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="font-medium leading-relaxed">{sucessoIAMsg}</span>
                      </div>
                    )}
                    {erroIAMsg && (
                      <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-xs text-rose-200 flex items-start gap-2.5 animate-in fade-in duration-200">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <span className="font-medium leading-relaxed">{erroIAMsg}</span>
                      </div>
                    )}

                    {/* Botão de Ação Principal com IA */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-1">
                      <button
                        type="button"
                        id="btn-processar-ementa-ia"
                        onClick={handleProcessarEmentaIA}
                        disabled={processandoIA}
                        className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 via-indigo-600 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white font-extrabold text-xs shadow-xl hover:shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {processandoIA ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                            <span>Inteligência Artificial Analisando e Organizando Grade...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 text-amber-300" />
                            <span>Processar & Organizar Ementa com Inteligência Artificial</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Informações Gerais do Curso */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-slate-500" />
                  Dados Gerais do Curso / Plano Curricular
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-6">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nome do Curso *
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Técnico em Enfermagem, Técnico em Informática..."
                      value={editNome}
                      onChange={(e) => setEditNome(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-medium"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Sigla *
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="Ex: ENF"
                      value={editSigla}
                      onChange={(e) => setEditSigla(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono uppercase font-bold"
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Modalidade de Ensino
                    </label>
                    <input
                      type="text"
                      placeholder="Concomitante e Subsequente, Integrado..."
                      value={editModalidade}
                      onChange={(e) => setEditModalidade(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-medium"
                    />
                  </div>

                  <div className="sm:col-span-12">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Título / Descrição da Matriz Curricular
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Matriz I Curricular – Concomitante e Subsequente (800h)"
                      value={editDescricao}
                      onChange={(e) => setEditDescricao(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-600"
                    />
                  </div>
                </div>
              </div>

              {/* Seção de Unidades Curriculares da Ementa */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-indigo-600" />
                      Disciplinas e Unidades Curriculares ({editUnidades.length})
                    </h5>
                    <p className="text-[11px] text-slate-500">
                      Edite nomes, ajuste cargas horárias, reordene a sequência das disciplinas ou adicione novas.
                    </p>
                  </div>
                </div>

                {/* Bloco de Adicionar Nova Unidade */}
                <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3 sm:p-4">
                  <div className="text-xs font-bold text-indigo-900 mb-2 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-indigo-600" />
                    Adicionar Nova Disciplina à Ementa
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      placeholder="Nome da disciplina (ex: Gestão de Pessoas, Ética Profissional...)"
                      value={novoUcNome}
                      onChange={(e) => setNovoUcNome(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAdicionarUnidadeEdit()}
                      className="flex-1 px-3 py-2 text-xs bg-white border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-medium"
                    />

                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="relative w-24">
                        <input
                          type="number"
                          min="10"
                          max="400"
                          step="10"
                          value={novoUcCarga}
                          onChange={(e) => setNovoUcCarga(Number(e.target.value))}
                          className="w-full px-2.5 py-2 text-xs bg-white border border-indigo-200 rounded-lg text-right font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                        />
                        <span className="absolute right-2 top-2 text-xs font-bold text-slate-400 pointer-events-none">
                          h
                        </span>
                      </div>

                      {/* Botões rápidos de carga horária */}
                      <div className="hidden sm:flex items-center gap-1">
                        {[20, 40, 60, 100].map((carga) => (
                          <button
                            key={carga}
                            type="button"
                            onClick={() => setNovoUcCarga(carga)}
                            className={`px-2 py-1.5 text-[10px] font-bold rounded border transition-colors cursor-pointer ${
                              novoUcCarga === carga
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-white text-slate-600 border-indigo-200 hover:bg-indigo-100'
                            }`}
                          >
                            {carga}h
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        id="btn-adicionar-disciplina-ementa"
                        onClick={handleAdicionarUnidadeEdit}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adicionar</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Lista de Unidades com Edição Inline */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold uppercase tracking-wider text-[10px]">
                        <th className="p-3 w-12 text-center">Nº</th>
                        <th className="p-3">Nome da Disciplina / Unidade Curricular</th>
                        <th className="p-3 w-32 text-center">Carga Horária</th>
                        <th className="p-3 w-28 text-center">Reordenar</th>
                        <th className="p-3 w-16 text-center">Excluir</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {editUnidades.map((uc, index) => (
                        <tr key={uc.id || index} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-2.5 font-mono text-slate-400 text-center font-bold">
                            {index + 1 < 10 ? `0${index + 1}` : index + 1}
                          </td>

                          <td className="p-2.5">
                            <input
                              type="text"
                              value={uc.nome}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEditUnidades((prev) =>
                                  prev.map((item, i) => (i === index ? { ...item, nome: val } : item))
                                );
                              }}
                              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-md font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                            />
                          </td>

                          <td className="p-2.5 text-center">
                            <div className="inline-flex items-center gap-1">
                              <input
                                type="number"
                                min="10"
                                max="400"
                                step="10"
                                value={uc.cargaHoraria}
                                onChange={(e) => {
                                  const val = Number(e.target.value) || 0;
                                  setEditUnidades((prev) =>
                                    prev.map((item, i) =>
                                      i === index ? { ...item, cargaHoraria: val } : item
                                    )
                                  );
                                }}
                                className="w-20 px-2 py-1.5 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-md font-mono font-bold text-slate-800 text-right focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                              />
                              <span className="text-xs font-bold text-slate-500">h</span>
                            </div>
                          </td>

                          <td className="p-2.5 text-center">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleMoverUnidadeCima(index)}
                                disabled={index === 0}
                                title="Mover para cima"
                                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoverUnidadeBaixo(index)}
                                disabled={index === editUnidades.length - 1}
                                title="Mover para baixo"
                                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>

                          <td className="p-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoverUnidadeEdit(index)}
                              title="Excluir disciplina"
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Rodapé da Edição com Salvar e Cancelar */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-slate-500 font-medium">
                Soma atual da ementa: <strong className="text-indigo-700">{totalHorasEmEdicao}h</strong> em{' '}
                <strong className="text-slate-800">{editUnidades.length} disciplinas</strong>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancelarEdicao}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  id="btn-salvar-ementa"
                  onClick={handleSalvarEmenta}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Ementa</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ============================================================== */
          /* MODO DE VISUALIZAÇÃO E CONSULTA DA MATRIZ */
          /* ============================================================== */
          <>
            {/* Tabs de Cursos Cadastrados com Botão de Nova Ementa */}
            <div className="p-3 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center gap-2 shrink-0">
              {listaMatrizes.map((m) => {
                const isSelected = m.id === matrizAtual.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    id={`tab-curso-${m.sigla.toLowerCase()}`}
                    onClick={() => {
                      setCursoSelecionadoId(m.id);
                      setFiltroTexto('');
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black ${
                        isSelected
                          ? 'bg-indigo-700 text-white'
                          : 'bg-slate-100 text-indigo-700'
                      }`}
                    >
                      {m.sigla}
                    </span>
                    <span>{m.nome}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                        isSelected
                          ? 'bg-indigo-700/50 text-indigo-100'
                          : 'bg-slate-200/80 text-slate-600'
                      }`}
                    >
                      {(m.unidades || []).length} UCs
                    </span>
                  </button>
                );
              })}

              {/* Botões para Cadastrar Nova Ementa ou Importar com IA */}
              <button
                type="button"
                id="btn-importar-ementa-ia-tab"
                onClick={() => {
                  handleIniciarCriacaoNova();
                  setIsImportAIOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Importar ementa colando texto ou enviando arquivo com Inteligência Artificial"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Importar com IA</span>
              </button>

              <button
                type="button"
                id="btn-cadastrar-nova-ementa-tab"
                onClick={handleIniciarCriacaoNova}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Cadastrar uma nova ementa curricular de curso técnico manualmente"
              >
                <Plus className="w-4 h-4" />
                <span>+ Nova Ementa</span>
              </button>
            </div>

            {/* Informações do Curso Ativo com Ações de Edição */}
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">
                    {matrizAtual.sigla} • {matrizAtual.cargaHorariaTotal} HORAS
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">
                    {matrizAtual.modalidade}
                  </span>
                </div>
                <h4 className="text-base font-bold text-slate-900 mt-1">
                  {matrizAtual.descricao || matrizAtual.nome}
                </h4>
              </div>

              {/* Botões de Ação na Ementa */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  id="btn-editar-ementa-atual"
                  onClick={handleIniciarEdicaoAtual}
                  className="px-3.5 py-1.5 text-xs font-bold rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  title="Editar esta ementa (adicionar/remover disciplinas, mudar carga horária ou nomes)"
                >
                  <Edit className="w-3.5 h-3.5 text-amber-700" />
                  <span>Editar Ementa</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopiarEmenta}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Copiar lista de componentes curriculares e cargas horárias"
                >
                  {copiado ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copiar Ementa</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  id="btn-criar-turma-desta-matriz"
                  onClick={() => {
                    onCriarTurmaComMatriz(matrizAtual);
                    onClose();
                  }}
                  className="px-4 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Criar Turma com esta Ementa</span>
                </button>

                <button
                  type="button"
                  onClick={handleExcluirEmenta}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                  title="Excluir esta ementa"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Barra de Busca de Componentes */}
            <div className="p-3 px-5 border-b border-slate-200 bg-white flex items-center justify-between gap-3 shrink-0">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar unidade curricular nesta ementa..."
                  value={filtroTexto}
                  onChange={(e) => setFiltroTexto(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-800"
                />
              </div>

              <div className="text-xs font-semibold text-slate-500">
                Exibindo{' '}
                <strong className="text-slate-800">
                  {unidadesFiltradas.length}
                </strong>{' '}
                de {(matrizAtual.unidades || []).length} componentes
              </div>
            </div>

            {/* Tabela de Componentes Curriculares da Matriz */}
            <div className="flex-1 overflow-y-auto p-5">
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold uppercase tracking-wider text-[10px]">
                      <th className="p-3 w-12 text-center">Nº</th>
                      <th className="p-3">Componente / Unidade Curricular</th>
                      <th className="p-3 w-32 text-right">Carga Horária</th>
                      <th className="p-3 w-28 text-center">Participação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {unidadesFiltradas.map((uc, idx) => {
                      const totalMatriz = matrizAtual.cargaHorariaTotal || 1;
                      const percentual = Math.round((uc.cargaHoraria / totalMatriz) * 100);
                      return (
                        <tr
                          key={idx}
                          className="hover:bg-indigo-50/30 transition-colors"
                        >
                          <td className="p-3 font-mono text-slate-400 text-center font-bold">
                            {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                          </td>
                          <td className="p-3 font-semibold text-slate-900">
                            {uc.nome}
                            {uc.nome.toLowerCase().includes('projeto integrador') && (
                              <span className="ml-2 px-1.5 py-0.5 text-[9px] font-black uppercase rounded bg-purple-100 text-purple-700 border border-purple-200">
                                Prática Profissional
                              </span>
                            )}
                            {uc.nome.toLowerCase().includes('inteligência artificial') && (
                              <span className="ml-2 px-1.5 py-0.5 text-[9px] font-black uppercase rounded bg-indigo-100 text-indigo-700 border border-indigo-200">
                                Tecnologia & Inovação
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-800 text-right">
                            <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {uc.cargaHoraria}h
                            </span>
                          </td>
                          <td className="p-3 text-center text-slate-500 font-medium">
                            {percentual}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-900 text-white font-bold">
                      <td colSpan={2} className="p-3 text-right uppercase tracking-wider text-[11px]">
                        Carga Horária Total do Curso:
                      </td>
                      <td className="p-3 font-mono text-right text-sm text-emerald-400 font-extrabold">
                        {matrizAtual.cargaHorariaTotal}h
                      </td>
                      <td className="p-3 text-center text-xs text-slate-300">
                        100%
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Total de <strong>{listaMatrizes.length} matrizes</strong> de cursos cadastradas no sistema.
                  </span>
                </div>

                {onRestaurarPadrao && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Deseja restaurar as 5 matrizes curriculares oficiais originais (800h cada)?')) {
                        onRestaurarPadrao();
                        setSucessoMsg('Matrizes oficiais restauradas com sucesso.');
                        setTimeout(() => setSucessoMsg(null), 3000);
                      }
                    }}
                    className="text-[11px] text-slate-500 hover:text-indigo-600 font-medium flex items-center gap-1 hover:underline cursor-pointer ml-2"
                    title="Restaurar as 5 matrizes originais de 800h"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restaurar Padrão Oficial</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="btn-editar-ementa-rodape"
                  onClick={handleIniciarEdicaoAtual}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5 text-amber-700" />
                  <span>Editar Esta Ementa</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

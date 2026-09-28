import React, { useState } from 'react';
import { X, Download, ExternalLink, Loader2 } from 'lucide-react';
import { auth } from '../lib/firebase';
interface ModalHostingerDeployProps { isOpen: boolean; onClose: () => void; }
export const ModalHostingerDeploy: React.FC<ModalHostingerDeployProps> = ({ isOpen, onClose }) => {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  if (!isOpen) return null;
  const download = async (kind: 'hostinger' | 'source') => {
    if (busy) return;
    setBusy(kind); setError(null); setNotice(null);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Entre novamente para baixar os arquivos.');
      const token = await user.getIdToken();
      const endpoint = kind === 'hostinger' ? '/api/download/hostinger-zip' : '/api/download/codigo-fonte-zip';
      const response = await fetch(endpoint, { headers: { Authorization: 'Bearer ' + token }, cache: 'no-store' });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || (response.status === 401 ? 'Sua sessão expirou. Entre novamente.' : response.status === 403 ? 'Somente administradores podem baixar estes arquivos.' : 'Download indisponível. Verifique a configuração do servidor.'));
      }
      if (!response.headers.get('content-type')?.includes('application/zip')) throw new Error('O servidor não retornou um ZIP. Configure o backend do RIOS nesta hospedagem.');
      const blob = await response.blob();
      if (!blob.size) throw new Error('O pacote retornado está vazio.');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = kind === 'hostinger' ? 'rios_hostinger_public_html.zip' : 'rios_codigo_fonte.zip';
      document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      setNotice('Arquivo recebido. Verifique os downloads do navegador. Se a prévia bloquear o salvamento, abra o sistema em nova aba e faça login novamente.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível baixar o arquivo.'); }
    finally { setBusy(null); }
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80" id="modal-hostinger-deploy" role="dialog" aria-modal="true" aria-labelledby="download-title">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[94vh] flex flex-col">
      <header className="bg-slate-900 px-6 py-5 text-white flex justify-between items-center">
        <div><h3 id="download-title" className="text-lg font-bold">Arquivos do Sistema RIOS</h3><p className="text-xs text-slate-300 mt-1">Downloads para administradores autenticados</p></div>
        <button type="button" aria-label="Fechar" onClick={onClose} className="p-2"><X className="w-5 h-5" /></button>
      </header>
      <div className="p-6 space-y-5 overflow-y-auto text-sm text-slate-700">
        {error && <div role="alert" className="bg-red-50 text-red-800 p-3 rounded-xl">{error}</div>}
        {notice && <div role="status" className="bg-blue-50 text-blue-900 p-3 rounded-xl">{notice}</div>}
        {(['hostinger', 'source'] as const).map(kind => <section key={kind} className="border border-slate-200 rounded-xl p-5">
          <h4 className="font-bold">{kind === 'hostinger' ? 'Interface para Hostinger' : 'Código-fonte para manutenção'}</h4>
          <button type="button" disabled={!!busy} onClick={() => download(kind)} className="mt-3 inline-flex items-center gap-2 bg-indigo-600 disabled:opacity-50 text-white rounded-xl px-4 py-3 font-semibold">
            {busy === kind ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}{kind === 'hostinger' ? 'Baixar Pacote Hostinger (.ZIP)' : 'Baixar Código-Fonte (.ZIP)'}
          </button>
        </section>)}

        <section className="border border-emerald-200 bg-emerald-50/50 rounded-xl p-5">
          <h4 className="font-bold text-emerald-900">💾 Banco de Dados & Informações Salvas na Hostinger</h4>
          <p className="text-xs text-emerald-700 mt-1">
            Todas as turmas, professores, escolas, ementas, diário de aulas e matrizes digitadas são salvas automaticamente no disco do seu servidor Hostinger (<code className="bg-emerald-100 px-1 py-0.5 rounded">public_html/api/data/rios_database.json</code>).
          </p>
          <a
            href="/api/dados?action=download_backup"
            download
            className="mt-3 inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl px-4 py-2.5 font-semibold text-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            Baixar Backup dos Dados Salvos na Hostinger (.JSON)
          </a>
        </section>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4"><p className="font-semibold">Antes de publicar</p><p className="text-xs mt-1">Enviar somente a interface para public_html não executa o servidor. Configure o backend Node.js e as rotas /api para usar a IA e os downloads. Mantenha chaves privadas, arquivos .env e pacotes ZIP fora da pasta pública.</p></div>
        <button type="button" onClick={() => window.open(window.location.href, '_blank', 'noopener,noreferrer')} className="text-indigo-700 inline-flex items-center gap-2"><ExternalLink className="w-4 h-4" />Abrir Sistema em Nova Aba</button>
      </div>
      <footer className="bg-slate-50 border-t px-6 py-4 text-right"><button type="button" onClick={onClose} className="bg-slate-900 text-white rounded-xl px-5 py-2">Fechar</button></footer>
    </div>
  </div>;
};

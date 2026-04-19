'use client';

import { useState, useRef } from 'react';
import { Upload, File, Loader2, X, CheckCircle2 } from 'lucide-react';

interface FileUploadProps {
  accept?: string;
  label?: string;
  hint?: string;
  onResult: (result: { text?: string; rows?: Record<string, string>[]; filename: string; type: 'text' | 'table' }) => void;
}

export default function FileUpload({ accept = '.pdf,.docx,.xlsx,.csv,.txt', label = 'Déposer un fichier', hint, onResult }: FileUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [filename, setFilename] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setLoading(true);
    setDone(false);
    setError('');
    setFilename(file.name);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const r = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await r.json();
      if (data.error) { setError(data.error); setLoading(false); return; }
      setDone(true);
      onResult(data);
    } catch {
      setError('Erreur lors du traitement du fichier');
    }
    setLoading(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const reset = () => { setDone(false); setFilename(''); setError(''); if (inputRef.current) inputRef.current.value = ''; };

  return (
    <div>
      <div
        onClick={() => !done && inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer
          ${dragging ? 'border-indigo-500 bg-indigo-500/10' : done ? 'border-green-500/50 bg-green-500/5' : 'border-slate-700 hover:border-indigo-500/50 hover:bg-slate-800/50'}
          ${loading ? 'pointer-events-none' : ''}`}
      >
        {loading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 size={28} className="text-indigo-400 animate-spin" />
            <p className="text-sm text-slate-400">Traitement de <span className="text-white">{filename}</span>...</p>
          </div>
        ) : done ? (
          <div className="flex flex-col items-center gap-2">
            <CheckCircle2 size={28} className="text-green-400" />
            <p className="text-sm text-green-300 font-medium">{filename}</p>
            <button onClick={e => { e.stopPropagation(); reset(); }} className="text-xs text-slate-500 hover:text-white flex items-center gap-1 mt-1">
              <X size={12} /> Changer de fichier
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload size={28} className="text-slate-500" />
            <p className="text-sm font-medium text-slate-300">{label}</p>
            <p className="text-xs text-slate-500">
              {hint || `PDF, Word, Excel, CSV — glissez-déposez ou cliquez`}
            </p>
          </div>
        )}
        <input ref={inputRef} type="file" accept={accept} className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      </div>
      {error && <p className="mt-2 text-xs text-red-400">⚠ {error}</p>}
    </div>
  );
}

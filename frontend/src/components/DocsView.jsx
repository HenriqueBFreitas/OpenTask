'use client';
import { useState, useRef, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const getToken = () => localStorage.getItem('access_token');
const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

function getFileKind(name = '') {
  const ext = name.split('.').pop().toLowerCase();
  if (IMAGE_EXTS.includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  if (['doc', 'docx'].includes(ext)) return 'docx';
  return 'doc';
}

// ─── Loaders ──────────────────────────────────────────────────────────────────
async function loadPdfJs() {
  if (window.pdfjsLib) return window.pdfjsLib;
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = resolve; script.onerror = reject;
    document.head.appendChild(script);
  });
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  return window.pdfjsLib;
}

async function loadMammoth() {
  if (window.mammoth) return window.mammoth;
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
    script.onload = resolve; script.onerror = reject;
    document.head.appendChild(script);
  });
  return window.mammoth;
}

// ─── PDF Canvas ───────────────────────────────────────────────────────────────
function PdfCanvas({ url, desiredWidth, onPageCount, style = {} }) {
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const renderRef = useRef(null);

  useEffect(() => {
    if (!url || !desiredWidth) return;
    if (renderRef.current) renderRef.current.cancelled = true;
    const task = { cancelled: false };
    renderRef.current = task;
    setReady(false); setFailed(false);

    (async () => {
      try {
        const pdfjsLib = await loadPdfJs();
        if (task.cancelled) return;
        const pdf = await pdfjsLib.getDocument({
          url, httpHeaders: { Authorization: `Bearer ${getToken()}` },
        }).promise;
        if (task.cancelled) return;
        if (onPageCount) onPageCount(pdf.numPages);
        const page = await pdf.getPage(1);
        if (task.cancelled) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const viewport = page.getViewport({ scale: 1 });
        const scale = desiredWidth / viewport.width;
        const scaled = page.getViewport({ scale });
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(scaled.width * dpr);
        canvas.height = Math.floor(scaled.height * dpr);
        canvas.style.width = scaled.width + 'px';
        canvas.style.height = scaled.height + 'px';
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        await page.render({ canvasContext: ctx, viewport: scaled }).promise;
        if (!task.cancelled) setReady(true);
      } catch { if (!task.cancelled) setFailed(true); }
    })();
    return () => { task.cancelled = true; };
  }, [url, desiredWidth]);

  if (failed) return <DocFallback kind="pdf" />;
  return (
    <div style={{ position: 'relative', width: '100%', background: '#f0ede8', ...style }}>
      <canvas ref={canvasRef} style={{ display: 'block', maxWidth: '100%', height: 'auto', opacity: ready ? 1 : 0, transition: 'opacity 0.3s' }} />
      {!ready && (
        <div style={{ position: 'absolute', inset: 0, minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <DocFallback kind="pdf" loading />
        </div>
      )}
    </div>
  );
}

// ─── DOCX Preview (mammoth) ───────────────────────────────────────────────────
function DocxPreview({ url, thumbnail = false }) {
  const [html, setHtml] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    setHtml(null); setFailed(false);

    (async () => {
      try {
        const mammoth = await loadMammoth();
        const res = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } });
        if (!res.ok) throw new Error('fetch failed');
        const arrayBuffer = await res.arrayBuffer();
        if (cancelled) return;
        const result = await mammoth.convertToHtml({ arrayBuffer });
        if (!cancelled) setHtml(result.value);
      } catch { if (!cancelled) setFailed(true); }
    })();
    return () => { cancelled = true; };
  }, [url]);

  if (failed) return <DocFallback kind="docx" />;
  if (html === null) return <DocFallback kind="docx" loading />;

  if (thumbnail) {
    return (
      <div style={{
        width: '100%', aspectRatio: '3/4', overflow: 'hidden',
        borderRadius: '12px 12px 0 0', background: '#fff', flexShrink: 0,
        position: 'relative',
      }}>
        {/* iframe sandboxed para renderizar o HTML sem JS externo */}
        <iframe
          sandbox="allow-same-origin"
          srcDoc={`
            <html><head><style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: 'Georgia', serif;
                font-size: 7px;
                line-height: 1.4;
                color: #1a1814;
                padding: 10px 12px;
                background: #fff;
                overflow: hidden;
              }
              h1,h2,h3,h4 { font-size: 8px; margin-bottom: 3px; font-weight: 700; }
              p { margin-bottom: 3px; }
              table { width: 100%; border-collapse: collapse; font-size: 6px; }
              td, th { border: 1px solid #ddd; padding: 2px; }
              img { max-width: 100%; }
            </style></head><body>${html}</body></html>
          `}
          style={{ width: '100%', height: '100%', border: 'none', pointerEvents: 'none' }}
          title="doc-preview"
        />
      </div>
    );
  }

  // Painel lateral — renderização completa
  return (
    <div style={{
      width: '100%', background: '#fff', borderRadius: 8,
      boxShadow: '0 2px 16px rgba(0,0,0,0.08)', overflow: 'hidden',
    }}>
      <iframe
        sandbox="allow-same-origin"
        srcDoc={`
          <html><head><style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: 'Georgia', serif;
              font-size: 14px;
              line-height: 1.7;
              color: #1a1814;
              padding: 40px 48px;
              background: #fff;
            }
            h1 { font-size: 22px; margin-bottom: 12px; }
            h2 { font-size: 18px; margin-bottom: 10px; margin-top: 24px; }
            h3 { font-size: 15px; margin-bottom: 8px; margin-top: 18px; }
            p { margin-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
            td, th { border: 1px solid #e0ddd8; padding: 8px 12px; }
            th { background: #f7f5f0; font-weight: 700; }
            ul, ol { padding-left: 22px; margin-bottom: 10px; }
            li { margin-bottom: 4px; }
            img { max-width: 100%; border-radius: 4px; }
            strong { font-weight: 700; }
            em { font-style: italic; }
          </style></head><body>${html}</body></html>
        `}
        style={{ width: '100%', height: '70vh', border: 'none' }}
        title="doc-full-preview"
      />
    </div>
  );
}

// ─── Fallback ─────────────────────────────────────────────────────────────────
function DocFallback({ kind = 'doc', loading = false }) {
  const p = kind === 'pdf'
    ? { bg: '#f0ede8', accent: '#8a7f72', label: 'PDF' }
    : kind === 'docx'
    ? { bg: '#e8edf5', accent: '#5b7fa6', label: 'DOC' }
    : { bg: '#ebe9f0', accent: '#7a7490', label: 'DOC' };

  return (
    <div style={{
      width: '100%', aspectRatio: '3/4',
      borderRadius: '12px 12px 0 0',
      background: p.bg, flexShrink: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 10,
    }}>
      <div style={{
        width: 52, height: 64, borderRadius: 6, background: '#fff',
        boxShadow: '0 2px 10px rgba(0,0,0,0.10)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 5, position: 'relative',
        opacity: loading ? 0.5 : 1, transition: 'opacity 0.3s',
      }}>
        <div style={{
          position: 'absolute', top: 0, right: 0, width: 14, height: 14,
          background: p.bg, clipPath: 'polygon(0 0, 100% 100%, 100% 0)',
        }} />
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            height: 2, borderRadius: 2,
            width: i === 0 ? 28 : i === 3 ? 16 : 32,
            background: `${p.accent}40`, marginTop: i === 0 ? 14 : 0,
          }} />
        ))}
      </div>
      <div style={{ fontSize: 11, fontWeight: 800, color: p.accent, letterSpacing: 1, opacity: loading ? 0.4 : 0.8 }}>
        {loading ? '...' : p.label}
      </div>
    </div>
  );
}

// ─── Card preview ─────────────────────────────────────────────────────────────
const CardPreview = ({ doc }) => {
  const kind = getFileKind(doc.name);

  if (kind === 'image' && doc.file_url) {
    return (
      <div style={{ width: '100%', aspectRatio: '3/4', overflow: 'hidden', borderRadius: '12px 12px 0 0', background: '#eef0eb', flexShrink: 0 }}>
        <img src={doc.file_url} alt={doc.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </div>
    );
  }
  if (kind === 'pdf' && doc.file_url) {
    return (
      <div style={{ width: '100%', aspectRatio: '3/4', overflow: 'hidden', borderRadius: '12px 12px 0 0', flexShrink: 0 }}>
        <PdfCanvas url={doc.file_url} desiredWidth={260} style={{ borderRadius: '12px 12px 0 0' }} />
      </div>
    );
  }
  if (kind === 'docx' && doc.file_url) {
    return <DocxPreview url={doc.file_url} thumbnail />;
  }
  return <DocFallback kind="doc" />;
};

// ─── Card ─────────────────────────────────────────────────────────────────────
const DocCard = ({ doc, isSelected, onClick, onDelete }) => {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', flexDirection: 'column', borderRadius: 12,
        border: `1.5px solid ${isSelected ? '#2c2a26' : hover ? '#c5c2bc' : '#e8e5e0'}`,
        background: '#fff', cursor: 'pointer',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        boxShadow: isSelected ? '0 4px 20px rgba(44,42,38,0.12)' : hover ? '0 2px 12px rgba(0,0,0,0.07)' : 'none',
        overflow: 'hidden', position: 'relative',
      }}
    >
      <CardPreview doc={doc} />
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(doc.id, e); }}
        style={{
          position: 'absolute', top: 8, right: 8,
          background: 'rgba(255,255,255,0.92)', border: 'none', borderRadius: 6,
          width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: 13, color: '#a09d97',
          opacity: hover ? 1 : 0, transition: 'opacity 0.15s, color 0.1s',
          boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#c0392b'}
        onMouseLeave={e => e.currentTarget.style.color = '#a09d97'}
        title="Remover"
      >✕</button>
      <div style={{ padding: '10px 11px 11px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#1a1814', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 3 }}>{doc.name}</div>
        <div style={{ fontSize: 10, color: '#a09d97', fontWeight: 500 }}>{doc.size}</div>
      </div>
    </div>
  );
};

// ─── Painel lateral ───────────────────────────────────────────────────────────
const DocPreviewPanel = ({ doc, onClose }) => {
  const [pageCount, setPageCount] = useState(null);
  const contentRef = useRef(null);
  const [pdfWidth, setPdfWidth] = useState(0);

  useEffect(() => { setPageCount(null); setPdfWidth(0); }, [doc?.id]);

  useEffect(() => {
    if (!contentRef.current) return;
    const update = () => {
      if (!contentRef.current) return;
      const w = contentRef.current.getBoundingClientRect().width;
      setPdfWidth(Math.floor(Math.min(w - 48, 700)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(contentRef.current);
    return () => ro.disconnect();
  }, []);

  if (!doc) return null;
  const kind = getFileKind(doc.name);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = doc.file_url; a.download = doc.name; a.target = '_blank'; a.click();
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f7f5f0', minWidth: 0 }}>
      <div style={{ padding: '14px 20px', background: '#fff', borderBottom: '1px solid #e8e5e0', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#2c2a26', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.name}</div>
          <div style={{ fontSize: 11, color: '#a09d97', marginTop: 3 }}>
            {doc.size} · {doc.date}{pageCount ? ` · ${pageCount} pág.` : ''}
          </div>
        </div>
        <button onClick={handleDownload} style={{ background: '#2c2a26', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>Baixar</button>
        <button onClick={onClose} style={{ background: '#f0ede8', border: 'none', borderRadius: 7, width: 30, height: 30, cursor: 'pointer', fontSize: 16, color: '#7a7570', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>×</button>
      </div>

      <div ref={contentRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: 24, display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
        {kind === 'image' && (
          <img src={doc.file_url} alt={doc.name} style={{ maxWidth: '100%', borderRadius: 8, boxShadow: '0 2px 16px rgba(0,0,0,0.08)', objectFit: 'contain' }} />
        )}
        {kind === 'pdf' && pdfWidth > 0 && (
          <div style={{ width: '100%', maxWidth: 700, background: '#fff', borderRadius: 8, boxShadow: '0 2px 16px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            <PdfCanvas url={doc.file_url} desiredWidth={pdfWidth} onPageCount={setPageCount} />
          </div>
        )}
        {kind === 'docx' && (
          <div style={{ width: '100%', maxWidth: 700 }}>
            <DocxPreview url={doc.file_url} thumbnail={false} />
          </div>
        )}
        {kind === 'doc' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center', paddingTop: 60 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#6b6760' }}>Pré-visualização não disponível</div>
            <div style={{ fontSize: 12, color: '#a09d97' }}>Clique em Baixar para abrir o arquivo</div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Principal ────────────────────────────────────────────────────────────────
export default function DocsView() {
  const [docs, setDocs]                 = useState([]);
  const [loading, setLoading]           = useState(true);
  const [selectedDoc, setSelectedDoc]   = useState(null);
  const [dragging, setDragging]         = useState(false);
  const [search, setSearch]             = useState('');
  const [pendingFiles, setPendingFiles] = useState([]);
  const [showModal, setShowModal]       = useState(false);
  const [uploading, setUploading]       = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetch(`${API}/files/`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then(data => setDocs(Array.isArray(data) ? data.map(normalizeDoc) : []))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  }, []);

  function normalizeDoc(d) {
    const bytes = d.size || 0;
    return {
      id: d.id,
      name: d.original_name || d.file?.split('/').pop() || 'arquivo',
      size: bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`,
      date: new Date(d.uploaded_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }),
      file_url: d.file_url,
    };
  }

  const filtered = docs.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));
  const ACCEPT = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,.xls,.xlsx,.ppt,.pptx,.txt,.csv';

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) { setPendingFiles(files); setShowModal(true); }
  };

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) { setPendingFiles(files); setShowModal(true); }
    e.target.value = '';
  };

  const confirmUpload = async () => {
    setUploading(true);
    const added = [];
    for (const f of pendingFiles) {
      const fd = new FormData();
      fd.append('file', f);
      try {
        const res = await fetch(`${API}/files/`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` }, body: fd });
        if (res.ok) added.push(normalizeDoc(await res.json()));
      } catch (_) {}
    }
    setDocs(prev => [...added, ...prev]);
    setPendingFiles([]); setShowModal(false); setUploading(false);
  };

  const deleteDoc = async (id, e) => {
    e?.stopPropagation();
    try { await fetch(`${API}/files/${id}/`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } }); } catch (_) {}
    setDocs(prev => prev.filter(d => d.id !== id));
    if (selectedDoc?.id === id) setSelectedDoc(null);
  };

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a09d97', fontSize: 13 }}>Carregando...</div>
  );

  return (
    <div
      style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative', fontFamily: 'inherit' }}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      {dragging && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(44,42,38,0.05)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: '36px 52px', border: '2px dashed #c5c2bc', textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#2c2a26' }}>Solte para enviar</div>
            <div style={{ fontSize: 12, color: '#a09d97', marginTop: 4 }}>PDF, DOC, DOCX, JPG, PNG...</div>
          </div>
        </div>
      )}

      <div style={{ width: selectedDoc ? 420 : '100%', flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: selectedDoc ? '1px solid #e8e5e0' : 'none', transition: 'width 0.2s', overflow: 'hidden', background: '#faf9f7' }}>
        <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #e8e5e0', background: '#fff', flexShrink: 0 }}>
          <input
            placeholder="Buscar arquivos..." value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e2ddd6', fontSize: 13, background: '#faf9f7', outline: 'none', color: '#2c2a26', fontFamily: 'inherit' }}
            onFocus={e => e.target.style.borderColor = '#2c2a26'}
            onBlur={e => e.target.style.borderColor = '#e2ddd6'}
          />
          <button onClick={() => fileInputRef.current?.click()} style={{ background: '#2c2a26', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Enviar</button>
        </div>

        <input ref={fileInputRef} type="file" accept={ACCEPT} multiple style={{ display: 'none' }} onChange={handleFileInput} />

        {filtered.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#6b6760' }}>{search ? 'Nenhum resultado' : 'Nenhum arquivo ainda'}</div>
            <div style={{ fontSize: 12, color: '#a09d97', lineHeight: 1.6 }}>{search ? 'Tente outro termo' : 'Arraste ou clique para enviar arquivos'}</div>
            {!search && (
              <button onClick={() => fileInputRef.current?.click()} style={{ marginTop: 6, background: 'none', border: '1.5px solid #e2ddd6', borderRadius: 8, padding: '8px 18px', fontSize: 13, color: '#6b6760', cursor: 'pointer', fontFamily: 'inherit' }}>Selecionar arquivo</button>
            )}
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12, alignContent: 'start' }}>
            {filtered.map(doc => (
              <DocCard key={doc.id} doc={doc} isSelected={selectedDoc?.id === doc.id}
                onClick={() => setSelectedDoc(selectedDoc?.id === doc.id ? null : doc)}
                onDelete={deleteDoc} />
            ))}
          </div>
        )}
      </div>

      {selectedDoc && <DocPreviewPanel doc={selectedDoc} onClose={() => setSelectedDoc(null)} />}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 400, boxShadow: '0 16px 64px rgba(0,0,0,0.10)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#2c2a26' }}>
              Enviar {pendingFiles.length} arquivo{pendingFiles.length > 1 ? 's' : ''}
            </h3>
            <div style={{ marginBottom: 20, maxHeight: 180, overflowY: 'auto' }}>
              {pendingFiles.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f0ede8' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 6, background: '#f0ede8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#8a7f72', flexShrink: 0 }}>
                    {getFileKind(f.name).toUpperCase().slice(0, 3)}
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#2c2a26', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 280 }}>{f.name}</div>
                    <div style={{ fontSize: 11, color: '#a09d97' }}>
                      {f.size >= 1024 * 1024 ? `${(f.size / (1024 * 1024)).toFixed(1)} MB` : `${(f.size / 1024).toFixed(0)} KB`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowModal(false); setPendingFiles([]); }} disabled={uploading}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1.5px solid #e2ddd6', background: '#fff', fontSize: 13, cursor: 'pointer', color: '#6b6760', fontFamily: 'inherit' }}>
                Cancelar
              </button>
              <button onClick={confirmUpload} disabled={uploading}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: uploading ? '#a09d97' : '#2c2a26', fontSize: 13, fontWeight: 700, cursor: uploading ? 'not-allowed' : 'pointer', color: '#fff', fontFamily: 'inherit' }}>
                {uploading ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

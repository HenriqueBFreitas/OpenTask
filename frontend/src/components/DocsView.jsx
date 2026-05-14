'use client';
import { useState, useRef, useEffect } from 'react';

const API = 'http://localhost:8000/api';
const FOLDERS = ['Geral', 'Matemática', 'Português', 'Ciências'];
const getToken = () => localStorage.getItem('access_token');

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
const DOC_EXTS   = ['pdf', 'doc', 'docx'];

function getFileKind(name = '') {
  const ext = name.split('.').pop().toLowerCase();
  if (IMAGE_EXTS.includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  return 'doc';
}

const FileIcon = ({ kind, size = 36 }) => {
  const styles = {
    image: { bg: '#eef0eb', color: '#7a8a6a', label: 'IMG', border: '#dde5d5' },
    pdf:   { bg: '#f0ede8', color: '#8a7f72', label: 'PDF', border: '#e2ddd6' },
    doc:   { bg: '#ebe9f0', color: '#7a7490', label: 'DOC', border: '#dddae8' },
  };
  const s = styles[kind] || styles.doc;
  return (
    <div style={{
      width: size, height: size, borderRadius: 7,
      background: s.bg, border: `1px solid ${s.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.22, fontWeight: 800, color: s.color,
      flexShrink: 0, letterSpacing: 0.3,
    }}>
      {s.label}
    </div>
  );
};

const DocPreview = ({ doc }) => {
  if (!doc) return null;
  const kind = getFileKind(doc.name);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = doc.file_url;
    a.download = doc.name;
    a.target = '_blank';
    a.click();
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f7f5f0' }}>
      {/* Header */}
      <div style={{
        padding: '14px 20px', background: '#fff',
        borderBottom: '1px solid #e8e5e0',
        display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
      }}>
        <FileIcon kind={kind} size={36} />
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{
            fontSize: 13, fontWeight: 600, color: '#2c2a26',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{doc.name}</div>
          <div style={{ fontSize: 11, color: '#a09d97', marginTop: 3 }}>
            {doc.size} · {doc.date} · {doc.folder}
          </div>
        </div>
        <button onClick={handleDownload} style={{
          background: '#2c2a26', color: '#fff', border: 'none',
          borderRadius: 7, padding: '7px 14px', fontSize: 12,
          fontWeight: 600, cursor: 'pointer',
        }}>
          ↓ Baixar
        </button>
      </div>

      {/* Preview area */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        {kind === 'image' && (
          <img
            src={doc.file_url}
            alt={doc.name}
            style={{
              maxWidth: '100%', maxHeight: '100%',
              borderRadius: 8, boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
              objectFit: 'contain',
            }}
          />
        )}
        {kind === 'pdf' && (
          <iframe
            src={doc.file_url}
            title={doc.name}
            style={{
              width: '100%', height: '100%',
              border: 'none', borderRadius: 6,
              boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
            }}
          />
        )}
        {kind === 'doc' && (
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 12, color: '#a09d97', textAlign: 'center',
          }}>
            <FileIcon kind="doc" size={52} />
            <div style={{ fontSize: 14, fontWeight: 600, color: '#6b6760' }}>
              Pré-visualização não disponível
            </div>
            <div style={{ fontSize: 12 }}>Clique em Baixar para abrir o arquivo</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function DocsView() {
  const [docs, setDocs]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [dragging, setDragging]       = useState(false);
  const [search, setSearch]           = useState('');
  const [showModal, setShowModal]     = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState('Geral');
  const [uploading, setUploading]     = useState(false);
  const fileInputRef = useRef(null);

  // Carrega documentos do backend
  useEffect(() => {
    fetch(`${API}/documents/`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => r.json())
      .then(data => {
        setDocs(Array.isArray(data) ? data.map(normalizeDoc) : []);
      })
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  }, []);

  function normalizeDoc(d) {
    return {
      id: d.id,
      name: d.name,
      folder: d.folder,
      size: d.size,
      date: new Date(d.uploaded_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }),
      file_url: d.file,  // URL absoluta retornada pelo Django
    };
  }

  const filtered = docs.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const ACCEPT = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp';

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => {
      const ext = f.name.split('.').pop().toLowerCase();
      return [...IMAGE_EXTS, ...DOC_EXTS].includes(ext);
    });
    if (files.length > 0) { setPendingFiles(files); setShowModal(true); }
  };

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) { setPendingFiles(files); setShowModal(true); }
    e.target.value = '';
  };

  // Envia cada arquivo como multipart/form-data pro backend
  const confirmUpload = async () => {
    setUploading(true);
    const added = [];

    for (const f of pendingFiles) {
      const formData = new FormData();
      formData.append('file', f);
      formData.append('name', f.name);
      formData.append('folder', selectedFolder);
      formData.append('size',
        f.size >= 1024 * 1024
          ? `${(f.size / (1024 * 1024)).toFixed(1)} MB`
          : `${(f.size / 1024).toFixed(0)} KB`
      );

      try {
        const res = await fetch(`${API}/documents/`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${getToken()}` },
          // NÃO adiciona Content-Type — o browser define automaticamente com boundary
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          added.push(normalizeDoc(data));
        }
      } catch (_) {}
    }

    setDocs(prev => [...added, ...prev]);
    setPendingFiles([]);
    setShowModal(false);
    setUploading(false);
  };

  const deleteDoc = async (id, e) => {
    e.stopPropagation();
    try {
      await fetch(`${API}/documents/${id}/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
    } catch (_) {}
    setDocs(prev => prev.filter(d => d.id !== id));
    if (selectedDoc?.id === id) setSelectedDoc(null);
  };

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a09d97', fontSize: 13 }}>
      Carregando...
    </div>
  );

  return (
    <div
      style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative', fontFamily: 'inherit' }}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      {/* Drop overlay */}
      {dragging && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(44,42,38,0.05)',
          zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(2px)',
        }}>
          <div style={{
            background: '#fff', borderRadius: 14, padding: '36px 52px',
            border: '2px dashed #c5c2bc', textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
          }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}></div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#2c2a26' }}>Solte para enviar</div>
            <div style={{ fontSize: 12, color: '#a09d97', marginTop: 4 }}>PDF, DOC, DOCX, JPG, PNG...</div>
          </div>
        </div>
      )}

      {/* Left panel */}
      <div style={{
        width: selectedDoc ? 340 : '100%',
        flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        borderRight: selectedDoc ? '1px solid #e8e5e0' : 'none',
        transition: 'width 0.2s',
        overflow: 'hidden',
      }}>
        {/* Toolbar */}
        {docs.length > 0 && (
          <div style={{
            padding: '14px 20px',
            display: 'flex', alignItems: 'center', gap: 10,
            borderBottom: '1px solid #e8e5e0', background: '#fff', flexShrink: 0,
          }}>
            <input
              placeholder="Buscar documentos..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 8,
                border: '1.5px solid #e2ddd6', fontSize: 13,
                background: '#faf9f7', outline: 'none', color: '#2c2a26',
                fontFamily: 'inherit',
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                background: '#2c2a26', color: '#fff', border: 'none',
                borderRadius: 8, padding: '8px 16px', fontSize: 13,
                fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              + Enviar arquivo
            </button>
          </div>
        )}

        {/* Input oculto */}
        <input
          ref={fileInputRef} type="file" accept={ACCEPT}
          multiple style={{ display: 'none' }} onChange={handleFileInput}
        />

        {/* Empty state */}
        {filtered.length === 0 && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 10, padding: 40, textAlign: 'center',
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#6b6760' }}>
              {search ? 'Nenhum resultado' : 'Nenhum documento ainda'}
            </div>
            <div style={{ fontSize: 12, color: '#a09d97', lineHeight: 1.6 }}>
              {search ? 'Tente outro termo de busca' : 'Arraste ou clique para enviar PDF, DOC ou imagens'}
            </div>
            {!search && (
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  marginTop: 6, background: 'none', border: '1.5px solid #e2ddd6',
                  borderRadius: 8, padding: '8px 18px', fontSize: 13,
                  color: '#6b6760', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Selecionar arquivo
              </button>
            )}
          </div>
        )}

        {/* Doc list */}
        {filtered.length > 0 && (
          <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(doc => {
              const isSelected = selectedDoc?.id === doc.id;
              const kind = getFileKind(doc.name);
              return (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDoc(isSelected ? null : doc)}
                  style={{
                    background: '#fff', borderRadius: 10, padding: '12px 14px',
                    border: `1.5px solid ${isSelected ? '#2c2a26' : '#e8e5e0'}`,
                    display: 'flex', alignItems: 'center', gap: 12,
                    cursor: 'pointer', transition: 'all 0.15s',
                    boxShadow: isSelected ? '0 2px 12px rgba(0,0,0,0.06)' : 'none',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = '#c5c2bc'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = '#e8e5e0'; }}
                >
                  {/* Thumbnail para imagens, ícone para docs */}
                  {kind === 'image' && doc.file_url ? (
                    <img src={doc.file_url} alt={doc.name} style={{
                      width: 36, height: 36, borderRadius: 6,
                      objectFit: 'cover', flexShrink: 0,
                      border: '1px solid #e8e5e0',
                    }} />
                  ) : (
                    <FileIcon kind={kind} size={36} />
                  )}
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{
                      fontSize: 13, fontWeight: 600, color: '#2c2a26',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{doc.name}</div>
                    <div style={{ fontSize: 11, color: '#a09d97', marginTop: 4, display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{
                        background: '#f0ede8', borderRadius: 4, padding: '1px 6px',
                        fontSize: 10, fontWeight: 600, color: '#6b6760',
                      }}>{doc.folder}</span>
                      <span>{doc.size}</span>
                      <span>·</span>
                      <span>{doc.date}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => deleteDoc(doc.id, e)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#d0cdc8', fontSize: 14, padding: '4px 6px',
                      borderRadius: 4, flexShrink: 0, transition: 'color 0.1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#b0ada8'}
                    onMouseLeave={e => e.currentTarget.style.color = '#d0cdc8'}
                    title="Remover"
                  >✕</button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right panel — preview */}
      {selectedDoc && <DocPreview doc={selectedDoc} />}

      {/* Upload modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: 28, width: 400,
            boxShadow: '0 16px 64px rgba(0,0,0,0.10)',
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#2c2a26' }}>
              Enviar {pendingFiles.length} arquivo{pendingFiles.length > 1 ? 's' : ''}
            </h3>
            <div style={{ marginBottom: 16, maxHeight: 180, overflowY: 'auto' }}>
              {pendingFiles.map((f, i) => {
                const kind = getFileKind(f.name);
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 0', borderBottom: '1px solid #f0ede8',
                  }}>
                    <FileIcon kind={kind} size={32} />
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{
                        fontSize: 13, fontWeight: 500, color: '#2c2a26',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 280,
                      }}>{f.name}</div>
                      <div style={{ fontSize: 11, color: '#a09d97' }}>
                        {f.size >= 1024 * 1024 ? `${(f.size / (1024 * 1024)).toFixed(1)} MB` : `${(f.size / 1024).toFixed(0)} KB`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b6760', display: 'block', marginBottom: 6 }}>
                Salvar em
              </label>
              <select
                value={selectedFolder}
                onChange={e => setSelectedFolder(e.target.value)}
                style={{
                  width: '100%', padding: '9px 12px', borderRadius: 8,
                  border: '1.5px solid #e2ddd6', fontSize: 13,
                  background: '#faf9f7', color: '#2c2a26', fontFamily: 'inherit', outline: 'none',
                }}
              >
                {FOLDERS.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => { setShowModal(false); setPendingFiles([]); }}
                disabled={uploading}
                style={{
                  flex: 1, padding: '10px', borderRadius: 8,
                  border: '1.5px solid #e2ddd6', background: '#fff',
                  fontSize: 13, cursor: 'pointer', color: '#6b6760', fontFamily: 'inherit',
                }}
              >Cancelar</button>
              <button
                onClick={confirmUpload}
                disabled={uploading}
                style={{
                  flex: 1, padding: '10px', borderRadius: 8,
                  border: 'none', background: uploading ? '#a09d97' : '#2c2a26',
                  fontSize: 13, fontWeight: 700, cursor: uploading ? 'not-allowed' : 'pointer',
                  color: '#fff', fontFamily: 'inherit',
                }}
              >{uploading ? 'Enviando...' : 'Enviar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
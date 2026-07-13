'use client';
import { useState, useRef, useEffect, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const getAuthHeadersFormData = () => {
  const token = localStorage.getItem('access_token') || localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const TEAM_COLORS = [
  { name: 'Ardósia',   dot: '#64748b', bg: '#f1f5f9', text: '#334155' },
  { name: 'Índigo',    dot: '#6366f1', bg: '#eef2ff', text: '#3730a3' },
  { name: 'Esmeralda', dot: '#10b981', bg: '#ecfdf5', text: '#065f46' },
  { name: 'Âmbar',     dot: '#f59e0b', bg: '#fffbeb', text: '#92400e' },
  { name: 'Rosa',      dot: '#ec4899', bg: '#fdf2f8', text: '#9d174d' },
  { name: 'Céu',       dot: '#0ea5e9', bg: '#f0f9ff', text: '#0c4a6e' },
  { name: 'Coral',     dot: '#ef4444', bg: '#fef2f2', text: '#991b1b' },
  { name: 'Violeta',   dot: '#8b5cf6', bg: '#f5f3ff', text: '#5b21b6' },
];

const getColorForGroup = (id) => TEAM_COLORS[id % TEAM_COLORS.length];

function useFileAsDataURL() {
  return (file) =>
    new Promise((res) => {
      const r = new FileReader();
      r.onload = (e) => res(e.target.result);
      r.readAsDataURL(file);
    });
}


// ─── File helpers ──────────────────────────────────────────────────────────────

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

function getFileKind(name = '') {
  const ext = name.split('.').pop().toLowerCase();
  if (IMAGE_EXTS.includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  if (['doc', 'docx'].includes(ext)) return 'docx';
  if (['ppt', 'pptx'].includes(ext)) return 'ppt';
  return 'doc';
}

function formatSize(bytes) {
  if (!bytes) return '—';
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${(bytes / 1024).toFixed(0)} KB`;
}

async function loadPdfJs() {
  if (window.pdfjsLib) return window.pdfjsLib;
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  return window.pdfjsLib;
}

async function loadMammoth() {
  if (window.mammoth) return window.mammoth;
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
    s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
  return window.mammoth;
}

async function loadJSZip() {
  if (window.JSZip) return window.JSZip;
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
  return window.JSZip;
}

// Fetch autenticado → Blob URL
// groupId + fileId (GroupFile.id) → proxy via /api/groups/<groupId>/files/<fileId>/download/
// qualquer membro do grupo pode acessar, resolve CORS e permissão
async function fetchBlobUrl(rawUrl, fileId = null, groupId = null) {
  try {
    if (!rawUrl && !fileId) return { blobUrl: null, error: 'no url' };
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');

    if (groupId && fileId) {
      const proxyUrl = `${API}/groups/${groupId}/files/${fileId}/download/`;
      const res = await fetch(proxyUrl, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (res.ok) { const blob = await res.blob(); return { blobUrl: URL.createObjectURL(blob), error: null }; }
      return { blobUrl: null, error: `HTTP ${res.status}` };
    }

    // Fallback sem groupId (uso direto fora de grupos)
    if (!rawUrl) return { blobUrl: null, error: 'no url' };
    const backendBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api').replace(/\/api\/?$/, '');
    let fullUrl = rawUrl;
    if (!rawUrl.startsWith('http')) fullUrl = backendBase + (rawUrl.startsWith('/') ? '' : '/') + rawUrl;
    const isInternal = (() => { try { return new URL(fullUrl).hostname === new URL(backendBase).hostname; } catch { return false; } })();
    const res = await fetch(fullUrl, { headers: isInternal && token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) return { blobUrl: null, error: `HTTP ${res.status}` };
    const blob = await res.blob();
    return { blobUrl: URL.createObjectURL(blob), error: null };
  } catch (e) {
    return { blobUrl: null, error: String(e) };
  }
}

// ─── PPTX helpers ─────────────────────────────────────────────────────────────
function extractTextsFromXml(xmlStr) {
  const texts = [];
  const paraMatches = xmlStr.match(/<a:p[\s>][\s\S]*?<\/a:p>/g) || [];
  for (const para of paraMatches) {
    const runs = para.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g) || [];
    const line = runs.map(r => r.replace(/<a:t[^>]*>/, '').replace(/<\/a:t>/, '')).join('');
    const decoded = line.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'");
    if (decoded.trim()) texts.push(decoded.trim());
  }
  return texts;
}
function extractSolidColor(xmlStr) {
  const m = xmlStr.match(/<a:srgbClr val="([0-9A-Fa-f]{6})"/);
  return m ? `#${m[1]}` : null;
}
function extractBgColor(slideXml) {
  const bgMatch = slideXml.match(/<p:bg[\s\S]*?<\/p:bg>/);
  if (bgMatch) { const c = extractSolidColor(bgMatch[0]); if (c) return c; }
  return null;
}
function parseShapes(slideXml) {
  const shapes = [];
  const spMatches = slideXml.match(/<p:sp[\s>][\s\S]*?<\/p:sp>/g) || [];
  for (const sp of spMatches) {
    const phType = sp.match(/type="([^"]+)"/)?.[1] || 'body';
    const texts = extractTextsFromXml(sp);
    if (!texts.length) continue;
    const fontSizes = (sp.match(/<a:rPr[^>]*sz="(\d+)"/g) || []).map(s => parseInt(s.match(/sz="(\d+)"/)?.[1]||'0')/100).filter(Boolean);
    const fontSize = fontSizes.length ? Math.max(...fontSizes) : null;
    const bold = /<a:rPr[^>]*b="1"/.test(sp);
    const color = extractSolidColor(sp);
    shapes.push({ texts, fontSize, bold, color, type: phType });
  }
  return shapes;
}
function sortShapes(shapes) {
  const order = { title:0, ctrTitle:0, subTitle:1, body:2, other:3 };
  return [...shapes].sort((a,b) => (order[a.type]??3)-(order[b.type]??3));
}
function isDarkColor(hex) {
  if (!hex||hex.length<7) return false;
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  return (0.299*r+0.587*g+0.114*b)/255<0.5;
}

function FileSpinner() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 24, height: 24, borderRadius: '50%', border: '3px solid #e0ddd8', borderTopColor: '#8a7f72', animation: 'fsp_ 0.7s linear infinite' }} />
      <style>{`@keyframes fsp_ { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function FileFallback({ kind = 'doc' }) {
  const p = kind === 'pdf'  ? { bg: '#f0ede8', accent: '#8a7f72', label: 'PDF' }
           : kind === 'docx' ? { bg: '#e8edf5', accent: '#5b7fa6', label: 'DOC' }
           : kind === 'ppt'  ? { bg: '#fdf0e8', accent: '#c47a3a', label: 'PPT' }
           :                   { bg: '#ebe9f0', accent: '#7a7490', label: 'DOC' };
  return (
    <div style={{ width: '100%', aspectRatio: '3/4', borderRadius: '10px 10px 0 0', background: p.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, flexShrink: 0 }}>
      <div style={{ width: 44, height: 56, borderRadius: 6, background: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.10)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, width: 12, height: 12, background: p.bg, clipPath: 'polygon(0 0, 100% 100%, 100% 0)' }} />
        {[0, 1, 2, 3].map(i => <div key={i} style={{ height: 2, borderRadius: 2, width: i === 0 ? 24 : i === 3 ? 14 : 28, background: `${p.accent}40`, marginTop: i === 0 ? 12 : 0 }} />)}
      </div>
      <div style={{ fontSize: 10, fontWeight: 800, color: p.accent, letterSpacing: 1, opacity: 0.8 }}>{p.label}</div>
    </div>
  );
}

// PDF thumbnail (1 página) para o card
function PdfCardThumb({ url, fileId, groupId }) {
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    setReady(false); setFailed(false);
    (async () => {
      try {
        const pdfjsLib = await loadPdfJs();
        if (cancelled) return;
        const token = localStorage.getItem('access_token') || localStorage.getItem('token');
        // Usa o endpoint de grupo quando disponível (resolve permissão e CORS)
        const proxyUrl = (groupId && fileId)
          ? `${API}/groups/${groupId}/files/${fileId}/download/`
          : url;
        const res = await fetch(proxyUrl, token ? { headers: { Authorization: `Bearer ${token}` } } : {});
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        if (cancelled) return;
        const blobUrl = URL.createObjectURL(blob);
        const pdf = await pdfjsLib.getDocument(blobUrl).promise;
        URL.revokeObjectURL(blobUrl);
        if (cancelled) return;
        const page = await pdf.getPage(1);
        if (cancelled) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const vp0 = page.getViewport({ scale: 1 });
        const scale = 220 / vp0.width;
        const vp = page.getViewport({ scale });
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(vp.width * dpr);
        canvas.height = Math.floor(vp.height * dpr);
        canvas.style.width = vp.width + 'px';
        canvas.style.height = vp.height + 'px';
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
        if (!cancelled) setReady(true);
      } catch (e) {
        console.error('[PdfCardThumb]', e);
        if (!cancelled) setFailed(true);
      }
    })();
    return () => { cancelled = true; };
  }, [url, fileId]);

  if (failed) return <FileFallback kind="pdf" />;
  return (
    <div style={{ width: '100%', aspectRatio: '3/4', borderRadius: '10px 10px 0 0', overflow: 'hidden', background: '#f0ede8', position: 'relative', flexShrink: 0 }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', opacity: ready ? 1 : 0, transition: 'opacity 0.3s' }} />
      {!ready && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileSpinner /></div>}
    </div>
  );
}
// Thumbnail de card para qualquer tipo de arquivo
function FileCardThumb({ file }) {
  const kind = getFileKind(file.original_name || '');
  const url = file.file_url || file.image_url || file.file || '';
  const id = file.file_id || file.id;
  if (kind === 'image' && url) return (
    <div style={{ width: '100%', aspectRatio: '3/4', borderRadius: '10px 10px 0 0', overflow: 'hidden', flexShrink: 0 }}>
      <img src={url} alt={file.original_name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
    </div>
  );
  if (kind === 'pdf' && url) return <PdfCardThumb url={url} fileId={id} />;
  return <FileFallback kind={kind} />;
}

// ─── Componentes de preview full (painel lateral) ─────────────────────────────

function CanvasDisplay({ canvas }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && canvas) {
      ref.current.innerHTML = '';
      canvas.style.display = 'block';
      canvas.style.maxWidth = '100%';
      canvas.style.height = 'auto';
      ref.current.appendChild(canvas);
    }
  }, [canvas]);
  return <div ref={ref} style={{ width: '100%', lineHeight: 0 }} />;
}

// PDF — todas as páginas
function PdfPanelPreview({ url, fileId, groupId, onPageCount }) {
  const wrapRef = useRef(null);
  const taskRef = useRef(null);
  const [pages, setPages] = useState([]);
  const [status, setStatus] = useState('loading');
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    if (!url) return;
    if (taskRef.current) taskRef.current.cancelled = true;
    const task = { cancelled: false };
    taskRef.current = task;
    setPages([]); setStatus('loading'); setErrMsg('');
    const run = async () => {
      try {
        const pdfjsLib = await loadPdfJs();
        if (task.cancelled) return;
        const { blobUrl, error } = await fetchBlobUrl(url, fileId, groupId);
        if (!blobUrl) { if (!task.cancelled) { setErrMsg(error||''); setStatus('failed'); } return; }
        if (task.cancelled) { URL.revokeObjectURL(blobUrl); return; }
        const pdf = await pdfjsLib.getDocument(blobUrl).promise;
        URL.revokeObjectURL(blobUrl);
        if (task.cancelled) return;
        const total = pdf.numPages;
        if (onPageCount) onPageCount(total);
        if (!task.cancelled) { setPages(Array.from({length:total},(_,i)=>({index:i+1,canvas:null}))); setStatus('done'); }
        let containerW = 650;
        if (wrapRef.current) { const w = wrapRef.current.getBoundingClientRect().width; containerW = w>0?Math.floor(w-48):650; }
        for (let i=1; i<=total; i++) {
          if (task.cancelled) break;
          const page = await pdf.getPage(i);
          if (task.cancelled) break;
          const vp0 = page.getViewport({scale:1});
          const scale = Math.min(containerW,700)/vp0.width;
          const vp = page.getViewport({scale});
          const dpr = window.devicePixelRatio||1;
          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(vp.width*dpr); canvas.height = Math.floor(vp.height*dpr);
          canvas.style.width = vp.width+'px'; canvas.style.height = vp.height+'px';
          const ctx = canvas.getContext('2d'); ctx.scale(dpr,dpr);
          await page.render({canvasContext:ctx,viewport:vp}).promise;
          if (task.cancelled) break;
          setPages(prev => prev.map((p,idx) => idx===i-1?{...p,canvas}:p));
        }
      } catch(e) { if (!task.cancelled) { setErrMsg(String(e)); setStatus('failed'); } }
    };
    const raf = requestAnimationFrame(run); task._raf = raf;
    return () => { task.cancelled = true; if (task._raf) cancelAnimationFrame(task._raf); };
  }, [url]);

  if (status==='failed') return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,paddingTop:60,textAlign:'center'}}>
      <div style={{fontSize:14,fontWeight:600,color:'#6b6760'}}>Falha ao carregar o PDF</div>
      {errMsg && <div style={{fontSize:11,color:'#c0392b',maxWidth:400,wordBreak:'break-all'}}>{errMsg}</div>}
    </div>
  );
  if (status==='loading') return <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:300}}><FileSpinner /></div>;
  return (
    <div ref={wrapRef} style={{width:'100%',display:'flex',flexDirection:'column',gap:16,alignItems:'center'}}>
      {pages.map((p,i) => (
        <div key={i} style={{width:'100%',maxWidth:700,background:'#fff',borderRadius:6,overflow:'hidden',boxShadow:'0 1px 8px rgba(0,0,0,0.08)',position:'relative'}}>
          <div style={{position:'absolute',top:8,right:10,background:'rgba(0,0,0,0.35)',color:'#fff',fontSize:10,fontWeight:700,borderRadius:4,padding:'2px 7px',zIndex:2}}>{i+1}</div>
          {p.canvas ? <CanvasDisplay canvas={p.canvas} /> : <div style={{height:200,display:'flex',alignItems:'center',justifyContent:'center',background:'#f7f5f0'}}><FileSpinner /></div>}
        </div>
      ))}
    </div>
  );
}

// DOCX preview
function DocxPreview({ url, fileId, groupId, thumbnail=false }) {
  const [html, setHtml] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    setHtml(null); setFailed(false);
    (async () => {
      try {
        const mammoth = await loadMammoth();
        const { blobUrl } = await fetchBlobUrl(url, fileId, groupId);
        if (!blobUrl) { if (!cancelled) setFailed(true); return; }
        const res = await fetch(blobUrl);
        URL.revokeObjectURL(blobUrl);
        if (!res.ok) throw new Error();
        const arrayBuffer = await res.arrayBuffer();
        if (cancelled) return;
        const result = await mammoth.convertToHtml({ arrayBuffer });
        if (!cancelled) setHtml(result.value);
      } catch { if (!cancelled) setFailed(true); }
    })();
    return () => { cancelled = true; };
  }, [url]);

  if (failed) return <FileFallback kind="docx" />;
  if (html === null) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:120}}><FileSpinner /></div>;
  if (thumbnail) return (
    <div style={{width:'100%',aspectRatio:'3/4',overflow:'hidden',borderRadius:'10px 10px 0 0',background:'#fff',flexShrink:0}}>
      <iframe sandbox="allow-same-origin"
        srcDoc={`<html><head><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Georgia,serif;font-size:7px;line-height:1.4;color:#1a1814;padding:10px 12px;background:#fff;overflow:hidden}h1,h2,h3{font-size:8px;margin-bottom:3px;font-weight:700}p{margin-bottom:3px}</style></head><body>${html}</body></html>`}
        style={{width:'100%',height:'100%',border:'none',pointerEvents:'none'}} title="doc-preview" />
    </div>
  );
  return (
    <div style={{width:'100%',background:'#fff',borderRadius:8,boxShadow:'0 2px 16px rgba(0,0,0,0.08)',overflow:'hidden'}}>
      <iframe sandbox="allow-same-origin"
        srcDoc={`<html><head><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Georgia,serif;font-size:14px;line-height:1.7;color:#1a1814;padding:40px 48px;background:#fff}h1{font-size:22px;margin-bottom:12px}h2{font-size:18px;margin-bottom:10px;margin-top:24px}p{margin-bottom:10px}table{width:100%;border-collapse:collapse;margin-bottom:16px}td,th{border:1px solid #e0ddd8;padding:8px 12px}ul,ol{padding-left:22px;margin-bottom:10px}li{margin-bottom:4px}img{max-width:100%;border-radius:4px}</style></head><body>${html}</body></html>`}
        style={{width:'100%',height:'70vh',border:'none'}} title="doc-full-preview" />
    </div>
  );
}

// Slide renderer para PPTX
function SlideRender({ shapes, bg, mini=false }) {
  const bgColor = bg||'#ffffff';
  const dark = isDarkColor(bgColor);
  const defText = dark?'#ffffff':'#1a1814';
  const subText = dark?'rgba(255,255,255,0.75)':'#4a4845';
  const titleShape = shapes.find(s=>['title','ctrTitle'].includes(s.type))||shapes[0];
  const subtitleShape = shapes.find(s=>['subTitle','body'].includes(s.type)&&s!==titleShape);
  return (
    <div style={{width:'100%',height:'100%',background:bgColor,display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',padding:mini?'4px 6px':'32px 40px',boxSizing:'border-box',gap:mini?3:14,overflow:'hidden'}}>
      {titleShape && <div style={{fontSize:mini?7:Math.min(titleShape.fontSize||36,44),fontWeight:700,color:titleShape.color||defText,textAlign:'center',lineHeight:1.2,maxWidth:'100%',wordBreak:'break-word'}}>{titleShape.texts.join(' ')}</div>}
      {subtitleShape && <div style={{fontSize:mini?4:Math.min(subtitleShape.fontSize||18,22),fontWeight:subtitleShape.bold?600:400,color:subtitleShape.color||subText,textAlign:'center',lineHeight:1.4,maxWidth:'100%',wordBreak:'break-word',opacity:0.9}}>{subtitleShape.texts.slice(0,mini?2:4).join(' · ')}</div>}
      {!shapes.length && <div style={{fontSize:mini?9:14,color:defText,opacity:0.4}}>{mini?'PPT':'Slide sem texto'}</div>}
    </div>
  );
}

// PPT preview
function PptPreview({ url, fileId, groupId, thumbnail=false, onDownload }) {
  const [state, setState] = useState({status:'loading',shapes:[],bg:null,slideCount:0,thumbSrc:null});
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    setState({status:'loading',shapes:[],bg:null,slideCount:0,thumbSrc:null});
    (async () => {
      try {
        const JSZip = await loadJSZip();
        const { blobUrl } = await fetchBlobUrl(url, fileId, groupId);
        if (!blobUrl) { if (!cancelled) setState(s=>({...s,status:'failed'})); return; }
        const res = await fetch(blobUrl); URL.revokeObjectURL(blobUrl);
        if (!res.ok) throw new Error();
        const arrayBuffer = await res.arrayBuffer();
        if (cancelled) return;
        const zip = await JSZip.loadAsync(arrayBuffer);
        const slideFiles = Object.keys(zip.files).filter(n=>/^ppt\/slides\/slide\d+\.xml$/i.test(n)).sort((a,b)=>parseInt(a.match(/\d+/)?.[0]||0)-parseInt(b.match(/\d+/)?.[0]||0));
        const slideCount = slideFiles.length;
        const thumbFile = zip.files['docProps/thumbnail.jpeg']||zip.files['docProps/thumbnail.jpg']||zip.files['docProps/thumbnail.png'];
        if (thumbFile) {
          const blob = await thumbFile.async('blob');
          const thumbSrc = await new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(fr.result);fr.readAsDataURL(blob);});
          if (!cancelled) setState({status:'done',shapes:[],bg:null,slideCount,thumbSrc});
          return;
        }
        if (!slideFiles.length) { if (!cancelled) setState({status:'nodata',shapes:[],bg:null,slideCount:0,thumbSrc:null}); return; }
        const slide1Xml = await zip.files[slideFiles[0]].async('string');
        if (cancelled) return;
        const bg = extractBgColor(slide1Xml);
        const shapes = sortShapes(parseShapes(slide1Xml));
        if (!cancelled) setState({status:'done',shapes,bg,slideCount,thumbSrc:null});
      } catch(err) { if (!cancelled) setState(s=>({...s,status:'failed'})); }
    })();
    return () => { cancelled = true; };
  }, [url]);

  const {status,shapes,bg,slideCount,thumbSrc} = state;
  if (thumbnail) {
    if (status==='loading') return <div style={{width:'100%',aspectRatio:'3/4',borderRadius:'10px 10px 0 0',background:'#fdf0e8',display:'flex',alignItems:'center',justifyContent:'center'}}><FileSpinner /></div>;
    if (thumbSrc) return <div style={{width:'100%',aspectRatio:'3/4',overflow:'hidden',borderRadius:'10px 10px 0 0',background:'#fdf0e8',flexShrink:0}}><img src={thumbSrc} alt="slide" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}} /></div>;
    return <div style={{width:'100%',aspectRatio:'3/4',overflow:'hidden',borderRadius:'10px 10px 0 0',flexShrink:0}}><SlideRender shapes={shapes} bg={bg} mini /></div>;
  }
  if (status==='loading') return <div style={{width:'100%',height:280,background:'#fdf0e8',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center'}}><FileSpinner /></div>;
  return (
    <div style={{width:'100%',maxWidth:700,background:'#fff',borderRadius:8,boxShadow:'0 2px 16px rgba(0,0,0,0.08)',overflow:'hidden'}}>
      <div style={{width:'100%',background:'#1a1a2e',padding:24,display:'flex',alignItems:'center',justifyContent:'center',position:'relative'}}>
        {thumbSrc ? <img src={thumbSrc} alt="slide 1" style={{maxWidth:'90%',maxHeight:360,borderRadius:4,boxShadow:'0 8px 32px rgba(0,0,0,0.4)'}} /> : <div style={{width:'100%',maxWidth:560,aspectRatio:'16/9',borderRadius:4,overflow:'hidden',boxShadow:'0 8px 32px rgba(0,0,0,0.4)'}}><SlideRender shapes={shapes} bg={bg} /></div>}
        {slideCount>0 && <div style={{position:'absolute',bottom:16,right:20,background:'rgba(255,255,255,0.15)',color:'#fff',fontSize:11,fontWeight:700,borderRadius:6,padding:'3px 10px'}}>{slideCount} slides</div>}
      </div>
      <div style={{padding:'16px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',borderTop:'1px solid #f0ede8'}}>
        <div><div style={{fontSize:12,color:'#6b6760'}}>Pré-visualização do slide 1</div><div style={{fontSize:11,color:'#a09d97',marginTop:2}}>Para ver todos os slides, baixe o arquivo</div></div>
        {onDownload && <button onClick={onDownload} style={{background:'#2c2a26',color:'#fff',border:'none',borderRadius:7,padding:'8px 18px',fontSize:12,fontWeight:600,cursor:'pointer'}}>Baixar</button>}
      </div>
    </div>
  );
}

// Painel de preview lateral para arquivos do grupo
function GroupFilePreviewPanel({ file, groupId, onClose }) {
  const [pageCount, setPageCount] = useState(null);
  useEffect(() => { setPageCount(null); }, [file?.id]);
  if (!file) return null;

  const kind = getFileKind(file.original_name || '');
  const url = file.file_url || file.image_url || file.file || '';
  const fileId = file.id; // GroupFile.id — usado no endpoint /groups/<groupId>/files/<fileId>/download/
  const name = file.original_name || 'arquivo';
  const size = formatSize(file.size);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = url; a.download = name; a.target = '_blank'; a.click();
  };

  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',background:'#f7f5f0',minWidth:0,borderLeft:'1px solid #e8e5e0'}}>
      <div style={{padding:'14px 20px',background:'#fff',borderBottom:'1px solid #e8e5e0',display:'flex',alignItems:'center',gap:12,flexShrink:0}}>
        <div style={{flex:1,overflow:'hidden',minWidth:0}}>
          <div style={{fontSize:13,fontWeight:700,color:'#2c2a26',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{name}</div>
          <div style={{fontSize:11,color:'#a09d97',marginTop:3}}>{size}{pageCount?` · ${pageCount} pág.`:''}</div>
        </div>
        <button onClick={handleDownload} style={{background:'#2c2a26',color:'#fff',border:'none',borderRadius:7,padding:'7px 14px',fontSize:12,fontWeight:600,cursor:'pointer',flexShrink:0}}>Baixar</button>
        <button onClick={onClose} style={{background:'#f0ede8',border:'none',borderRadius:7,width:30,height:30,cursor:'pointer',fontSize:16,color:'#7a7570',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>×</button>
      </div>
      <div style={{flex:1,overflowY:'auto',overflowX:'hidden',padding:24,display:'flex',flexDirection:'column',alignItems:'center'}}>
        {kind==='image' && url && <img src={url} alt={name} style={{maxWidth:'100%',borderRadius:8,boxShadow:'0 2px 16px rgba(0,0,0,0.08)',objectFit:'contain'}} />}
        {kind==='pdf'  && <PdfPanelPreview url={url} fileId={fileId} groupId={groupId} onPageCount={setPageCount} />}
        {kind==='docx' && <div style={{width:'100%',maxWidth:700}}><DocxPreview url={url} fileId={fileId} groupId={groupId} thumbnail={false} /></div>}
        {kind==='ppt'  && <div style={{width:'100%',maxWidth:700}}><PptPreview url={url} fileId={fileId} groupId={groupId} thumbnail={false} onDownload={handleDownload} /></div>}
        {kind==='doc'  && <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:12,textAlign:'center',paddingTop:60}}>
          <div style={{fontSize:14,fontWeight:600,color:'#6b6760'}}>Pré-visualização não disponível</div>
          <div style={{fontSize:12,color:'#a09d97'}}>Clique em Baixar para abrir o arquivo</div>
        </div>}
      </div>
    </div>
  );
}

// ─── Componentes base ──────────────────────────────────────────────────────

function Modal({ title, onClose, children, wide = false }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 20,
          width: '100%', maxWidth: wide ? 620 : 460,
          boxShadow: '0 32px 100px rgba(0,0,0,0.22)',
          maxHeight: '92vh', overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '22px 28px 0' }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#1a1814', letterSpacing: '-0.3px' }}>{title}</span>
          <button
            onClick={onClose}
            style={{ background: '#f0ede8', border: 'none', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', fontSize: 16, color: '#7a7570', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >×</button>
        </div>
        <div style={{ padding: '20px 28px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ children }) {
  return (
    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#a09d97', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 6 }}>
      {children}
    </label>
  );
}

function TextInput({ label, ...props }) {
  return (
    <div>
      {label && <FieldLabel>{label}</FieldLabel>}
      <input
        style={{ width: '100%', border: '1.5px solid #e2ddd6', borderRadius: 10, padding: '10px 13px', fontSize: 14, fontFamily: 'inherit', outline: 'none', color: '#1a1814', background: '#faf9f7', transition: 'border-color 0.15s', boxSizing: 'border-box' }}
        onFocus={(e) => e.target.style.borderColor = '#2c2a26'}
        onBlur={(e) => e.target.style.borderColor = '#e2ddd6'}
        {...props}
      />
    </div>
  );
}

function PrimaryBtn({ children, onClick, disabled, small, loading, style: s = {} }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      onMouseEnter={(e) => !(disabled || loading) && (e.currentTarget.style.opacity = '0.85')}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
      style={{
        background: (disabled || loading) ? '#c5c2bc' : '#2c2a26',
        color: '#fff', border: 'none',
        borderRadius: small ? 9 : 11,
        padding: small ? '8px 16px' : '11px 22px',
        fontSize: small ? 13 : 14,
        fontWeight: 700,
        cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
        letterSpacing: '0.15px', transition: 'opacity 0.15s',
        boxShadow: (disabled || loading) ? 'none' : '0 2px 8px rgba(44,42,38,0.15)',
        fontFamily: 'inherit', ...s,
      }}
    >
      {loading ? 'Aguarde…' : children}
    </button>
  );
}

function GhostBtn({ children, onClick, small, style: s = {} }) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={(e) => e.currentTarget.style.background = '#e8e4de'}
      onMouseLeave={(e) => e.currentTarget.style.background = '#f0ede8'}
      style={{
        background: '#f0ede8', color: '#5a5550', border: 'none',
        borderRadius: small ? 9 : 10,
        padding: small ? '7px 14px' : '10px 18px',
        fontSize: 13, fontWeight: 600, cursor: 'pointer',
        transition: 'background 0.15s', fontFamily: 'inherit', ...s,
      }}
    >
      {children}
    </button>
  );
}

function ColorDot({ color, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      title={color.name}
      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.25)'}
      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      style={{
        width: 24, height: 24, borderRadius: '50%', background: color.dot,
        border: selected ? '2.5px solid #2c2a26' : '2.5px solid transparent',
        outline: selected ? '2px solid #f0ede8' : 'none',
        outlineOffset: 1, cursor: 'pointer', padding: 0, transition: 'transform 0.15s',
      }}
    />
  );
}

function CopyLink({ groupId, color }) {
  const [copied, setCopied] = useState(false);
  const link = `https://opentask.app/invite/${groupId}`;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#faf9f7', border: '1.5px solid #e2ddd6', borderRadius: 10, padding: '9px 12px' }}>
      <span style={{ fontSize: 12, color: '#a09d97', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link}</span>
      <button
        onClick={() => { navigator.clipboard?.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        style={{ background: copied ? color.bg : '#f0ede8', color: copied ? color.text : '#5a5550', border: 'none', borderRadius: 7, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit', flexShrink: 0 }}
      >
        {copied ? '✓ Copiado' : 'Copiar'}
      </button>
    </div>
  );
}

// ─── Modal criar equipe ────────────────────────────────────────────────────

function CreateTeamModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(TEAM_COLORS[1]);
  const [coverImage, setCoverImage] = useState(null);
  const [avatarImage, setAvatarImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const readFile = useFileAsDataURL();
  const coverRef = useRef();
  const avatarRef = useRef();

  const pickCover = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    setCoverImage({ dataURL: await readFile(f), file: f });
  };

  const pickAvatar = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    setAvatarImage({ dataURL: await readFile(f), file: f });
  };

  const handle = async () => {
    if (!name.trim()) return;
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/groups/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      });
      if (!res.ok) throw new Error('Erro ao criar grupo');
      const group = await res.json();

      if (avatarImage) {
        const fd = new FormData();
        fd.append('photo', avatarImage.file);
        await fetch(`${API}/groups/${group.id}/upload-photo/`, {
          method: 'POST', headers: getAuthHeadersFormData(), body: fd,
        });
      }

      if (coverImage) {
        const fd = new FormData();
        fd.append('banner', coverImage.file);
        await fetch(`${API}/groups/${group.id}/upload-banner/`, {
          method: 'POST', headers: getAuthHeadersFormData(), body: fd,
        });
      }

      onCreate({ ...group, color, cover: coverImage?.dataURL || null, avatar: avatarImage?.dataURL || null, members: [] });
      onClose();
    } catch (err) {
      setError(err.message || 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Nova equipe" onClose={onClose} wide>
      {/* Capa */}
      <div>
        <FieldLabel>Capa</FieldLabel>
        <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', height: 120 }}>
          {coverImage
            ? <img src={coverImage.dataURL} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : (
              <div
                onClick={() => coverRef.current.click()}
                onMouseEnter={(e) => e.currentTarget.style.background = '#e8e4de'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#f0ede8'}
                style={{ width: '100%', height: '100%', background: '#f0ede8', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.15s' }}
              >
                <span style={{ fontSize: 12, color: '#a09d97', fontWeight: 600 }}>Clique para adicionar capa</span>
              </div>
            )
          }
          {coverImage && (
            <div style={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', gap: 6 }}>
              <button onClick={() => coverRef.current.click()} style={{ background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: 7, padding: '5px 10px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Trocar</button>
              <button onClick={() => setCoverImage(null)} style={{ background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: 7, padding: '5px 10px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>✕</button>
            </div>
          )}
          <input ref={coverRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={pickCover} />
        </div>
      </div>

      {/* Ícone + Nome */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end' }}>
        <div style={{ flexShrink: 0 }}>
          <FieldLabel>Ícone</FieldLabel>
          <div style={{ position: 'relative', width: 64, height: 64, zIndex: 100 }}>
            <div
              onClick={() => avatarRef.current.click()}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              style={{ width: 64, height: 64, borderRadius: 14, background: avatarImage ? 'none' : color.bg, border: `2px solid ${color.dot}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', transition: 'opacity 0.15s' }}
            >
              {avatarImage
                ? <img src={avatarImage.dataURL} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ color: color.dot, fontWeight: 800, fontSize: 24 }}>{name.charAt(0).toUpperCase() || 'E'}</span>
              }
            </div>
            <div
              onClick={() => avatarRef.current.click()}
              style={{ position: 'absolute', bottom: -4, right: -4, background: '#2c2a26', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', cursor: 'pointer', border: '2px solid #fff' }}
            >+</div>
            <input ref={avatarRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={pickAvatar} />
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <TextInput label="Nome da equipe" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
      </div>

      {/* Descrição */}
      <div>
        <FieldLabel>Descrição <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span></FieldLabel>
        <textarea
          placeholder="Do que essa equipe se trata?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          onFocus={(e) => e.target.style.borderColor = '#2c2a26'}
          onBlur={(e) => e.target.style.borderColor = '#e2ddd6'}
          style={{ width: '100%', border: '1.5px solid #e2ddd6', borderRadius: 10, padding: '10px 13px', fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'none', color: '#1a1814', background: '#faf9f7', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
        />
      </div>

      {/* Cor */}
      <div>
        <FieldLabel>Cor do tema</FieldLabel>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TEAM_COLORS.map((c) => (
            <ColorDot key={c.name} color={c} selected={color.name === c.name} onClick={() => setColor(c)} />
          ))}
        </div>
      </div>

      {error && <p style={{ margin: 0, fontSize: 12, color: '#ef4444' }}>{error}</p>}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
        <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
        <PrimaryBtn onClick={handle} disabled={!name.trim()} loading={loading}>Criar equipe</PrimaryBtn>
      </div>
    </Modal>
  );
}

// ─── Modal convidar membro ────────────────────────────────────────────────
function InviteMemberModal({ group, onClose, onInvited }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]); // agora é uma lista, não só 1
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [invitingId, setInvitingId] = useState(null);

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true); setResults([]); setError('');
    try {
      const res = await fetch(`${API}/groups/${group.id}/users/search/?q=${encodeURIComponent(query.trim())}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Erro ao buscar usuários');
      const data = await res.json();
      const list = Array.isArray(data) ? data : (Array.isArray(data.results) ? data.results : []);
      if (!list.length) { setError('Nenhum usuário encontrado'); return; }
      setResults(list);
    } catch (err) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  };

  const invite = async (user) => {
    setInvitingId(user.id); setError('');
    try {
      const res = await fetch(`${API}/groups/${group.id}/invites/`, {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({ invited_user: user.id }),
      });
      if (!res.ok) throw new Error('Erro ao enviar convite');
      setSuccess(`Convite enviado para ${user.username || user.email}!`);
      setResults((prev) => prev.filter((u) => u.id !== user.id));
      onInvited && onInvited();
    } catch (err) {
      setError(err.message);
    } finally {
      setInvitingId(null);
    }
  };

  return (
    <Modal title="Convidar pessoa" onClose={onClose}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          placeholder="Username ou e-mail"
          value={query}
          autoFocus
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          onFocus={(e) => e.target.style.borderColor = '#2c2a26'}
          onBlur={(e) => e.target.style.borderColor = '#e2ddd6'}
          style={{ flex: 1, border: '1.5px solid #e2ddd6', borderRadius: 10, padding: '10px 13px', fontSize: 14, fontFamily: 'inherit', outline: 'none', color: '#1a1814', background: '#faf9f7' }}
        />
        <PrimaryBtn onClick={search} loading={searching} small>Buscar</PrimaryBtn>
      </div>

      {results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
          {results.map((user) => (
            <div key={user.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#faf9f7', borderRadius: 12, padding: '12px 14px', border: '1.5px solid #e2ddd6' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', background: '#e8e4de', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {user.avatar_url
                  ? <img src={user.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 14, fontWeight: 700, color: '#7a7570' }}>{(user.username || user.email || '?')[0].toUpperCase()}</span>
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#1a1814', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.full_name || user.username}</p>
                <p style={{ margin: 0, fontSize: 12, color: '#a09d97', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</p>
              </div>
              <PrimaryBtn onClick={() => invite(user)} loading={invitingId === user.id} small>Convidar</PrimaryBtn>
            </div>
          ))}
        </div>
      )}

      {success && <p style={{ margin: 0, fontSize: 13, color: '#10b981', fontWeight: 600 }}>{success}</p>}
      {error && <p style={{ margin: 0, fontSize: 12, color: '#ef4444' }}>{error}</p>}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <GhostBtn onClick={onClose}>Fechar</GhostBtn>
      </div>
    </Modal>
  );
}
// ─── Detalhe da equipe ─────────────────────────────────────────────────────

function TeamDetail({ team, onBack, onUpdate, onDelete }) {
  const [members, setMembers] = useState(team.members || []);
  const [showInvite, setShowInvite] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(team.name);
  const [description, setDescription] = useState(team.description || '');
  const [activeTab, setActiveTab] = useState('members');
  const [groupFiles, setGroupFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [filesError, setFilesError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef();

  const fetchGroupFiles = useCallback(async () => {
    setFilesLoading(true); setFilesError('');
    try {
      const res = await fetch(`${API}/groups/${team.id}/files/`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setGroupFiles(Array.isArray(data) ? data : []);
    } catch { setFilesError('Erro ao carregar arquivos.'); }
    finally { setFilesLoading(false); }
  }, [team.id]);

  useEffect(() => {
    if (activeTab === 'docs') fetchGroupFiles();
  }, [activeTab, fetchGroupFiles]);

  const uploadGroupFile = async (file) => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    // 1. Faz upload do arquivo para /api/files/
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${API}/files/`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    });
    if (!res.ok) throw new Error('Falha no upload');
    const uploaded = await res.json();
    // 2. Vincula ao grupo via /api/groups/{id}/files/
    const res2 = await fetch(`${API}/groups/${team.id}/files/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ file: uploaded.id }),
    });
    if (!res2.ok) throw new Error('Falha ao vincular ao grupo');
    return await res2.json();
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    e.target.value = '';
    setFilesError('');
    for (const f of files) {
      try {
        const gf = await uploadGroupFile(f);
        setGroupFiles(prev => [gf, ...prev]);
      } catch { setFilesError('Erro ao enviar arquivo.'); }
    }
  };

  const deleteGroupFile = async (gfId) => {
    try {
      await fetch(`${API}/groups/${team.id}/files/${gfId}/`, {
        method: 'DELETE', headers: getAuthHeaders(),
      });
      setGroupFiles(prev => prev.filter(f => f.id !== gfId));
      if (selectedFile?.id === gfId) setSelectedFile(null);
    } catch { setFilesError('Erro ao remover arquivo.'); }
  };
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const readFile = useFileAsDataURL();
  const coverRef = useRef();
  const avatarRef = useRef();

  const color = team.color || getColorForGroup(team.id);

  const patchGroup = useCallback(async (data) => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/groups/${team.id}/`, {
        method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Erro ao salvar');
      const updated = await res.json();
      onUpdate({ ...team, ...updated, color, cover: team.cover, avatar: team.avatar, members });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, [team, color, members, onUpdate]);

  const saveName = () => {
    setEditingName(false);
    if (name.trim() && name.trim() !== team.name) patchGroup({ name: name.trim() });
  };

  const saveDescription = () => {
    if (description !== team.description) patchGroup({ description });
  };

  const toggleRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    try {
      await fetch(`${API}/groups/${team.id}/members/${userId}/role/`, {
        method: 'PATCH', headers: getAuthHeaders(), body: JSON.stringify({ role: newRole }),
      });
      setMembers((prev) => prev.map((m) => (m.user === userId || m.id === userId) ? { ...m, role: newRole } : m));
    } catch {
      setError('Erro ao alterar papel');
    }
  };

  const kickMember = async (userId) => {
    if (!confirm('Remover este membro?')) return;
    try {
      await fetch(`${API}/groups/${team.id}/members/${userId}/kick/`, {
        method: 'DELETE', headers: getAuthHeaders(),
      });
      setMembers((prev) => prev.filter((m) => m.user !== userId && m.id !== userId));
    } catch {
      setError('Erro ao remover membro');
    }
  };

  const deleteGroup = async () => {
    if (!confirm(`Excluir a equipe "${team.name}"? Essa ação não pode ser desfeita.`)) return;
    try {
      await fetch(`${API}/groups/${team.id}/`, { method: 'DELETE', headers: getAuthHeaders() });
      onDelete(team.id);
    } catch {
      setError('Erro ao excluir equipe');
    }
  };

  const changeCover = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    const url = await readFile(f);
    const fd = new FormData();
    fd.append('banner', f);
    await fetch(`${API}/groups/${team.id}/upload-banner/`, {
      method: 'POST', headers: getAuthHeadersFormData(), body: fd,
    });
    onUpdate({ ...team, cover: url, banner_url: url, color, members });
  };

  const changeAvatar = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    const url = await readFile(f);
    const fd = new FormData();
    fd.append('photo', f);
    await fetch(`${API}/groups/${team.id}/upload-photo/`, {
      method: 'POST', headers: getAuthHeadersFormData(), body: fd,
    });
    onUpdate({ ...team, avatar: url, photo_url: url, color, members });
  };

  const coverSrc = team.cover || team.banner_url;
  const avatarSrc = team.avatar || team.photo_url;

  return (
    <div style={{ width: '100%', height: '100%', overflowY: 'auto', background: '#f5f3ef' }}>
      {/* Capa */}
      <div style={{ position: 'relative', width: '100%', height: 180, overflow: 'hidden', flexShrink: 0, background: '#e8e4de' }}>
        {coverSrc && (
          <img src={coverSrc} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block' }} />
        )}
        <button
          onClick={onBack}
          style={{ position: 'absolute', top: 14, left: 16, zIndex: 2, background: coverSrc ? 'rgba(0,0,0,0.38)' : '#ccc9c2', color: coverSrc ? '#fff' : '#5a5550', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
        >← Equipes</button>
        <button
          onClick={() => coverRef.current.click()}
          style={{ position: 'absolute', bottom: 10, right: 14, zIndex: 2, background: coverSrc ? 'rgba(0,0,0,0.38)' : '#ccc9c2', color: coverSrc ? '#fff' : '#7a7570', border: 'none', borderRadius: 8, padding: '6px 13px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
        >{coverSrc ? 'Editar capa' : 'Adicionar capa'}</button>
        <input ref={coverRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={changeCover} />
      </div>

      {/* Header */}
      <div style={{ padding: '0 36px', maxWidth: 960, margin: '0 auto' }}>
        <div style={{ marginTop: -36, marginBottom: 16 }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <div
              onClick={() => avatarRef.current.click()}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              style={{ width: 72, height: 72, borderRadius: 16, background: avatarSrc ? 'none' : color.bg, border: '3px solid #f5f3ef', boxShadow: '0 2px 12px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', transition: 'opacity 0.15s' }}
            >
              {avatarSrc
                ? <img src={avatarSrc} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ color: color.dot, fontWeight: 800, fontSize: 28 }}>{team.name.charAt(0)}</span>
              }
            </div>
            <div
              onClick={() => avatarRef.current.click()}
              style={{ position: 'absolute', bottom: -2, right: -2, background: '#2c2a26', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', cursor: 'pointer', border: '2px solid #f5f3ef' }}
            >+</div>
            <input ref={avatarRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={changeAvatar} />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
          <div>
            {editingName ? (
              <input
                value={name}
                autoFocus
                onChange={(e) => setName(e.target.value)}
                onBlur={saveName}
                onKeyDown={(e) => e.key === 'Enter' && saveName()}
                style={{ fontSize: 22, fontWeight: 700, color: '#1a1814', border: 'none', borderBottom: '2px solid #2c2a26', outline: 'none', background: 'transparent', fontFamily: 'inherit', letterSpacing: '-0.4px', width: 320 }}
              />
            ) : (
              <h1
                onDoubleClick={() => setEditingName(true)}
                style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a1814', letterSpacing: '-0.4px', cursor: 'text' }}
              >{team.name}</h1>
            )}
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#a09d97' }}>
              {team.description || 'Sem descrição'} · {members.length} {members.length === 1 ? 'membro' : 'membros'}
            </p>
          </div>
          <PrimaryBtn onClick={() => setShowInvite(true)} small>+ Convidar pessoa</PrimaryBtn>
        </div>

        {error && <p style={{ fontSize: 12, color: '#ef4444', margin: '0 0 12px' }}>{error}</p>}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1.5px solid #e8e4de', marginBottom: 28 }}>
          {[['members', 'Membros'], ['docs', 'Docs'], ['invite', 'Convite'], ['settings', 'Config']].map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '10px 18px', fontSize: 13, fontWeight: 600, color: activeTab === tab ? '#1a1814' : '#a09d97', borderBottom: `2.5px solid ${activeTab === tab ? '#2c2a26' : 'transparent'}`, marginBottom: -1.5, transition: 'all 0.15s', fontFamily: 'inherit' }}
            >{label}</button>
          ))}
        </div>

        {/* Tab: Membros */}
        {activeTab === 'members' && (
          <div>
            {members.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#c5c2bc' }}>
                <p style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 500, color: '#a09d97' }}>Nenhum membro ainda</p>
                <PrimaryBtn onClick={() => setShowInvite(true)} small>+ Convidar primeira pessoa</PrimaryBtn>
              </div>
            ) : (
              <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px 100px 40px', gap: 0, padding: '11px 20px', borderBottom: '1.5px solid #f0ede8', background: '#faf9f7' }}>
                  {['Pessoa', 'E-mail', 'Papel', ''].map((h, i) => (
                    <span key={i} style={{ fontSize: 11, fontWeight: 700, color: '#c5c2bc', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</span>
                  ))}
                </div>
                {members.map((m, i) => {
                  const userId = m.user || m.id;
                  const displayName = m.user_full_name || m.full_name || m.user_username || m.username || 'Usuário';
                  const displayEmail = m.user_email || m.email || '';
                  const avatarUrl = m.user_avatar || m.avatar_url || null;
                  const initials = displayName.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2);
                  return (
                    <div
                      key={m.id || userId}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#faf9f7'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      style={{ display: 'grid', gridTemplateColumns: '1fr 180px 100px 40px', gap: 0, padding: '13px 20px', borderTop: i === 0 ? 'none' : '1px solid #f5f3ef', alignItems: 'center', transition: 'background 0.15s' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 38, height: 38, borderRadius: '50%', background: avatarUrl ? 'none' : color.bg, border: `1.5px solid ${color.dot}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: color.text, overflow: 'hidden', flexShrink: 0 }}>
                          {avatarUrl ? <img src={avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
                        </div>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#1a1814' }}>{displayName}</p>
                      </div>
                      <span style={{ fontSize: 13, color: '#a09d97', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayEmail}</span>
                      <button
                        onClick={() => toggleRole(userId, m.role)}
                        style={{ background: m.role === 'admin' ? color.bg : '#f0ede8', color: m.role === 'admin' ? color.text : '#7a7570', border: 'none', borderRadius: 20, padding: '5px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', width: 'fit-content' }}
                      >{m.role === 'admin' ? 'Admin' : 'Membro'}</button>
                      <button
                        onClick={() => kickMember(userId)}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#e2ddd6'}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e2ddd6', fontSize: 16, padding: 4, transition: 'color 0.15s', lineHeight: 1, justifySelf: 'end' }}
                      >×</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab: Docs */}
        {activeTab === 'docs' && (
          <div style={{ display: 'flex', gap: 0, minHeight: 400 }}>
            {/* Lista de arquivos */}
            <div style={{ flex: selectedFile ? '0 0 360px' : '1', minWidth: 0, transition: 'flex 0.2s' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ fontSize: 13, color: '#a09d97' }}>
                  {groupFiles.length > 0 ? `${groupFiles.length} arquivo${groupFiles.length > 1 ? 's' : ''}` : 'Nenhum arquivo ainda'}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{ background: '#2c2a26', color: '#fff', border: 'none', borderRadius: 9, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >+ Enviar arquivo</button>
                <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,.ppt,.pptx,.xls,.xlsx,.txt,.csv" style={{ display: 'none' }} onChange={handleFileUpload} />
              </div>
              {filesError && <p style={{ fontSize: 12, color: '#ef4444', margin: '0 0 12px' }}>{filesError}</p>}
              {filesLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><FileSpinner /></div>
              ) : groupFiles.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                  <p style={{ fontSize: 14, color: '#a09d97', margin: '0 0 16px' }}>Nenhum arquivo compartilhado ainda</p>
                  <button onClick={() => fileInputRef.current?.click()} style={{ background: 'none', border: '1.5px solid #e2ddd6', borderRadius: 9, padding: '8px 18px', fontSize: 13, color: '#6b6760', cursor: 'pointer', fontFamily: 'inherit' }}>Enviar primeiro arquivo</button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${selectedFile ? '120px' : '150px'}, 1fr))`, gap: 14 }}>
                  {groupFiles.map(gf => {
                    const name = gf.original_name || 'arquivo';
                    const size = formatSize(gf.size);
                    const uploader = gf.uploaded_by_username || gf.uploaded_by_full_name || '';
                    const kind = getFileKind(name);
                    const isSelected = selectedFile?.id === gf.id;
                    return (
                      <div
                        key={gf.id}
                        onClick={() => setSelectedFile(isSelected ? null : gf)}
                        style={{ display: 'flex', flexDirection: 'column', borderRadius: 10, border: `1.5px solid ${isSelected ? '#2c2a26' : '#e8e5e0'}`, background: '#fff', overflow: 'hidden', position: 'relative', cursor: 'pointer', transition: 'box-shadow 0.15s, border-color 0.15s', boxShadow: isSelected ? '0 4px 16px rgba(44,42,38,0.12)' : 'none' }}
                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; }}
                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.boxShadow = 'none'; }}
                      >
                        {/* Thumbnail por tipo */}
                        {kind === 'image' && (gf.file_url||gf.image_url||gf.file) ? (
                          <div style={{ width: '100%', aspectRatio: '3/4', borderRadius: '10px 10px 0 0', overflow: 'hidden', flexShrink: 0 }}>
                            <img src={gf.file_url||gf.image_url||gf.file} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          </div>
                        ) : kind === 'pdf' && (gf.file_url||gf.file) ? (
                          <PdfCardThumb url={gf.file_url||gf.file} fileId={gf.id} groupId={team.id} />
                        ) : kind === 'docx' ? (
                          <DocxPreview url={gf.file_url||gf.file||''} fileId={gf.id} groupId={team.id} thumbnail />
                        ) : kind === 'ppt' ? (
                          <PptPreview url={gf.file_url||gf.file||''} fileId={gf.id} groupId={team.id} thumbnail />
                        ) : (
                          <FileFallback kind={kind} />
                        )}
                        <button
                          onClick={e => { e.stopPropagation(); deleteGroupFile(gf.id); }}
                          style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(255,255,255,0.92)', border: 'none', borderRadius: 5, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 12, color: '#a09d97', boxShadow: '0 1px 4px rgba(0,0,0,0.10)' }}
                          onMouseEnter={e => e.currentTarget.style.color = '#c0392b'}
                          onMouseLeave={e => e.currentTarget.style.color = '#a09d97'}
                          title="Remover"
                        >✕</button>
                        <div style={{ padding: '8px 10px 10px' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#1a1814', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>{name}</div>
                          <div style={{ fontSize: 10, color: '#a09d97' }}>{size}{uploader ? ` · ${uploader}` : ''}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {/* Painel de preview */}
            {selectedFile && (
              <div style={{ flex: 1, minWidth: 0, marginLeft: 24 }}>
                <GroupFilePreviewPanel file={selectedFile} onClose={() => setSelectedFile(null)} />
              </div>
            )}
          </div>
        )}

        {/* Tab: Convite */}
        {activeTab === 'invite' && (
          <div style={{ maxWidth: 520 }}>
            <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.05)', padding: '24px' }}>
              <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: '#1a1814' }}>Link de convite</h3>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: '#a09d97', lineHeight: 1.5 }}>Qualquer pessoa com este link pode entrar na equipe como membro.</p>
              <CopyLink groupId={team.id} color={color} />
              <div style={{ marginTop: 20, padding: '14px 16px', background: color.bg, borderRadius: 10 }}>
                <p style={{ margin: 0, fontSize: 12, color: color.text, fontWeight: 600 }}>Dica: você também pode convidar pessoas diretamente pela aba Membros buscando pelo username delas.</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Config */}
        {activeTab === 'settings' && (
          <div style={{ maxWidth: 520 }}>
            <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.05)', padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <FieldLabel>Descrição</FieldLabel>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={saveDescription}
                  onFocus={(e) => e.target.style.borderColor = '#2c2a26'}
                  rows={3}
                  style={{ width: '100%', border: '1.5px solid #e2ddd6', borderRadius: 10, padding: '10px 13px', fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'none', color: '#1a1814', background: '#faf9f7', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                />
              </div>
              <div style={{ paddingTop: 16, borderTop: '1px solid #f0ede8' }}>
                <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#ef4444' }}>Zona de perigo</p>
                <button
                  onClick={deleteGroup}
                  style={{ background: '#fef2f2', color: '#ef4444', border: '1.5px solid #fecaca', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >Excluir equipe</button>
              </div>
            </div>
          </div>
        )}

        <div style={{ height: 60 }} />
      </div>

      {showInvite && (
        <InviteMemberModal group={team} onClose={() => setShowInvite(false)} onInvited={() => {}} />
      )}
    </div>
  );
}

// ─── Card da equipe ────────────────────────────────────────────────────────

function TeamCard({ team, onClick }) {
  const color = team.color || getColorForGroup(team.id);
  const coverSrc = team.cover || team.banner_url;
  const avatarSrc = team.avatar || team.photo_url;

  return (
    <div
      onClick={onClick}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.12)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.06)'; e.currentTarget.style.transform = 'none'; }}
      style={{
        background: '#fff', borderRadius: 16,
        boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
        cursor: 'pointer', overflow: 'hidden',
        transition: 'box-shadow 0.2s, transform 0.15s',
        border: '1px solid rgba(0,0,0,0.04)',
      }}
    >
      {/* Área da capa — sem overflow:hidden próprio para o avatar vazar */}
      <div style={{ height: 90, position: 'relative' }}>
        {coverSrc
          ? <img src={coverSrc} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <div style={{ width: '100%', height: '100%', background: '#ece9e4' }} />
        }
        {/* Avatar — vaza para baixo; o overflow:hidden do card pai contém tudo */}
        <div style={{
          position: 'absolute', bottom: -18, left: 16,
          width: 48, height: 48, borderRadius: 12,
          background: avatarSrc ? 'none' : color.bg,
          border: '3px solid #fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          zIndex: 2,
        }}>
          {avatarSrc
            ? <img src={avatarSrc} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ color: color.dot, fontWeight: 800, fontSize: 18 }}>{team.name.charAt(0)}</span>
          }
        </div>
      </div>

      {/* Corpo do card */}
      <div style={{ padding: '26px 16px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#1a1814' }}>{team.name}</span>
          <span style={{ background: color.bg, color: color.text, borderRadius: 20, padding: '2px 9px', fontSize: 11, fontWeight: 600 }}>
            {(team.members || []).length} {(team.members || []).length === 1 ? 'membro' : 'membros'}
          </span>
        </div>
        <p style={{ margin: '0 0 14px', fontSize: 12, color: '#a09d97', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {team.description || 'Sem descrição'}
        </p>
        {(team.members || []).length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {(team.members || []).slice(0, 5).map((m, i) => {
              const avatarUrl = m.user_avatar || m.avatar_url || null;
              const name = m.user_full_name || m.full_name || m.user_username || m.username || '?';
              const initials = name.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2);
              return (
                <div key={m.id || i} style={{ marginLeft: i === 0 ? 0 : -8, position: 'relative', zIndex: 5 - i }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: color.bg, color: color.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, border: '2px solid #fff', overflow: 'hidden' }}>
                    {avatarUrl ? <img src={avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
                  </div>
                </div>
              );
            })}
            {(team.members || []).length > 5 && (
              <div style={{ marginLeft: -8, width: 26, height: 26, borderRadius: '50%', background: '#f0ede8', color: '#7a7570', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, border: '2px solid #fff', zIndex: 0 }}>
                +{(team.members || []).length - 5}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TeamsView principal ───────────────────────────────────────────────────

export default function TeamsView() {
  const [teams, setTeams] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchGroups = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/groups/`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Erro ao carregar grupos');
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.results || []);
      setTeams(list.map((g) => ({ ...g, color: getColorForGroup(g.id) })));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  const filtered = teams.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = (group) => setTeams((prev) => [...prev, { ...group, color: group.color || getColorForGroup(group.id) }]);
  const handleUpdate = (updated) => {
    setTeams((prev) => prev.map((t) => t.id === updated.id ? updated : t));
    if (selected?.id === updated.id) setSelected(updated);
  };
  const handleDelete = (id) => { setTeams((prev) => prev.filter((t) => t.id !== id)); setSelected(null); };

  if (selected) {
    return (
      <div style={{ width: '100%', height: '100%' }}>
        <TeamDetail team={selected} onBack={() => setSelected(null)} onUpdate={handleUpdate} onDelete={handleDelete} />
      </div>
    );
  }

  const totalMembers = [...new Set(teams.flatMap((t) => (t.members || []).map((m) => m.user_email || m.email).filter(Boolean)))].length;

  return (
    <div style={{ width: '100%', height: '100%', overflowY: 'auto', background: '#f5f3ef' }}>
      <div style={{ padding: '36px 40px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, color: '#1a1814', letterSpacing: '-0.6px' }}>Equipes</h1>
            <p style={{ margin: '5px 0 0', fontSize: 14, color: '#a09d97' }}>
              {loading
                ? 'Carregando…'
                : teams.length === 0
                  ? 'Crie sua primeira equipe para começar'
                  : `${teams.length} ${teams.length === 1 ? 'equipe' : 'equipes'} · ${totalMembers} ${totalMembers === 1 ? 'pessoa' : 'pessoas'}`
              }
            </p>
          </div>
          <PrimaryBtn onClick={() => setShowCreate(true)}>+ Nova equipe</PrimaryBtn>
        </div>

        {error && <p style={{ fontSize: 13, color: '#ef4444', marginBottom: 16 }}>{error}</p>}

        {teams.length > 0 && (
          <div style={{ position: 'relative', marginBottom: 28, maxWidth: 400 }}>
            <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#c5c2bc', pointerEvents: 'none' }}>⌕</span>
            <input
              placeholder="Buscar equipes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={(e) => e.target.style.borderColor = '#2c2a26'}
              onBlur={(e) => e.target.style.borderColor = '#e2ddd6'}
              style={{ width: '100%', padding: '10px 13px 10px 34px', border: '1.5px solid #e2ddd6', borderRadius: 12, fontSize: 14, color: '#1a1814', background: '#fff', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
            />
          </div>
        )}

        {!loading && teams.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 100, textAlign: 'center', userSelect: 'none' }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#2c2a26' }}>Nenhuma equipe ainda</span>
            <span style={{ fontSize: 14, color: '#a09d97', maxWidth: 300, lineHeight: 1.6 }}>Crie uma equipe, adicione pessoas e comece a colaborar.</span>
            <PrimaryBtn onClick={() => setShowCreate(true)} style={{ marginTop: 8 }}>+ Criar primeira equipe</PrimaryBtn>
          </div>
        )}

        {teams.length > 0 && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#c5c2bc' }}>
            <p style={{ margin: 0, fontSize: 14 }}>Nenhuma equipe encontrada para "{search}"</p>
          </div>
        )}

        {filtered.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 18 }}>
            {filtered.map((team) => (
              <TeamCard key={team.id} team={team} onClick={() => setSelected(team)} />
            ))}
          </div>
        )}
      </div>

      {showCreate && <CreateTeamModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
    </div>
  );
}
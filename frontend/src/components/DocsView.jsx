'use client';
import { useState, useRef, useEffect, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

// ─── Auth helpers ─────────────────────────────────────────────────────────────
const getToken   = () => localStorage.getItem('access_token');
const getRefresh = () => localStorage.getItem('refresh_token');

async function refreshAccessToken() {
  const refresh = getRefresh();
  if (!refresh) return null;
  try {
    const res = await fetch(`${API}/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    localStorage.setItem('access_token', data.access);
    return data.access;
  } catch { return null; }
}

// ─── Fetch autenticado → Blob URL ─────────────────────────────────────────────
// Retorna { blobUrl, error } — nunca lança exceção
// fetchBlobUrl: baixa um arquivo como blob.
// - URLs do próprio backend → Authorization: Bearer token
// - URLs externas (Cloudinary etc) → tenta direto; se 401/403 usa proxy backend (?download=1)
async function fetchBlobUrl(rawUrl, fileId = null) {
  try {
    if (!rawUrl) return { blobUrl: null, error: 'no url' };

    const backendBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api')
      .replace(/\/api\/?$/, '');

    let fullUrl = rawUrl;
    if (!rawUrl.startsWith('http')) {
      fullUrl = backendBase + (rawUrl.startsWith('/') ? '' : '/') + rawUrl;
    }

    const isInternal = (() => {
      try { return new URL(fullUrl).hostname === new URL(backendBase).hostname; }
      catch { return false; }
    })();

    const token = getToken();

    // 1. Tenta direto
    let res = await fetch(fullUrl, {
      headers: isInternal && token ? { Authorization: `Bearer ${token}` } : {},
    });

    // Token expirado no backend → renova
    if (isInternal && (res.status === 401 || res.status === 403)) {
      const newToken = await refreshAccessToken();
      if (newToken) res = await fetch(fullUrl, { headers: { Authorization: `Bearer ${newToken}` } });
    }

    // 2. URL externa com 401/403 → proxy pelo backend
    if (!isInternal && (res.status === 401 || res.status === 403) && fileId) {
      const proxyUrl = `${API}/files/${fileId}/?download=1`;
      const t = getToken() || '';
      res = await fetch(proxyUrl, { headers: t ? { Authorization: `Bearer ${t}` } : {} });
    }

    if (!res.ok) {
      console.warn('[fetchBlobUrl] status', res.status, fullUrl);
      return { blobUrl: null, error: `HTTP ${res.status}` };
    }

    const blob = await res.blob();
    return { blobUrl: URL.createObjectURL(blob), error: null };
  } catch (e) {
    console.error('[fetchBlobUrl] exception', e, rawUrl);
    return { blobUrl: null, error: String(e) };
  }
}

}

function getFileKind(name = '') {
  const ext = name.split('.').pop().toLowerCase();
  if (IMAGE_EXTS.includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  if (['doc', 'docx'].includes(ext)) return 'docx';
  if (['ppt', 'pptx'].includes(ext)) return 'ppt';
  return 'doc';
}

// ─── Loaders ──────────────────────────────────────────────────────────────────
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

// ─── PPTX XML helpers ─────────────────────────────────────────────────────────
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
  if (bgMatch) {
    const color = extractSolidColor(bgMatch[0]);
    if (color) return color;
    const gm = bgMatch[0].match(/<a:srgbClr val="([0-9A-Fa-f]{6})"/);
    if (gm) return `#${gm[1]}`;
  }
  return null;
}

function parseShapes(slideXml) {
  const shapes = [];
  const spMatches = slideXml.match(/<p:sp[\s>][\s\S]*?<\/p:sp>/g) || [];
  for (const sp of spMatches) {
    const phType = sp.match(/type="([^"]+)"/)?.[1] || 'body';
    const texts = extractTextsFromXml(sp);
    if (!texts.length) continue;
    const fontSizes = (sp.match(/<a:rPr[^>]*sz="(\d+)"/g) || [])
      .map(s => parseInt(s.match(/sz="(\d+)"/)?.[1] || '0') / 100).filter(Boolean);
    const fontSize = fontSizes.length ? Math.max(...fontSizes) : null;
    const bold = /<a:rPr[^>]*b="1"/.test(sp);
    const color = extractSolidColor(sp);
    shapes.push({ texts, fontSize, bold, color, type: phType });
  }
  return shapes;
}

function sortShapes(shapes) {
  const order = { title: 0, ctrTitle: 0, subTitle: 1, body: 2, other: 3 };
  return [...shapes].sort((a, b) => (order[a.type] ?? 3) - (order[b.type] ?? 3));
}

function isDarkColor(hex) {
  if (!hex || hex.length < 7) return false;
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return (0.299*r + 0.587*g + 0.114*b) / 255 < 0.5;
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner({ label = 'Carregando...' }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
      <div style={{ width:28, height:28, borderRadius:'50%', border:'3px solid #e0ddd8', borderTopColor:'#8a7f72', animation:'spin_ 0.7s linear infinite' }} />
      <style>{`@keyframes spin_ { to { transform:rotate(360deg); } }`}</style>
      <div style={{ fontSize:11, color:'#a09d97', fontWeight:500 }}>{label}</div>
    </div>
  );
}

// ─── PDF Canvas (thumbnail no card — 1 página) ────────────────────────────────
function PdfCanvas({ url, fileId, desiredWidth = 260, style = {} }) {
  const canvasRef = useRef(null);
  const wrapRef   = useRef(null);
  const taskRef   = useRef(null);
  const [ready,  setReady]  = useState(false);
  const [failed, setFailed] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    if (!url) return;
    if (taskRef.current) taskRef.current.cancelled = true;
    const task = { cancelled: false };
    taskRef.current = task;
    setReady(false); setFailed(false); setErrMsg('');

    const run = async () => {
      // Resolve largura
      const width = desiredWidth > 0 ? desiredWidth
        : (wrapRef.current ? Math.floor(wrapRef.current.getBoundingClientRect().width) || 260 : 260);

      try {
        const pdfjsLib = await loadPdfJs();
        if (task.cancelled) return;

        const { blobUrl, error } = await fetchBlobUrl(url, fileId);
        if (!blobUrl) { if (!task.cancelled) { setErrMsg(error||'fetch fail'); setFailed(true); } return; }
        if (task.cancelled) { URL.revokeObjectURL(blobUrl); return; }

        const pdf = await pdfjsLib.getDocument(blobUrl).promise;
        URL.revokeObjectURL(blobUrl);
        if (task.cancelled) return;

        const page = await pdf.getPage(1);
        if (task.cancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const vp0   = page.getViewport({ scale: 1 });
        const scale = width / vp0.width;
        const vp    = page.getViewport({ scale });
        const dpr   = window.devicePixelRatio || 1;

        canvas.width  = Math.floor(vp.width  * dpr);
        canvas.height = Math.floor(vp.height * dpr);
        canvas.style.width  = vp.width  + 'px';
        canvas.style.height = vp.height + 'px';

        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
        if (!task.cancelled) setReady(true);
      } catch (e) {
        console.error('[PdfCanvas]', e);
        if (!task.cancelled) { setErrMsg(String(e)); setFailed(true); }
      }
    };

    // Se o wrapper ainda não tem dimensões, espera um frame
    if (wrapRef.current && wrapRef.current.getBoundingClientRect().width === 0) {
      const raf = requestAnimationFrame(run);
      task._raf = raf;
    } else {
      run();
    }

    return () => {
      task.cancelled = true;
      if (task._raf) cancelAnimationFrame(task._raf);
    };
  }, [url, desiredWidth]);

  if (failed) return (
    <div style={{ width:'100%', aspectRatio:'3/4', background:'#f0ede8', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6, borderRadius:'12px 12px 0 0' }}>
      <DocFallback kind="pdf" />
      {errMsg && <div style={{ fontSize:9, color:'#c0392b', padding:'0 8px', textAlign:'center', wordBreak:'break-all' }}>{errMsg}</div>}
    </div>
  );

  return (
    <div ref={wrapRef} style={{ position:'relative', width:'100%', background:'#f0ede8', ...style }}>
      <canvas ref={canvasRef} style={{ display:'block', maxWidth:'100%', height:'auto', opacity: ready ? 1 : 0, transition:'opacity 0.3s' }} />
      {!ready && (
        <div style={{ position:'absolute', inset:0, minHeight:160, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Spinner label="Carregando PDF..." />
        </div>
      )}
    </div>
  );
}

// ─── PDF painel (todas as páginas) ────────────────────────────────────────────
function PdfPanelPreview({ url, fileId, onPageCount }) {
  const wrapRef   = useRef(null);
  const taskRef   = useRef(null);
  const [pages,   setPages]   = useState([]);
  const [status,  setStatus]  = useState('loading'); // loading | done | failed
  const [errMsg,  setErrMsg]  = useState('');

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

        const { blobUrl, error } = await fetchBlobUrl(url, fileId);
        if (!blobUrl) {
          console.error('[PdfPanel] fetchBlobUrl failed:', error, url);
          if (!task.cancelled) { setErrMsg(error||''); setStatus('failed'); }
          return;
        }
        if (task.cancelled) { URL.revokeObjectURL(blobUrl); return; }

        const pdf = await pdfjsLib.getDocument(blobUrl).promise;
        URL.revokeObjectURL(blobUrl);
        if (task.cancelled) return;

        const total = pdf.numPages;
        if (onPageCount) onPageCount(total);

        // Inicializa slots vazios
        if (!task.cancelled) {
          setPages(Array.from({ length: total }, (_, i) => ({ index: i+1, canvas: null })));
          setStatus('done');
        }

        // Resolve largura do container (aguarda DOM se necessário)
        let containerW = 650;
        if (wrapRef.current) {
          const w = wrapRef.current.getBoundingClientRect().width;
          containerW = w > 0 ? Math.floor(w - 48) : 650;
        }

        // Renderiza cada página
        for (let i = 1; i <= total; i++) {
          if (task.cancelled) break;
          const page = await pdf.getPage(i);
          if (task.cancelled) break;

          const vp0   = page.getViewport({ scale: 1 });
          const scale = Math.min(containerW, 700) / vp0.width;
          const vp    = page.getViewport({ scale });
          const dpr   = window.devicePixelRatio || 1;

          const canvas = document.createElement('canvas');
          canvas.width  = Math.floor(vp.width  * dpr);
          canvas.height = Math.floor(vp.height * dpr);
          canvas.style.width  = vp.width  + 'px';
          canvas.style.height = vp.height + 'px';

          const ctx = canvas.getContext('2d');
          ctx.scale(dpr, dpr);
          await page.render({ canvasContext: ctx, viewport: vp }).promise;
          if (task.cancelled) break;

          setPages(prev => prev.map((p, idx) => idx === i-1 ? { ...p, canvas } : p));
        }
      } catch (e) {
        console.error('[PdfPanel]', e);
        if (!task.cancelled) { setErrMsg(String(e)); setStatus('failed'); }
      }
    };

    // Aguarda 1 frame para o wrapper ter dimensões
    const raf = requestAnimationFrame(run);
    task._raf = raf;

    return () => {
      task.cancelled = true;
      if (task._raf) cancelAnimationFrame(task._raf);
    };
  }, [url]);

  if (status === 'failed') return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, paddingTop:60, textAlign:'center' }}>
      <div style={{ fontSize:14, fontWeight:600, color:'#6b6760' }}>Falha ao carregar o PDF</div>
      {errMsg && <div style={{ fontSize:11, color:'#c0392b', maxWidth:400, wordBreak:'break-all' }}>{errMsg}</div>}
      <div style={{ fontSize:12, color:'#a09d97', marginTop:4 }}>Verifique o arquivo ou baixe para abrir localmente</div>
    </div>
  );

  if (status === 'loading') return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:300 }}>
      <Spinner label="Carregando PDF..." />
    </div>
  );

  return (
    <div ref={wrapRef} style={{ width:'100%', display:'flex', flexDirection:'column', gap:16, alignItems:'center' }}>
      {pages.map((p, i) => (
        <div key={i} style={{ width:'100%', maxWidth:700, background:'#fff', borderRadius:6, overflow:'hidden', boxShadow:'0 1px 8px rgba(0,0,0,0.08)', position:'relative' }}>
          <div style={{ position:'absolute', top:8, right:10, background:'rgba(0,0,0,0.35)', color:'#fff', fontSize:10, fontWeight:700, borderRadius:4, padding:'2px 7px', zIndex:2, backdropFilter:'blur(4px)' }}>
            {i + 1}
          </div>
          {p.canvas
            ? <CanvasDisplay canvas={p.canvas} />
            : <div style={{ height:200, display:'flex', alignItems:'center', justifyContent:'center', background:'#f7f5f0' }}><Spinner label={`Página ${i+1}...`} /></div>
          }
        </div>
      ))}
    </div>
  );
}

function CanvasDisplay({ canvas }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && canvas) {
      ref.current.innerHTML = '';
      canvas.style.display  = 'block';
      canvas.style.maxWidth = '100%';
      canvas.style.height   = 'auto';
      ref.current.appendChild(canvas);
    }
  }, [canvas]);
  return <div ref={ref} style={{ width:'100%', lineHeight:0 }} />;
}

// ─── DOCX Preview ─────────────────────────────────────────────────────────────
function DocxPreview({ url, fileId, thumbnail = false }) {
  const [html,   setHtml]   = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    setHtml(null); setFailed(false);
    (async () => {
      try {
        const mammoth = await loadMammoth();
        const { blobUrl } = await fetchBlobUrl(url, fileId);
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

  if (failed) return <DocFallback kind="docx" />;
  if (html === null) return <DocFallback kind="docx" loading />;

  if (thumbnail) return (
    <div style={{ width:'100%', aspectRatio:'3/4', overflow:'hidden', borderRadius:'12px 12px 0 0', background:'#fff', flexShrink:0 }}>
      <iframe sandbox="allow-same-origin"
        srcDoc={`<html><head><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Georgia,serif;font-size:7px;line-height:1.4;color:#1a1814;padding:10px 12px;background:#fff;overflow:hidden}h1,h2,h3,h4{font-size:8px;margin-bottom:3px;font-weight:700}p{margin-bottom:3px}table{width:100%;border-collapse:collapse;font-size:6px}td,th{border:1px solid #ddd;padding:2px}img{max-width:100%}</style></head><body>${html}</body></html>`}
        style={{ width:'100%', height:'100%', border:'none', pointerEvents:'none' }} title="doc-preview" />
    </div>
  );

  return (
    <div style={{ width:'100%', background:'#fff', borderRadius:8, boxShadow:'0 2px 16px rgba(0,0,0,0.08)', overflow:'hidden' }}>
      <iframe sandbox="allow-same-origin"
        srcDoc={`<html><head><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Georgia,serif;font-size:14px;line-height:1.7;color:#1a1814;padding:40px 48px;background:#fff}h1{font-size:22px;margin-bottom:12px}h2{font-size:18px;margin-bottom:10px;margin-top:24px}h3{font-size:15px;margin-bottom:8px;margin-top:18px}p{margin-bottom:10px}table{width:100%;border-collapse:collapse;margin-bottom:16px}td,th{border:1px solid #e0ddd8;padding:8px 12px}th{background:#f7f5f0;font-weight:700}ul,ol{padding-left:22px;margin-bottom:10px}li{margin-bottom:4px}img{max-width:100%;border-radius:4px}strong{font-weight:700}em{font-style:italic}</style></head><body>${html}</body></html>`}
        style={{ width:'100%', height:'70vh', border:'none' }} title="doc-full-preview" />
    </div>
  );
}

// ─── SlideRender ──────────────────────────────────────────────────────────────
function SlideRender({ shapes, bg, bgImageSrc, mini = false }) {
  const bgColor = bg || '#ffffff';
  const dark    = isDarkColor(bgColor);
  const defText = dark ? '#ffffff' : '#1a1814';
  const subText = dark ? 'rgba(255,255,255,0.75)' : '#4a4845';

  const titleShape    = shapes.find(s => ['title','ctrTitle'].includes(s.type)) || shapes[0];
  const subtitleShape = shapes.find(s => ['subTitle','body'].includes(s.type) && s !== titleShape);
  const otherShapes   = shapes.filter(s => s !== titleShape && s !== subtitleShape);

  return (
    <div style={{ width:'100%', height:'100%', background:bgColor, position:'relative', overflow:'hidden', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', padding: mini?'4px 6px':'32px 40px', boxSizing:'border-box', gap: mini?3:14 }}>
      {bgImageSrc && <img src={bgImageSrc} alt="" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', opacity:0.35 }} />}
      {!mini && <div style={{ position:'absolute', left:0, top:0, bottom:0, width:5, background: dark?'rgba(255,255,255,0.25)':'rgba(0,0,0,0.12)' }} />}
      {titleShape && (
        <div style={{ position:'relative', zIndex:1, fontSize: mini?7:Math.min(titleShape.fontSize||36,44), fontWeight:700, color:titleShape.color||defText, textAlign:'center', lineHeight:1.2, letterSpacing: mini?0:'-0.02em', maxWidth:'100%', wordBreak:'break-word' }}>
          {titleShape.texts.join(' ')}
        </div>
      )}
      {subtitleShape && (
        <div style={{ position:'relative', zIndex:1, fontSize: mini?4:Math.min(subtitleShape.fontSize||18,22), fontWeight: subtitleShape.bold?600:400, color:subtitleShape.color||subText, textAlign:'center', lineHeight:1.4, maxWidth:'100%', wordBreak:'break-word', opacity:0.9 }}>
          {subtitleShape.texts.slice(0, mini?2:4).join(' · ')}
        </div>
      )}
      {!mini && otherShapes.slice(0,3).map((s,i) => (
        <div key={i} style={{ position:'relative', zIndex:1, fontSize:Math.min(s.fontSize||14,16), color:s.color||subText, textAlign:'center', maxWidth:'100%', opacity:0.7 }}>
          {s.texts.slice(0,2).join(' ')}
        </div>
      ))}
      {!shapes.length && (
        <div style={{ position:'relative', zIndex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:mini?3:10, opacity:0.5 }}>
          <PptIconSmall color={dark?'#fff':'#c47a3a'} size={mini?20:48} />
          {!mini && <div style={{ fontSize:13, color:defText }}>Slide sem texto</div>}
        </div>
      )}
    </div>
  );
}

// ─── PPT Preview ──────────────────────────────────────────────────────────────
function PptPreview({ url, fileId, thumbnail = false, onDownload }) {
  const [state, setState] = useState({ status:'loading', shapes:[], bg:null, slideCount:0, thumbSrc:null, bgImageSrc:null });

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    setState({ status:'loading', shapes:[], bg:null, slideCount:0, thumbSrc:null, bgImageSrc:null });

    (async () => {
      try {
        const JSZip = await loadJSZip();
        const { blobUrl } = await fetchBlobUrl(url, fileId);
        if (!blobUrl) { if (!cancelled) setState(s => ({...s, status:'failed'})); return; }
        const res = await fetch(blobUrl);
        URL.revokeObjectURL(blobUrl);
        if (!res.ok) throw new Error();
        const arrayBuffer = await res.arrayBuffer();
        if (cancelled) return;
        const zip = await JSZip.loadAsync(arrayBuffer);

        const slideFiles = Object.keys(zip.files)
          .filter(n => /^ppt\/slides\/slide\d+\.xml$/i.test(n))
          .sort((a,b) => parseInt(a.match(/\d+/)?.[0]||0) - parseInt(b.match(/\d+/)?.[0]||0));
        const slideCount = slideFiles.length;

        const thumbFile = zip.files['docProps/thumbnail.jpeg'] || zip.files['docProps/thumbnail.jpg'] || zip.files['docProps/thumbnail.png'];
        if (thumbFile) {
          const blob = await thumbFile.async('blob');
          const thumbSrc = await new Promise(r => { const fr=new FileReader(); fr.onload=()=>r(fr.result); fr.readAsDataURL(blob); });
          if (!cancelled) setState({ status:'done', shapes:[], bg:null, slideCount, thumbSrc, bgImageSrc:null });
          return;
        }

        if (!slideFiles.length) { if (!cancelled) setState({ status:'nodata', shapes:[], bg:null, slideCount:0, thumbSrc:null, bgImageSrc:null }); return; }

        const slide1Xml = await zip.files[slideFiles[0]].async('string');
        if (cancelled) return;
        const bg     = extractBgColor(slide1Xml);
        const shapes = sortShapes(parseShapes(slide1Xml));

        let bgImageSrc = null;
        const blipMatches = slide1Xml.match(/r:embed="(rId\d+)"/g) || [];
        if (blipMatches.length) {
          const relPath = `ppt/slides/_rels/${slideFiles[0].split('/').pop()}.rels`;
          if (zip.files[relPath]) {
            const relsXml = await zip.files[relPath].async('string');
            for (const blip of blipMatches) {
              const rId = blip.match(/r:embed="(rId\d+)"/)?.[1];
              if (!rId) continue;
              const targetMatch = relsXml.match(new RegExp(`Id="${rId}"[^>]*Target="([^"]+)"`));
              if (!targetMatch) continue;
              const target = targetMatch[1];
              const mediaPath = `ppt/slides/${target}`.replace(/\/[^/]+\/\.\./g,'').replace(/^\//,'');
              const mediaFile = zip.files[mediaPath] || zip.files[`ppt/media/${target.split('/').pop()}`];
              if (mediaFile && /\.(png|jpg|jpeg|gif|webp)$/i.test(mediaPath)) {
                const blob = await mediaFile.async('blob');
                bgImageSrc = await new Promise(r => { const fr=new FileReader(); fr.onload=()=>r(fr.result); fr.readAsDataURL(blob); });
                break;
              }
            }
          }
        }
        if (!cancelled) setState({ status:'done', shapes, bg, slideCount, thumbSrc:null, bgImageSrc });
      } catch (err) {
        console.error('[PptPreview]', err);
        if (!cancelled) setState(s => ({...s, status:'failed'}));
      }
    })();
    return () => { cancelled = true; };
  }, [url]);

  const { status, shapes, bg, slideCount, thumbSrc, bgImageSrc } = state;

  if (thumbnail) {
    if (status === 'loading') return (
      <div style={{ width:'100%', aspectRatio:'3/4', borderRadius:'12px 12px 0 0', background:'#fdf0e8', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Spinner />
      </div>
    );
    if (thumbSrc) return (
      <div style={{ width:'100%', aspectRatio:'3/4', overflow:'hidden', borderRadius:'12px 12px 0 0', background:'#fdf0e8', flexShrink:0, position:'relative' }}>
        <img src={thumbSrc} alt="slide" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
        {slideCount > 0 && <SlideBadge count={slideCount} />}
      </div>
    );
    return (
      <div style={{ width:'100%', aspectRatio:'3/4', overflow:'hidden', borderRadius:'12px 12px 0 0', flexShrink:0, position:'relative' }}>
        <SlideRender shapes={shapes} bg={bg} bgImageSrc={bgImageSrc} mini />
        {slideCount > 0 && <SlideBadge count={slideCount} />}
      </div>
    );
  }

  if (status === 'loading') return (
    <div style={{ width:'100%', height:320, borderRadius:8, background:'#fdf0e8', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <Spinner />
    </div>
  );

  const slidePreview = thumbSrc
    ? <img src={thumbSrc} alt="slide 1" style={{ maxWidth:'90%', maxHeight:380, borderRadius:4, boxShadow:'0 8px 32px rgba(0,0,0,0.4)', display:'block' }} />
    : <div style={{ width:'100%', maxWidth:560, aspectRatio:'16/9', borderRadius:4, overflow:'hidden', boxShadow:'0 8px 32px rgba(0,0,0,0.4)' }}><SlideRender shapes={shapes} bg={bg} bgImageSrc={bgImageSrc} /></div>;

  return (
    <div style={{ width:'100%', maxWidth:700, background:'#fff', borderRadius:8, boxShadow:'0 2px 16px rgba(0,0,0,0.08)', overflow:'hidden' }}>
      <div style={{ width:'100%', background:'#1a1a2e', padding:'24px', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
        {slidePreview}
        {slideCount > 0 && (
          <div style={{ position:'absolute', bottom:16, right:20, background:'rgba(255,255,255,0.15)', color:'#fff', fontSize:11, fontWeight:700, borderRadius:6, padding:'3px 10px', backdropFilter:'blur(4px)' }}>
            {slideCount} slides
          </div>
        )}
      </div>
      <div style={{ padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', borderTop:'1px solid #f0ede8' }}>
        <div>
          <div style={{ fontSize:12, color:'#6b6760' }}>Pré-visualização do slide 1</div>
          <div style={{ fontSize:11, color:'#a09d97', marginTop:2 }}>Para ver todos os slides, baixe o arquivo</div>
        </div>
        {onDownload && <button onClick={onDownload} style={{ background:'#2c2a26', color:'#fff', border:'none', borderRadius:7, padding:'8px 18px', fontSize:12, fontWeight:600, cursor:'pointer', flexShrink:0 }}>Baixar</button>}
      </div>
    </div>
  );
}

// ─── Helpers visuais ──────────────────────────────────────────────────────────
function SlideBadge({ count }) {
  return <div style={{ position:'absolute', bottom:6, right:6, background:'rgba(0,0,0,0.55)', color:'#fff', fontSize:9, fontWeight:700, borderRadius:4, padding:'2px 6px' }}>{count} slides</div>;
}

function PptIconSmall({ color='#c47a3a', size=32 }) {
  return (
    <div style={{ width:size, height:size*1.25, borderRadius:size*0.12, background:'#fff', boxShadow:'0 2px 10px rgba(0,0,0,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:size*0.55, height:size*0.38, borderRadius:size*0.06, background:color, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ width:0, height:0, borderStyle:'solid', borderWidth:`${size*0.1}px 0 ${size*0.1}px ${size*0.18}px`, borderColor:`transparent transparent transparent #fff` }} />
      </div>
    </div>
  );
}

function DocFallback({ kind='doc', loading=false }) {
  const p = kind==='pdf'  ? { bg:'#f0ede8', accent:'#8a7f72', label:'PDF' }
           : kind==='docx' ? { bg:'#e8edf5', accent:'#5b7fa6', label:'DOC' }
           : kind==='ppt'  ? { bg:'#fdf0e8', accent:'#c47a3a', label:'PPT' }
           :                  { bg:'#ebe9f0', accent:'#7a7490', label:'DOC' };
  return (
    <div style={{ width:'100%', aspectRatio:'3/4', borderRadius:'12px 12px 0 0', background:p.bg, flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10 }}>
      <div style={{ width:52, height:64, borderRadius:6, background:'#fff', boxShadow:'0 2px 10px rgba(0,0,0,0.10)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:5, position:'relative', opacity:loading?0.5:1, transition:'opacity 0.3s' }}>
        <div style={{ position:'absolute', top:0, right:0, width:14, height:14, background:p.bg, clipPath:'polygon(0 0, 100% 100%, 100% 0)' }} />
        {[0,1,2,3].map(i => <div key={i} style={{ height:2, borderRadius:2, width:i===0?28:i===3?16:32, background:`${p.accent}40`, marginTop:i===0?14:0 }} />)}
      </div>
      <div style={{ fontSize:11, fontWeight:800, color:p.accent, letterSpacing:1, opacity:loading?0.4:0.8 }}>{loading?'...':p.label}</div>
    </div>
  );
}

// ─── Card preview ─────────────────────────────────────────────────────────────
const CardPreview = ({ doc }) => {
  const kind = getFileKind(doc.name);
  if (kind === 'image' && doc.file_url) return (
    <div style={{ width:'100%', aspectRatio:'3/4', overflow:'hidden', borderRadius:'12px 12px 0 0', background:'#eef0eb', flexShrink:0 }}>
      <img src={doc.file_url} alt={doc.name} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
    </div>
  );
  if (kind === 'pdf' && doc.file_url) return (
    <div style={{ width:'100%', aspectRatio:'3/4', overflow:'hidden', borderRadius:'12px 12px 0 0', flexShrink:0 }}>
      <PdfCanvas url={doc.file_url} fileId={doc.id} desiredWidth={260} style={{ borderRadius:'12px 12px 0 0' }} />
    </div>
  );
  if (kind === 'docx' && doc.file_url) return <DocxPreview url={doc.file_url} fileId={doc.id} thumbnail />;
  if (kind === 'ppt'  && doc.file_url) return <PptPreview  url={doc.file_url} fileId={doc.id} thumbnail />;
  return <DocFallback kind={kind} />;
};

// ─── Card ─────────────────────────────────────────────────────────────────────
const DocCard = ({ doc, isSelected, onClick, onDelete }) => {
  const [hover, setHover] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display:'flex', flexDirection:'column', borderRadius:12, border:`1.5px solid ${isSelected?'#2c2a26':hover?'#c5c2bc':'#e8e5e0'}`, background:'#fff', cursor:'pointer', transition:'border-color 0.15s, box-shadow 0.15s', boxShadow:isSelected?'0 4px 20px rgba(44,42,38,0.12)':hover?'0 2px 12px rgba(0,0,0,0.07)':'none', overflow:'hidden', position:'relative' }}>
      <CardPreview doc={doc} />
      <button onClick={e => { e.stopPropagation(); onDelete(doc.id, e); }}
        style={{ position:'absolute', top:8, right:8, background:'rgba(255,255,255,0.92)', border:'none', borderRadius:6, width:24, height:24, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:13, color:'#a09d97', opacity:hover?1:0, transition:'opacity 0.15s, color 0.1s', boxShadow:'0 1px 4px rgba(0,0,0,0.10)' }}
        onMouseEnter={e => e.currentTarget.style.color='#c0392b'} onMouseLeave={e => e.currentTarget.style.color='#a09d97'} title="Remover">✕</button>
      <div style={{ padding:'10px 11px 11px' }}>
        <div style={{ fontSize:12, fontWeight:700, color:'#1a1814', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', marginBottom:3 }}>{doc.name}</div>
        <div style={{ fontSize:10, color:'#a09d97', fontWeight:500 }}>{doc.size}</div>
      </div>
    </div>
  );
};

// ─── Painel lateral ───────────────────────────────────────────────────────────
const DocPreviewPanel = ({ doc, onClose }) => {
  const [pageCount, setPageCount] = useState(null);
  useEffect(() => { setPageCount(null); }, [doc?.id]);

  if (!doc) return null;
  const kind = getFileKind(doc.name);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = doc.file_url; a.download = doc.name; a.target = '_blank'; a.click();
  };

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'#f7f5f0', minWidth:0 }}>
      <div style={{ padding:'14px 20px', background:'#fff', borderBottom:'1px solid #e8e5e0', display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
        <div style={{ flex:1, overflow:'hidden', minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'#2c2a26', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{doc.name}</div>
          <div style={{ fontSize:11, color:'#a09d97', marginTop:3 }}>{doc.size} · {doc.date}{pageCount ? ` · ${pageCount} pág.` : ''}</div>
        </div>
        <button onClick={handleDownload} style={{ background:'#2c2a26', color:'#fff', border:'none', borderRadius:7, padding:'7px 14px', fontSize:12, fontWeight:600, cursor:'pointer', flexShrink:0 }}>Baixar</button>
        <button onClick={onClose} style={{ background:'#f0ede8', border:'none', borderRadius:7, width:30, height:30, cursor:'pointer', fontSize:16, color:'#7a7570', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>×</button>
      </div>

      <div style={{ flex:1, overflowY:'auto', overflowX:'hidden', padding:24, display:'flex', flexDirection:'column', alignItems:'center' }}>
        {kind === 'image' && (
          <img src={doc.file_url} alt={doc.name} style={{ maxWidth:'100%', borderRadius:8, boxShadow:'0 2px 16px rgba(0,0,0,0.08)', objectFit:'contain' }} />
        )}
        {kind === 'pdf' && (
          <PdfPanelPreview url={doc.file_url} fileId={doc.id} onPageCount={setPageCount} />
        )}
        {kind === 'docx' && (
          <div style={{ width:'100%', maxWidth:700 }}>
            <DocxPreview url={doc.file_url} fileId={doc.id} thumbnail={false} />
          </div>
        )}
        {kind === 'ppt' && (
          <div style={{ width:'100%', maxWidth:700 }}>
            <PptPreview url={doc.file_url} fileId={doc.id} thumbnail={false} onDownload={handleDownload} />
          </div>
        )}
        {kind === 'doc' && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12, textAlign:'center', paddingTop:60 }}>
            <div style={{ fontSize:14, fontWeight:600, color:'#6b6760' }}>Pré-visualização não disponível</div>
            <div style={{ fontSize:12, color:'#a09d97' }}>Clique em Baixar para abrir o arquivo</div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── normalizeDoc ─────────────────────────────────────────────────────────────
function normalizeDoc(d) {
  const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api').replace(/\/api\/?$/, '');
  const rawUrl = d.file_url || d.file || '';
  const file_url = rawUrl.startsWith('http') ? rawUrl : `${base}${rawUrl}`;
  const bytes = d.size || 0;
  return {
    id: d.id,
    name: d.original_name || rawUrl.split('/').pop() || 'arquivo',
    size: bytes >= 1024*1024 ? `${(bytes/(1024*1024)).toFixed(1)} MB` : `${(bytes/1024).toFixed(0)} KB`,
    date: new Date(d.uploaded_at).toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' }),
    file_url,
  };
}

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
    const token = getToken();
    fetch(`${API}/files/`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.json())
      .then(data => setDocs(Array.isArray(data) ? data.map(normalizeDoc) : []))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = docs.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));
  const ACCEPT = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,.xls,.xlsx,.ppt,.pptx,.txt,.csv';

  const handleDrop = e => { e.preventDefault(); setDragging(false); const files = Array.from(e.dataTransfer.files); if (files.length) { setPendingFiles(files); setShowModal(true); } };
  const handleFileInput = e => { const files = Array.from(e.target.files); if (files.length) { setPendingFiles(files); setShowModal(true); } e.target.value = ''; };

  const confirmUpload = async () => {
    setUploading(true);
    const added = [];
    const token = getToken();
    for (const f of pendingFiles) {
      const fd = new FormData(); fd.append('file', f);
      try {
        const res = await fetch(`${API}/files/`, { method:'POST', headers: token ? { Authorization:`Bearer ${token}` } : {}, body:fd });
        if (res.ok) added.push(normalizeDoc(await res.json()));
      } catch (_) {}
    }
    setDocs(prev => [...added, ...prev]);
    setPendingFiles([]); setShowModal(false); setUploading(false);
  };

  const deleteDoc = async (id, e) => {
    e?.stopPropagation();
    const token = getToken();
    try { await fetch(`${API}/files/${id}/`, { method:'DELETE', headers: token ? { Authorization:`Bearer ${token}` } : {} }); } catch (_) {}
    setDocs(prev => prev.filter(d => d.id !== id));
    if (selectedDoc?.id === id) setSelectedDoc(null);
  };

  if (loading) return <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'#a09d97', fontSize:13 }}>Carregando...</div>;

  return (
    <div style={{ flex:1, display:'flex', overflow:'hidden', position:'relative', fontFamily:'inherit' }}
      onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={handleDrop}>

      {dragging && (
        <div style={{ position:'absolute', inset:0, background:'rgba(44,42,38,0.05)', zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(2px)' }}>
          <div style={{ background:'#fff', borderRadius:14, padding:'36px 52px', border:'2px dashed #c5c2bc', textAlign:'center', boxShadow:'0 8px 32px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize:14, fontWeight:600, color:'#2c2a26' }}>Solte para enviar</div>
            <div style={{ fontSize:12, color:'#a09d97', marginTop:4 }}>PDF, DOC, DOCX, PPT, PPTX, JPG, PNG...</div>
          </div>
        </div>
      )}

      <div style={{ width: selectedDoc ? 420 : '100%', flexShrink:0, display:'flex', flexDirection:'column', borderRight: selectedDoc ? '1px solid #e8e5e0' : 'none', transition:'width 0.2s', overflow:'hidden', background:'#faf9f7' }}>
        <div style={{ padding:'14px 16px', display:'flex', alignItems:'center', gap:10, borderBottom:'1px solid #e8e5e0', background:'#fff', flexShrink:0 }}>
          <input placeholder="Buscar arquivos..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ flex:1, padding:'8px 12px', borderRadius:8, border:'1.5px solid #e2ddd6', fontSize:13, background:'#faf9f7', outline:'none', color:'#2c2a26', fontFamily:'inherit' }}
            onFocus={e => e.target.style.borderColor='#2c2a26'} onBlur={e => e.target.style.borderColor='#e2ddd6'} />
          <button onClick={() => fileInputRef.current?.click()} style={{ background:'#2c2a26', color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', fontSize:13, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>+ Enviar</button>
        </div>
        <input ref={fileInputRef} type="file" accept={ACCEPT} multiple style={{ display:'none' }} onChange={handleFileInput} />

        {filtered.length === 0 ? (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10, padding:40, textAlign:'center' }}>
            <div style={{ fontSize:14, fontWeight:600, color:'#6b6760' }}>{search ? 'Nenhum resultado' : 'Nenhum arquivo ainda'}</div>
            <div style={{ fontSize:12, color:'#a09d97', lineHeight:1.6 }}>{search ? 'Tente outro termo' : 'Arraste ou clique para enviar arquivos'}</div>
            {!search && <button onClick={() => fileInputRef.current?.click()} style={{ marginTop:6, background:'none', border:'1.5px solid #e2ddd6', borderRadius:8, padding:'8px 18px', fontSize:13, color:'#6b6760', cursor:'pointer', fontFamily:'inherit' }}>Selecionar arquivo</button>}
          </div>
        ) : (
          <div style={{ flex:1, overflowY:'auto', padding:16, display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(130px, 1fr))', gap:12, alignContent:'start' }}>
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
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.18)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, backdropFilter:'blur(4px)' }}>
          <div style={{ background:'#fff', borderRadius:16, padding:28, width:400, boxShadow:'0 16px 64px rgba(0,0,0,0.10)' }}>
            <h3 style={{ margin:'0 0 16px', fontSize:15, fontWeight:700, color:'#2c2a26' }}>Enviar {pendingFiles.length} arquivo{pendingFiles.length>1?'s':''}</h3>
            <div style={{ marginBottom:20, maxHeight:180, overflowY:'auto' }}>
              {pendingFiles.map((f,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid #f0ede8' }}>
                  <div style={{ width:32, height:32, borderRadius:6, background:'#f0ede8', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800, color:'#8a7f72', flexShrink:0 }}>
                    {getFileKind(f.name).toUpperCase().slice(0,3)}
                  </div>
                  <div style={{ overflow:'hidden' }}>
                    <div style={{ fontSize:13, fontWeight:500, color:'#2c2a26', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:280 }}>{f.name}</div>
                    <div style={{ fontSize:11, color:'#a09d97' }}>{f.size>=1024*1024?`${(f.size/(1024*1024)).toFixed(1)} MB`:`${(f.size/1024).toFixed(0)} KB`}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => { setShowModal(false); setPendingFiles([]); }} disabled={uploading} style={{ flex:1, padding:'10px', borderRadius:8, border:'1.5px solid #e2ddd6', background:'#fff', fontSize:13, cursor:'pointer', color:'#6b6760', fontFamily:'inherit' }}>Cancelar</button>
              <button onClick={confirmUpload} disabled={uploading} style={{ flex:1, padding:'10px', borderRadius:8, border:'none', background:uploading?'#a09d97':'#2c2a26', fontSize:13, fontWeight:700, cursor:uploading?'not-allowed':'pointer', color:'#fff', fontFamily:'inherit' }}>{uploading?'Enviando...':'Enviar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
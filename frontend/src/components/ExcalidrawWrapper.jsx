'use client';
import dynamic from 'next/dynamic';
import { useRef, useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const getToken = () => localStorage.getItem('access_token');
const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

const Excalidraw = dynamic(
  () => import('@excalidraw/excalidraw').then((mod) => mod.Excalidraw),
  { ssr: false }
);

export default function ExcalidrawWrapper() {
  const excalidrawAPI = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  // Carrega o board salvo ao montar
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API}/tasks/boards/`, { headers: authHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        if (excalidrawAPI.current && data.elements?.length > 0) {
          excalidrawAPI.current.updateScene({
            elements: data.elements,
            appState: data.app_state || {},
          });
          if (data.files && Object.keys(data.files).length > 0) {
            excalidrawAPI.current.addFiles(Object.values(data.files));
          }
        }
      } catch (e) {
        console.error('Erro ao carregar board:', e);
      } finally {
        setLoaded(true);
      }
    };

    // Aguarda o Excalidraw montar
    const timer = setTimeout(load, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleSave = async () => {
    if (!excalidrawAPI.current) return;
    setSaving(true);
    try {
      const elements = excalidrawAPI.current.getSceneElements();
      const appState = excalidrawAPI.current.getAppState();
      const files = excalidrawAPI.current.getFiles();
      await fetch(`${API}/tasks/boards/`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ elements, app_state: appState, files }),
      });
    } catch (e) {
      console.error('Erro ao salvar board:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '6px 12px', background: '#fff',
        borderBottom: '1px solid #e8e5e0',
        display: 'flex', justifyContent: 'flex-end',
      }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: saving ? '#a09d97' : '#2c2a26',
            color: '#fff', border: 'none',
            borderRadius: 8, padding: '6px 16px', fontSize: 13,
            fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
      <div style={{ flex: 1 }}>
        <Excalidraw excalidrawAPI={(api) => {
          excalidrawAPI.current = api;
        }} />
      </div>
    </div>
  );
}
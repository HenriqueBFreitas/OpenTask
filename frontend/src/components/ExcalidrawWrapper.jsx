'use client';
import dynamic from 'next/dynamic';
import { useRef } from 'react';

const Excalidraw = dynamic(
  () => import('@excalidraw/excalidraw').then((mod) => mod.Excalidraw),
  { ssr: false }
);

const getToken = () => localStorage.getItem('access_token');

export default function ExcalidrawWrapper() {
  const excalidrawAPI = useRef(null);

  const handleSave = async () => {
    if (!excalidrawAPI.current) return;
    const elements = excalidrawAPI.current.getSceneElements();
    const appState = excalidrawAPI.current.getAppState();
    const files = excalidrawAPI.current.getFiles();

    await fetch('http://localhost:8000/api/boards/1/', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ elements, appState, files }),
    });
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
          style={{
            background: '#2c2a26', color: '#fff', border: 'none',
            borderRadius: 8, padding: '6px 16px', fontSize: 13,
            fontWeight: 600, cursor: 'pointer',
          }}
        >
          Salvar
        </button>
      </div>
      <div style={{ flex: 1 }}>
        <Excalidraw excalidrawAPI={(api) => (excalidrawAPI.current = api)} />
      </div>
    </div>
  );
}
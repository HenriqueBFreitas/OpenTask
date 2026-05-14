'use client';
import { useEffect, useRef } from 'react';

const getToken = () => localStorage.getItem('access_token');
const API = 'http://localhost:8000/api';

export default function ExcalidrawWrapper() {
  const iframeRef = useRef(null);

  // Carrega o board e manda pro iframe depois que ele estiver pronto
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const sendBoard = () => {
      fetch(`${API}/boards/`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
        .then(r => r.json())
        .then(data => {
          iframe.contentWindow?.postMessage({
            type: 'LOAD_BOARD',
            elements: data.elements || [],
            appState: data.app_state || {},
          }, '*');
        })
        .catch(() => {});
    };

    iframe.addEventListener('load', sendBoard);
    return () => iframe.removeEventListener('load', sendBoard);
  }, []);

  // Recebe o postMessage do iframe e salva no backend
  useEffect(() => {
    const handleMessage = async (e) => {
      if (e.data?.type !== 'SAVE_BOARD') return;
      const { elements, appState, files } = e.data;
      await fetch(`${API}/boards/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ elements, app_state: appState, files }),
      });
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
      <iframe
        ref={iframeRef}
        src="/excalidraw.html"
        style={{ flex: 1, border: 'none' }}
      />
    </div>
  );
}
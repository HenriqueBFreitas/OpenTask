'use client';
import { useEffect, useRef, useState } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';

export default function ExcalidrawWrapper() {
  const containerRef = useRef(null);
  const [size, setSize] = useState(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 10 && rect.height > 10) {
        setSize({ w: Math.floor(rect.width), h: Math.floor(rect.height) });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      {size && (
        <div style={{ width: size.w, height: size.h }}>
          <Excalidraw
            initialData={{ appState: { viewBackgroundColor: '#f7f5f0' } }}
            UIOptions={{ welcomeScreen: false }}
            langCode="pt-BR"
          />
        </div>
      )}
    </div>
  );
}
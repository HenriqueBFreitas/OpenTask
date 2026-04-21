'use client';

export default function ExcalidrawWrapper() {
  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <iframe
        src="https://excalidraw.com/"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
        }}
        title="Quadro Branco"
      />
    </div>
  );
}
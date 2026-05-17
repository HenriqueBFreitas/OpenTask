'use client';
import { useEffect } from 'react';

const CSS = `
  @keyframes ot-walk {
    0%   { transform: translateX(-60px) scaleX(1); }
    49%  { transform: translateX(60px) scaleX(1); }
    50%  { transform: translateX(60px) scaleX(-1); }
    99%  { transform: translateX(-60px) scaleX(-1); }
    100% { transform: translateX(-60px) scaleX(1); }
  }
  @keyframes ot-bounce {
    0%, 100% { transform: translateY(0) scaleY(1); }
    40%       { transform: translateY(-30px) scaleY(1.05); }
    60%       { transform: translateY(-30px) scaleY(1.05); }
    80%       { transform: translateY(5px) scaleY(0.88); }
  }
  @keyframes ot-spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes ot-pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50%       { transform: scale(1.25); opacity: 0.65; }
  }
  @keyframes ot-dot {
    0%, 100% { opacity: 0.2; transform: translateY(0); }
    50%       { opacity: 1;   transform: translateY(-6px); }
  }
  @keyframes ot-shadow {
    0%, 100% { transform: scaleX(0.45); opacity: 0.1; }
    50%       { transform: scaleX(1);    opacity: 0.2; }
  }
  @keyframes ot-bar {
    0%   { width: 0%; }
    70%  { width: 88%; }
    100% { width: 100%; }
  }
  .ot-walk   { animation: ot-walk   2.4s linear infinite; image-rendering: pixelated; }
  .ot-bounce { animation: ot-bounce 0.9s cubic-bezier(.36,.07,.19,.97) infinite; image-rendering: pixelated; }
  .ot-spin   { animation: ot-spin   1.2s linear infinite; image-rendering: pixelated; }
  .ot-pulse  { animation: ot-pulse  1.1s ease-in-out infinite; image-rendering: pixelated; }
  .ot-dot-1  { animation: ot-dot 1s ease-in-out infinite 0s; }
  .ot-dot-2  { animation: ot-dot 1s ease-in-out infinite 0.18s; }
  .ot-dot-3  { animation: ot-dot 1s ease-in-out infinite 0.36s; }
  .ot-shadow { animation: ot-shadow 0.9s ease-in-out infinite; }
  .ot-bar-inner { animation: ot-bar 2s cubic-bezier(.4,0,.2,1) infinite; }
`;

const DOT = {
  display: 'inline-block',
  width: 8, height: 8,
  borderRadius: '50%',
  background: '#c5c2bc',
};

function Dots() {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
      <span style={DOT} className="ot-dot-1" />
      <span style={DOT} className="ot-dot-2" />
      <span style={DOT} className="ot-dot-3" />
    </div>
  );
}

function Msg({ text }) {
  return <span style={{ fontSize: 13, color: '#a09d97', letterSpacing: '0.2px' }}>{text}</span>;
}

export default function LoadingSpinner({
  type = 'bounce',
  message = 'carregando...',
  size = 56,
  fullScreen = true,
}) {
  useEffect(() => {
    if (!document.getElementById('ot-spinner-css')) {
      const tag = document.createElement('style');
      tag.id = 'ot-spinner-css';
      tag.textContent = CSS;
      document.head.appendChild(tag);
    }
  }, []);

  const src = '/character.png';

  const inner = (() => {
    if (type === 'walk') return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 160, height: size + 8, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={src} className="ot-walk" width={size} height={size} alt="carregando" style={{ objectFit: 'contain', display: 'block' }} />
        </div>
        <div style={{ width: 120, height: 4, background: '#e2ddd6', borderRadius: 99, overflow: 'hidden' }}>
          <div className="ot-bar-inner" style={{ height: '100%', background: '#2c2a26', borderRadius: 99, width: 0 }} />
        </div>
        <Msg text={message} />
      </div>
    );

    if (type === 'bounce') return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <div style={{ height: size + 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
          <img src={src} className="ot-bounce" width={size} height={size} alt="carregando" style={{ objectFit: 'contain', display: 'block', marginBottom: 4 }} />
          <div className="ot-shadow" style={{ width: size * 0.65, height: 6, borderRadius: '50%', background: 'rgba(0,0,0,0.18)' }} />
        </div>
        <Dots />
        <Msg text={message} />
      </div>
    );

    if (type === 'spin') return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <img src={src} className="ot-spin" width={size} height={size} alt="carregando" style={{ objectFit: 'contain', display: 'block' }} />
        <Dots />
        <Msg text={message} />
      </div>
    );

    if (type === 'pulse') return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <img src={src} className="ot-pulse" width={size} height={size} alt="carregando" style={{ objectFit: 'contain', display: 'block' }} />
        <Dots />
        <Msg text={message} />
      </div>
    );

    return null;
  })();

  if (!fullScreen) return inner;

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#faf9f7',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999,
    }}>
      {inner}
    </div>
  );
}
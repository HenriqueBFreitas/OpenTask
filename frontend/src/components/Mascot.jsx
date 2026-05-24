'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const getToken = () => localStorage.getItem('access_token');

const STYLES = `
  @keyframes mascot-float {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-5px); }
  }
  @keyframes mascot-jump {
    0%   { transform: translateY(0) scale(1, 1); }
    15%  { transform: translateY(0) scale(1.1, 0.85); }
    35%  { transform: translateY(-30px) scale(0.92, 1.1); }
    55%  { transform: translateY(-34px) scale(0.95, 1.08); }
    75%  { transform: translateY(-8px) scale(1.05, 0.95); }
    90%  { transform: translateY(2px) scale(0.98, 1.04); }
    100% { transform: translateY(0) scale(1, 1); }
  }
  @keyframes mascot-shake {
    0%, 100% { transform: translateX(0); }
    15%  { transform: translateX(-5px) rotate(-3deg); }
    30%  { transform: translateX(5px) rotate(3deg); }
    45%  { transform: translateX(-4px) rotate(-2deg); }
    60%  { transform: translateX(4px) rotate(2deg); }
    75%  { transform: translateX(-2px) rotate(-1deg); }
    90%  { transform: translateX(2px) rotate(1deg); }
  }
  @keyframes shadow-float {
    0%, 100% { transform: scaleX(0.85); opacity: 0.1; }
    50%       { transform: scaleX(1.05); opacity: 0.18; }
  }
  @keyframes shadow-jump {
    0%   { transform: scaleX(1); opacity: 0.18; }
    45%  { transform: scaleX(0.35); opacity: 0.04; }
    100% { transform: scaleX(1); opacity: 0.18; }
  }
  @keyframes bubble-in {
    0%   { opacity: 0; transform: scale(0.75) translateY(8px); }
    60%  { transform: scale(1.03) translateY(-1px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes bubble-out {
    0%   { opacity: 1; transform: scale(1); }
    100% { opacity: 0; transform: scale(0.8) translateY(6px); }
  }
  @keyframes badge-ping {
    0%        { transform: scale(1); opacity: 1; }
    70%, 100% { transform: scale(2.2); opacity: 0; }
  }
  @keyframes badge-pop {
    0%   { transform: scale(0); }
    60%  { transform: scale(1.2); }
    100% { transform: scale(1); }
  }

  .mascot-img { image-rendering: pixelated; display: block; }
  .mascot-float { animation: mascot-float 2.2s ease-in-out infinite; }
  .mascot-jump  { animation: mascot-jump 0.7s cubic-bezier(.36,.07,.19,.97) forwards; }
  .mascot-shake { animation: mascot-shake 0.6s ease-in-out forwards; }
  .shadow-float { animation: shadow-float 2.2s ease-in-out infinite; }
  .shadow-jump  { animation: shadow-jump 0.7s ease-in-out forwards; }
  .badge-ping   { animation: badge-ping 1.2s ease-out infinite; }
  .badge-pop    { animation: badge-pop 0.3s cubic-bezier(.36,.07,.19,.97) forwards; }
`;

const NOTIFICATION_TYPES = {
  friend: {
    color: '#7c3aed',
    lightColor: '#f3f0ff',
    icon: '👋',
    label: 'Friend Request',
    accept: 'Accept',
    decline: 'Decline',
  },
  group: {
    color: '#0284c7',
    lightColor: '#f0f9ff',
    icon: '👥',
    label: 'Convite de Grupo',
    accept: 'Entrar',
    decline: 'Recusar',
  },
};

export default function Mascot() {
  const [queue, setQueue]           = useState([]);
  const [current, setCurrent]       = useState(null);
  const [bubbleOpen, setBubbleOpen] = useState(false);
  const [bubbleAnim, setBubbleAnim] = useState('in');
  const [charAnim, setCharAnim]     = useState('float');
  const [shadowAnim, setShadowAnim] = useState('float');
  const jumpTimer = useRef(null);
  const pollTimer = useRef(null);

  // Inject CSS once
  useEffect(() => {
    if (document.getElementById('mascot-styles')) return;
    const el = document.createElement('style');
    el.id = 'mascot-styles';
    el.textContent = STYLES;
    document.head.appendChild(el);
  }, []);

  // Poll for pending notifications every 15s
  useEffect(() => {
    const poll = async () => {
      const token = getToken();
      if (!token) return;

      try {
        const [friendRes, groupRes] = await Promise.all([
          fetch(`${API}/friends/requests/`,  { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/groups/invites/`,    { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        const incoming = [];

        if (friendRes.ok) {
          const data = await friendRes.json();
          const list = Array.isArray(data) ? data : (data.results ?? []);
          list.forEach(r => incoming.push({
            id:      `friend-${r.id}`,
            type:    'friend',
            message: `${r.from_user?.username ?? 'Alguém'} quer ser seu amigo`,
            payload: r,
          }));
        }

        if (groupRes.ok) {
          const data = await groupRes.json();
          const list = Array.isArray(data) ? data : (data.results ?? []);
          list.forEach(r => incoming.push({
            id:      `group-${r.id}`,
            type:    'group',
            message: `${r.invited_by_username ?? 'Alguém'} te convidou para "${r.group_name ?? 'um grupo'}"`,
            payload: r,
          }));
        }

        if (incoming.length > 0) {
          setQueue(prev => {
            const existingIds = new Set(prev.map(n => n.id));
            const newItems = incoming.filter(n => !existingIds.has(n.id));
            return [...prev, ...newItems];
          });
        } else {
          // Limpa a fila se não há mais pendentes (ex: respondido em outro dispositivo)
          setQueue([]);
        }
      } catch (_) {}
    };

    poll();
    pollTimer.current = setInterval(poll, 15_000);
    return () => clearInterval(pollTimer.current);
  }, []);

  // Show next notification when queue changes
  useEffect(() => {
    if (queue.length === 0 || current) return;
    const next = queue[0];
    setCurrent(next);
    triggerJump();
    setTimeout(() => {
      setBubbleAnim('in');
      setBubbleOpen(true);
    }, 200);
  }, [queue, current]);

  const triggerJump = () => {
    setCharAnim('jump');
    setShadowAnim('jump');
    clearTimeout(jumpTimer.current);
    jumpTimer.current = setTimeout(() => {
      setCharAnim('float');
      setShadowAnim('float');
    }, 750);
  };

  const triggerShake = () => {
    setCharAnim('shake');
    clearTimeout(jumpTimer.current);
    jumpTimer.current = setTimeout(() => setCharAnim('float'), 650);
  };

  const closeBubble = useCallback((notifId) => {
    setBubbleAnim('out');
    setTimeout(() => {
      setBubbleOpen(false);
      setCurrent(null);
      setQueue(prev => prev.filter(n => n.id !== notifId));
    }, 200);
  }, []);

  const respond = async (accept) => {
    if (!current) return;
    const token = getToken();
    try {
      if (current.type === 'friend') {
        const action = accept ? 'accept' : 'reject';
        await fetch(`${API}/friends/requests/${current.payload.id}/${action}/`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await fetch(`${API}/groups/invites/${current.payload.id}/respond/`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: accept ? 'accept' : 'decline' }),
        });
      }
    } catch (_) {}

    if (accept) triggerJump(); else triggerShake();
    closeBubble(current.id);
  };

  const handleMascotClick = () => {
    if (queue.length === 0) return;
    if (bubbleOpen) return;
    setCurrent(queue[0]);
    triggerJump();
    setTimeout(() => {
      setBubbleAnim('in');
      setBubbleOpen(true);
    }, 150);
  };

  const config = current ? NOTIFICATION_TYPES[current.type] : null;
  const hasPending = queue.length > 0;

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 60,
      zIndex: 9990,
      display: hasPending ? 'flex' : 'none',
      flexDirection: 'column',
      alignItems: 'center',
      pointerEvents: 'none',
      userSelect: 'none',
    }}>

      {/* Notification bubble */}
      {bubbleOpen && current && config && (
        <div
          key={current.id}
          style={{
            animation: `bubble-${bubbleAnim} 0.22s cubic-bezier(.36,.07,.19,.97) forwards`,
            background: '#ffffff',
            border: `2px solid ${config.color}`,
            borderRadius: 16,
            padding: '13px 15px 12px',
            marginBottom: 12,
            width: 230,
            boxShadow: `0 12px 40px rgba(0,0,0,0.13), 0 0 0 4px ${config.color}18`,
            pointerEvents: 'all',
            position: 'relative',
            fontFamily: 'inherit',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: config.lightColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, flexShrink: 0,
            }}>
              {config.icon}
            </div>
            <span style={{
              fontSize: 11, fontWeight: 700, color: config.color,
              letterSpacing: 0.4, textTransform: 'uppercase',
            }}>
              {config.label}
            </span>
            {queue.length > 1 && (
              <span style={{
                marginLeft: 'auto',
                fontSize: 10, fontWeight: 700,
                background: config.color, color: '#fff',
                borderRadius: 99, padding: '2px 7px',
              }}>
                +{queue.length - 1}
              </span>
            )}
          </div>

          {/* Message */}
          <p style={{
            fontSize: 12.5, color: '#1a1a1a',
            lineHeight: 1.5, margin: '0 0 12px',
          }}>
            {current.message}
          </p>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => respond(true)}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 9,
                border: 'none', background: config.color,
                color: '#fff', fontSize: 12.5, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'filter 0.15s',
              }}
              onMouseEnter={e => e.target.style.filter = 'brightness(1.12)'}
              onMouseLeave={e => e.target.style.filter = 'brightness(1)'}
            >
              {config.accept}
            </button>
            <button
              onClick={() => respond(false)}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 9,
                border: `1.5px solid ${config.color}`,
                background: 'transparent',
                color: config.color, fontSize: 12.5, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.target.style.background = config.lightColor}
              onMouseLeave={e => e.target.style.background = 'transparent'}
            >
              {config.decline}
            </button>
          </div>

          {/* Bubble tail */}
          <div style={{
            position: 'absolute', bottom: -10, right: 28,
            width: 0, height: 0,
            borderLeft: '10px solid transparent',
            borderRight: '10px solid transparent',
            borderTop: `10px solid ${config.color}`,
          }} />
          <div style={{
            position: 'absolute', bottom: -7, right: 30,
            width: 0, height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: '8px solid #fff',
          }} />
        </div>
      )}

      {/* Character + shadow */}
      <div
        onClick={handleMascotClick}
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          pointerEvents: hasPending ? 'all' : 'none',
          cursor: hasPending && !bubbleOpen ? 'pointer' : 'default',
        }}
      >
        {/* Badge */}
        {hasPending && (
          <div style={{ position: 'absolute', top: -5, right: -5, zIndex: 1 }}>
            <div className="badge-ping" style={{
              position: 'absolute', inset: 0,
              borderRadius: '50%', background: '#ef4444',
            }} />
            <div className="badge-pop" style={{
              width: 16, height: 16, borderRadius: '50%',
              background: '#ef4444', border: '2px solid #fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 8.5, fontWeight: 900, color: '#fff',
              position: 'relative',
            }}>
              {queue.length > 9 ? '9+' : queue.length}
            </div>
          </div>
        )}

        {/* Character image */}
        <img
          key={charAnim}
          src="/character.png"
          width={72}
          height={72}
          alt="mascot"
          className={`mascot-img mascot-${charAnim}`}
          style={{ objectFit: 'contain' }}
          draggable={false}
        />

        {/* Shadow */}
        <div
          key={`shadow-${shadowAnim}`}
          className={`shadow-${shadowAnim}`}
          style={{
            width: 36, height: 6,
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.13)',
            marginTop: 2,
          }}
        />
      </div>
    </div>
  );
}
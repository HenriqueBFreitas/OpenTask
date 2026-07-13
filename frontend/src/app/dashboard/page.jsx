'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import TasksView from '@/components/TaskView';
import DocsView from '@/components/DocsView';
import TeamsView from '@/components/TeamsView';
import SettingsView from '@/components/SettingsView';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const ExcalidrawWrapper = dynamic(
  () => import('./ExcalidrawWrapper'),
  {
    ssr: false,
    loading: () => (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a09d97' }}>
        Carregando quadro...
      </div>
    ),
  }
);

const NAV = [
  { id: 'whiteboard', icon: '', label: 'Quadro' },
  { id: 'tasks',      icon: '',  label: 'Tarefas' },
  { id: 'docs',      icon: '',  label: 'Arquivos' },
  { id: 'members',    icon: '', label: 'Equipe' },
  { id: 'settings',   icon: '', label: 'Ajustes' },
];

function PlaceholderView({ label, icon }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      color: '#a09d97', gap: 12,
    }}>
      <span style={{ fontSize: 40 }}>{icon}</span>
      <span style={{ fontSize: 18, fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 13 }}>Em breve</span>
    </div>
  );
}

export default function Dashboard() {
  const [active, setActive] = useState('whiteboard');
  const [collapsed, setCollapsed] = useState(false);
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    fetch(`${API}/users/me/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        setUsername(data.username || data.email || '');
        setAvatar(data.avatar || null);
      })
      .catch(() => {});
  }, []);

  const initial = username ? username[0].toUpperCase() : '?';

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f7f5f0' }}>
      <aside style={{
        width: collapsed ? 56 : 200,
        minWidth: collapsed ? 56 : 200,
        background: '#fff',
        borderRight: '1px solid #e8e5e0',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s, min-width 0.2s',
        overflow: 'hidden',
        zIndex: 10,
        flexShrink: 0,
      }}>
        <div style={{
          height: 52, display: 'flex', alignItems: 'center',
          padding: collapsed ? '0 14px' : '0 18px',
          borderBottom: '1px solid #e8e5e0',
          gap: 10, cursor: 'pointer',
        }} onClick={() => setCollapsed(c => !c)}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>◈</span>
          {!collapsed && <span style={{ fontWeight: 700, fontSize: 15, color: '#2c2a26', whiteSpace: 'nowrap' }}>OpenTask</span>}
          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#a09d97', flexShrink: 0 }}>
            {collapsed ? '›' : '‹'}
          </span>
        </div>

        <nav style={{ flex: 1, padding: '8px 0' }}>
          {NAV.map(item => (
            <button
              key={item.id}
              onClick={() => setActive(item.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center',
                gap: 10, padding: collapsed ? '10px 14px' : '10px 18px',
                background: active === item.id ? '#f7f5f0' : 'transparent',
                border: 'none', cursor: 'pointer',
                color: active === item.id ? '#2c2a26' : '#6b6760',
                fontWeight: active === item.id ? 600 : 400,
                fontSize: 14, textAlign: 'left',
                borderLeft: active === item.id ? '2px solid #2c2a26' : '2px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
              {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
            </button>
          ))}
        </nav>

        <button
          onClick={() => setActive('settings')}
          onMouseEnter={(e) => e.currentTarget.style.background = '#f7f5f0'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          style={{
            width: '100%',
            borderTop: '1px solid #e8e5e0',
            padding: collapsed ? '12px 14px' : '12px 18px',
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'transparent',
            border: 'none',
            borderTop: '1px solid #e8e5e0',
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          title="Ir para Configurações"
        >
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: avatar ? 'none' : '#2c2a26', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, flexShrink: 0,
            overflow: 'hidden',
          }}>
            {avatar
              ? <img src={avatar} alt={username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initial
            }
          </div>
          {!collapsed && (
            <div style={{ overflow: 'hidden', flex: 1, textAlign: 'left' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#2c2a26', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{username || '...'}</div>
              <div style={{ fontSize: 11, color: '#a09d97', whiteSpace: 'nowrap' }}>Pessoal</div>
            </div>
          )}
        </button>
      </aside>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <div style={{
          height: 52, background: '#fff', borderBottom: '1px solid #e8e5e0',
          display: 'flex', alignItems: 'center', padding: '0 20px',
          flexShrink: 0,
        }}>
          <span style={{ fontWeight: 600, fontSize: 15, color: '#2c2a26' }}>
            {NAV.find(n => n.id === active)?.label}
          </span>
        </div>

        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', minHeight: 0 }}>
          {active === 'whiteboard' && <ExcalidrawWrapper />}
          {active === 'tasks'      && <TasksView />}
          {active === 'docs'       && <DocsView/>}
          {active === 'members'    && <TeamsView />}
          {active === 'settings'   && <SettingsView onAvatarUpdate={setAvatar} />}
        </div>
      </main>
    </div>
  );
}
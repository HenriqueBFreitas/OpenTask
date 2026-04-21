'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';

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
  { id: 'whiteboard', icon: '✏️', label: 'Quadro' },
  { id: 'tasks',      icon: '✓',  label: 'Tarefas' },
  { id: 'docs',       icon: '📄', label: 'Docs' },
  { id: 'members',    icon: '👥', label: 'Equipe' },
  { id: 'settings',   icon: '⚙', label: 'Config' },
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

        <div style={{
          borderTop: '1px solid #e8e5e0',
          padding: collapsed ? '12px 14px' : '12px 18px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: '#2c2a26', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, flexShrink: 0,
          }}>D</div>
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#2c2a26', whiteSpace: 'nowrap' }}>davi4</div>
              <div style={{ fontSize: 11, color: '#a09d97', whiteSpace: 'nowrap' }}>Pessoal</div>
            </div>
          )}
        </div>
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
          {active === 'tasks'      && <PlaceholderView label="Tarefas" icon="✓" />}
          {active === 'docs'       && <PlaceholderView label="Documentos" icon="📄" />}
          {active === 'members'    && <PlaceholderView label="Equipe" icon="👥" />}
          {active === 'settings'   && <PlaceholderView label="Configurações" icon="⚙" />}
        </div>
      </main>
    </div>
  );
}
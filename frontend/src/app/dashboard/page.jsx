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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Garante que começa expandida no desktop
  useEffect(() => {
    if (window.innerWidth > 768) {
      setCollapsed(false);
    }
  }, []);

  // Abre o menu mobile sempre expandido
  useEffect(() => {
    if (mobileMenuOpen && window.innerWidth <= 768) {
      setCollapsed(false);
    }
  }, [mobileMenuOpen]);

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

  const handleNavClick = (id) => {
    setActive(id);
    setMobileMenuOpen(false); // Fecha o menu mobile ao selecionar
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f7f5f0' }}>
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1100,
            display: 'none',
          }}
          className="mobile-overlay"
        />
      )}

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
      }}
      className="sidebar"
      >
        {/* Close button - mobile only */}
        <button
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            width: 32,
            height: 32,
            borderRadius: 8,
            background: '#f7f5f0',
            border: 'none',
            cursor: 'pointer',
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            color: '#6b6760',
            zIndex: 20,
          }}
          className="mobile-close-btn"
        >
          ×
        </button>

        <div style={{
          height: 52, display: 'flex', alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: collapsed ? '0' : '0 18px',
          borderBottom: '1px solid #e8e5e0',
          gap: 10, cursor: 'pointer',
        }} 
        onClick={() => {
          // No mobile, fecha o menu em vez de colapsar
          if (window.innerWidth <= 768) {
            setMobileMenuOpen(false);
          } else {
            setCollapsed(c => !c);
          }
        }}
        className="sidebar-header"
        >
          {collapsed ? (
            <span style={{ fontSize: 20, color: '#6b6760' }}>☰</span>
          ) : (
            <>
              <span className="sidebar-title" style={{ fontWeight: 700, fontSize: 15, color: '#2c2a26', whiteSpace: 'nowrap' }}>OpenTask</span>
              <span 
                className="collapse-arrow"
                style={{ fontSize: 11, color: '#a09d97', flexShrink: 0 }}
              >
                ‹
              </span>
            </>
          )}
        </div>

        <nav style={{ flex: 1, padding: '8px 0' }}>
          {NAV.map(item => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              onMouseEnter={(e) => {
                if (active !== item.id) e.currentTarget.style.background = '#faf9f7';
              }}
              onMouseLeave={(e) => {
                if (active !== item.id) e.currentTarget.style.background = 'transparent';
              }}
              title={collapsed ? item.label : undefined}
              style={{
                width: '100%', display: 'flex', alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'flex-start',
                gap: 10, padding: collapsed ? '10px 0' : '10px 18px',
                background: active === item.id ? '#f7f5f0' : 'transparent',
                border: 'none', cursor: 'pointer',
                color: active === item.id ? '#2c2a26' : '#6b6760',
                fontWeight: active === item.id ? 600 : 400,
                fontSize: 14, textAlign: 'left',
                borderLeft: active === item.id && !collapsed ? '2px solid #2c2a26' : '2px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
              {!collapsed && <span className="nav-label" style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
            </button>
          ))}
        </nav>

        <button
          onClick={() => handleNavClick('settings')}
          onMouseEnter={(e) => e.currentTarget.style.background = '#f7f5f0'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          title={collapsed ? 'Configurações' : undefined}
          style={{
            width: '100%',
            borderTop: '1px solid #e8e5e0',
            padding: collapsed ? '12px 0' : '12px 18px',
            display: 'flex', alignItems: 'center', 
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 10,
            background: 'transparent',
            border: 'none',
            borderTop: '1px solid #e8e5e0',
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
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
            <div className="profile-info" style={{ overflow: 'hidden', flex: 1, textAlign: 'left' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#2c2a26', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{username || '...'}</div>
              <div style={{ fontSize: 11, color: '#a09d97', whiteSpace: 'nowrap' }}>Pessoal</div>
            </div>
          )}
        </button>
      </aside>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <div style={{
          height: 52, background: '#fff', borderBottom: '1px solid #e8e5e0',
          display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12,
          flexShrink: 0,
        }}>
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            style={{
              display: 'none',
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'transparent',
              border: '1px solid #e8e5e0',
              cursor: 'pointer',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              color: '#2c2a26',
              padding: 0,
            }}
            className="mobile-menu-btn"
          >
            ☰
          </button>
          
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

      {/* CSS Responsivo para Mobile */}
      <style jsx>{`
        @media (max-width: 768px) {
          .mobile-menu-btn {
            display: flex !important;
          }
          
          .sidebar {
            position: fixed !important;
            left: ${mobileMenuOpen ? '0' : '-100%'} !important;
            top: 0 !important;
            bottom: 0 !important;
            width: 280px !important;
            min-width: 280px !important;
            max-width: 280px !important;
            z-index: 1200 !important;
            transition: left 0.3s ease !important;
          }
          
          .sidebar-header {
            justify-content: space-between !important;
            padding: 0 18px !important;
          }
          
          .sidebar-title,
          .nav-label,
          .profile-info {
            display: block !important;
          }
          
          .mobile-overlay {
            display: block !important;
          }
          
          .mobile-close-btn {
            display: flex !important;
          }
          
          .collapse-arrow {
            display: block !important;
          }
        }
        
        @media (min-width: 769px) {
          .mobile-close-btn {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
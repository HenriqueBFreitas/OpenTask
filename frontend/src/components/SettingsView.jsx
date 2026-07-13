'use client';
import { useState, useEffect, useRef } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const getToken = () => localStorage.getItem('access_token');

// Tenta parsear JSON; se falhar retorna objeto vazio (evita crash em respostas HTML de erro)
async function safeJson(res) {
  try { return await res.json(); } catch { return {}; }
}

// ─── Componentes base ─────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 16,
      boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
      marginBottom: 20, overflow: 'hidden',
    }}>
      <div style={{ padding: '16px 28px 12px', borderBottom: '1px solid #f0ede8' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#a09d97', textTransform: 'uppercase', letterSpacing: '0.7px' }}>
          {title}
        </span>
      </div>
      <div style={{ padding: '20px 28px 24px' }}>{children}</div>
    </div>
  );
}

function FieldLabel({ children }) {
  return <div style={{ fontSize: 12, fontWeight: 600, color: '#6b6760', marginBottom: 7 }}>{children}</div>;
}

function Field({ label, children }) {
  return (
    <div>
      {label && <FieldLabel>{label}</FieldLabel>}
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, disabled, prefix, onKeyDown }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      {prefix && (
        <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#a09d97', pointerEvents: 'none' }}>
          {prefix}
        </span>
      )}
      <input
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: prefix ? '10px 13px 10px 28px' : '10px 13px',
          border: `1.5px solid ${focused && !disabled ? '#2c2a26' : '#e2ddd6'}`,
          borderRadius: 10, fontSize: 14,
          fontFamily: 'inherit', outline: 'none',
          color: disabled ? '#a09d97' : '#1a1814',
          background: disabled ? '#faf9f7' : '#fff',
          cursor: disabled ? 'not-allowed' : 'text',
          transition: 'border-color 0.15s',
        }}
      />
    </div>
  );
}

function SaveBtn({ onClick, loading, saved, disabled }) {
  const bg    = disabled ? '#e2ddd6' : saved ? '#10b981' : '#2c2a26';
  const label = loading ? 'Salvando…' : saved ? '✓ Salvo' : 'Salvar alterações';
  return (
    <button onClick={onClick} disabled={disabled || loading}
      style={{
        background: bg, color: '#fff', border: 'none',
        borderRadius: 10, padding: '10px 22px',
        fontSize: 13, fontWeight: 700,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        transition: 'background 0.25s', fontFamily: 'inherit',
        boxShadow: disabled ? 'none' : '0 2px 8px rgba(44,42,38,0.12)',
      }}
    >{label}</button>
  );
}

function ErrorMsg({ msg }) {
  if (!msg) return null;
  return <div style={{ marginTop: 8, fontSize: 12, color: '#ef4444', fontWeight: 500 }}>{msg}</div>;
}

// ─── SettingsView ─────────────────────────────────────────────────────────────
export default function SettingsView({ onAvatarUpdate }) {
  const avatarInputRef = useRef(null);

  const [profile, setProfile]   = useState(null);
  const [loading, setLoading]   = useState(true);

  // campos
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile]       = useState(null);

  // estados por seção
  const [savingProfile, setSavingProfile] = useState(false);
  const [savedProfile,  setSavedProfile]  = useState(false);
  const [profileError,  setProfileError]  = useState('');

  const [savingAvatar, setSavingAvatar] = useState(false);
  const [savedAvatar,  setSavedAvatar]  = useState(false);
  const [avatarError,  setAvatarError]  = useState('');

  // carrega perfil
  useEffect(() => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    fetch(`${API}/users/me/`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setProfile(data);
        setFullName(data.full_name || '');
        setUsername(data.username  || '');
        setAvatarPreview(data.avatar || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ─── Selecionar foto ────────────────────────────────────────────────────────
  const handleAvatarPick = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    setSavedAvatar(false); setAvatarError('');
    const reader = new FileReader();
    reader.onload = ev => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // ─── Salvar nome + username ─────────────────────────────────────────────────
  const saveProfile = async () => {
    const payload = {};
    if (fullName.trim() !== (profile?.full_name || '')) payload.full_name = fullName.trim();
    if (username.trim() !== (profile?.username  || '')) payload.username  = username.trim();
    if (!Object.keys(payload).length) return;

    setSavingProfile(true); setProfileError(''); setSavedProfile(false);
    try {
      const token = getToken();

      // Tenta PATCH /me/ (novo endpoint)
      const res = await fetch(`${API}/users/me/`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Se PATCH /me/ não está disponível ainda, cai no endpoint legado de username
      if (res.status === 405 && payload.username && !payload.full_name) {
        const res2 = await fetch(`${API}/users/me/username/`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: payload.username }),
        });
        const data2 = await safeJson(res2);
        if (!res2.ok) throw new Error(data2.username?.[0] || data2.detail || 'Erro ao salvar username');
        setProfile(p => ({ ...p, username: data2.username }));
        setUsername(data2.username || '');
        setSavedProfile(true);
        setTimeout(() => setSavedProfile(false), 2500);
        return;
      }

      const data = await safeJson(res);
      if (!res.ok) {
        throw new Error(data.username?.[0] || data.full_name?.[0] || data.detail || `Erro ${res.status}`);
      }
      setProfile(data);
      setFullName(data.full_name || '');
      setUsername(data.username  || '');
      setSavedProfile(true);
      setTimeout(() => setSavedProfile(false), 2500);
    } catch (e) {
      setProfileError(e.message);
    } finally {
      setSavingProfile(false);
    }
  };

  // ─── Salvar foto ────────────────────────────────────────────────────────────
  const saveAvatar = async () => {
    if (!avatarFile) return;
    setSavingAvatar(true); setAvatarError(''); setSavedAvatar(false);
    try {
      const token = getToken();
      const fd = new FormData();
      fd.append('avatar', avatarFile);
      const res = await fetch(`${API}/users/me/avatar/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.detail || `Erro ${res.status}`);
      setProfile(p => ({ ...p, avatar: data.avatar_url }));
      onAvatarUpdate?.(data.avatar_url);
      setAvatarFile(null);
      setSavedAvatar(true);
      setTimeout(() => setSavedAvatar(false), 2500);
    } catch (e) {
      setAvatarError(e.message);
    } finally {
      setSavingAvatar(false);
    }
  };

  const profileChanged =
    fullName.trim() !== (profile?.full_name || '') ||
    username.trim() !== (profile?.username  || '');

  const initial = (profile?.full_name || profile?.username || '?')[0].toUpperCase();

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a09d97', fontSize: 13 }}>
      Carregando…
    </div>
  );

  return (
    <div style={{ width: '100%', height: '100%', overflowY: 'auto', background: '#f5f3ef' }}>
      <div style={{ padding: '40px 40px 60px', maxWidth: 620, margin: '0 auto' }}>

        {/* Cabeçalho */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#1a1814', letterSpacing: '-0.5px' }}>
            Configurações
          </h1>
          <p style={{ margin: '5px 0 0', fontSize: 14, color: '#a09d97' }}>
            Gerencie seu perfil e preferências
          </p>
        </div>

        {/* ─── Foto ──────────────────────────────────────────────────────────── */}
        <Section title="Foto de perfil">
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            {/* Avatar clicável */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div
                onClick={() => avatarInputRef.current?.click()}
                onMouseEnter={e => e.currentTarget.querySelector('.overlay').style.opacity = '1'}
                onMouseLeave={e => e.currentTarget.querySelector('.overlay').style.opacity = '0'}
                style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', cursor: 'pointer', position: 'relative', border: '3px solid #e8e4de', boxShadow: '0 2px 12px rgba(0,0,0,0.10)', background: avatarPreview ? 'none' : '#2c2a26', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {avatarPreview
                  ? <img src={avatarPreview} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  : <span style={{ fontSize: 28, fontWeight: 700, color: '#fff' }}>{initial}</span>
                }
                <div className="overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.15s', borderRadius: '50%' }}>
                  <span style={{ fontSize: 18, color: '#fff' }}>✎</span>
                </div>
              </div>
            </div>

            <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleAvatarPick} />

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: '#6b6760', lineHeight: 1.6, marginBottom: 14 }}>
                Clique na foto para escolher uma imagem.<br />
                <span style={{ fontSize: 12, color: '#a09d97' }}>JPG, PNG, ou WEBP · máx. 5 MB</span>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <SaveBtn onClick={saveAvatar} loading={savingAvatar} saved={savedAvatar} disabled={!avatarFile} />
                {avatarFile && !savingAvatar && (
                  <button
                    onClick={() => { setAvatarFile(null); setAvatarPreview(profile?.avatar || null); setAvatarError(''); }}
                    style={{ background: 'none', border: '1.5px solid #e2ddd6', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#6b6760', cursor: 'pointer', fontFamily: 'inherit' }}
                  >Cancelar</button>
                )}
              </div>
              <ErrorMsg msg={avatarError} />
            </div>
          </div>
        </Section>

        {/* ─── Perfil (nome + username) ───────────────────────────────────────── */}
        <Section title="Perfil">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            <Field label="Nome completo">
              <Input
                value={fullName}
                onChange={e => { setFullName(e.target.value); setSavedProfile(false); setProfileError(''); }}
                placeholder="Seu nome completo"
              />
            </Field>

            <Field label="Username">
              <Input
                value={username}
                onChange={e => { setUsername(e.target.value); setSavedProfile(false); setProfileError(''); }}
                onKeyDown={e => e.key === 'Enter' && profileChanged && saveProfile()}
                placeholder="seuusername"
                prefix="@"
              />
              <div style={{ marginTop: 5, fontSize: 11, color: '#a09d97' }}>
                Letras, números e os caracteres . @ + - _
              </div>
            </Field>

          </div>

          <ErrorMsg msg={profileError} />

          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
            <SaveBtn
              onClick={saveProfile}
              loading={savingProfile}
              saved={savedProfile}
              disabled={!profileChanged}
            />
          </div>
        </Section>

        {/* ─── Conta (readonly) ──────────────────────────────────────────────── */}
        <Section title="Conta">
          <Field label="E-mail">
            <Input value={profile?.email || ''} disabled />
            <div style={{ marginTop: 5, fontSize: 11, color: '#c5c2bc' }}>O e-mail não pode ser alterado</div>
          </Field>
        </Section>

        {/* ─── Sessão ────────────────────────────────────────────────────────── */}
        <Section title="Sessão">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1814' }}>Sair da conta</div>
              <div style={{ fontSize: 12, color: '#a09d97', marginTop: 2 }}>Você precisará fazer login novamente</div>
            </div>
              <button
              onClick={() => {
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                document.cookie = 'access=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                document.cookie = 'refresh=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                window.location.href = '/login';
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff5f5'}
              style={{ background: '#fff5f5', color: '#ef4444', border: '1.5px solid #fecaca', borderRadius: 10, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s' }}
            >Sair</button>
          </div>
        </Section>

      </div>
    </div>
  );
}

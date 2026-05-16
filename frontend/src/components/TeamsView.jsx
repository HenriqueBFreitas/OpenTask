import { useState, useRef } from 'react';

// ─── Paleta ────────────────────────────────────────────────────────────────
const TEAM_COLORS = [
  { name: 'Ardósia',   dot: '#64748b', bg: '#f1f5f9', text: '#334155' },
  { name: 'Índigo',    dot: '#6366f1', bg: '#eef2ff', text: '#3730a3' },
  { name: 'Esmeralda', dot: '#10b981', bg: '#ecfdf5', text: '#065f46' },
  { name: 'Âmbar',    dot: '#f59e0b', bg: '#fffbeb', text: '#92400e' },
  { name: 'Rosa',      dot: '#ec4899', bg: '#fdf2f8', text: '#9d174d' },
  { name: 'Céu',       dot: '#0ea5e9', bg: '#f0f9ff', text: '#0c4a6e' },
  { name: 'Coral',     dot: '#ef4444', bg: '#fef2f2', text: '#991b1b' },
  { name: 'Violeta',   dot: '#8b5cf6', bg: '#f5f3ff', text: '#5b21b6' },
];



const INITIAL_TEAMS = [];

// ─── Utilitários ───────────────────────────────────────────────────────────
function useFileAsDataURL() {
  const read = (file) => new Promise((res) => {
    const r = new FileReader();
    r.onload = (e) => res(e.target.result);
    r.readAsDataURL(file);
  });
  return read;
}

// ─── Componentes base ──────────────────────────────────────────────────────
function Modal({ title, onClose, children, wide = false }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff', borderRadius: 20,
          width: '100%', maxWidth: wide ? 620 : 460,
          boxShadow: '0 32px 100px rgba(0,0,0,0.22)',
          maxHeight: '92vh', overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '22px 28px 0',
        }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#1a1814', letterSpacing: '-0.3px' }}>
            {title}
          </span>
          <button
            onClick={onClose}
            style={{
              background: '#f0ede8', border: 'none', borderRadius: 8,
              width: 30, height: 30, cursor: 'pointer', fontSize: 16,
              color: '#7a7570', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >×</button>
        </div>
        <div style={{ padding: '20px 28px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ children }) {
  return (
    <label style={{
      display: 'block', fontSize: 11, fontWeight: 700, color: '#a09d97',
      textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 6,
    }}>
      {children}
    </label>
  );
}

function TextInput({ label, ...props }) {
  return (
    <div>
      {label && <FieldLabel>{label}</FieldLabel>}
      <input
        style={{
          width: '100%', border: '1.5px solid #e2ddd6', borderRadius: 10,
          padding: '10px 13px', fontSize: 14, fontFamily: 'inherit',
          outline: 'none', color: '#1a1814', background: '#faf9f7',
          transition: 'border-color 0.15s', boxSizing: 'border-box',
        }}
        onFocus={e => e.target.style.borderColor = '#2c2a26'}
        onBlur={e => e.target.style.borderColor = '#e2ddd6'}
        {...props}
      />
    </div>
  );
}

function PrimaryBtn({ children, onClick, disabled, small, style: s = {} }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? '#c5c2bc' : '#2c2a26',
        color: '#fff', border: 'none',
        borderRadius: small ? 9 : 11,
        padding: small ? '8px 16px' : '11px 22px',
        fontSize: small ? 13 : 14, fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        letterSpacing: '0.15px', transition: 'opacity 0.15s',
        boxShadow: disabled ? 'none' : '0 2px 8px rgba(44,42,38,0.15)',
        fontFamily: 'inherit', ...s,
      }}
      onMouseEnter={e => !disabled && (e.currentTarget.style.opacity = '0.85')}
      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
    >{children}</button>
  );
}

function GhostBtn({ children, onClick, small, style: s = {} }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: '#f0ede8', color: '#5a5550', border: 'none',
        borderRadius: small ? 9 : 10,
        padding: small ? '7px 14px' : '10px 18px',
        fontSize: small ? 13 : 13, fontWeight: 600,
        cursor: 'pointer', transition: 'background 0.15s',
        fontFamily: 'inherit', ...s,
      }}
      onMouseEnter={e => e.currentTarget.style.background = '#e8e4de'}
      onMouseLeave={e => e.currentTarget.style.background = '#f0ede8'}
    >{children}</button>
  );
}

function ColorDot({ color, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      title={color.name}
      style={{
        width: 24, height: 24, borderRadius: '50%', background: color.dot,
        border: selected ? '2.5px solid #2c2a26' : '2.5px solid transparent',
        outline: selected ? '2px solid #f0ede8' : 'none', outlineOffset: 1,
        cursor: 'pointer', padding: 0, transition: 'transform 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.25)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
    />
  );
}

function CopyLink({ teamId, color }) {
  const [copied, setCopied] = useState(false);
  const link = `https://opentask.app/invite/${teamId}`;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: '#faf9f7', border: '1.5px solid #e2ddd6',
      borderRadius: 10, padding: '9px 12px',
    }}>
      <span style={{ fontSize: 12, color: '#a09d97', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {link}
      </span>
      <button
        onClick={() => { navigator.clipboard?.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        style={{
          background: copied ? color.bg : '#f0ede8',
          color: copied ? color.text : '#5a5550',
          border: 'none', borderRadius: 7, padding: '5px 12px',
          fontSize: 12, fontWeight: 600, cursor: 'pointer',
          transition: 'all 0.2s', fontFamily: 'inherit', flexShrink: 0,
        }}
      >{copied ? '✓ Copiado' : 'Copiar'}</button>
    </div>
  );
}

// ─── Modal criar equipe ────────────────────────────────────────────────────
function CreateTeamModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(TEAM_COLORS[1]);
  const [coverImage, setCoverImage] = useState(null);
  const [avatarImage, setAvatarImage] = useState(null);
  const readFile = useFileAsDataURL();
  const coverRef = useRef();
  const avatarRef = useRef();

  const pickCover = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    setCoverImage(await readFile(f));
  };
  const pickAvatar = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    setAvatarImage(await readFile(f));
  };

  const handle = () => {
    if (!name.trim()) return;
    onCreate({
      name: name.trim(), description: description.trim(), color,
      cover: coverImage || null,
      avatar: avatarImage,
    });
    onClose();
  };

  return (
    <Modal title="Nova equipe" onClose={onClose} wide>
      {/* Prévia da capa */}
      <div>
        <FieldLabel>Capa</FieldLabel>
        <div
          style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', height: 120 }}
        >
          {coverImage ? (
            <img src={coverImage} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          ) : (
            <div
              onClick={() => coverRef.current.click()}
              style={{
                width: '100%', height: '100%',
                background: '#f0ede8',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', gap: 6,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#e8e4de'}
              onMouseLeave={e => e.currentTarget.style.background = '#f0ede8'}
            >
              <span style={{ fontSize: 12, color: '#a09d97', fontWeight: 600 }}>Clique para adicionar capa</span>
            </div>
          )}
          {/* Botões sobre a imagem */}
          {coverImage && (
            <div style={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', gap: 6 }}>
              <button
                onClick={() => coverRef.current.click()}
                style={{
                  background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none',
                  borderRadius: 7, padding: '5px 10px', fontSize: 11,
                  cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
                  backdropFilter: 'blur(4px)',
                }}
              >Trocar</button>
              <button
                onClick={() => setCoverImage(null)}
                style={{
                  background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none',
                  borderRadius: 7, padding: '5px 10px', fontSize: 11,
                  cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
                }}
              >✕ Remover</button>
            </div>
          )}
          <input ref={coverRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={pickCover} />
        </div>
      </div>

      {/* Avatar + nome */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end' }}>
        <div style={{ flexShrink: 0 }}>
          <FieldLabel>Ícone</FieldLabel>
          <div style={{ position: 'relative', width: 64, height: 64 }}>
            <div
              onClick={() => avatarRef.current.click()}
              style={{
                width: 64, height: 64, borderRadius: 14,
                background: avatarImage ? 'none' : color.bg,
                border: `2px solid ${color.dot}55`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', overflow: 'hidden', transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              {avatarImage
                ? <img src={avatarImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ color: color.dot, fontWeight: 800, fontSize: 24 }}>{name.charAt(0).toUpperCase() || 'E'}</span>
              }
            </div>
            <div style={{
              position: 'absolute', bottom: -4, right: -4,
              background: '#2c2a26', borderRadius: '50%', width: 20, height: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, color: '#fff', cursor: 'pointer', border: '2px solid #fff',
            }}
              onClick={() => avatarRef.current.click()}
            >+</div>
            <input ref={avatarRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={pickAvatar} />
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <TextInput
            label="Nome da equipe"
            placeholder="Ex: Design & Produto"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
        </div>
      </div>

      {/* Descrição */}
      <div>
        <FieldLabel>Descrição <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span></FieldLabel>
        <textarea
          placeholder="Do que essa equipe se trata?"
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={2}
          style={{
            width: '100%', border: '1.5px solid #e2ddd6', borderRadius: 10,
            padding: '10px 13px', fontSize: 14, fontFamily: 'inherit',
            outline: 'none', resize: 'none', color: '#1a1814', background: '#faf9f7',
            boxSizing: 'border-box', transition: 'border-color 0.15s',
          }}
          onFocus={e => e.target.style.borderColor = '#2c2a26'}
          onBlur={e => e.target.style.borderColor = '#e2ddd6'}
        />
      </div>

      {/* Cor */}
      <div>
        <FieldLabel>Cor do tema</FieldLabel>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TEAM_COLORS.map(c => (
            <ColorDot key={c.name} color={c} selected={color.name === c.name} onClick={() => setColor(c)} />
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
        <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
        <PrimaryBtn onClick={handle} disabled={!name.trim()}>Criar equipe</PrimaryBtn>
      </div>
    </Modal>
  );
}

// ─── Modal adicionar membro ────────────────────────────────────────────────
function AddMemberModal({ color, onClose, onAdd }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');

  const handle = () => {
    if (!email.trim()) return;
    const namePart = email.split('@')[0].replace(/[._-]/g, ' ');
    const initials = namePart.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) || 'US';
    onAdd({ id: Date.now(), name: namePart, email: email.trim(), role, avatar: initials, photo: null });
    onClose();
  };

  return (
    <Modal title="Adicionar pessoa" onClose={onClose}>
      <TextInput
        label="E-mail ou usuário"
        placeholder="usuario@exemplo.com"
        value={email}
        onChange={e => setEmail(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handle()}
        autoFocus
      />
      <div>
        <FieldLabel>Papel</FieldLabel>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['member', 'Membro'], ['admin', 'Admin']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setRole(val)}
              style={{
                flex: 1, padding: '11px 10px', borderRadius: 10, cursor: 'pointer',
                border: `1.5px solid ${role === val ? '#2c2a26' : '#e2ddd6'}`,
                background: role === val ? '#2c2a26' : '#faf9f7',
                color: role === val ? '#fff' : '#7a7570',
                fontWeight: 600, fontSize: 13, fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >{label}</button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
        <PrimaryBtn onClick={handle} disabled={!email.trim()}>Adicionar</PrimaryBtn>
      </div>
    </Modal>
  );
}

// ─── Detalhe da equipe (workspace page) ───────────────────────────────────
function TeamDetail({ team, onBack, onUpdate }) {
  const [members, setMembers] = useState(team.members);
  const [showAdd, setShowAdd] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(team.name);
  const [activeTab, setActiveTab] = useState('members');
  const readFile = useFileAsDataURL();
  const coverRef = useRef();
  const avatarRef = useRef();

  const sync = (patch) => {
    const updated = { ...team, members, ...patch };
    onUpdate(updated);
  };

  const addMember = (m) => {
    const u = [...members, m];
    setMembers(u);
    sync({ members: u });
  };

  const toggleRole = (id) => {
    const u = members.map(m => m.id === id ? { ...m, role: m.role === 'admin' ? 'member' : 'admin' } : m);
    setMembers(u); sync({ members: u });
  };

  const removeMember = (id) => {
    const u = members.filter(m => m.id !== id);
    setMembers(u); sync({ members: u });
  };

  const changeCover = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    const url = await readFile(f);
    sync({ cover: url });
  };

  const changeAvatar = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    const url = await readFile(f);
    sync({ avatar: url });
  };

  const saveName = () => {
    setEditingName(false);
    if (name.trim()) sync({ name: name.trim() });
  };

  const hasCoverImage = typeof team.cover === 'string' && team.cover.startsWith('data:');

  return (
    <div style={{ width: '100%', height: '100%', overflowY: 'auto', background: '#f5f3ef' }}>

      {/* ── Capa ── */}
      <div style={{ position: 'relative', width: '100%', height: 180, overflow: 'hidden', flexShrink: 0, background: '#e8e4de' }}>
        {hasCoverImage && (
          <img
            src={team.cover}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block' }}
          />
        )}
        {/* Botão voltar — canto superior esquerdo */}
        <button
          onClick={onBack}
          style={{
            position: 'absolute', top: 14, left: 16, zIndex: 2,
            background: hasCoverImage ? 'rgba(0,0,0,0.38)' : '#ccc9c2',
            color: hasCoverImage ? '#fff' : '#5a5550',
            border: 'none', borderRadius: 8, padding: '7px 14px',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >← Equipes</button>

        {/* Editar capa — canto inferior direito */}
        <button
          onClick={() => coverRef.current.click()}
          style={{
            position: 'absolute', bottom: 10, right: 14, zIndex: 2,
            background: hasCoverImage ? 'rgba(0,0,0,0.38)' : '#ccc9c2',
            color: hasCoverImage ? '#fff' : '#7a7570',
            border: 'none', borderRadius: 8, padding: '6px 13px',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >{hasCoverImage ? 'Editar capa' : 'Adicionar capa'}</button>
        <input ref={coverRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={changeCover} />
      </div>

      {/* ── Header: avatar + nome + botão ── */}
      <div style={{ padding: '0 36px', maxWidth: 960, margin: '0 auto' }}>
        {/* Avatar sai da capa */}
        <div style={{ marginTop: -36, marginBottom: 16 }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <div
              onClick={() => avatarRef.current.click()}
              style={{
                width: 72, height: 72, borderRadius: 16,
                background: team.avatar && team.avatar.startsWith('data:') ? 'none' : team.color.bg,
                border: '3px solid #f5f3ef',
                boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', overflow: 'hidden', transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              {team.avatar && team.avatar.startsWith('data:')
                ? <img src={team.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ color: team.color.dot, fontWeight: 800, fontSize: 28 }}>{team.name.charAt(0)}</span>
              }
            </div>
            <div
              onClick={() => avatarRef.current.click()}
              style={{
                position: 'absolute', bottom: -2, right: -2,
                background: '#2c2a26', borderRadius: '50%', width: 20, height: 20,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, color: '#fff', cursor: 'pointer', border: '2px solid #f5f3ef',
              }}
            >+</div>
            <input ref={avatarRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={changeAvatar} />
          </div>
        </div>

        {/* Nome + descrição + botão na mesma linha */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
          <div>
            {editingName ? (
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                onBlur={saveName}
                onKeyDown={e => e.key === 'Enter' && saveName()}
                autoFocus
                style={{
                  fontSize: 22, fontWeight: 700, color: '#1a1814',
                  border: 'none', borderBottom: '2px solid #2c2a26',
                  outline: 'none', background: 'transparent', fontFamily: 'inherit',
                  letterSpacing: '-0.4px', width: 320,
                }}
              />
            ) : (
              <h1
                onDoubleClick={() => setEditingName(true)}
                style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a1814', letterSpacing: '-0.4px', cursor: 'text' }}
                title="Duplo clique para editar"
              >{team.name}</h1>
            )}
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#a09d97' }}>
              {team.description || 'Sem descrição'} · {members.length} {members.length === 1 ? 'membro' : 'membros'}
            </p>
          </div>
          <PrimaryBtn onClick={() => setShowAdd(true)} small>+ Adicionar pessoa</PrimaryBtn>
        </div>

        {/* ── Tabs ── */}
        <div style={{
          display: 'flex', gap: 0, borderBottom: '1.5px solid #e8e4de',
          marginBottom: 28,
        }}>
          {[['members', 'Membros'], ['invite', 'Convite'], ['settings', 'Config']].map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '10px 18px', fontSize: 13, fontWeight: 600,
                color: activeTab === tab ? '#1a1814' : '#a09d97',
                borderBottom: `2.5px solid ${activeTab === tab ? '#2c2a26' : 'transparent'}`,
                marginBottom: -1.5, transition: 'all 0.15s', fontFamily: 'inherit',
              }}
            >{label}</button>
          ))}
        </div>

        {/* ── Tab: Membros ── */}
        {activeTab === 'members' && (
          <div>
            {members.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#c5c2bc' }}>
                <p style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 500, color: '#a09d97' }}>Nenhum membro ainda</p>
                <PrimaryBtn onClick={() => setShowAdd(true)} small>+ Adicionar primeira pessoa</PrimaryBtn>
              </div>
            ) : (
              <div style={{
                background: '#fff', borderRadius: 16,
                boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
                overflow: 'hidden',
              }}>
                {/* Header tabela */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 180px 100px 40px',
                  gap: 0, padding: '11px 20px',
                  borderBottom: '1.5px solid #f0ede8',
                  background: '#faf9f7',
                }}>
                  {['Pessoa', 'E-mail', 'Papel', ''].map((h, i) => (
                    <span key={i} style={{ fontSize: 11, fontWeight: 700, color: '#c5c2bc', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</span>
                  ))}
                </div>

                {members.map((m, i) => (
                  <div
                    key={m.id}
                    style={{
                      display: 'grid', gridTemplateColumns: '1fr 180px 100px 40px',
                      gap: 0, padding: '13px 20px',
                      borderTop: i === 0 ? 'none' : '1px solid #f5f3ef',
                      alignItems: 'center', transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#faf9f7'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Nome */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: '50%',
                        background: m.photo ? 'none' : team.color.bg,
                        border: `1.5px solid ${team.color.dot}33`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700, color: team.color.text,
                        overflow: 'hidden', flexShrink: 0,
                      }}>
                        {m.photo
                          ? <img src={m.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : m.avatar}
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#1a1814' }}>{m.name}</p>
                      </div>
                    </div>

                    {/* Email */}
                    <span style={{ fontSize: 13, color: '#a09d97', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.email}
                    </span>

                    {/* Papel */}
                    <button
                      onClick={() => toggleRole(m.id)}
                      style={{
                        background: m.role === 'admin' ? team.color.bg : '#f0ede8',
                        color: m.role === 'admin' ? team.color.text : '#7a7570',
                        border: 'none', borderRadius: 20,
                        padding: '5px 12px', fontSize: 11, fontWeight: 700,
                        cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                        width: 'fit-content',
                      }}
                    >{m.role === 'admin' ? 'Admin' : 'Membro'}</button>

                    {/* Remover */}
                    <button
                      onClick={() => removeMember(m.id)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#e2ddd6', fontSize: 16, padding: 4,
                        transition: 'color 0.15s', lineHeight: 1, justifySelf: 'end',
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={e => e.currentTarget.style.color = '#e2ddd6'}
                    >×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Convite ── */}
        {activeTab === 'invite' && (
          <div style={{ maxWidth: 520 }}>
            <div style={{
              background: '#fff', borderRadius: 16,
              boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
              padding: '24px',
            }}>
              <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: '#1a1814' }}>Link de convite</h3>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: '#a09d97', lineHeight: 1.5 }}>
                Qualquer pessoa com este link pode entrar na equipe como membro.
              </p>
              <CopyLink teamId={team.id} color={team.color} />

              <div style={{
                marginTop: 20, padding: '14px 16px',
                background: team.color.bg, borderRadius: 10,
              }}>
                <p style={{ margin: 0, fontSize: 12, color: team.color.text, fontWeight: 600 }}>
                  Dica: você também pode adicionar pessoas diretamente pela aba Membros digitando o e-mail delas.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Config ── */}
        {activeTab === 'settings' && (
          <div style={{ maxWidth: 520 }}>
            <div style={{
              background: '#fff', borderRadius: 16,
              boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
              padding: '24px', display: 'flex', flexDirection: 'column', gap: 20,
            }}>
              <div>
                <FieldLabel>Cor do tema</FieldLabel>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  {TEAM_COLORS.map(c => (
                    <ColorDot key={c.name} color={c} selected={team.color.name === c.name}
                      onClick={() => sync({ color: c })} />
                  ))}
                </div>
              </div>

              <div style={{ paddingTop: 16, borderTop: '1px solid #f0ede8' }}>
                <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#ef4444' }}>Zona de perigo</p>
                <button
                  onClick={onBack}
                  style={{
                    background: '#fef2f2', color: '#ef4444', border: '1.5px solid #fecaca',
                    borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >Excluir equipe</button>
              </div>
            </div>
          </div>
        )}

        <div style={{ height: 60 }} />
      </div>

      {showAdd && (
        <AddMemberModal color={team.color} onClose={() => setShowAdd(false)} onAdd={addMember} />
      )}
    </div>
  );
}

// ─── Card da equipe ────────────────────────────────────────────────────────
function TeamCard({ team, onClick }) {
  const hasCoverImage = typeof team.cover === 'string' && team.cover.startsWith('data:');

  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff', borderRadius: 16,
        boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
        cursor: 'pointer', overflow: 'hidden',
        transition: 'box-shadow 0.2s, transform 0.15s',
        border: '1px solid rgba(0,0,0,0.04)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.12)';
        e.currentTarget.style.transform = 'translateY(-3px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.06)';
        e.currentTarget.style.transform = 'none';
      }}
    >
      {/* Capa */}
      <div style={{ height: 90, position: 'relative', overflow: 'hidden' }}>
        {hasCoverImage ? (
          <img src={team.cover} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: '#ece9e4',
          }} />
        )}

        {/* Avatar sobre a capa */}
        <div style={{
          position: 'absolute', bottom: -18, left: 16,
          width: 48, height: 48, borderRadius: 12,
          background: team.avatar && team.avatar.startsWith('data:') ? 'none' : team.color.bg,
          border: `3px solid #fff`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        }}>
          {team.avatar && team.avatar.startsWith('data:')
            ? <img src={team.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ color: team.color.dot, fontWeight: 800, fontSize: 18 }}>{team.name.charAt(0)}</span>
          }
        </div>
      </div>

      {/* Conteúdo */}
      <div style={{ padding: '26px 16px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#1a1814' }}>{team.name}</span>
          <span style={{
            background: team.color.bg, color: team.color.text,
            borderRadius: 20, padding: '2px 9px', fontSize: 11, fontWeight: 600,
          }}>
            {team.members.length} {team.members.length === 1 ? 'membro' : 'membros'}
          </span>
        </div>
        <p style={{
          margin: '0 0 14px', fontSize: 12, color: '#a09d97',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {team.description || 'Sem descrição'}
        </p>

        {/* Avatares empilhados */}
        {team.members.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {team.members.slice(0, 5).map((m, i) => (
              <div key={m.id} style={{ marginLeft: i === 0 ? 0 : -8, position: 'relative', zIndex: 5 - i }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: team.color.bg, color: team.color.text,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 700, border: '2px solid #fff',
                  overflow: 'hidden',
                }}>
                  {m.photo
                    ? <img src={m.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : m.avatar}
                </div>
              </div>
            ))}
            {team.members.length > 5 && (
              <div style={{
                marginLeft: -8, width: 26, height: 26, borderRadius: '50%',
                background: '#f0ede8', color: '#7a7570',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 700, border: '2px solid #fff', zIndex: 0,
              }}>+{team.members.length - 5}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TeamsView principal ───────────────────────────────────────────────────
export default function TeamsView() {
  const [teams, setTeams] = useState(INITIAL_TEAMS);
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = teams.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = (data) => {
    const t = { id: Date.now(), members: [], ...data };
    setTeams(prev => [...prev, t]);
  };

  const handleUpdate = (updated) => {
    setTeams(prev => prev.map(t => t.id === updated.id ? updated : t));
    if (selected?.id === updated.id) setSelected(updated);
  };

  if (selected) {
    return (
      <div style={{ width: '100%', height: '100%' }}>
        <TeamDetail team={selected} onBack={() => setSelected(null)} onUpdate={handleUpdate} />
      </div>
    );
  }

  const totalMembers = [...new Set(teams.flatMap(t => t.members.map(m => m.email)))].length;

  return (
    <div style={{ width: '100%', height: '100%', overflowY: 'auto', background: '#f5f3ef' }}>
      <div style={{ padding: '36px 40px', maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
          marginBottom: 32,
        }}>
          <div>
            <h1 style={{
              margin: 0, fontSize: 30, fontWeight: 800, color: '#1a1814',
              letterSpacing: '-0.6px',
            }}>Equipes</h1>
            <p style={{ margin: '5px 0 0', fontSize: 14, color: '#a09d97' }}>
              {teams.length === 0
                ? 'Crie sua primeira equipe para começar'
                : `${teams.length} ${teams.length === 1 ? 'equipe' : 'equipes'} · ${totalMembers} ${totalMembers === 1 ? 'pessoa' : 'pessoas'}`}
            </p>
          </div>
          <PrimaryBtn onClick={() => setShowCreate(true)}>+ Nova equipe</PrimaryBtn>
        </div>

        {/* Busca */}
        {teams.length > 0 && (
          <div style={{ position: 'relative', marginBottom: 28, maxWidth: 400 }}>
            <span style={{
              position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
              fontSize: 14, color: '#c5c2bc', pointerEvents: 'none',
            }}>⌕</span>
            <input
              placeholder="Buscar equipes…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '10px 13px 10px 34px',
                border: '1.5px solid #e2ddd6', borderRadius: 12,
                fontSize: 14, color: '#1a1814', background: '#fff',
                outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => e.target.style.borderColor = '#2c2a26'}
              onBlur={e => e.target.style.borderColor = '#e2ddd6'}
            />
          </div>
        )}

        {/* Estado vazio */}
        {teams.length === 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 10, paddingTop: 100, textAlign: 'center', userSelect: 'none',
          }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#2c2a26' }}>Nenhuma equipe ainda</span>
            <span style={{ fontSize: 14, color: '#a09d97', maxWidth: 300, lineHeight: 1.6 }}>
              Crie uma equipe, adicione pessoas e comece a colaborar.
            </span>
            <PrimaryBtn onClick={() => setShowCreate(true)} style={{ marginTop: 8 }}>
              + Criar primeira equipe
            </PrimaryBtn>
          </div>
        )}

        {/* Sem resultado na busca */}
        {teams.length > 0 && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#c5c2bc' }}>
            <p style={{ margin: 0, fontSize: 14 }}>Nenhuma equipe encontrada para "{search}"</p>
          </div>
        )}

        {/* Grid de cards */}
        {filtered.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 18,
          }}>
            {filtered.map(team => (
              <TeamCard key={team.id} team={team} onClick={() => setSelected(team)} />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateTeamModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />
      )}
    </div>
  );
}
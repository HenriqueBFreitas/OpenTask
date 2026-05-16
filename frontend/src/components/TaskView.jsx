import { useState, useRef, useCallback, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const getToken = () => localStorage.getItem('access_token');
const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

const POSITIONS_KEY = 'opentask_positions';
const loadPositions = () => {
  try { return JSON.parse(localStorage.getItem(POSITIONS_KEY) || '{}'); }
  catch { return {}; }
};
const savePositions = (pos) => localStorage.setItem(POSITIONS_KEY, JSON.stringify(pos));

// ─── Workspace Dropdown ──────────────────────────────────────────────────────
function WorkspaceDropdown({ teams, activeWorkspace, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const activeLabel = activeWorkspace === null
    ? 'Pessoal'
    : teams.find(t => t.id === activeWorkspace)?.name || 'Pessoal';

  const items = [
    { id: null, label: 'Pessoal', color: '#a09d97' },
    ...teams.map(t => ({ id: t.id, label: t.name, color: t.color || '#2c2a26' })),
  ];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: '#fff',
          border: '1.5px solid #e2ddd6',
          borderRadius: 10,
          padding: '9px 14px',
          fontSize: 13,
          fontWeight: 600,
          color: '#2c2a26',
          cursor: 'pointer',
          fontFamily: 'inherit',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          transition: 'border-color 0.15s',
          minWidth: 140,
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = '#2c2a26'}
        onMouseLeave={e => { if (!open) e.currentTarget.style.borderColor = '#e2ddd6'; }}
      >
        <span style={{
          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
          background: activeWorkspace === null
            ? '#a09d97'
            : (teams.find(t => t.id === activeWorkspace)?.color || '#2c2a26'),
        }} />
        <span style={{ flex: 1, textAlign: 'left' }}>{activeLabel}</span>
        <span style={{ fontSize: 10, color: '#a09d97' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          background: '#fff',
          border: '1.5px solid #e2ddd6',
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
          minWidth: 190,
          zIndex: 200,
          padding: 4,
          overflow: 'hidden',
        }}>
          {items.map((item, i) => {
            const isActive = item.id === activeWorkspace;
            return (
              <button
                key={i}
                onClick={() => { onChange(item.id); setOpen(false); }}
                style={{
                  width: '100%',
                  background: isActive ? '#f5f3ef' : 'none',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontSize: 13,
                  fontWeight: isActive ? 700 : 400,
                  color: isActive ? '#1a1814' : '#4a4845',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#faf9f7'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'none'; }}
              >
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: item.color,
                }} />
                {item.label}
                {isActive && (
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: '#2c2a26' }}>✓</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Modal de criação ────────────────────────────────────────────────────────
function CreateTaskModal({ onClose, onCreate, teams = [], defaultTeam = null }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    image: null,
    team: defaultTeam !== null ? String(defaultTeam) : '',
  });
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setForm(f => ({ ...f, image: file }));
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    setLoading(true);
    await onCreate(form);
    setLoading(false);
    onClose();
  };

  const allOptions = [
    { value: '', label: 'Pessoal', color: '#a09d97' },
    ...teams.map(t => ({ value: String(t.id), label: t.name, color: t.color || '#2c2a26' })),
  ];

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff', borderRadius: 18, padding: 32, width: 440,
          boxShadow: '0 24px 80px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column', gap: 14,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#1a1814', letterSpacing: '-0.3px' }}>
            Nova tarefa
          </span>
          <button
            onClick={onClose}
            style={{
              background: '#f0ede8', border: 'none', borderRadius: 8,
              width: 32, height: 32, cursor: 'pointer', fontSize: 18,
              color: '#7a7570', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >×</button>
        </div>

        {/* Upload de imagem */}
        <label style={{ cursor: 'pointer' }}>
          <div style={{
            border: '2px dashed #e2ddd6', borderRadius: 12, overflow: 'hidden',
            background: '#faf9f7', textAlign: 'center', minHeight: 90,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {preview ? (
              <img src={preview} alt="preview" style={{ width: '100%', maxHeight: 160, objectFit: 'cover' }} />
            ) : (
              <div style={{ padding: '20px 0', color: '#a09d97', fontSize: 13 }}>
                <div style={{ fontSize: 20, marginBottom: 4, opacity: 0.5 }}>+</div>
                Clique para anexar imagem
              </div>
            )}
          </div>
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImage} />
        </label>

        {/* Título */}
        <input
          placeholder="Título da tarefa *"
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          autoFocus
          style={{
            border: '1.5px solid #e2ddd6', borderRadius: 10,
            padding: '10px 13px', fontSize: 14, fontFamily: 'inherit',
            outline: 'none', color: '#1a1814', background: '#faf9f7',
          }}
          onFocus={e => e.target.style.borderColor = '#2c2a26'}
          onBlur={e => e.target.style.borderColor = '#e2ddd6'}
        />

        {/* Descrição */}
        <textarea
          placeholder="Descrição (opcional)..."
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          rows={3}
          style={{
            border: '1.5px solid #e2ddd6', borderRadius: 10,
            padding: '10px 13px', fontSize: 14, fontFamily: 'inherit',
            outline: 'none', resize: 'vertical', color: '#1a1814',
            background: '#faf9f7',
          }}
          onFocus={e => e.target.style.borderColor = '#2c2a26'}
          onBlur={e => e.target.style.borderColor = '#e2ddd6'}
        />

        {/* Workspace — lista vertical igual à imagem de referência */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6b6760', marginBottom: 6 }}>
            Workspace
          </div>
          <div style={{
            border: '1.5px solid #e2ddd6', borderRadius: 10,
            overflow: 'hidden', background: '#faf9f7',
          }}>
            {allOptions.map((opt, i) => {
              const isSelected = form.team === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, team: opt.value }))}
                  style={{
                    width: '100%',
                    background: isSelected ? '#f0ede8' : 'transparent',
                    border: 'none',
                    borderTop: i > 0 ? '1px solid #f0ede8' : 'none',
                    padding: '11px 14px',
                    fontSize: 14,
                    fontWeight: isSelected ? 600 : 400,
                    color: isSelected ? '#1a1814' : '#4a4845',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f5f3ef'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: opt.color,
                  }} />
                  {opt.label}
                  {isSelected && (
                    <span style={{ marginLeft: 'auto', fontSize: 13, color: '#2c2a26' }}>✓</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Botão criar */}
        <button
          onClick={handleSubmit}
          disabled={!form.title.trim() || loading}
          style={{
            background: form.title.trim() ? '#2c2a26' : '#c5c2bc',
            color: '#fff', border: 'none', borderRadius: 11,
            padding: '12px', fontSize: 14, fontWeight: 700,
            cursor: form.title.trim() ? 'pointer' : 'not-allowed',
            marginTop: 4, transition: 'background 0.2s',
            letterSpacing: '0.2px',
          }}
        >
          {loading ? 'Criando...' : 'Criar tarefa'}
        </button>
      </div>
    </div>
  );
}

// ─── Card de tarefa ──────────────────────────────────────────────────────────
function TaskCard({ task, teams = [], onUpdate, onDelete, onAddSubtask, onToggleSubtask, onPositionChange }) {
  const [expanded, setExpanded] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [newSub, setNewSub] = useState('');
  const [addingSub, setAddingSub] = useState(false);
  const [dragging, setDragging] = useState(false);

  const cardRef = useRef(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const pos = useRef({ x: task._x, y: task._y });

  const onMouseDown = (e) => {
    if (e.target.closest('button, input, textarea, select, .no-drag')) return;
    e.preventDefault();
    setDragging(true);
    dragOffset.current = {
      x: e.clientX - pos.current.x,
      y: e.clientY - pos.current.y,
    };
    const onMove = (ev) => {
      pos.current = {
        x: ev.clientX - dragOffset.current.x,
        y: ev.clientY - dragOffset.current.y,
      };
      if (cardRef.current) {
        cardRef.current.style.left = pos.current.x + 'px';
        cardRef.current.style.top = pos.current.y + 'px';
      }
    };
    const onUp = () => {
      setDragging(false);
      onPositionChange(task.id, pos.current.x, pos.current.y);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const saveTitle = async () => {
    setEditingTitle(false);
    if (title.trim() && title !== task.title) {
      await onUpdate(task.id, { title });
    }
  };

  const handleAddSub = async () => {
    if (!newSub.trim()) return;
    setAddingSub(true);
    await onAddSubtask(task.id, newSub.trim());
    setNewSub('');
    setAddingSub(false);
  };

  const assignedTeam = teams.find(t => t.id === task.team || t.id === Number(task.team));
  const done = task.subtasks?.filter(s => s.completed).length || 0;
  const total = task.subtasks?.length || 0;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;
  const coverImage = task.images_data?.[0]?.image;

  return (
    <div
      ref={cardRef}
      onMouseDown={onMouseDown}
      style={{
        position: 'absolute',
        left: task._x, top: task._y,
        width: 270,
        background: '#fff',
        borderRadius: 14,
        boxShadow: dragging
          ? '0 20px 60px rgba(0,0,0,0.18)'
          : '0 2px 12px rgba(0,0,0,0.08)',
        cursor: dragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        transition: dragging ? 'none' : 'box-shadow 0.2s',
        zIndex: dragging ? 100 : 1,
        overflow: 'hidden',
      }}
    >
      {coverImage && (
        <img
          src={coverImage}
          alt="capa"
          style={{ width: '100%', height: 110, objectFit: 'cover', display: 'block' }}
        />
      )}

      <div style={{ padding: '14px 14px 12px' }}>
        {assignedTeam && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: '#f5f3ef', borderRadius: 6, padding: '2px 8px',
            fontSize: 10, fontWeight: 600, color: '#6b6760', marginBottom: 8,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: assignedTeam.color || '#2c2a26',
            }} />
            {assignedTeam.name}
          </div>
        )}

        {editingTitle ? (
          <input
            className="no-drag"
            value={title}
            autoFocus
            onChange={e => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={e => e.key === 'Enter' && saveTitle()}
            style={{
              width: '100%', border: 'none', borderBottom: '2px solid #2c2a26',
              fontSize: 14, fontWeight: 700, padding: '2px 0',
              fontFamily: 'inherit', outline: 'none', background: 'transparent',
              color: '#1a1814', boxSizing: 'border-box',
            }}
          />
        ) : (
          <div
            onDoubleClick={() => setEditingTitle(true)}
            style={{
              fontSize: 14, fontWeight: 700, color: '#1a1814',
              marginBottom: 2, cursor: 'text', lineHeight: 1.4,
            }}
          >
            {task.title}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, marginBottom: 8 }}>
          <button
            className="no-drag"
            onClick={() => onUpdate(task.id, { completed: !task.completed })}
            style={{
              background: task.completed ? '#2c2a26' : 'transparent',
              border: `1.5px solid ${task.completed ? '#2c2a26' : '#d0ccc5'}`,
              borderRadius: 6, width: 20, height: 20,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, color: '#fff', flexShrink: 0,
            }}
          >
            {task.completed ? '✓' : ''}
          </button>
          <span style={{ fontSize: 11, color: task.completed ? '#2c2a26' : '#a09d97', fontWeight: 500 }}>
            {task.completed ? 'Concluída' : 'Em andamento'}
          </span>
        </div>

        {total > 0 && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#a09d97', marginBottom: 4 }}>
              <span>Subtarefas</span>
              <span>{done}/{total}</span>
            </div>
            <div style={{ background: '#f0ede8', borderRadius: 99, height: 5, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 99,
                width: `${progress}%`,
                background: progress === 100 ? '#4caf50' : '#2c2a26',
                transition: 'width 0.3s',
              }} />
            </div>
          </div>
        )}

        <button
          className="no-drag"
          onClick={() => setExpanded(e => !e)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 11, color: '#a09d97', padding: 0, fontFamily: 'inherit',
            fontWeight: 500,
          }}
        >
          {expanded ? 'Fechar' : 'Ver subtarefas'}
        </button>

        {expanded && (
          <div className="no-drag" style={{ marginTop: 10 }}>
            {task.subtasks?.map(sub => (
              <div key={sub.id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '5px 0', borderTop: '1px solid #f0ede8',
              }}>
                <button
                  onClick={() => onToggleSubtask(sub)}
                  style={{
                    background: sub.completed ? '#2c2a26' : 'transparent',
                    border: `1.5px solid ${sub.completed ? '#2c2a26' : '#d0ccc5'}`,
                    borderRadius: 5, width: 17, height: 17, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, color: '#fff', flexShrink: 0,
                  }}
                >{sub.completed ? '✓' : ''}</button>
                <span style={{
                  fontSize: 12, color: sub.completed ? '#a09d97' : '#2c2a26',
                  textDecoration: sub.completed ? 'line-through' : 'none', flex: 1,
                }}>
                  {sub.title}
                </span>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <input
                placeholder="Nova subtarefa..."
                value={newSub}
                onChange={e => setNewSub(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddSub()}
                style={{
                  flex: 1, border: '1px solid #e2ddd6', borderRadius: 7,
                  padding: '6px 9px', fontSize: 12, fontFamily: 'inherit',
                  outline: 'none', background: '#faf9f7',
                }}
              />
              <button
                onClick={handleAddSub}
                disabled={addingSub || !newSub.trim()}
                style={{
                  background: '#2c2a26', color: '#fff', border: 'none',
                  borderRadius: 7, padding: '6px 10px', cursor: 'pointer',
                  fontSize: 12, fontWeight: 700,
                }}
              >+</button>
            </div>
          </div>
        )}
      </div>

      <div style={{
        display: 'flex', justifyContent: 'flex-end',
        padding: '6px 14px 10px', borderTop: '1px solid #f5f3ef',
      }}>
        <button
          className="no-drag"
          onClick={() => onDelete(task.id)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 11, color: '#c9a09a', fontFamily: 'inherit',
          }}
        >
          Excluir
        </button>
      </div>
    </div>
  );
}

// ─── TasksView principal ─────────────────────────────────────────────────────
export default function TasksView() {
  const [tasks, setTasks] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [tasksRes, teamsRes] = await Promise.all([
          fetch(`${API}/tasks/`, { headers: authHeaders() }),
          fetch(`${API}/teams/`, { headers: authHeaders() }),
        ]);
        if (!tasksRes.ok) throw new Error();
        const data = await tasksRes.json();
        const teamsData = teamsRes.ok ? await teamsRes.json() : [];
        const positions = loadPositions();
        setTasks(data.map((t, i) => ({
          ...t,
          subtasks: t.subtasks || [],
          _x: positions[t.id]?.x ?? 30 + (i % 4) * 290,
          _y: positions[t.id]?.y ?? 30 + Math.floor(i / 4) * 220,
        })));
        setTeams(Array.isArray(teamsData) ? teamsData : []);
      } catch {
        setError('Erro ao carregar tarefas.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Filtra tarefas pelo workspace ativo
  const visibleTasks = tasks.filter(t => {
    if (activeWorkspace === null) return !t.team || t.team === '' || t.team === null;
    return t.team === activeWorkspace || t.team === String(activeWorkspace) || Number(t.team) === activeWorkspace;
  });

  const createTask = async (form) => {
    setCreating(true);
    try {
      const teamId = form.team ? Number(form.team) : null;
      const body = {
        title: form.title,
        description: form.description || '',
        completed: false,
        ...(teamId ? { team: teamId } : {}),
      };
      const res = await fetch(`${API}/tasks/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      const t = await res.json();

      if (form.image) {
        const fd = new FormData();
        fd.append('images', form.image);
        await fetch(`${API}/tasks/${t.id}/upload-images/`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${getToken()}` },
          body: fd,
        });
        const r2 = await fetch(`${API}/tasks/${t.id}/`, { headers: authHeaders() });
        if (r2.ok) Object.assign(t, await r2.json());
      }

      const positions = loadPositions();
      const x = positions[t.id]?.x ?? 30 + (tasks.length % 4) * 290;
      const y = positions[t.id]?.y ?? 30 + Math.floor(tasks.length / 4) * 220;
      setTasks(prev => [...prev, { ...t, subtasks: t.subtasks || [], _x: x, _y: y }]);
    } catch {
      setError('Erro ao criar tarefa.');
    } finally {
      setCreating(false);
    }
  };

  const updateTask = async (id, data) => {
    try {
      const res = await fetch(`${API}/tasks/${id}/`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updated } : t));
    } catch {
      setError('Erro ao atualizar tarefa.');
    }
  };

  const deleteTask = async (id) => {
    if (!confirm('Excluir esta tarefa?')) return;
    try {
      await fetch(`${API}/tasks/${id}/`, { method: 'DELETE', headers: authHeaders() });
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch {
      setError('Erro ao excluir tarefa.');
    }
  };

  const addSubtask = async (taskId, title) => {
    try {
      const res = await fetch(`${API}/subtasks/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ task: taskId, title, completed: false }),
      });
      if (!res.ok) throw new Error();
      const sub = await res.json();
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, subtasks: [...(t.subtasks || []), sub] } : t
      ));
    } catch {
      setError('Erro ao criar subtarefa.');
    }
  };

  const toggleSubtask = async (sub) => {
    try {
      const res = await fetch(`${API}/subtasks/${sub.id}/`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ completed: !sub.completed }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setTasks(prev => prev.map(t => ({
        ...t,
        subtasks: t.subtasks?.map(s => s.id === sub.id ? updated : s),
      })));
    } catch {
      setError('Erro ao atualizar subtarefa.');
    }
  };

  const handlePositionChange = useCallback((id, x, y) => {
    const positions = loadPositions();
    positions[id] = { x, y };
    savePositions(positions);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, _x: x, _y: y } : t));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#a09d97', fontSize: 14 }}>
      Carregando tarefas...
    </div>
  );

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: '#faf9f7' }}>

      {/* Toolbar */}
      <div style={{
        position: 'absolute', top: 16, right: 20, zIndex: 50,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        {error && (
          <span style={{
            fontSize: 12, color: '#c0392b', background: '#fdf0ee',
            padding: '5px 10px', borderRadius: 7,
          }}>
            {error}
          </span>
        )}

        <WorkspaceDropdown
          teams={teams}
          activeWorkspace={activeWorkspace}
          onChange={setActiveWorkspace}
        />

        <button
          onClick={() => setShowModal(true)}
          style={{
            background: '#2c2a26', color: '#fff', border: 'none',
            borderRadius: 10, padding: '9px 18px', fontSize: 13,
            fontWeight: 700, cursor: 'pointer', letterSpacing: '0.2px',
            boxShadow: '0 2px 8px rgba(44,42,38,0.15)',
          }}
        >
          + Nova tarefa
        </button>
      </div>

      {/* Canvas */}
      {visibleTasks.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          height: '100%', gap: 12, userSelect: 'none',
        }}>
          <div style={{ fontSize: 52, opacity: 0.15, fontWeight: 900, color: '#2c2a26' }}></div>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#2c2a26' }}>
            Nenhuma tarefa neste workspace
          </span>
          <span style={{ fontSize: 13, color: '#a09d97' }}>
            Crie a primeira tarefa para este espaço
          </span>
          <button
            onClick={() => setShowModal(true)}
            style={{
              marginTop: 8, background: '#2c2a26', color: '#fff',
              border: 'none', borderRadius: 12, padding: '12px 28px',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(44,42,38,0.2)',
              letterSpacing: '0.2px',
            }}
          >
            + Criar tarefa
          </button>
        </div>
      ) : (
        visibleTasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            teams={teams}
            onUpdate={updateTask}
            onDelete={deleteTask}
            onAddSubtask={addSubtask}
            onToggleSubtask={toggleSubtask}
            onPositionChange={handlePositionChange}
          />
        ))
      )}

      {showModal && (
        <CreateTaskModal
          onClose={() => setShowModal(false)}
          onCreate={createTask}
          teams={teams}
          defaultTeam={activeWorkspace}
        />
      )}
    </div>
  );
}
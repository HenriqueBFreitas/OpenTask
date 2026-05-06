import { useState, useEffect, useRef, useCallback } from 'react';

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

// ─── Modal de criação ───────────────────────────────────────────────────────
function CreateTaskModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ title: '', description: '', image: null });
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
            position: 'relative',
          }}>
            {preview ? (
              <img src={preview} alt="preview" style={{ width: '100%', maxHeight: 160, objectFit: 'cover' }} />
            ) : (
              <div style={{ padding: '20px 0', color: '#a09d97', fontSize: 13 }}>
                <div style={{ fontSize: 24, marginBottom: 4 }}></div>
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
            transition: 'border-color 0.15s',
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

// ─── Card de tarefa ─────────────────────────────────────────────────────────
function TaskCard({ task, onUpdate, onDelete, onAddSubtask, onToggleSubtask, onPositionChange }) {
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
    if (e.target.closest('button, input, textarea, .no-drag')) return;
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, marginBottom: 10 }}>
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
          {expanded ? '▲ Fechar' : '▼ Ver subtarefas'}
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
          🗑 Excluir
        </button>
      </div>
    </div>
  );
}

// ─── TasksView principal ────────────────────────────────────────────────────
export default function TasksView() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/tasks/`, { headers: authHeaders() });
        if (!res.ok) throw new Error();
        const data = await res.json();
        const positions = loadPositions();
        setTasks(data.map((t, i) => ({
          ...t,
          _x: positions[t.id]?.x ?? 30 + (i % 4) * 290,
          _y: positions[t.id]?.y ?? 30 + Math.floor(i / 4) * 220,
        })));
      } catch {
        setError('Erro ao carregar tarefas.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const createTask = async (form) => {
    setCreating(true);
    try {
      const res = await fetch(`${API}/tasks/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ title: form.title, completed: false }),
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

      {tasks.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          height: '100%', gap: 12, userSelect: 'none',
        }}>
          <div style={{ fontSize: 52, filter: 'grayscale(0.3)' }}>✓</div>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#2c2a26' }}>
            Nenhuma tarefa ainda
          </span>
          <span style={{ fontSize: 13, color: '#a09d97' }}>
            Comece criando sua primeira tarefa
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
            + Criar primeira tarefa
          </button>
        </div>
      ) : (
        tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
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
        />
      )}
    </div>
  );
}
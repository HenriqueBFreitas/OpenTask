'use client';
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

// ─── Modal de confirmação de exclusão ────────────────────────────────────────
function DeleteModal({ taskTitle, onConfirm, onCancel }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, backdropFilter: 'blur(4px)',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: '#fff', borderRadius: 16, padding: 28, width: 360,
          boxShadow: '0 24px 80px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1814', marginBottom: 6 }}>
            Excluir tarefa
          </div>
          <div style={{ fontSize: 13, color: '#6b6760', lineHeight: 1.5 }}>
            Tem certeza que deseja excluir{' '}
            <span style={{ fontWeight: 600, color: '#2c2a26' }}>"{taskTitle}"</span>?
            Esta ação não pode ser desfeita.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '10px', borderRadius: 9,
              border: '1.5px solid #e2ddd6', background: '#fff',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              color: '#6b6760', fontFamily: 'inherit',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#2c2a26'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#e2ddd6'}
          >Cancelar</button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: '10px', borderRadius: 9,
              border: 'none', background: '#c0392b',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              color: '#fff', fontFamily: 'inherit',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#a93226'}
            onMouseLeave={e => e.currentTarget.style.background = '#c0392b'}
          >Excluir</button>
        </div>
      </div>
    </div>
  );
}

// ─── Workspace Dropdown (seletor de visualização — uma por vez) ──────────────
function WorkspaceDropdown({ groups, activeWorkspace, onChange }) {
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
    : groups.find(g => g.id === activeWorkspace)?.name || 'Pessoal';

  const items = [
    { id: null, label: 'Pessoal', color: '#a09d97' },
    ...groups.map(g => ({ id: g.id, label: g.name, color: g.color || '#2c2a26' })),
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
          minWidth: 140,
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = '#2c2a26'}
        onMouseLeave={e => { if (!open) e.currentTarget.style.borderColor = '#e2ddd6'; }}
      >
        <span style={{
          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
          background: activeWorkspace === null
            ? '#a09d97'
            : (groups.find(g => g.id === activeWorkspace)?.color || '#2c2a26'),
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
          minWidth: 200,
          zIndex: 200,
          padding: 4,
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

// ─── Modal de criação — workspace multi-select ───────────────────────────────
function CreateTaskModal({ onClose, onCreate, groups = [], defaultGroup = null }) {
  // isPessoal e grupos são independentes — uma task pode ser de ambos ao mesmo tempo
  const [isPessoal, setIsPessoal] = useState(defaultGroup === null);
  const [selectedGroups, setSelectedGroups] = useState(
    defaultGroup !== null ? [defaultGroup] : []
  );
  const [form, setForm] = useState({ title: '', description: '', image: null });
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setForm(f => ({ ...f, image: file }));
    setPreview(URL.createObjectURL(file));
  };

  const toggleGroup = (groupId) => {
    if (groupId === null) {
      setIsPessoal(p => !p);
      return;
    }
    setSelectedGroups(prev =>
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    );
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    setLoading(true);
    await onCreate({ ...form, groups: selectedGroups, isPessoal });
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
          maxHeight: '90vh', overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
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

        {/* Imagem */}
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

        {/* Workspace multi-select */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6b6760', marginBottom: 6 }}>
            Workspace
            {selectedGroups.length > 1 && (
              <span style={{
                marginLeft: 8, background: '#2c2a26', color: '#fff',
                borderRadius: 99, padding: '1px 7px', fontSize: 11, fontWeight: 700,
              }}>
                {selectedGroups.length} selecionados
              </span>
            )}
          </div>
          <div style={{
            border: '1.5px solid #e2ddd6', borderRadius: 10,
            overflow: 'hidden', background: '#faf9f7',
          }}>
            {/* Pessoal */}
            <WorkspaceOption
              label="Pessoal"
              color="#a09d97"
              selected={isPessoal}
              isCheckbox={true}
              onClick={() => toggleGroup(null)}
              borderTop={false}
            />

            {/* Grupos */}
            {groups.map((g, i) => {
              const isSelected = selectedGroups.includes(g.id);
              return (
                <WorkspaceOption
                  key={g.id}
                  label={g.name}
                  color={g.color || '#2c2a26'}
                  selected={isSelected}
                  isCheckbox={true}
                  onClick={() => toggleGroup(g.id)}
                  borderTop={true}
                  photoUrl={g.photo_url}
                />
              );
            })}
          </div>
          {groups.length === 0 && (
            <div style={{ fontSize: 11, color: '#a09d97', marginTop: 6 }}>
              Você ainda não faz parte de nenhum grupo.
            </div>
          )}
        </div>

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

function WorkspaceOption({ label, color, selected, isCheckbox, onClick, borderTop, photoUrl }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        background: selected ? '#f0ede8' : 'transparent',
        border: 'none',
        borderTop: borderTop ? '1px solid #f0ede8' : 'none',
        padding: '11px 14px',
        fontSize: 14,
        fontWeight: selected ? 600 : 400,
        color: selected ? '#1a1814' : '#4a4845',
        cursor: 'pointer',
        fontFamily: 'inherit',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = '#f5f3ef'; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent'; }}
    >
      {/* Avatar do grupo ou bolinha */}
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={label}
          style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
        />
      ) : (
        <span style={{
          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
          background: color,
        }} />
      )}

      <span style={{ flex: 1 }}>{label}</span>

      {/* Checkbox para grupos, checkmark simples para Pessoal */}
      {isCheckbox ? (
        <span style={{
          width: 16, height: 16, borderRadius: 4, flexShrink: 0,
          border: selected ? 'none' : '1.5px solid #c5c2bc',
          background: selected ? '#2c2a26' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, color: '#fff',
          transition: 'background 0.15s',
        }}>
          {selected ? '✓' : ''}
        </span>
      ) : (
        selected && (
          <span style={{ fontSize: 13, color: '#2c2a26' }}>✓</span>
        )
      )}
    </button>
  );
}

// ─── Card de tarefa ──────────────────────────────────────────────────────────
function TaskCard({ task, groups = [], onUpdate, onDelete, onAddSubtask, onToggleSubtask, onPositionChange }) {
  const [expanded, setExpanded] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [newSub, setNewSub] = useState('');
  const [addingSub, setAddingSub] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  // Task pode pertencer a vários grupos
  const taskGroupIds = Array.isArray(task.groups)
    ? task.groups
    : (task.group ? [task.group] : []);
  const assignedGroups = groups.filter(g => taskGroupIds.includes(g.id) || taskGroupIds.includes(String(g.id)));

  const done = task.subtasks?.filter(s => s.completed).length || 0;
  const total = task.subtasks?.length || 0;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;
  const coverImage = task.images_data?.[0]?.image_url;

  return (
    <>
      {confirmDelete && (
        <DeleteModal
          taskTitle={task.title}
          onConfirm={() => { setConfirmDelete(false); onDelete(task.id); }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

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
          {/* Tags de grupos */}
          {assignedGroups.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
              {assignedGroups.map(g => (
                <div key={g.id} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: '#f5f3ef', borderRadius: 6, padding: '2px 7px',
                  fontSize: 10, fontWeight: 600, color: '#6b6760',
                }}>
                  {g.photo_url ? (
                    <img src={g.photo_url} alt={g.name} style={{ width: 10, height: 10, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: g.color || '#2c2a26' }} />
                  )}
                  {g.name}
                </div>
              ))}
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

          {task.description ? (
            <div style={{
              fontSize: 12, color: '#7a7570', lineHeight: 1.5,
              marginTop: 4, marginBottom: 4,
              display: '-webkit-box', WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {task.description}
            </div>
          ) : null}

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
            onClick={() => setConfirmDelete(true)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 11, color: '#c9a09a', fontFamily: 'inherit',
              fontWeight: 500, padding: '2px 4px', borderRadius: 4,
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#c0392b'}
            onMouseLeave={e => e.currentTarget.style.color = '#c9a09a'}
          >
            Excluir
          </button>
        </div>
      </div>
    </>
  );
}

// ─── TasksView principal ─────────────────────────────────────────────────────
export default function TasksView() {
  const [tasks, setTasks] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState(null); // null = Pessoal

  useEffect(() => {
    (async () => {
      try {
        const [tasksRes, groupsRes] = await Promise.all([
          fetch(`${API}/tasks/`, { headers: authHeaders() }),
          fetch(`${API}/groups/`, { headers: authHeaders() }),  // ← corrigido de /teams/ para /groups/
        ]);
        if (!tasksRes.ok) throw new Error();
        const data = await tasksRes.json();
        const groupsData = groupsRes.ok ? await groupsRes.json() : [];
        const positions = loadPositions();
        setTasks(data.map((t, i) => {
          const grps = t.groups || (t.group ? [t.group] : []);
          return {
            ...t,
            subtasks: t.subtasks || [],
            groups: grps,
            // se o backend retorna isPessoal usa, senão tasks sem grupos são pessoais
            isPessoal: t.isPessoal ?? (grps.length === 0),
            _x: positions[t.id]?.x ?? 30 + (i % 4) * 290,
            _y: positions[t.id]?.y ?? 30 + Math.floor(i / 4) * 220,
          };
        }));
        setGroups(Array.isArray(groupsData) ? groupsData : []);
      } catch {
        setError('Erro ao carregar tarefas.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Filtra tasks pelo workspace ativo
  const visibleTasks = tasks.filter(t => {
    const taskGroups = Array.isArray(t.groups) ? t.groups : [];
    if (activeWorkspace === null) {
      // Pessoal = tasks marcadas como pessoal OU sem nenhum grupo
      return t.isPessoal === true || taskGroups.length === 0;
    }
    // Grupo selecionado = task que tem esse grupo na lista
    return taskGroups.includes(activeWorkspace) || taskGroups.includes(String(activeWorkspace));
  });

  const createTask = async (form) => {
    setCreating(true);
    try {
      // form.groups = array de ids de grupos selecionados ([] = Pessoal)
      const body = {
        title: form.title,
        description: form.description || '',
        completed: false,
        ...(form.groups && form.groups.length > 0 ? { groups: form.groups } : {}),
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
      setTasks(prev => [...prev, {
        ...t,
        subtasks: t.subtasks || [],
        groups: t.groups || (form.groups || []),
        isPessoal: form.isPessoal ?? true,
        _x: x, _y: y,
      }]);
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
    try {
      await fetch(`${API}/tasks/${id}/`, { method: 'DELETE', headers: authHeaders() });
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch {
      setError('Erro ao excluir tarefa.');
    }
  };

  const addSubtask = async (taskId, title) => {
    try {
      const res = await fetch(`${API}/tasks/${sub.id}/subtasks/`, {
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
      const res = await fetch(`${API}/tasks/subtasks/${sub.id}/`, {
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

        <WorkspaceDropdown
          groups={groups}
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

      {visibleTasks.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          height: '100%', gap: 12, userSelect: 'none',
        }}>
          <div style={{ fontSize: 52, opacity: 0.15, fontWeight: 900, color: '#2c2a26' }}>✓</div>
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
            groups={groups}
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
          groups={groups}
          defaultGroup={activeWorkspace}
        />
      )}
    </div>
  );
}

'use client';
import { useState, useRef, useEffect, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const getToken = () => localStorage.getItem('access_token');
const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

const ORDER_KEY = 'opentask_order';
const POSITIONS_KEY = 'opentask_positions';
const VIEW_KEY = 'opentask_view';

const loadOrder = () => {
  try { return JSON.parse(localStorage.getItem(ORDER_KEY) || '[]'); }
  catch { return []; }
};
const saveOrder = (ids) => localStorage.setItem(ORDER_KEY, JSON.stringify(ids));

const loadPositions = () => {
  try { return JSON.parse(localStorage.getItem(POSITIONS_KEY) || '{}'); }
  catch { return {}; }
};
const savePositions = (pos) => localStorage.setItem(POSITIONS_KEY, JSON.stringify(pos));

const loadView = () => localStorage.getItem(VIEW_KEY) || 'grid';
const saveView = (v) => localStorage.setItem(VIEW_KEY, v);

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconGrid() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" />
      <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" />
      <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" />
      <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" />
    </svg>
  );
}

function IconCanvas() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="5" height="7" rx="1.5" fill="currentColor" />
      <rect x="8" y="1" width="7" height="4" rx="1.5" fill="currentColor" />
      <rect x="8" y="7" width="7" height="8" rx="1.5" fill="currentColor" />
      <rect x="1" y="10" width="5" height="5" rx="1.5" fill="currentColor" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M4 7l2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────

function DeleteModal({ taskTitle, onConfirm, onCancel }) {
  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 16, padding: 28, width: 360,
          boxShadow: '0 24px 80px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}
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
            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#2c2a26'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e2ddd6'}
            style={{
              flex: 1, padding: '10px', borderRadius: 9,
              border: '1.5px solid #e2ddd6', background: '#fff',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              color: '#6b6760', fontFamily: 'inherit',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            onMouseEnter={(e) => e.currentTarget.style.background = '#a93226'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#c0392b'}
            style={{
              flex: 1, padding: '10px', borderRadius: 9,
              border: 'none', background: '#c0392b',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              color: '#fff', fontFamily: 'inherit',
            }}
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Workspace Dropdown ───────────────────────────────────────────────────────

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

  const activeLabel =
    activeWorkspace === null
      ? 'Pessoal'
      : groups.find((g) => g.id === activeWorkspace)?.name || 'Pessoal';

  const items = [
    { id: null, label: 'Pessoal', color: '#a09d97' },
    ...groups.map((g) => ({ id: g.id, label: g.name, color: g.color || '#2c2a26' })),
  ];

  const activeColor =
    activeWorkspace === null
      ? '#a09d97'
      : groups.find((g) => g.id === activeWorkspace)?.color || '#2c2a26';

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          background: '#fff', border: '1.5px solid #e2ddd6', borderRadius: 10,
          padding: '8px 14px', fontSize: 13, fontWeight: 600, color: '#2c2a26',
          cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)', minWidth: 130,
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: activeColor }} />
        <span style={{ flex: 1, textAlign: 'left' }}>{activeLabel}</span>
        <span style={{ fontSize: 10, color: '#a09d97' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0,
            background: '#fff', border: '1.5px solid #e2ddd6', borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
            minWidth: 190, zIndex: 200, padding: 4,
          }}
        >
          {items.map((item, i) => {
            const isActive = item.id === activeWorkspace;
            return (
              <button
                key={i}
                onClick={() => { onChange(item.id); setOpen(false); }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = '#faf9f7'; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'none'; }}
                style={{
                  width: '100%', background: isActive ? '#f5f3ef' : 'none',
                  border: 'none', borderRadius: 8, padding: '10px 14px',
                  fontSize: 13, fontWeight: isActive ? 700 : 400,
                  color: isActive ? '#1a1814' : '#4a4845',
                  cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: item.color }} />
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

// ─── Workspace Option (used inside CreateTaskModal) ───────────────────────────

function WorkspaceOption({ label, color, selected, onClick, borderTop, photoUrl }) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = '#f5f3ef'; }}
      onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = 'transparent'; }}
      style={{
        width: '100%', background: selected ? '#f0ede8' : 'transparent',
        border: 'none', borderTop: borderTop ? '1px solid #f0ede8' : 'none',
        padding: '11px 14px', fontSize: 14, fontWeight: selected ? 600 : 400,
        color: selected ? '#1a1814' : '#4a4845',
        cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
        display: 'flex', alignItems: 'center', gap: 10,
      }}
    >
      {photoUrl ? (
        <img
          src={photoUrl} alt={label}
          style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
        />
      ) : (
        <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: color }} />
      )}
      <span style={{ flex: 1 }}>{label}</span>
      <span
        style={{
          width: 16, height: 16, borderRadius: 4, flexShrink: 0,
          border: selected ? 'none' : '1.5px solid #c5c2bc',
          background: selected ? '#2c2a26' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, color: '#fff',
        }}
      >
        {selected ? '✓' : ''}
      </span>
    </button>
  );
}

// ─── Create Task Modal ────────────────────────────────────────────────────────

function CreateTaskModal({ onClose, onCreate, groups = [], defaultGroup = null }) {
  const [isPessoal, setIsPessoal] = useState(defaultGroup === null);
  const [selectedGroups, setSelectedGroups] = useState(defaultGroup !== null ? [defaultGroup] : []);
  const [form, setForm] = useState({ title: '', description: '', image: null });
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleImage = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setForm((p) => ({ ...p, image: f }));
    setPreview(URL.createObjectURL(f));
  };

  const toggleGroup = (id) => {
    if (id === null) { setIsPessoal((p) => !p); return; }
    setSelectedGroups((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
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
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 18, padding: 28,
          width: '90%', maxWidth: 420,
          boxShadow: '0 24px 80px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column', gap: 12,
          maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#1a1814' }}>Nova tarefa</span>
          <button
            onClick={onClose}
            style={{
              background: '#f0ede8', border: 'none', borderRadius: 8,
              width: 30, height: 30, cursor: 'pointer', fontSize: 17,
              color: '#7a7570', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>

        {/* Image upload */}
        <label style={{ cursor: 'pointer' }}>
          <div
            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#2c2a26'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e2ddd6'}
            style={{
              border: '2px dashed #e2ddd6', borderRadius: 12, overflow: 'hidden',
              background: '#faf9f7', textAlign: 'center',
              minHeight: 80, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {preview ? (
              <img src={preview} alt="preview" style={{ width: '100%', maxHeight: 150, objectFit: 'cover' }} />
            ) : (
              <div style={{ padding: '16px 0', color: '#a09d97', fontSize: 13 }}>
                <div style={{ fontSize: 22, marginBottom: 4, opacity: 0.4 }}>🖼</div>
                Clique para anexar imagem
              </div>
            )}
          </div>
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImage} />
        </label>

        {/* Title */}
        <input
          placeholder="Título da tarefa *"
          value={form.title}
          autoFocus
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          onFocus={(e) => e.target.style.borderColor = '#2c2a26'}
          onBlur={(e) => e.target.style.borderColor = '#e2ddd6'}
          style={{
            border: '1.5px solid #e2ddd6', borderRadius: 10, padding: '10px 13px',
            fontSize: 14, fontFamily: 'inherit', outline: 'none',
            color: '#1a1814', background: '#faf9f7',
          }}
        />

        {/* Description */}
        <textarea
          placeholder="Descrição (opcional)..."
          value={form.description}
          rows={3}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          onFocus={(e) => e.target.style.borderColor = '#2c2a26'}
          onBlur={(e) => e.target.style.borderColor = '#e2ddd6'}
          style={{
            border: '1.5px solid #e2ddd6', borderRadius: 10, padding: '10px 13px',
            fontSize: 14, fontFamily: 'inherit', outline: 'none',
            resize: 'vertical', color: '#1a1814', background: '#faf9f7',
          }}
        />

        {/* Workspace picker */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6b6760', marginBottom: 6 }}>
            Workspace
          </div>
          <div style={{ border: '1.5px solid #e2ddd6', borderRadius: 10, overflow: 'hidden', background: '#faf9f7' }}>
            <WorkspaceOption
              label="Pessoal"
              color="#a09d97"
              selected={isPessoal}
              onClick={() => toggleGroup(null)}
              borderTop={false}
            />
            {groups.map((g) => (
              <WorkspaceOption
                key={g.id}
                label={g.name}
                color={g.color || '#2c2a26'}
                selected={selectedGroups.includes(g.id)}
                onClick={() => toggleGroup(g.id)}
                borderTop
                photoUrl={g.photo_url}
              />
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!form.title.trim() || loading}
          style={{
            background: form.title.trim() ? '#2c2a26' : '#c5c2bc',
            color: '#fff', border: 'none', borderRadius: 11,
            padding: '12px', fontSize: 14, fontWeight: 700,
            cursor: form.title.trim() ? 'pointer' : 'not-allowed',
            transition: 'background 0.2s',
          }}
        >
          {loading ? 'Criando...' : 'Criar tarefa'}
        </button>
      </div>
    </div>
  );
}

// ─── View Toggle ──────────────────────────────────────────────────────────────

function ViewToggle({ view, onChange }) {
  const options = [
    { id: 'grid', Icon: IconGrid, label: 'Grade' },
    { id: 'canvas', Icon: IconCanvas, label: 'Canvas' },
  ];

  return (
    <div style={{ display: 'flex', background: '#f0ede8', borderRadius: 9, padding: 3, gap: 2 }}>
      {options.map(({ id, Icon, label }) => {
        const active = view === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            title={label}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 10px', borderRadius: 6, border: 'none',
              background: active ? '#fff' : 'transparent',
              color: active ? '#1a1814' : '#a09d97',
              cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 12, fontWeight: active ? 600 : 400,
              boxShadow: active ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            <Icon />
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Completed Tab Button ─────────────────────────────────────────────────────

function CompletedButton({ count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = '#e8f5e9';
          e.currentTarget.style.color = '#2e7d32';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = '#f0ede8';
          e.currentTarget.style.color = '#7a7570';
        }
      }}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '7px 13px', borderRadius: 9,
        border: 'none', cursor: 'pointer', fontFamily: 'inherit',
        fontSize: 12, fontWeight: active ? 700 : 500,
        background: active ? '#e8f5e9' : '#f0ede8',
        color: active ? '#2e7d32' : '#7a7570',
        boxShadow: active ? '0 0 0 1.5px #4caf50' : 'none',
        transition: 'all 0.15s',
      }}
    >
      <IconCheck />
      Concluídas
      {count > 0 && (
        <span
          style={{
            background: active ? '#4caf50' : '#a09d97',
            color: '#fff', borderRadius: 99, fontSize: 10,
            fontWeight: 700, padding: '1px 6px', lineHeight: 1.6,
            transition: 'background 0.15s',
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({
  task,
  groups = [],
  onUpdate,
  onDelete,
  onAddSubtask,
  onToggleSubtask,
  isDragging,
  dragHandleProps,
  viewMode,
  isCompletedView,
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [newSub, setNewSub] = useState('');
  const [addingSub, setAddingSub] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const saveTitle = async () => {
    setEditingTitle(false);
    if (title.trim() && title !== task.title) await onUpdate(task.id, { title });
  };

  const handleAddSub = async () => {
    if (!newSub.trim()) return;
    setAddingSub(true);
    await onAddSubtask(task.id, newSub.trim());
    setNewSub('');
    setAddingSub(false);
  };

  const taskGroupIds = Array.isArray(task.groups) ? task.groups : [];
  const assignedGroups = groups.filter(
    (g) => taskGroupIds.includes(g.id) || taskGroupIds.includes(String(g.id))
  );

  const done = task.subtasks?.filter((s) => s.completed).length || 0;
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
        style={{
          background: isCompletedView ? '#f9fdf9' : '#fff',
          borderRadius: 14, overflow: 'hidden',
          boxShadow: isDragging
            ? '0 20px 60px rgba(0,0,0,0.18)'
            : '0 2px 12px rgba(0,0,0,0.07)',
          border: isDragging
            ? '1.5px solid #2c2a26'
            : isCompletedView
              ? '1.5px solid #c8e6c9'
              : '1.5px solid #f0ede8',
          opacity: task._pending ? 0.6 : 1,
          transform: isDragging ? 'scale(1.02) rotate(0.8deg)' : 'scale(1)',
          transition: isDragging ? 'none' : 'box-shadow 0.2s, transform 0.15s, opacity 0.3s',
          userSelect: 'none',
          display: 'flex', flexDirection: 'column',
          width: viewMode === 'canvas' ? 270 : undefined,
        }}
      >
        {/* Cover image */}
        {coverImage && (
          <img
            src={coverImage} alt="capa"
            style={{ width: '100%', height: 110, objectFit: 'cover', display: 'block', flexShrink: 0 }}
          />
        )}

        {/* Completed banner */}
        {isCompletedView && (
          <div
            style={{
              background: '#e8f5e9', padding: '5px 14px',
              display: 'flex', alignItems: 'center', gap: 6,
              borderBottom: '1px solid #c8e6c9',
            }}
          >
            <span style={{ fontSize: 11, color: '#2e7d32', fontWeight: 600 }}>✓ Concluída</span>
          </div>
        )}

        <div style={{ padding: '14px 14px 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Group tags */}
          {assignedGroups.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
              {assignedGroups.map((g) => (
                <div
                  key={g.id}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    background: '#f5f3ef', borderRadius: 6,
                    padding: '2px 7px', fontSize: 10, fontWeight: 600, color: '#6b6760',
                  }}
                >
                  {g.photo_url ? (
                    <img
                      src={g.photo_url} alt={g.name}
                      style={{ width: 10, height: 10, borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: g.color || '#2c2a26' }} />
                  )}
                  {g.name}
                </div>
              ))}
            </div>
          )}

          {/* Saving badge */}
          {task._pending && (
            <div
              style={{
                fontSize: 10, color: '#a09d97', fontWeight: 500,
                marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#a09d97', display: 'inline-block' }} />
              Salvando...
            </div>
          )}

          {/* Title row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 2 }}>
            {!isCompletedView && (
              <div
                {...dragHandleProps}
                style={{
                  cursor: 'grab', color: '#c5c2bc', fontSize: 15,
                  flexShrink: 0, marginTop: 2, touchAction: 'none', lineHeight: 1,
                }}
              >
                ⠿
              </div>
            )}
            {editingTitle && !isCompletedView ? (
              <input
                value={title}
                autoFocus
                onChange={(e) => setTitle(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
                style={{
                  flex: 1, border: 'none', borderBottom: '2px solid #2c2a26',
                  fontSize: 14, fontWeight: 700, padding: '2px 0',
                  fontFamily: 'inherit', outline: 'none',
                  background: 'transparent', color: '#1a1814', boxSizing: 'border-box',
                }}
              />
            ) : (
              <div
                onDoubleClick={() => !isCompletedView && setEditingTitle(true)}
                style={{
                  fontSize: 14, fontWeight: 700,
                  color: isCompletedView ? '#5a7a5c' : '#1a1814',
                  lineHeight: 1.4,
                  cursor: isCompletedView ? 'default' : 'text',
                  flex: 1,
                  minWidth: 0,
                  textDecoration: isCompletedView ? 'line-through' : 'none',
                  textDecorationColor: '#a0c8a2',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  wordBreak: 'break-word',
                }}
              >
                {task.title}
              </div>
            )}
          </div>

          {/* Description */}
          {task.description && (
            <div
              style={{
                fontSize: 12, color: '#7a7570', lineHeight: 1.5,
                marginTop: 4, marginBottom: 4,
                display: '-webkit-box', WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical', overflow: 'hidden',
                paddingLeft: isCompletedView ? 0 : 21,
              }}
            >
              {task.description}
            </div>
          )}

          {/* Status toggle */}
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              marginTop: 8, marginBottom: 8,
              paddingLeft: isCompletedView ? 0 : 21,
            }}
          >
            <button
              onClick={() => onUpdate(task.id, { completed: !task.completed })}
              title={task.completed ? 'Reabrir tarefa' : 'Marcar como concluída'}
              onMouseEnter={(e) => {
                if (!task.completed) {
                  e.currentTarget.style.borderColor = '#4caf50';
                  e.currentTarget.style.background = '#e8f5e9';
                } else {
                  e.currentTarget.style.background = '#e57373';
                  e.currentTarget.style.borderColor = '#e57373';
                }
              }}
              onMouseLeave={(e) => {
                if (!task.completed) {
                  e.currentTarget.style.borderColor = '#d0ccc5';
                  e.currentTarget.style.background = 'transparent';
                } else {
                  e.currentTarget.style.background = '#4caf50';
                  e.currentTarget.style.borderColor = '#4caf50';
                }
              }}
              style={{
                flexShrink: 0, width: 20, height: 20, borderRadius: 6,
                border: `1.5px solid ${task.completed ? '#4caf50' : '#d0ccc5'}`,
                background: task.completed ? '#4caf50' : 'transparent',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, color: '#fff', transition: 'all 0.2s',
              }}
            >
              {task.completed ? '✓' : ''}
            </button>
            <span style={{ fontSize: 11, color: task.completed ? '#4caf50' : '#a09d97', fontWeight: 600 }}>
              {task.completed ? 'Concluída — clique para reabrir' : 'Em andamento'}
            </span>
          </div>

          {/* Progress bar */}
          {total > 0 && (
            <div style={{ marginBottom: 10, paddingLeft: isCompletedView ? 0 : 21 }}>
              <div
                style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: 11, color: '#a09d97', marginBottom: 4,
                }}
              >
                <span>Subtarefas</span>
                <span>{done}/{total}</span>
              </div>
              <div style={{ background: '#f0ede8', borderRadius: 99, height: 5, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%', borderRadius: 99,
                    width: `${progress}%`,
                    background: progress === 100 ? '#4caf50' : '#2c2a26',
                    transition: 'width 0.3s',
                  }}
                />
              </div>
            </div>
          )}

          {/* Expand toggle */}
          <div style={{ paddingLeft: isCompletedView ? 0 : 21 }}>
            <button
              onClick={() => setExpanded((e) => !e)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 11, color: '#a09d97', padding: 0,
                fontFamily: 'inherit', fontWeight: 500,
              }}
            >
              {expanded ? 'Fechar' : `Ver subtarefas${total > 0 ? ` (${total})` : ''}`}
            </button>
          </div>

          {/* Subtasks list */}
          {expanded && (
            <div style={{ marginTop: 10, paddingLeft: isCompletedView ? 0 : 21 }}>
              {task.subtasks?.map((sub) => (
                <div
                  key={sub.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '5px 0', borderTop: '1px solid #f0ede8',
                  }}
                >
                  <button
                    onClick={() => onToggleSubtask(sub)}
                    style={{
                      background: sub.completed ? '#4caf50' : 'transparent',
                      border: `1.5px solid ${sub.completed ? '#4caf50' : '#d0ccc5'}`,
                      borderRadius: 5, width: 17, height: 17,
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, color: '#fff', flexShrink: 0,
                    }}
                  >
                    {sub.completed ? '✓' : ''}
                  </button>
                  <span
                    style={{
                      fontSize: 12, flex: 1,
                      minWidth: 0,
                      color: sub.completed ? '#a09d97' : '#2c2a26',
                      textDecoration: sub.completed ? 'line-through' : 'none',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      wordBreak: 'break-word',
                    }}
                  >
                    {sub.title}
                  </span>
                </div>
              ))}

              {/* Add subtask input — hidden in completed view */}
              {!isCompletedView && (
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <input
                    placeholder="Nova subtarefa..."
                    value={newSub}
                    onChange={(e) => setNewSub(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSub()}
                    style={{
                      flex: 1, border: '1px solid #e2ddd6', borderRadius: 7,
                      padding: '6px 9px', fontSize: 12,
                      fontFamily: 'inherit', outline: 'none', background: '#faf9f7',
                    }}
                  />
                  <button
                    onClick={handleAddSub}
                    disabled={addingSub || !newSub.trim()}
                    style={{
                      background: '#2c2a26', color: '#fff', border: 'none',
                      borderRadius: 7, padding: '6px 10px',
                      cursor: 'pointer', fontSize: 12, fontWeight: 700,
                    }}
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex', justifyContent: 'flex-end',
            padding: '8px 14px 10px',
            borderTop: '1px solid #f5f3ef', marginTop: 10,
          }}
        >
          <button
            onClick={() => setConfirmDelete(true)}
            onMouseEnter={(e) => e.currentTarget.style.color = '#c0392b'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#c9a09a'}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 11, color: '#c9a09a', fontFamily: 'inherit',
              fontWeight: 500, padding: '2px 4px', borderRadius: 4,
              transition: 'color 0.15s',
            }}
          >
            Excluir
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Canvas Task Card ─────────────────────────────────────────────────────────

function CanvasTaskCard({ task, groups, onUpdate, onDelete, onAddSubtask, onToggleSubtask, onPositionChange, zoom }) {
  const cardRef = useRef(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const pos = useRef({ x: task._x, y: task._y });
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    pos.current = { x: task._x, y: task._y };
  }, [task._x, task._y]);

  const onMouseDown = (e) => {
    if (e.target.closest('button, input, textarea')) return;
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
    dragOffset.current = {
      x: e.clientX / zoom - pos.current.x,
      y: e.clientY / zoom - pos.current.y,
    };

    const onMove = (ev) => {
      pos.current = {
        x: ev.clientX / zoom - dragOffset.current.x,
        y: ev.clientY / zoom - dragOffset.current.y,
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

  return (
    <div
      ref={cardRef}
      onMouseDown={onMouseDown}
      style={{
        position: 'absolute',
        left: task._x,
        top: task._y,
        cursor: dragging ? 'grabbing' : 'grab',
        zIndex: dragging ? 100 : 1,
      }}
    >
      <TaskCard
        task={task}
        groups={groups}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onAddSubtask={onAddSubtask}
        onToggleSubtask={onToggleSubtask}
        isDragging={dragging}
        dragHandleProps={{}}
        viewMode="canvas"
      />
    </div>
  );
}

// ─── Completed View ───────────────────────────────────────────────────────────

function CompletedView({ tasks, groups, onUpdate, onDelete, onAddSubtask, onToggleSubtask }) {
  if (tasks.length === 0) {
    return (
      <div
        style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          width: '100%', flex: 1, gap: 12,
        }}
      >
        <div style={{ fontSize: 52, opacity: 0.13 }}></div>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#2c2a26' }}>
          Nenhuma tarefa concluída ainda
        </span>
        <span style={{ fontSize: 13, color: '#a09d97' }}>
          As tarefas concluídas aparecerão aqui
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1, overflowY: 'auto', padding: '20px',
        width: '100%', boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))',
          gap: 16, alignItems: 'start',
        }}
      >
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            groups={groups}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onAddSubtask={onAddSubtask}
            onToggleSubtask={onToggleSubtask}
            isDragging={false}
            dragHandleProps={{}}
            viewMode="grid"
            isCompletedView
          />
        ))}
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ onCreateClick }) {
  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        width: '100%', height: '100%', gap: 12,
      }}
    >
      <div style={{ fontSize: 48, opacity: 0.12, fontWeight: 900, color: '#2c2a26' }}>✓</div>
      <span style={{ fontSize: 16, fontWeight: 700, color: '#2c2a26' }}>
        Nenhuma tarefa neste workspace
      </span>
      <span style={{ fontSize: 13, color: '#a09d97' }}>
        Crie a primeira tarefa para este espaço
      </span>
      <button
        onClick={onCreateClick}
        style={{
          marginTop: 8, background: '#2c2a26', color: '#fff',
          border: 'none', borderRadius: 12, padding: '12px 28px',
          fontSize: 14, fontWeight: 700, cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(44,42,38,0.2)',
        }}
      >
        + Criar tarefa
      </button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function TasksView() {
  const [tasks, setTasks] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [view, setView] = useState(() => loadView());
  // 'active' = tarefas pendentes | 'completed' = concluídas
  const [tab, setTab] = useState('active');

  // Grid drag state
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Canvas state
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const panOrigin = useRef({ x: 0, y: 0 });
  const canvasRef = useRef(null);
  const MIN_ZOOM = 0.3;
  const MAX_ZOOM = 2;

  // Persist view preference
  useEffect(() => { saveView(view); }, [view]);

  // Reset to active tab when workspace changes
  const handleWorkspaceChange = (ws) => {
    setActiveWorkspace(ws);
    setTab('active');
  };

  // Initial data fetch
  useEffect(() => {
    (async () => {
      try {
        const [tasksRes, groupsRes] = await Promise.all([
          fetch(`${API}/tasks/`, { headers: authHeaders() }),
          fetch(`${API}/groups/`, { headers: authHeaders() }),
        ]);
        if (!tasksRes.ok) throw new Error();

        const data = await tasksRes.json();
        const groupsData = groupsRes.ok ? await groupsRes.json() : [];
        const savedOrder = loadOrder();
        const positions = loadPositions();

        let mapped = data.map((t, i) => {
          const rawGroups = t.groups || [];
          // Normaliza: grupos podem vir como objetos {id, name,...} ou como IDs diretos
          const grpIds = rawGroups.map((g) =>
            typeof g === 'object' && g !== null ? g.id : g
          );
          return {
            ...t,
            subtasks: t.subtasks || [],
            groups: grpIds, // sempre array de IDs
            isPessoal: t.is_personal ?? (grpIds.length === 0),
            _x: positions[t.id]?.x ?? 30 + (i % 4) * 290,
            _y: positions[t.id]?.y ?? 30 + Math.floor(i / 4) * 340,
          };
        });

        if (savedOrder.length > 0) {
          const orderMap = Object.fromEntries(savedOrder.map((id, i) => [id, i]));
          mapped = mapped.sort((a, b) => (orderMap[a.id] ?? 9999) - (orderMap[b.id] ?? 9999));
        }

        setTasks(mapped);
        setGroups(Array.isArray(groupsData) ? groupsData : []);
      } catch {
        setError('Erro ao carregar tarefas.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Workspace filter ────────────────────────────────────────────────────────

  const inWorkspace = (t) => {
    const tg = Array.isArray(t.groups) ? t.groups : [];

    // Normaliza os IDs do grupo da tarefa para string para comparação segura
    // A API pode retornar IDs como int ou string, e grupos podem ser objetos {id, name} ou IDs diretos
    const tgIds = tg.map((g) => String(typeof g === 'object' && g !== null ? g.id : g));

    if (activeWorkspace === null) {
      // Workspace "Pessoal": tarefas sem nenhum grupo OU marcadas como pessoal
      return t.is_personal === true || t.isPessoal === true || tgIds.length === 0;
    }

    // Workspace de grupo: tarefa pertence ao grupo se o ID está na lista
    return tgIds.includes(String(activeWorkspace));
  };

  const workspaceTasks = tasks.filter(inWorkspace);
  const activeTasks = workspaceTasks.filter((t) => !t.completed);
  const completedTasks = workspaceTasks.filter((t) => t.completed);

  // ── Grid drag handlers ──────────────────────────────────────────────────────

  const handleDragStart = (e, index) => {
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => setDragIndex(index), 0);
  };

  const handleDragEnter = (e, index) => {
    if (index !== dragIndex) setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      setTasks((prev) => {
        const visible = prev.filter((t) => inWorkspace(t) && !t.completed);
        const rest = prev.filter((t) => !visible.includes(t));
        const reordered = [...visible];
        const [moved] = reordered.splice(dragIndex, 1);
        reordered.splice(dragOverIndex, 0, moved);
        saveOrder(reordered.map((t) => t.id));
        return [...reordered, ...rest];
      });
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  // ── Canvas handlers ─────────────────────────────────────────────────────────

  const onCanvasMouseDown = (e) => {
    if (e.target !== canvasRef.current && !e.target.dataset.canvasBg) return;
    isPanning.current = true;
    panStart.current = { x: e.clientX, y: e.clientY };
    panOrigin.current = { ...pan };
  };

  const onCanvasMouseMove = (e) => {
    if (!isPanning.current) return;
    setPan({
      x: panOrigin.current.x + e.clientX - panStart.current.x,
      y: panOrigin.current.y + e.clientY - panStart.current.y,
    });
  };

  const onCanvasMouseUp = () => { isPanning.current = false; };

  useEffect(() => {
    if (view !== 'canvas') return;
    const handler = (e) => {
      if (!canvasRef.current?.contains(e.target)) return;
      e.preventDefault();
      setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * (e.deltaY > 0 ? 0.9 : 1.1))));
    };
    document.addEventListener('wheel', handler, { passive: false });
    return () => document.removeEventListener('wheel', handler);
  }, [view]);

  const getVisibleCenter = useCallback(() => {
    const vw = canvasRef.current?.clientWidth || window.innerWidth;
    const vh = canvasRef.current?.clientHeight || window.innerHeight;
    return {
      x: (vw / 2 - pan.x) / zoom - 135,
      y: (vh / 2 - pan.y) / zoom - 150,
    };
  }, [pan, zoom]);

  // ── CRUD ────────────────────────────────────────────────────────────────────

  const createTask = async (form) => {
    const tempId = `temp_${Date.now()}`;
    const center = getVisibleCenter();
    const positions = loadPositions();
    const x = positions[tempId]?.x ?? center.x;
    const y = positions[tempId]?.y ?? center.y;

    const optimistic = {
      id: tempId,
      title: form.title,
      description: form.description || '',
      completed: false,
      subtasks: [],
      groups: form.groups || [],
      isPessoal: form.isPessoal ?? true,
      images_data: [],
      _x: x, _y: y,
      _pending: true,
    };

    setTasks((prev) => [optimistic, ...prev]);

    try {
      const body = {
        title: form.title,
        description: form.description || '',
        completed: false,
        is_personal: form.isPessoal ?? true,
        ...(form.groups?.length > 0 ? { groups: form.groups } : {}),
      };

      const res = await fetch(`${API}/tasks/`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(body),
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

      setTasks((prev) =>
        prev.map((tk) =>
          tk.id === tempId
            ? {
              ...t,
              subtasks: t.subtasks || [],
              // Normaliza grupos da resposta da API (podem vir como objetos ou IDs)
              groups: (t.groups || form.groups || []).map((g) =>
                typeof g === 'object' && g !== null ? g.id : g
              ),
              isPessoal: t.is_personal ?? true,
              _x: x, _y: y,
              _pending: false,
            }
            : tk
        )
      );
    } catch {
      setTasks((prev) => prev.filter((tk) => tk.id !== tempId));
      setError('Erro ao criar tarefa.');
    }
  };

  const updateTask = async (id, data) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, ...data } : t));
    try {
      const res = await fetch(`${API}/tasks/${id}/`, {
        method: 'PATCH', headers: authHeaders(), body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      const u = await res.json();
      setTasks((prev) => prev.map((t) => t.id === id ? { ...t, ...u } : t));
    } catch {
      setError('Erro ao atualizar tarefa.');
    }
  };

  const deleteTask = async (id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    try {
      await fetch(`${API}/tasks/${id}/`, { method: 'DELETE', headers: authHeaders() });
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
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, subtasks: [...(t.subtasks || []), sub] } : t
        )
      );
    } catch {
      setError('Erro ao criar subtarefa.');
    }
  };

  const toggleSubtask = async (sub) => {
    setTasks((prev) =>
      prev.map((t) => ({
        ...t,
        subtasks: t.subtasks?.map((s) =>
          s.id === sub.id ? { ...s, completed: !sub.completed } : s
        ),
      }))
    );
    try {
      const res = await fetch(`${API}/tasks/subtasks/${sub.id}/`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ completed: !sub.completed }),
      });
      if (!res.ok) throw new Error();
      const u = await res.json();
      setTasks((prev) =>
        prev.map((t) => ({
          ...t,
          subtasks: t.subtasks?.map((s) => (s.id === sub.id ? u : s)),
        }))
      );
    } catch {
      // Revert optimistic update on failure
      setTasks((prev) =>
        prev.map((t) => ({
          ...t,
          subtasks: t.subtasks?.map((s) => (s.id === sub.id ? sub : s)),
        }))
      );
      setError('Erro ao atualizar subtarefa.');
    }
  };

  const handlePositionChange = useCallback((id, x, y) => {
    const positions = loadPositions();
    positions[id] = { x, y };
    savePositions(positions);
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, _x: x, _y: y } : t)));
  }, []);

  // ── Shared card props ───────────────────────────────────────────────────────

  const sharedCardProps = {
    groups,
    onUpdate: updateTask,
    onDelete: deleteTask,
    onAddSubtask: addSubtask,
    onToggleSubtask: toggleSubtask,
  };

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: '100%', color: '#a09d97', fontSize: 14,
        }}
      >
        Carregando tarefas...
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        height: '100%', width: '100%',
        display: 'flex', flexDirection: 'column',
        background: '#faf9f7', fontFamily: 'inherit', boxSizing: 'border-box',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          padding: '10px 20px', background: '#fff',
          borderBottom: '1px solid #e8e5e0',
          display: 'flex', alignItems: 'center', gap: 10,
          flexShrink: 0, flexWrap: 'wrap',
        }}
      >
        {error && (
          <span
            style={{
              fontSize: 12, color: '#c0392b',
              background: '#fdf0ee', padding: '5px 10px', borderRadius: 7,
            }}
          >
            {error}
          </span>
        )}

        <WorkspaceDropdown
          groups={groups}
          activeWorkspace={activeWorkspace}
          onChange={handleWorkspaceChange}
        />

        {/* View toggle — only shown on active tab */}
        {tab === 'active' && (
          <ViewToggle view={view} onChange={setView} />
        )}

        <div style={{ width: 1, height: 24, background: '#e8e5e0', flexShrink: 0 }} />

        {/* Completed tab button */}
        <CompletedButton
          count={completedTasks.length}
          active={tab === 'completed'}
          onClick={() => setTab(tab === 'completed' ? 'active' : 'completed')}
        />

        {/* New task button — hidden on completed tab */}
        {tab === 'active' ? (
          <button
            onClick={() => setShowModal(true)}
            style={{
              background: '#2c2a26', color: '#fff', border: 'none',
              borderRadius: 10, padding: '9px 18px',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              letterSpacing: '0.2px',
              boxShadow: '0 2px 8px rgba(44,42,38,0.15)',
              marginLeft: 'auto',
            }}
          >
            + Nova tarefa
          </button>
        ) : (
          <div style={{ marginLeft: 'auto' }} />
        )}
      </div>

      {/* ── Completed Tab ── */}
      {tab === 'completed' && (
        <CompletedView tasks={completedTasks} {...sharedCardProps} />
      )}

      {/* ── Active Tab — Grid ── */}
      {tab === 'active' && view === 'grid' && (
        <div
          style={{
            flex: 1, overflowY: 'auto', padding: '20px',
            width: '100%', boxSizing: 'border-box',
          }}
        >
          {activeTasks.length === 0 ? (
            <EmptyState onCreateClick={() => setShowModal(true)} />
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))',
                gap: 16, alignItems: 'start',
              }}
            >
              {activeTasks.map((task, index) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnter={(e) => handleDragEnter(e, index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  style={{
                    transition: 'transform 0.15s, opacity 0.15s',
                    transform:
                      dragOverIndex === index && dragIndex !== index
                        ? 'scale(1.02)'
                        : 'scale(1)',
                    opacity: dragIndex === index ? 0.4 : 1,
                    outline:
                      dragOverIndex === index && dragIndex !== index
                        ? '2px dashed #2c2a26'
                        : 'none',
                    borderRadius: 14,
                  }}
                >
                  <TaskCard
                    task={task}
                    {...sharedCardProps}
                    isDragging={dragIndex === index}
                    dragHandleProps={{ onMouseDown: (e) => e.stopPropagation() }}
                    viewMode="grid"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Active Tab — Canvas ── */}
      {tab === 'active' && view === 'canvas' && (
        <div
          ref={canvasRef}
          style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#faf9f7' }}
          onMouseDown={onCanvasMouseDown}
          onMouseMove={onCanvasMouseMove}
          onMouseUp={onCanvasMouseUp}
          onMouseLeave={onCanvasMouseUp}
        >
          {/* Dot-grid background */}
          <div
            data-canvas-bg="1"
            style={{
              position: 'absolute', inset: 0, zIndex: 0,
              backgroundImage: 'radial-gradient(circle, #d0cdc8 1px, transparent 1px)',
              backgroundSize: `${28 * zoom}px ${28 * zoom}px`,
              backgroundPosition: `${pan.x % (28 * zoom)}px ${pan.y % (28 * zoom)}px`,
              pointerEvents: 'none',
            }}
          />

          {/* Zoom controls */}
          <div
            style={{
              position: 'absolute', bottom: 20, right: 20, zIndex: 50,
              display: 'flex', flexDirection: 'column', gap: 6,
            }}
          >
            {[
              { label: '+', action: () => setZoom((z) => Math.min(MAX_ZOOM, z * 1.15)), title: 'Zoom in' },
              { label: `${Math.round(zoom * 100)}%`, action: () => { setPan({ x: 0, y: 0 }); setZoom(1); }, title: 'Resetar', small: true },
              { label: '−', action: () => setZoom((z) => Math.max(MIN_ZOOM, z * 0.85)), title: 'Zoom out' },
            ].map(({ label, action, title, small }) => (
              <button
                key={label}
                onClick={action}
                title={title}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  border: '1.5px solid #e2ddd6', background: '#fff',
                  fontSize: small ? 10 : 16, fontWeight: 700,
                  cursor: 'pointer', color: '#2c2a26',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.07)', fontFamily: 'inherit',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Canvas content */}
          {activeTasks.length === 0 ? (
            <div
              style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 12, pointerEvents: 'none',
              }}
            >
              <div style={{ fontSize: 48, opacity: 0.12, fontWeight: 900, color: '#2c2a26' }}>✓</div>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#2c2a26' }}>
                Nenhuma tarefa neste workspace
              </span>
              <span style={{ fontSize: 13, color: '#a09d97' }}>
                Crie a primeira tarefa para este espaço
              </span>
              <button
                onClick={() => setShowModal(true)}
                style={{
                  pointerEvents: 'all', marginTop: 8,
                  background: '#2c2a26', color: '#fff',
                  border: 'none', borderRadius: 12, padding: '12px 28px',
                  fontSize: 14, fontWeight: 700, cursor: 'pointer',
                }}
              >
                + Criar tarefa
              </button>
            </div>
          ) : (
            <div
              style={{
                position: 'absolute', top: 0, left: 0,
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: '0 0', willChange: 'transform',
              }}
            >
              {activeTasks.map((task) => (
                <CanvasTaskCard
                  key={task.id}
                  task={task}
                  {...sharedCardProps}
                  onPositionChange={handlePositionChange}
                  zoom={zoom}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Create Task Modal ── */}
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

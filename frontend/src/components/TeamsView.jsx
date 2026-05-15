import { useState } from "react";

const COLORS = [
  { name: "Índigo", bg: "#E8E7FF", text: "#4338CA", dot: "#6366F1" },
  { name: "Esmeralda", bg: "#D1FAE5", text: "#065F46", dot: "#10B981" },
  { name: "Rosa", bg: "#FCE7F3", text: "#9D174D", dot: "#EC4899" },
  { name: "Âmbar", bg: "#FEF3C7", text: "#92400E", dot: "#F59E0B" },
  { name: "Céu", bg: "#DBEAFE", text: "#1E40AF", dot: "#3B82F6" },
  { name: "Coral", bg: "#FEE2E2", text: "#991B1B", dot: "#EF4444" },
  { name: "Violeta", bg: "#EDE9FE", text: "#5B21B6", dot: "#8B5CF6" },
  { name: "Lima", bg: "#ECFCCB", text: "#365314", dot: "#84CC16" },
];

const INITIAL_TEAMS = [
  
];

function Avatar({ initials, color, size = 36 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: color.bg, color: color.text,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.35, fontWeight: 600, flexShrink: 0,
      border: `1.5px solid ${color.dot}22`,
    }}>
      {initials}
    </div>
  );
}

function ColorPicker({ selected, onChange }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {COLORS.map((c) => (
        <button
          key={c.name}
          onClick={() => onChange(c)}
          title={c.name}
          style={{
            width: 28, height: 28, borderRadius: "50%",
            background: c.dot, border: selected.name === c.name ? "3px solid #1a1a1a" : "3px solid transparent",
            cursor: "pointer", outline: "none", transition: "transform 0.15s",
          }}
          onMouseEnter={e => e.target.style.transform = "scale(1.2)"}
          onMouseLeave={e => e.target.style.transform = "scale(1)"}
        />
      ))}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: 16,
    }} onClick={onClose}>
      <div style={{
        background: "#fff", borderRadius: 16, padding: "28px 32px",
        width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        maxHeight: "90vh", overflowY: "auto",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <span style={{ fontSize: 17, fontWeight: 600, color: "#111" }}>{title}</span>
          <button onClick={onClose} style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 20, color: "#888", padding: 4, lineHeight: 1,
          }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#444", marginBottom: 6 }}>{label}</label>}
      <input style={{
        width: "100%", padding: "10px 14px", borderRadius: 10,
        border: "1px solid #E5E7EB", fontSize: 14, color: "#111",
        outline: "none", boxSizing: "border-box", background: "#FAFAFA",
        transition: "border 0.15s",
      }}
        onFocus={e => e.target.style.border = "1px solid #6366F1"}
        onBlur={e => e.target.style.border = "1px solid #E5E7EB"}
        {...props}
      />
    </div>
  );
}

function Btn({ children, variant = "primary", onClick, style = {} }) {
  const base = {
    padding: "10px 20px", borderRadius: 10, fontWeight: 500, fontSize: 14,
    cursor: "pointer", border: "none", transition: "opacity 0.15s, transform 0.1s",
    ...style,
  };
  const variants = {
    primary: { background: "#111", color: "#fff" },
    ghost: { background: "#F3F4F6", color: "#374151", border: "1px solid #E5E7EB" },
    danger: { background: "#FEE2E2", color: "#991B1B" },
    colored: {},
  };
  return (
    <button style={{ ...base, ...variants[variant] }} onClick={onClick}
      onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
      onMouseLeave={e => e.currentTarget.style.opacity = "1"}
    >{children}</button>
  );
}

function InviteLink({ teamName, color }) {
  const [copied, setCopied] = useState(false);
  const link = `https://app.exemplo.com/convite/${teamName.toLowerCase().replace(/\s/g, "-")}-x7k2p`;
  const copy = () => {
    navigator.clipboard?.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div style={{ marginTop: 8 }}>
      <label style={{ fontSize: 13, fontWeight: 500, color: "#444", display: "block", marginBottom: 8 }}>
        Link de convite
      </label>
      <div style={{
        display: "flex", gap: 8, alignItems: "center",
        background: "#F3F4F6", borderRadius: 10, padding: "10px 14px",
        border: "1px solid #E5E7EB",
      }}>
        <span style={{ fontSize: 13, color: "#6B7280", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {link}
        </span>
        <button onClick={copy} style={{
          background: copied ? color.bg : "#fff", color: copied ? color.text : "#374151",
          border: `1px solid ${copied ? color.dot : "#D1D5DB"}`, borderRadius: 8,
          padding: "5px 12px", fontSize: 12, fontWeight: 500, cursor: "pointer",
          flexShrink: 0, transition: "all 0.2s",
        }}>
          {copied ? "✓ Copiado" : "Copiar"}
        </button>
      </div>
    </div>
  );
}

function TeamCard({ team, onSelect, onEdit }) {
  return (
    <div
      onClick={() => onSelect(team)}
      style={{
        background: "#fff", borderRadius: 14, padding: "20px 22px",
        border: "1px solid #F0F0F0", cursor: "pointer",
        transition: "box-shadow 0.2s, transform 0.15s",
        position: "relative",
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.08)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: team.color.bg, display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 20, flexShrink: 0,
          border: `1.5px solid ${team.color.dot}33`,
        }}>
          <span style={{ color: team.color.dot, fontWeight: 700, fontSize: 16 }}>
            {team.name.charAt(0)}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontWeight: 600, fontSize: 15, color: "#111" }}>{team.name}</span>
            <span style={{
              background: team.color.bg, color: team.color.text,
              borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 500,
            }}>
              {team.members.length} {team.members.length === 1 ? "membro" : "membros"}
            </span>
          </div>
          <p style={{ fontSize: 13, color: "#888", margin: 0, lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {team.description || "Sem descrição"}
          </p>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onEdit(team); }}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#aaa", fontSize: 18, flexShrink: 0 }}
          title="Editar equipe"
        >⋯</button>
      </div>
      <div style={{ marginTop: 16, display: "flex", gap: -8 }}>
        {team.members.slice(0, 5).map((m, i) => (
          <div key={m.id} style={{ marginLeft: i === 0 ? 0 : -8 }}>
            <Avatar initials={m.avatar} color={team.color} size={28} />
          </div>
        ))}
        {team.members.length > 5 && (
          <div style={{
            width: 28, height: 28, borderRadius: "50%", background: "#F3F4F6",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, color: "#888", fontWeight: 600, marginLeft: -8,
            border: "2px solid #fff",
          }}>+{team.members.length - 5}</div>
        )}
      </div>
    </div>
  );
}

function TeamDetail({ team, onBack, onUpdate }) {
  const [showInviteUser, setShowInviteUser] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [members, setMembers] = useState(team.members);

  const addMember = () => {
    if (!inviteEmail.trim()) return;
    const name = inviteEmail.split("@")[0].replace(/\./g, " ");
    const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    const newM = { id: Date.now(), name, email: inviteEmail, role: inviteRole, avatar: initials };
    const updated = [...members, newM];
    setMembers(updated);
    onUpdate({ ...team, members: updated });
    setInviteEmail("");
    setShowInviteUser(false);
  };

  const toggleRole = (id) => {
    const updated = members.map(m => m.id === id ? { ...m, role: m.role === "admin" ? "member" : "admin" } : m);
    setMembers(updated);
    onUpdate({ ...team, members: updated });
  };

  const removeMember = (id) => {
    const updated = members.filter(m => m.id !== id);
    setMembers(updated);
    onUpdate({ ...team, members: updated });
  };

  return (
    <div>
      <button onClick={onBack} style={{
        background: "none", border: "none", cursor: "pointer",
        fontSize: 14, color: "#888", padding: "0 0 20px 0",
        display: "flex", alignItems: "center", gap: 6,
      }}>
        ← Voltar para equipes
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14, background: team.color.bg,
          display: "flex", alignItems: "center", justifyContent: "center",
          border: `2px solid ${team.color.dot}44`,
        }}>
          <span style={{ color: team.color.dot, fontWeight: 700, fontSize: 22 }}>{team.name.charAt(0)}</span>
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#111" }}>{team.name}</h2>
          <p style={{ margin: "2px 0 0", fontSize: 14, color: "#888" }}>{team.description}</p>
        </div>
      </div>

      <div style={{ marginTop: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontWeight: 600, fontSize: 15, color: "#111" }}>
            Membros · {members.length}
          </span>
          <Btn onClick={() => setShowInviteUser(true)}>+ Adicionar pessoa</Btn>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {members.map(m => (
            <div key={m.id} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
              borderRadius: 10, transition: "background 0.15s",
            }}
              onMouseEnter={e => e.currentTarget.style.background = "#F9F9F9"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <Avatar initials={m.avatar} color={team.color} size={38} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "#111" }}>{m.name}</p>
                <p style={{ margin: 0, fontSize: 12, color: "#999" }}>{m.email}</p>
              </div>
              <button onClick={() => toggleRole(m.id)} style={{
                background: m.role === "admin" ? team.color.bg : "#F3F4F6",
                color: m.role === "admin" ? team.color.text : "#888",
                border: "none", borderRadius: 20, padding: "4px 14px",
                fontSize: 12, fontWeight: 500, cursor: "pointer",
              }}>
                {m.role === "admin" ? "Admin" : "Membro"}
              </button>
              <button onClick={() => removeMember(m.id)} style={{
                background: "none", border: "none", cursor: "pointer",
                color: "#ddd", fontSize: 16, padding: 4,
                transition: "color 0.15s",
              }}
                onMouseEnter={e => e.target.style.color = "#EF4444"}
                onMouseLeave={e => e.target.style.color = "#ddd"}
              >✕</button>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: 28, padding: "20px 20px", background: "#FAFAFA",
          borderRadius: 12, border: "1px dashed #E5E7EB",
        }}>
          <InviteLink teamName={team.name} color={team.color} />
        </div>
      </div>

      {showInviteUser && (
        <Modal title="Adicionar pessoa" onClose={() => setShowInviteUser(false)}>
          <Input
            label="E-mail ou usuário"
            placeholder="email@exemplo.com"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addMember()}
          />
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: "#444", display: "block", marginBottom: 8 }}>Papel</label>
            <div style={{ display: "flex", gap: 8 }}>
              {["member", "admin"].map(r => (
                <button key={r} onClick={() => setInviteRole(r)} style={{
                  flex: 1, padding: "10px", borderRadius: 10, cursor: "pointer",
                  border: `1.5px solid ${inviteRole === r ? team.color.dot : "#E5E7EB"}`,
                  background: inviteRole === r ? team.color.bg : "#fff",
                  color: inviteRole === r ? team.color.text : "#888",
                  fontWeight: inviteRole === r ? 600 : 400, fontSize: 14,
                  transition: "all 0.15s",
                }}>
                  {r === "member" ? "Membro" : "Admin"}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setShowInviteUser(false)}>Cancelar</Btn>
            <Btn onClick={addMember}>Enviar convite</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function CreateTeamModal({ onClose, onCreate }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLORS[0]);

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreate({ name: name.trim(), description: description.trim(), color });
    onClose();
  };

  return (
    <Modal title="Criar nova equipe" onClose={onClose}>
      <Input label="Nome da equipe" placeholder="Escolha um nome" value={name} onChange={e => setName(e.target.value)} />
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 13, fontWeight: 500, color: "#444", display: "block", marginBottom: 6 }}>
          Descrição <span style={{ color: "#aaa", fontWeight: 400 }}>(opcional)</span>
        </label>
        <textarea
          placeholder="Do que essa equipe se trata?"
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          style={{
            width: "100%", padding: "10px 14px", borderRadius: 10,
            border: "1px solid #E5E7EB", fontSize: 14, color: "#111",
            outline: "none", resize: "none", boxSizing: "border-box",
            background: "#FAFAFA", fontFamily: "inherit",
          }}
          onFocus={e => e.target.style.border = "1px solid #6366F1"}
          onBlur={e => e.target.style.border = "1px solid #E5E7EB"}
        />
      </div>
      <div style={{ marginBottom: 24 }}>
        <label style={{ fontSize: 13, fontWeight: 500, color: "#444", display: "block", marginBottom: 10 }}>Cor</label>
        <ColorPicker selected={color} onChange={setColor} />
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: color.bg,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: `2px solid ${color.dot}44`,
          }}>
            <span style={{ color: color.dot, fontWeight: 700, fontSize: 14 }}>{name.charAt(0) || "E"}</span>
          </div>
          <span style={{ fontSize: 13, color: "#888" }}>Prévia do ícone</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={handleCreate}>Criar equipe</Btn>
      </div>
    </Modal>
  );
}

export default function TeamsView() {
  const [teams, setTeams] = useState(INITIAL_TEAMS);
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = teams.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = ({ name, description, color }) => {
    setTeams([...teams, { id: Date.now(), name, description, color, members: [] }]);
  };

  const handleUpdate = (updated) => {
    setTeams(teams.map(t => t.id === updated.id ? updated : t));
    if (selected?.id === updated.id) setSelected(updated);
  };

  const totalMembers = [...new Set(teams.flatMap(t => t.members.map(m => m.email)))].length;

  return (
    <div style={{ padding: "32px 40px", maxWidth: 900, margin: "0 auto", fontFamily: "inherit" }}>

      {selected ? (
        <TeamDetail
          team={selected}
          onBack={() => setSelected(null)}
          onUpdate={handleUpdate}
        />
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 700, color: "#111", margin: "0 0 6px" }}>Equipes</h1>
              <p style={{ fontSize: 14, color: "#888", margin: 0 }}>
                {teams.length} equipes · {totalMembers} {totalMembers === 1 ? "pessoa" : "pessoas"}
              </p>
            </div>
            <Btn onClick={() => setShowCreate(true)}>+ Nova equipe</Btn>
          </div>

          <div style={{ position: "relative", marginBottom: 28 }}>
            <span style={{
              position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
              fontSize: 16, color: "#aaa", pointerEvents: "none",
            }}>⌕</span>
            <input
              placeholder="Buscar equipes…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: "100%", padding: "11px 14px 11px 38px", borderRadius: 12,
                border: "1px solid #E5E7EB", fontSize: 14, color: "#111",
                outline: "none", background: "#FAFAFA", boxSizing: "border-box",
              }}
              onFocus={e => e.target.style.border = "1px solid #6366F1"}
              onBlur={e => e.target.style.border = "1px solid #E5E7EB"}
            />
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#aaa" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}></div>
              <p style={{ margin: 0, fontSize: 14 }}>Nenhuma equipe encontrada</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {filtered.map(team => (
                <TeamCard
                  key={team.id}
                  team={team}
                  onSelect={setSelected}
                  onEdit={t => { setSelected(t); }}
                />
              ))}
            </div>
          )}
        </>
      )}

      {showCreate && (
        <CreateTeamModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />
      )}
    </div>
  );
}
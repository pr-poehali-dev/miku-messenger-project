import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";

interface Group { id: number; name: string; description?: string; avatar_url?: string; owner_id?: number; invite_code?: string; member_count?: number; }

interface GroupsViewProps {
  user: Record<string, unknown> | null;
  onOpenChat: (type: "group", id: number, name: string, avatar?: string) => void;
}

export default function GroupsView({ user, onOpenChat }: GroupsViewProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"my" | "explore">("my");
  const [publicGroups, setPublicGroups] = useState<Group[]>([]);
  const [searchQ, setSearchQ] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [creating, setCreating] = useState(false);

  const loadMy = useCallback(async () => {
    if (!user) return;
    const res = await api.getGroups();
    if (res.groups) setGroups(res.groups);
    setLoading(false);
  }, [user]);

  const loadPublic = useCallback(async () => {
    const res = await api.getPublicGroups(searchQ);
    if (res.groups) setPublicGroups(res.groups);
  }, [searchQ]);

  useEffect(() => { loadMy(); }, [loadMy]);
  useEffect(() => { if (tab === "explore") loadPublic(); }, [tab, loadPublic]);

  const createGroup = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const res = await api.createGroup({ name: newName.trim(), description: newDesc.trim() });
    if (res.group) {
      toast.success(`Группа "${newName}" создана!`);
      setGroups(prev => [...prev, { ...res.group, member_count: 1 }]);
      setShowCreate(false);
      setNewName(""); setNewDesc("");
    } else {
      toast.error("Ошибка создания группы");
    }
    setCreating(false);
  };

  const joinGroup = async () => {
    if (!inviteCode.trim()) return;
    const res = await api.joinGroup(inviteCode.trim());
    if (res.group) {
      toast.success(`Вступил в группу "${res.group.name}"!`);
      setShowJoin(false);
      setInviteCode("");
      loadMy();
    } else {
      toast.error(res.error || "Группа не найдена");
    }
  };

  const joinPublic = async (group: Group) => {
    if (!group.invite_code) return;
    const res = await api.joinGroup(group.invite_code);
    if (res.group) {
      toast.success(`Вступил в "${group.name}"!`);
      loadMy();
      setTab("my");
    } else toast.error("Ошибка вступления");
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--miku-panel)" }}>
      <div style={{ padding: "20px 20px 0", borderBottom: "1px solid rgba(0,212,232,0.08)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ color: "#e0f7ff", fontWeight: 800, fontSize: 18, margin: 0 }}>Группы</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <ActionBtn icon="UserPlus" label="Вступить" onClick={() => setShowJoin(true)} />
            <ActionBtn icon="Plus" label="Создать" onClick={() => setShowCreate(true)} primary />
          </div>
        </div>

        <div style={{ display: "flex", gap: 4 }}>
          {(["my", "explore"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "8px 16px", borderRadius: "10px 10px 0 0", border: "none", cursor: "pointer",
              background: tab === t ? "rgba(0,212,232,0.1)" : "transparent",
              color: tab === t ? "#00d4e8" : "rgba(0,212,232,0.4)",
              fontWeight: 700, fontSize: 13, fontFamily: "'Nunito',sans-serif",
              borderBottom: tab === t ? "2px solid #00d4e8" : "2px solid transparent",
              transition: "all 0.2s",
            }}>
              {t === "my" ? "Мои группы" : "Найти группу"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {tab === "explore" && (
          <div style={{ marginBottom: 12, position: "relative" }}>
            <Icon name="Search" size={14} />
            <input
              value={searchQ}
              onChange={e => { setSearchQ(e.target.value); loadPublic(); }}
              placeholder="Поиск групп..."
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "9px 12px 9px 36px",
                background: "rgba(0,212,232,0.04)", border: "1px solid rgba(0,212,232,0.12)",
                borderRadius: 10, color: "#e0f7ff", fontSize: 13, outline: "none",
              }}
            />
            <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "rgba(0,212,232,0.4)", pointerEvents: "none" }}>
              <Icon name="Search" size={14} />
            </div>
          </div>
        )}

        {loading && tab === "my" ? (
          <Loader />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(tab === "my" ? groups : publicGroups).map((g, i) => (
              <div
                key={g.id}
                className="animate-fade-in"
                style={{ animationDelay: `${i * 0.05}s` }}
                onClick={() => tab === "my"
                  ? onOpenChat("group", g.id, g.name, g.avatar_url)
                  : joinPublic(g)
                }
              >
                <GroupCard group={g} isJoined={tab === "my"} />
              </div>
            ))}
            {tab === "my" && groups.length === 0 && (
              <Empty icon="👥" title="Нет групп" sub="Создай или вступи в группу" />
            )}
            {tab === "explore" && publicGroups.length === 0 && (
              <Empty icon="🔍" title="Ничего не найдено" sub="Попробуй другой запрос" />
            )}
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <Modal title="Новая группа" onClose={() => setShowCreate(false)}>
          <label style={labelStyle}>Название</label>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Название группы" style={inputStyle} />
          <label style={{ ...labelStyle, marginTop: 12 }}>Описание</label>
          <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Необязательно" rows={3}
            style={{ ...inputStyle, resize: "none" }} />
          <ModalBtn label={creating ? "Создаём..." : "Создать группу"} onClick={createGroup} disabled={creating || !newName.trim()} />
        </Modal>
      )}

      {/* Join modal */}
      {showJoin && (
        <Modal title="Вступить в группу" onClose={() => setShowJoin(false)}>
          <label style={labelStyle}>Код приглашения</label>
          <input value={inviteCode} onChange={e => setInviteCode(e.target.value)} placeholder="Введи код" style={inputStyle} />
          <ModalBtn label="Вступить" onClick={joinGroup} disabled={!inviteCode.trim()} />
        </Modal>
      )}
    </div>
  );
}

function GroupCard({ group, isJoined }: { group: { id: number; name: string; description?: string; avatar_url?: string; member_count?: number }; isJoined: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: "12px 14px", borderRadius: 14, cursor: "pointer",
        background: hov ? "rgba(0,212,232,0.06)" : "rgba(13,31,56,0.5)",
        border: "1px solid rgba(0,212,232,0.08)",
        display: "flex", alignItems: "center", gap: 12,
        transition: "all 0.2s",
        transform: hov ? "translateX(3px)" : "translateX(0)",
      }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: group.avatar_url ? "transparent" : "linear-gradient(135deg,#00d4e8,#0ea5e9)",
        overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
        border: "2px solid rgba(0,212,232,0.2)",
      }}>
        {group.avatar_url
          ? <img src={group.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
          : <Icon name="Users" size={20} />
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "#e0f7ff", fontWeight: 700, fontSize: 14 }}>{group.name}</div>
        {group.description && <div style={{ color: "rgba(0,212,232,0.4)", fontSize: 12, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{group.description}</div>}
      </div>
      <div style={{ color: "rgba(0,212,232,0.3)", fontSize: 11, display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
        <Icon name="Users" size={12} />
        {group.member_count || 0}
      </div>
      {!isJoined && (
        <div style={{ padding: "4px 10px", background: "rgba(0,212,232,0.1)", border: "1px solid rgba(0,212,232,0.2)", borderRadius: 8, color: "#00d4e8", fontSize: 12, fontWeight: 700 }}>
          Вступить
        </div>
      )}
    </div>
  );
}

function ActionBtn({ icon, label, onClick, primary }: { icon: string; label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button onClick={onClick} style={{
      padding: "7px 12px", border: primary ? "none" : "1px solid rgba(0,212,232,0.2)",
      borderRadius: 10, cursor: "pointer",
      background: primary ? "linear-gradient(135deg,#00d4e8,#0ea5e9)" : "rgba(0,212,232,0.06)",
      color: primary ? "#060e1a" : "#00d4e8",
      fontFamily: "'Nunito',sans-serif", fontWeight: 700, fontSize: 12,
      display: "flex", alignItems: "center", gap: 5,
      transition: "all 0.2s",
    }}>
      <Icon name={icon} size={13} />
      {label}
    </button>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }} />
      <div onClick={e => e.stopPropagation()} style={{
        position: "relative", width: "100%", maxWidth: 380, margin: "0 20px",
        background: "rgba(10,22,40,0.98)", border: "1px solid rgba(0,212,232,0.2)",
        borderRadius: 20, padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
        animation: "slideUp 0.3s cubic-bezier(0.16,1,0.3,1)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ color: "#e0f7ff", fontWeight: 800, fontSize: 16, margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(0,212,232,0.4)", padding: 4 }}>
            <Icon name="X" size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(0,212,232,0.6)", marginBottom: 6, textTransform: "uppercase" };
const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "10px 14px", background: "rgba(0,212,232,0.04)", border: "1px solid rgba(0,212,232,0.15)", borderRadius: 10, color: "#e0f7ff", fontSize: 14, outline: "none", fontFamily: "'Nunito',sans-serif" };

function ModalBtn({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: "100%", padding: "12px 0", marginTop: 16, border: "none", borderRadius: 12,
      background: disabled ? "rgba(0,212,232,0.1)" : "linear-gradient(135deg,#00d4e8,#0ea5e9)",
      color: disabled ? "rgba(0,212,232,0.4)" : "#060e1a",
      fontWeight: 800, fontSize: 14, cursor: disabled ? "not-allowed" : "pointer",
      fontFamily: "'Nunito',sans-serif",
      boxShadow: disabled ? "none" : "0 4px 16px rgba(0,212,232,0.25)",
      transition: "all 0.2s",
    }}>{label}</button>
  );
}

function Loader() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
      <div style={{ width: 20, height: 20, border: "2px solid rgba(0,212,232,0.2)", borderTopColor: "#00d4e8", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function Empty({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div style={{ textAlign: "center", padding: 48, color: "rgba(0,212,232,0.3)" }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontWeight: 600, fontSize: 14 }}>{title}</div>
      <div style={{ fontSize: 12, marginTop: 4 }}>{sub}</div>
    </div>
  );
}

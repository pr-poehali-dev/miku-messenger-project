import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";

interface Channel { id: number; name: string; description?: string; avatar_url?: string; owner_id?: number; invite_code?: string; subscribers_count?: number; }

interface ChannelsViewProps {
  user: Record<string, unknown> | null;
  onOpenChat: (type: "channel", id: number, name: string, avatar?: string) => void;
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(0,212,232,0.6)", marginBottom: 6, textTransform: "uppercase" };
const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "10px 14px", background: "rgba(0,212,232,0.04)", border: "1px solid rgba(0,212,232,0.15)", borderRadius: 10, color: "#e0f7ff", fontSize: 14, outline: "none", fontFamily: "'Nunito',sans-serif" };

export default function ChannelsView({ user, onOpenChat }: ChannelsViewProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [explore, setExplore] = useState<Channel[]>([]);
  const [tab, setTab] = useState<"my" | "explore">("my");
  const [searchQ, setSearchQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  const loadMy = useCallback(async () => {
    if (!user) return;
    const res = await api.getChannels();
    if (res.channels) setChannels(res.channels);
    setLoading(false);
  }, [user]);

  const loadExplore = useCallback(async () => {
    const res = await api.exploreChannels(searchQ);
    if (res.channels) setExplore(res.channels);
  }, [searchQ]);

  useEffect(() => { loadMy(); }, [loadMy]);
  useEffect(() => { if (tab === "explore") loadExplore(); }, [tab, loadExplore]);

  const createChannel = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const res = await api.createChannel({ name: newName.trim(), description: newDesc.trim() });
    if (res.channel) {
      toast.success(`Канал "${newName}" создан!`);
      setChannels(prev => [...prev, { ...res.channel, subscribers_count: 1 }]);
      setShowCreate(false); setNewName(""); setNewDesc("");
    } else toast.error("Ошибка создания");
    setCreating(false);
  };

  const subscribe = async (ch: Channel) => {
    const isMy = channels.some(c => c.id === ch.id);
    const res = await api.subscribeChannel(ch.id, isMy ? "unsubscribe" : "subscribe");
    if (res.ok) {
      toast.success(isMy ? "Отписались" : `Подписались на "${ch.name}"!`);
      loadMy();
      loadExplore();
    }
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--miku-panel)" }}>
      <div style={{ padding: "20px 20px 0", borderBottom: "1px solid rgba(0,212,232,0.08)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ color: "#e0f7ff", fontWeight: 800, fontSize: 18, margin: 0 }}>Каналы</h2>
          <button onClick={() => setShowCreate(true)} style={{
            padding: "7px 14px", border: "none", borderRadius: 10, cursor: "pointer",
            background: "linear-gradient(135deg,#00d4e8,#0ea5e9)",
            color: "#060e1a", fontFamily: "'Nunito',sans-serif", fontWeight: 700, fontSize: 12,
            display: "flex", alignItems: "center", gap: 5,
          }}>
            <Icon name="Plus" size={13} /> Создать
          </button>
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
              {t === "my" ? "Мои каналы" : "Найти канал"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {tab === "explore" && (
          <div style={{ marginBottom: 12, position: "relative" }}>
            <input
              value={searchQ}
              onChange={e => { setSearchQ(e.target.value); loadExplore(); }}
              placeholder="Поиск каналов..."
              style={inputStyle}
            />
          </div>
        )}

        {loading && tab === "my" ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
            <div style={{ width: 20, height: 20, border: "2px solid rgba(0,212,232,0.2)", borderTopColor: "#00d4e8", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(tab === "my" ? channels : explore).map((ch, i) => {
              const isMy = channels.some(c => c.id === ch.id);
              return (
                <div key={ch.id} className="animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                  <ChannelCard
                    channel={ch}
                    isMy={isMy}
                    onOpen={() => onOpenChat("channel", ch.id, ch.name, ch.avatar_url)}
                    onSubscribe={() => subscribe(ch)}
                  />
                </div>
              );
            })}
            {tab === "my" && channels.length === 0 && <Empty icon="📻" title="Нет каналов" sub="Создай или найди канал" />}
            {tab === "explore" && explore.length === 0 && <Empty icon="🔍" title="Ничего нет" sub="Попробуй другой запрос" />}
          </div>
        )}
      </div>

      {showCreate && (
        <div style={{ position: "absolute", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setShowCreate(false)}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }} />
          <div onClick={e => e.stopPropagation()} style={{
            position: "relative", width: "100%", maxWidth: 380, margin: "0 20px",
            background: "rgba(10,22,40,0.98)", border: "1px solid rgba(0,212,232,0.2)",
            borderRadius: 20, padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
            animation: "slideUp 0.3s cubic-bezier(0.16,1,0.3,1)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ color: "#e0f7ff", fontWeight: 800, fontSize: 16, margin: 0 }}>Новый канал</h3>
              <button onClick={() => setShowCreate(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(0,212,232,0.4)" }}>
                <Icon name="X" size={18} />
              </button>
            </div>
            <label style={labelStyle}>Название</label>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Название канала" style={inputStyle} />
            <label style={{ ...labelStyle, marginTop: 12 }}>Описание</label>
            <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Необязательно" rows={3} style={{ ...inputStyle, resize: "none" }} />
            <button onClick={createChannel} disabled={creating || !newName.trim()} style={{
              width: "100%", padding: "12px 0", marginTop: 16, border: "none", borderRadius: 12,
              background: creating ? "rgba(0,212,232,0.1)" : "linear-gradient(135deg,#00d4e8,#0ea5e9)",
              color: creating ? "rgba(0,212,232,0.4)" : "#060e1a",
              fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "'Nunito',sans-serif",
            }}>
              {creating ? "Создаём..." : "Создать канал"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ChannelCard({ channel, isMy, onOpen, onSubscribe }: { channel: Channel; isMy: boolean; onOpen: () => void; onSubscribe: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        padding: "12px 14px", borderRadius: 14,
        background: hov ? "rgba(0,212,232,0.06)" : "rgba(13,31,56,0.5)",
        border: "1px solid rgba(0,212,232,0.08)",
        display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
        transition: "all 0.2s", transform: hov ? "translateX(3px)" : "translateX(0)",
      }}
      onClick={isMy ? onOpen : onSubscribe}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: "linear-gradient(135deg,#0ea5e9,#3b82f6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        border: "2px solid rgba(0,212,232,0.2)",
        overflow: "hidden",
      }}>
        {channel.avatar_url
          ? <img src={channel.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
          : <Icon name="Radio" size={20} />
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "#e0f7ff", fontWeight: 700, fontSize: 14 }}>{channel.name}</div>
        {channel.description && <div style={{ color: "rgba(0,212,232,0.4)", fontSize: 12, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{channel.description}</div>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
        <div style={{ color: "rgba(0,212,232,0.3)", fontSize: 11, display: "flex", alignItems: "center", gap: 3 }}>
          <Icon name="Users" size={11} /> {channel.subscribers_count || 0}
        </div>
        <div style={{
          padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700,
          background: isMy ? "rgba(0,212,232,0.1)" : "rgba(0,212,232,0.15)",
          color: isMy ? "#00d4e8" : "#00d4e8",
          border: "1px solid rgba(0,212,232,0.2)",
        }}>
          {isMy ? "Читать" : "Подписаться"}
        </div>
      </div>
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

import { useState, useEffect, useCallback } from "react";
import { api, auth } from "@/lib/api";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";

interface Conversation {
  id: number;
  other_user: { id: number; username: string; display_name: string; avatar_url?: string; is_verified?: boolean; is_online?: boolean };
  is_blocked?: boolean;
  last_message?: string;
  last_message_at?: string;
}

interface DMViewProps {
  user: Record<string, unknown> | null;
  onOpenChat: (type: "dm", id: number, name: string, avatar?: string) => void;
}

export default function DMView({ user, onOpenChat }: DMViewProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: number; username: string; display_name: string; avatar_url?: string; is_verified?: boolean }[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [contextMenu, setContextMenu] = useState<{ conv: Conversation; x: number; y: number } | null>(null);

  const load = useCallback(async () => {
    const res = await api.getConversations();
    if (res.conversations) setConversations(res.conversations);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (search.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      const res = await auth.searchUsers(search);
      setSearchResults(res.users || []);
      setSearching(false);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const openDM = async (userId: number, username: string, displayName: string, avatarUrl?: string) => {
    const res = await api.openDM(userId);
    if (res.conversation_id) {
      setSearch("");
      setSearchResults([]);
      onOpenChat("dm", res.conversation_id, displayName || username, avatarUrl);
      load();
    } else {
      toast.error("Ошибка открытия чата");
    }
  };

  const handleBlock = async (conv: Conversation) => {
    await api.blockDM(conv.id);
    toast.success("Пользователь заблокирован");
    setContextMenu(null);
    load();
  };

  const handleClear = async (conv: Conversation) => {
    await api.clearDM(conv.id);
    toast.success("Чат очищен");
    setContextMenu(null);
  };

  const formatTime = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("ru", { day: "numeric", month: "short" });
  };

  if (!user) return (
    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(0,212,232,0.3)" }}>
      <div>Войдите для доступа к сообщениям</div>
    </div>
  );

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--miku-panel)" }}
      onClick={() => setContextMenu(null)}
    >
      {/* Header */}
      <div style={{ padding: "20px 20px 12px", borderBottom: "1px solid rgba(0,212,232,0.08)" }}>
        <h2 style={{ color: "#e0f7ff", fontWeight: 800, fontSize: 18, margin: "0 0 14px" }}>
          Сообщения
        </h2>
        {/* Search */}
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(0,212,232,0.4)", pointerEvents: "none" }}>
            <Icon name="Search" size={15} />
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Найти по юзернейму..."
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "10px 12px 10px 38px",
              background: "rgba(0,212,232,0.04)", border: "1px solid rgba(0,212,232,0.12)",
              borderRadius: 12, color: "#e0f7ff", fontSize: 13, outline: "none",
              transition: "border-color 0.2s",
            }}
            onFocus={e => (e.target as HTMLInputElement).style.borderColor = "rgba(0,212,232,0.35)"}
            onBlur={e => (e.target as HTMLInputElement).style.borderColor = "rgba(0,212,232,0.12)"}
          />
          {searching && (
            <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }}>
              <div style={{ width: 14, height: 14, border: "2px solid rgba(0,212,232,0.2)", borderTopColor: "#00d4e8", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
            </div>
          )}
        </div>

        {/* Search results */}
        {searchResults.length > 0 && (
          <div style={{
            marginTop: 8, background: "rgba(10,22,40,0.98)",
            border: "1px solid rgba(0,212,232,0.15)", borderRadius: 12,
            overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}>
            {searchResults.map(u => (
              <div key={u.id} onClick={() => openDM(u.id, u.username, u.display_name || u.username, u.avatar_url)}
                style={{
                  padding: "10px 14px", display: "flex", alignItems: "center", gap: 10,
                  cursor: "pointer", transition: "background 0.15s",
                }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "rgba(0,212,232,0.06)"}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: "50%",
                  background: "linear-gradient(135deg,#00d4e8,#0ea5e9)",
                  overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  {u.avatar_url
                    ? <img src={u.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
                    : <span style={{ color: "#060e1a", fontWeight: 800, fontSize: 13 }}>{(u.display_name || u.username)[0]?.toUpperCase()}</span>
                  }
                </div>
                <div>
                  <div style={{ color: "#e0f7ff", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 5 }}>
                    {u.display_name || u.username}
                    {u.is_verified && <span style={{ color: "#00d4e8", fontSize: 12 }}>✓</span>}
                  </div>
                  <div style={{ color: "rgba(0,212,232,0.4)", fontSize: 11 }}>@{u.username}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Conversations list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px" }}>
        {loading && (
          <div style={{ display: "flex", justifyContent: "center", padding: 32, color: "rgba(0,212,232,0.3)" }}>
            <div style={{ width: 20, height: 20, border: "2px solid rgba(0,212,232,0.2)", borderTopColor: "#00d4e8", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          </div>
        )}
        {!loading && conversations.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: "rgba(0,212,232,0.3)" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>💬</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Нет диалогов</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Найди пользователя через поиск</div>
          </div>
        )}
        {conversations.map((conv, i) => (
          <div
            key={conv.id}
            onClick={() => onOpenChat("dm", conv.id, conv.other_user.display_name || conv.other_user.username, conv.other_user.avatar_url)}
            onContextMenu={e => { e.preventDefault(); setContextMenu({ conv, x: e.clientX, y: e.clientY }); }}
            className="animate-fade-in"
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 12px", borderRadius: 14, cursor: "pointer",
              transition: "background 0.2s",
              animationDelay: `${i * 0.04}s`,
              opacity: conv.is_blocked ? 0.4 : 1,
            }}
            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "rgba(0,212,232,0.06)"}
            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
          >
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div style={{
                width: 44, height: 44, borderRadius: "50%",
                background: "linear-gradient(135deg,#00d4e8,#0ea5e9)",
                overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
                border: "2px solid rgba(0,212,232,0.2)",
              }}>
                {conv.other_user.avatar_url
                  ? <img src={conv.other_user.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
                  : <span style={{ color: "#060e1a", fontWeight: 800, fontSize: 15 }}>{(conv.other_user.display_name || conv.other_user.username)[0]?.toUpperCase()}</span>
                }
              </div>
              <div style={{
                position: "absolute", bottom: 0, right: 0,
                width: 12, height: 12, borderRadius: "50%",
                background: conv.other_user.is_online ? "#22c55e" : "#4b5563",
                border: "2px solid var(--miku-panel)",
              }} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#e0f7ff", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 4 }}>
                  {conv.other_user.display_name || conv.other_user.username}
                  {conv.other_user.is_verified && <span style={{ color: "#00d4e8", fontSize: 13 }}>✓</span>}
                </span>
                <span style={{ color: "rgba(0,212,232,0.3)", fontSize: 11, flexShrink: 0, marginLeft: 8 }}>
                  {formatTime(conv.last_message_at)}
                </span>
              </div>
              <div style={{ color: "rgba(0,212,232,0.4)", fontSize: 12, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {conv.last_message || "Нет сообщений"}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div style={{
          position: "fixed", left: contextMenu.x, top: contextMenu.y, zIndex: 9999,
          background: "rgba(10,22,40,0.98)", border: "1px solid rgba(0,212,232,0.2)",
          borderRadius: 12, overflow: "hidden", minWidth: 180,
          boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
          animation: "scaleIn 0.15s ease",
        }}>
          {[
            { label: "Открыть чат", icon: "MessageCircle", action: () => { onOpenChat("dm", contextMenu.conv.id, contextMenu.conv.other_user.display_name || contextMenu.conv.other_user.username, contextMenu.conv.other_user.avatar_url); setContextMenu(null); } },
            { label: "Очистить чат", icon: "Trash2", action: () => handleClear(contextMenu.conv) },
            { label: "Заблокировать", icon: "Ban", action: () => handleBlock(contextMenu.conv), danger: true },
          ].map(item => (
            <div key={item.label} onClick={item.action} style={{
              padding: "10px 14px", display: "flex", alignItems: "center", gap: 10,
              cursor: "pointer", color: item.danger ? "#ff6b6b" : "#e0f7ff", fontSize: 13, fontWeight: 600,
              transition: "background 0.15s",
            }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = item.danger ? "rgba(255,107,107,0.08)" : "rgba(0,212,232,0.06)"}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
            >
              <Icon name={item.icon} size={15} />
              {item.label}
            </div>
          ))}
        </div>
      )}
      <style>{`@keyframes scaleIn{from{opacity:0;transform:scale(0.9)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
}

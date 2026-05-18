import { useState, useEffect, useRef, useCallback } from "react";
import { api, fileToBase64 } from "@/lib/api";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";
import UserHoverCard from "./UserHoverCard";

const EMOJIS = ["❤️","😂","😮","😢","😡","👍","🔥","🎵","💎","✨","🌸","🎀","🎭","🎪","🎂"];

interface Message {
  id: number; sender_id: number; content: string;
  media_url?: string; media_type?: string; created_at: string;
  sender: { username: string; display_name: string; avatar_url?: string; is_verified?: boolean };
  reactions: { emoji: string; count: number; reacted: boolean }[];
}

interface ChatViewProps {
  type: "group" | "channel" | "dm";
  id: number; name: string; avatar?: string;
  user: Record<string, unknown> | null;
  onClose: () => void;
}

export default function ChatView({ type, id, name, avatar, user, onClose }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [emojiTarget, setEmojiTarget] = useState<number | null>(null);
  const [hoverUser, setHoverUser] = useState<{ username: string; x: number; y: number } | null>(null);
  const [recording, setRecording] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const lastIdRef = useRef<number>(0);

  const getChatParam = () => {
    if (type === "group") return { group_id: String(id) };
    if (type === "channel") return { channel_id: String(id) };
    return { dm_id: String(id) };
  };

  const loadMessages = useCallback(async () => {
    const res = await api.getMessages(getChatParam());
    if (res.messages) {
      setMessages(res.messages);
      if (res.messages.length > 0) lastIdRef.current = res.messages[res.messages.length - 1].id;
    }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, id]);

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    loadMessages();
    pollRef.current = setInterval(loadMessages, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);
    const param = getChatParam();
    const body: Record<string, unknown> = { content: text, ...Object.fromEntries(Object.entries(param).map(([k, v]) => [k, Number(v)])) };
    const res = await api.sendMessage(body);
    if (res.message) {
      setMessages(prev => [...prev, res.message]);
    }
    setSending(false);
  };

  const sendFile = async (file: File) => {
    const b64 = await fileToBase64(file);
    const isImg = file.type.startsWith("image/");
    const res = await api.upload(b64, file.type, "media");
    if (res.url) {
      const param = getChatParam();
      const body: Record<string, unknown> = {
        content: "", media_url: res.url, media_type: isImg ? "image" : "file",
        ...Object.fromEntries(Object.entries(param).map(([k, v]) => [k, Number(v)]))
      };
      const msgRes = await api.sendMessage(body);
      if (msgRes.message) setMessages(prev => [...prev, msgRes.message]);
    } else {
      toast.error("Ошибка загрузки файла");
    }
  };

  const react = async (messageId: number, emoji: string) => {
    setEmojiTarget(null);
    await api.react(messageId, emoji);
    await loadMessages();
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
  };

  const isOwn = (msg: Message) => msg.sender_id === (user?.id as number);

  const canWrite = type !== "channel" || (user && true);

  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column",
      background: "var(--miku-dark)",
    }}>
      {/* Header */}
      <div style={{
        padding: "0 20px", height: 60, flexShrink: 0,
        display: "flex", alignItems: "center", gap: 12,
        background: "rgba(10,22,40,0.95)",
        borderBottom: "1px solid rgba(0,212,232,0.1)",
        backdropFilter: "blur(20px)",
      }}>
        <button onClick={onClose} style={{
          background: "transparent", border: "none", cursor: "pointer",
          color: "rgba(0,212,232,0.5)", padding: 6, borderRadius: 8,
          transition: "color 0.2s, background 0.2s",
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#00d4e8"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,212,232,0.08)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(0,212,232,0.5)"; (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
        >
          <Icon name="ArrowLeft" size={18} />
        </button>

        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: avatar ? "transparent" : "linear-gradient(135deg,#00d4e8,#0ea5e9)",
          border: "2px solid rgba(0,212,232,0.3)", overflow: "hidden",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          {avatar
            ? <img src={avatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
            : <Icon name={type === "channel" ? "Radio" : type === "group" ? "Users" : "User"} size={16} />
          }
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "#e0f7ff", fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", gap: 6 }}>
            {name}
            {type === "channel" && <span style={{ fontSize: 10, color: "#00d4e8", background: "rgba(0,212,232,0.1)", padding: "1px 6px", borderRadius: 20, fontWeight: 700 }}>КАНАЛ</span>}
          </div>
          <div style={{ color: "rgba(0,212,232,0.4)", fontSize: 12 }}>
            {type === "group" ? "Группа" : type === "channel" ? "Канал" : "Личные сообщения"}
          </div>
        </div>

        <div style={{ display: "flex", gap: 4 }}>
          {["Phone", "Video", "Search"].map(ic => (
            <button key={ic} style={{
              width: 36, height: 36, borderRadius: 10, border: "none",
              background: "rgba(0,212,232,0.06)", cursor: "pointer",
              color: "rgba(0,212,232,0.5)", transition: "all 0.2s",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,212,232,0.12)"; (e.currentTarget as HTMLButtonElement).style.color = "#00d4e8"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,212,232,0.06)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(0,212,232,0.5)"; }}
              onClick={() => toast.info(ic === "Phone" ? "Звонок скоро будет доступен" : "Видеозвонок скоро")}
            >
              <Icon name={ic} size={16} />
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "16px 20px",
        display: "flex", flexDirection: "column", gap: 2,
      }}>
        {loading && (
          <div style={{ display: "flex", justifyContent: "center", padding: 40, color: "rgba(0,212,232,0.3)" }}>
            <div style={{ width: 24, height: 24, border: "2px solid rgba(0,212,232,0.2)", borderTopColor: "#00d4e8", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div style={{ textAlign: "center", padding: 60, color: "rgba(0,212,232,0.3)" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎵</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Начни разговор!</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Пока сообщений нет</div>
          </div>
        )}
        {messages.map((msg, i) => {
          const own = isOwn(msg);
          const showAvatar = !own && (i === 0 || messages[i - 1].sender_id !== msg.sender_id);
          const grouped = !own && i > 0 && messages[i - 1].sender_id === msg.sender_id;
          return (
            <div key={msg.id} className="msg-enter" style={{
              display: "flex", gap: 10, justifyContent: own ? "flex-end" : "flex-start",
              marginTop: grouped ? 2 : 12, position: "relative",
            }}>
              {!own && (
                <div style={{ width: 36, flexShrink: 0, display: "flex", alignItems: "flex-end" }}>
                  {showAvatar && (
                    <div
                      onMouseEnter={e => {
                        const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                        setHoverUser({ username: msg.sender.username, x: r.right + 8, y: r.top });
                      }}
                      onMouseLeave={() => setTimeout(() => setHoverUser(null), 200)}
                      style={{
                        width: 36, height: 36, borderRadius: "50%",
                        background: "linear-gradient(135deg,#00d4e8,#0ea5e9)",
                        border: "2px solid rgba(0,212,232,0.25)", overflow: "hidden",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", flexShrink: 0,
                      }}>
                      {msg.sender.avatar_url
                        ? <img src={msg.sender.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
                        : <span style={{ color: "#060e1a", fontWeight: 800, fontSize: 13 }}>{msg.sender.display_name?.[0]?.toUpperCase()}</span>
                      }
                    </div>
                  )}
                </div>
              )}

              <div style={{ maxWidth: "70%", minWidth: 0 }}>
                {showAvatar && !own && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span style={{ color: "#00d4e8", fontWeight: 700, fontSize: 13 }}>
                      {msg.sender.display_name || msg.sender.username}
                    </span>
                    {msg.sender.is_verified && (
                      <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#00d4e8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Icon name="Check" size={8} />
                      </div>
                    )}
                    <span style={{ color: "rgba(0,212,232,0.3)", fontSize: 11 }}>{formatTime(msg.created_at)}</span>
                  </div>
                )}

                <div style={{ position: "relative" }}
                  onMouseEnter={() => setEmojiTarget(msg.id)}
                  onMouseLeave={() => setEmojiTarget(null)}
                >
                  <div style={{
                    padding: msg.media_url ? "4px" : "10px 14px",
                    borderRadius: own ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    background: own
                      ? "linear-gradient(135deg, rgba(0,212,232,0.2), rgba(14,165,233,0.15))"
                      : "rgba(13,31,56,0.9)",
                    border: own
                      ? "1px solid rgba(0,212,232,0.25)"
                      : "1px solid rgba(0,212,232,0.1)",
                    color: "#e0f7ff", fontSize: 14, lineHeight: 1.5,
                    wordBreak: "break-word",
                    boxShadow: own ? "0 2px 12px rgba(0,212,232,0.1)" : "none",
                  }}>
                    {msg.media_url && msg.media_type === "image" && (
                      <img src={msg.media_url} style={{
                        maxWidth: 300, maxHeight: 300, borderRadius: 12,
                        display: "block", objectFit: "cover",
                      }} alt="media" />
                    )}
                    {msg.content && <span>{msg.content}</span>}
                    {own && (
                      <span style={{ fontSize: 10, color: "rgba(0,212,232,0.4)", marginLeft: 8, float: "right", marginTop: 2 }}>
                        {formatTime(msg.created_at)}
                      </span>
                    )}
                  </div>

                  {/* Emoji picker on hover */}
                  {emojiTarget === msg.id && (
                    <div style={{
                      position: "absolute", [own ? "right" : "left"]: 0, bottom: "calc(100% + 4px)",
                      background: "rgba(10,22,40,0.98)", border: "1px solid rgba(0,212,232,0.2)",
                      borderRadius: 12, padding: "6px 8px",
                      display: "flex", gap: 4, flexWrap: "wrap", maxWidth: 220,
                      backdropFilter: "blur(20px)",
                      boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
                      animation: "scaleIn 0.15s ease",
                      zIndex: 5,
                    }}>
                      {EMOJIS.map(em => (
                        <button key={em} onClick={() => react(msg.id, em)} style={{
                          background: "transparent", border: "none", cursor: "pointer",
                          fontSize: 18, padding: "2px 4px", borderRadius: 6,
                          transition: "transform 0.15s, background 0.15s",
                        }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.3)"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,212,232,0.1)"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                        >{em}</button>
                      ))}
                    </div>
                  )}

                  {/* Reactions */}
                  {msg.reactions.length > 0 && (
                    <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                      {msg.reactions.map(r => (
                        <div key={r.emoji} onClick={() => react(msg.id, r.emoji)} style={{
                          display: "flex", alignItems: "center", gap: 3,
                          background: r.reacted ? "rgba(0,212,232,0.15)" : "rgba(255,255,255,0.05)",
                          border: `1px solid ${r.reacted ? "rgba(0,212,232,0.3)" : "rgba(255,255,255,0.08)"}`,
                          borderRadius: 20, padding: "2px 8px", cursor: "pointer",
                          fontSize: 13, transition: "all 0.2s",
                        }}>
                          <span>{r.emoji}</span>
                          <span style={{ color: r.reacted ? "#00d4e8" : "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 700 }}>{r.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {canWrite && (
        <div style={{
          padding: "12px 20px", flexShrink: 0,
          background: "rgba(10,22,40,0.95)",
          borderTop: "1px solid rgba(0,212,232,0.08)",
        }}>
          <div style={{
            display: "flex", gap: 10, alignItems: "flex-end",
            background: "rgba(0,212,232,0.04)",
            border: "1px solid rgba(0,212,232,0.12)",
            borderRadius: 16, padding: "8px 8px 8px 16px",
            transition: "border-color 0.2s",
          }}
            onFocus={() => { }}
          >
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
              onChange={async e => {
                const f = e.target.files?.[0];
                if (f) await sendFile(f);
                e.target.value = "";
              }}
            />
            <button onClick={() => fileRef.current?.click()} style={{
              background: "transparent", border: "none", cursor: "pointer",
              color: "rgba(0,212,232,0.4)", padding: 4, borderRadius: 8,
              transition: "color 0.2s",
            }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = "#00d4e8"}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = "rgba(0,212,232,0.4)"}
            >
              <Icon name="Image" size={18} />
            </button>

            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Напиши сообщение... (Enter для отправки)"
              rows={1}
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                color: "#e0f7ff", fontSize: 14, resize: "none", lineHeight: 1.5,
                fontFamily: "'Nunito', sans-serif", paddingTop: 4,
                maxHeight: 120, overflowY: "auto",
              }}
            />

            <button
              onClick={send}
              disabled={!input.trim() || sending}
              style={{
                width: 36, height: 36, borderRadius: 10, border: "none",
                background: input.trim() ? "linear-gradient(135deg,#00d4e8,#0ea5e9)" : "rgba(0,212,232,0.06)",
                cursor: input.trim() ? "pointer" : "not-allowed",
                color: input.trim() ? "#060e1a" : "rgba(0,212,232,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.2s", flexShrink: 0,
                boxShadow: input.trim() ? "0 4px 12px rgba(0,212,232,0.25)" : "none",
              }}
            >
              <Icon name="Send" size={16} />
            </button>
          </div>
        </div>
      )}

      {hoverUser && (
        <UserHoverCard
          username={hoverUser.username}
          x={hoverUser.x}
          y={hoverUser.y}
          onClose={() => setHoverUser(null)}
        />
      )}
      <style>{`@keyframes scaleIn{from{opacity:0;transform:scale(0.85)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
}

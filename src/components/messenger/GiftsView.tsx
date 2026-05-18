import { useState, useEffect } from "react";
import { api, auth } from "@/lib/api";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";

interface Gift {
  id: number;
  name: string;
  description: string;
  character_name: string;
  price_rub: number;
  rarity: "common" | "rare" | "epic" | "legendary";
  emoji: string;
}

interface GiftsViewProps {
  user: Record<string, unknown> | null;
}

const RARITY_CONFIG = {
  common:    { label: "Обычный",    color: "#9ca3af", bg: "rgba(156,163,175,0.1)", border: "rgba(156,163,175,0.2)", glow: "none" },
  rare:      { label: "Редкий",     color: "#60a5fa", bg: "rgba(96,165,250,0.1)",  border: "rgba(96,165,250,0.25)", glow: "0 0 12px rgba(96,165,250,0.2)" },
  epic:      { label: "Эпический",  color: "#a78bfa", bg: "rgba(167,139,250,0.1)", border: "rgba(167,139,250,0.25)", glow: "0 0 16px rgba(167,139,250,0.25)" },
  legendary: { label: "Легендарный",color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.3)", glow: "0 0 20px rgba(245,158,11,0.3)" },
};

export default function GiftsView({ user }: GiftsViewProps) {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [tab, setTab] = useState<"shop" | "received">("shop");
  const [received, setReceived] = useState<{ id: number; gift: Gift; message: string; created_at: string; sender: { username: string; display_name: string } }[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendModal, setSendModal] = useState<Gift | null>(null);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: number; username: string; display_name: string }[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<{ id: number; username: string; display_name: string } | null>(null);
  const [giftMessage, setGiftMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [filterRarity, setFilterRarity] = useState<string>("all");

  useEffect(() => {
    api.getGifts().then(res => {
      if (res.gifts) setGifts(res.gifts);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (tab === "received" && user?.id) {
      api.getReceivedGifts(user.id as number).then(res => {
        if (res.received) setReceived(res.received);
      });
    }
  }, [tab, user]);

  useEffect(() => {
    if (recipientSearch.length < 2) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      const res = await auth.searchUsers(recipientSearch);
      setSearchResults(res.users || []);
    }, 350);
    return () => clearTimeout(t);
  }, [recipientSearch]);

  const sendGift = async () => {
    if (!sendModal || !selectedRecipient) return;
    setSending(true);
    const res = await api.sendGift(sendModal.id, selectedRecipient.id, giftMessage);
    if (res.ok) {
      toast.success(`Подарок "${sendModal.name}" отправлен ${selectedRecipient.display_name || selectedRecipient.username}! 🎁`);
      setSendModal(null);
      setSelectedRecipient(null);
      setGiftMessage("");
      setRecipientSearch("");
    } else {
      toast.error("Ошибка отправки");
    }
    setSending(false);
  };

  const filtered = filterRarity === "all" ? gifts : gifts.filter(g => g.rarity === filterRarity);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--miku-panel)" }}>
      {/* Header */}
      <div style={{ padding: "20px 20px 0", borderBottom: "1px solid rgba(0,212,232,0.08)" }}>
        <h2 style={{ color: "#e0f7ff", fontWeight: 800, fontSize: 18, margin: "0 0 4px" }}>Подарки</h2>
        <p style={{ color: "rgba(0,212,232,0.4)", fontSize: 12, margin: "0 0 16px" }}>
          Персонажи Project Sekai — подари кому-нибудь!
        </p>
        <div style={{ display: "flex", gap: 4 }}>
          {(["shop", "received"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "8px 18px", borderRadius: "10px 10px 0 0", border: "none", cursor: "pointer",
              background: tab === t ? "rgba(0,212,232,0.1)" : "transparent",
              color: tab === t ? "#00d4e8" : "rgba(0,212,232,0.4)",
              fontWeight: 700, fontSize: 13, fontFamily: "'Nunito',sans-serif",
              borderBottom: tab === t ? "2px solid #00d4e8" : "2px solid transparent",
              transition: "all 0.2s",
            }}>
              {t === "shop" ? "🛍 Магазин" : "📬 Полученные"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {tab === "shop" && (
          <>
            {/* Rarity filter */}
            <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
              {["all", "common", "rare", "epic", "legendary"].map(r => {
                const cfg = r === "all" ? { label: "Все", color: "#00d4e8", bg: "rgba(0,212,232,0.1)", border: "rgba(0,212,232,0.2)" } : RARITY_CONFIG[r as keyof typeof RARITY_CONFIG];
                return (
                  <button key={r} onClick={() => setFilterRarity(r)} style={{
                    padding: "5px 12px", borderRadius: 20, border: `1px solid ${filterRarity === r ? cfg.border : "rgba(0,212,232,0.1)"}`,
                    background: filterRarity === r ? cfg.bg : "transparent",
                    color: filterRarity === r ? cfg.color : "rgba(0,212,232,0.3)",
                    fontWeight: 700, fontSize: 11, cursor: "pointer",
                    fontFamily: "'Nunito',sans-serif", transition: "all 0.2s",
                  }}>
                    {cfg.label}
                  </button>
                );
              })}
            </div>

            {loading ? (
              <Spinner />
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {filtered.map((gift, i) => (
                  <GiftCard key={gift.id} gift={gift} index={i} onSend={() => setSendModal(gift)} />
                ))}
              </div>
            )}
          </>
        )}

        {tab === "received" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {received.length === 0 ? (
              <div style={{ textAlign: "center", padding: 60, color: "rgba(0,212,232,0.3)" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🎁</div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Подарков пока нет</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Твои друзья могут подарить персонажей из Project Sekai</div>
              </div>
            ) : received.map((r, i) => {
              const cfg = r.gift ? RARITY_CONFIG[r.gift.rarity] : RARITY_CONFIG.common;
              return (
                <div key={r.id} className="animate-fade-in" style={{
                  animationDelay: `${i * 0.06}s`,
                  padding: "14px 16px", borderRadius: 16,
                  background: cfg.bg, border: `1px solid ${cfg.border}`,
                  boxShadow: cfg.glow, display: "flex", gap: 14, alignItems: "center",
                }}>
                  <div style={{ fontSize: 40, lineHeight: 1 }}>{r.gift?.emoji || "🎁"}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: cfg.color, fontWeight: 800, fontSize: 14 }}>{r.gift?.name}</div>
                    <div style={{ color: "rgba(0,212,232,0.5)", fontSize: 11, marginTop: 2 }}>
                      от <span style={{ color: "#00d4e8" }}>{r.sender?.display_name || r.sender?.username}</span>
                    </div>
                    {r.message && <div style={{ color: "rgba(224,247,255,0.6)", fontSize: 12, marginTop: 6, fontStyle: "italic" }}>"{r.message}"</div>}
                  </div>
                  <div style={{ color: "rgba(0,212,232,0.3)", fontSize: 10, flexShrink: 0 }}>
                    {new Date(r.created_at).toLocaleDateString("ru")}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Send gift modal */}
      {sendModal && (
        <div style={{ position: "absolute", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setSendModal(null)}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(10px)" }} />
          <div onClick={e => e.stopPropagation()} style={{
            position: "relative", width: "100%", maxWidth: 400, margin: "0 16px",
            background: "rgba(8,18,35,0.99)", border: `1px solid ${RARITY_CONFIG[sendModal.rarity].border}`,
            borderRadius: 20, padding: 28,
            boxShadow: `0 20px 60px rgba(0,0,0,0.7), ${RARITY_CONFIG[sendModal.rarity].glow}`,
            animation: "slideUp 0.35s cubic-bezier(0.16,1,0.3,1)",
          }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 56, marginBottom: 8, animation: "float 2s ease-in-out infinite" }}>{sendModal.emoji}</div>
              <div style={{ color: RARITY_CONFIG[sendModal.rarity].color, fontWeight: 800, fontSize: 16 }}>{sendModal.name}</div>
              <div style={{ color: "rgba(0,212,232,0.4)", fontSize: 12, marginTop: 4 }}>{sendModal.character_name}</div>
              <div style={{ marginTop: 8, display: "inline-block", padding: "3px 12px", borderRadius: 20, background: RARITY_CONFIG[sendModal.rarity].bg, color: RARITY_CONFIG[sendModal.rarity].color, fontSize: 11, fontWeight: 700, border: `1px solid ${RARITY_CONFIG[sendModal.rarity].border}` }}>
                {RARITY_CONFIG[sendModal.rarity].label} · {sendModal.price_rub} ₽
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={lbl}>Кому подарить</label>
              {selectedRecipient ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "rgba(0,212,232,0.06)", border: "1px solid rgba(0,212,232,0.2)", borderRadius: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#00d4e8,#0ea5e9)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ color: "#060e1a", fontWeight: 800, fontSize: 11 }}>{selectedRecipient.display_name[0]?.toUpperCase()}</span>
                  </div>
                  <span style={{ color: "#00d4e8", fontWeight: 700, fontSize: 13, flex: 1 }}>{selectedRecipient.display_name || selectedRecipient.username}</span>
                  <button onClick={() => { setSelectedRecipient(null); setRecipientSearch(""); }} style={{ background: "transparent", border: "none", color: "rgba(0,212,232,0.4)", cursor: "pointer", padding: 4 }}>
                    <Icon name="X" size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <input value={recipientSearch} onChange={e => setRecipientSearch(e.target.value)}
                    placeholder="Введи юзернейм..." style={inp} />
                  {searchResults.length > 0 && (
                    <div style={{ marginTop: 4, background: "rgba(10,22,40,0.98)", border: "1px solid rgba(0,212,232,0.15)", borderRadius: 10, overflow: "hidden" }}>
                      {searchResults.slice(0, 4).map(u => (
                        <div key={u.id} onClick={() => { setSelectedRecipient(u); setRecipientSearch(""); setSearchResults([]); }}
                          style={{ padding: "9px 14px", cursor: "pointer", color: "#e0f7ff", fontSize: 13, display: "flex", alignItems: "center", gap: 8, transition: "background 0.15s" }}
                          onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "rgba(0,212,232,0.06)"}
                          onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
                        >
                          <div style={{ width: 24, height: 24, borderRadius: "50%", background: "linear-gradient(135deg,#00d4e8,#0ea5e9)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ color: "#060e1a", fontWeight: 800, fontSize: 10 }}>{(u.display_name || u.username)[0]?.toUpperCase()}</span>
                          </div>
                          {u.display_name || u.username} <span style={{ color: "rgba(0,212,232,0.4)", fontSize: 11 }}>@{u.username}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>Сообщение (необязательно)</label>
              <textarea value={giftMessage} onChange={e => setGiftMessage(e.target.value)}
                placeholder="Напиши что-нибудь..." rows={2}
                style={{ ...inp, resize: "none" }} />
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setSendModal(null)} style={{
                flex: 1, padding: "12px 0", border: "1px solid rgba(0,212,232,0.2)", borderRadius: 12,
                background: "transparent", color: "rgba(0,212,232,0.6)", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "'Nunito',sans-serif",
              }}>Отмена</button>
              <button onClick={sendGift} disabled={!selectedRecipient || sending} style={{
                flex: 2, padding: "12px 0", border: "none", borderRadius: 12,
                background: selectedRecipient ? `linear-gradient(135deg, ${RARITY_CONFIG[sendModal.rarity].color}, #00d4e8)` : "rgba(0,212,232,0.1)",
                color: selectedRecipient ? "#060e1a" : "rgba(0,212,232,0.3)",
                fontWeight: 800, fontSize: 14, cursor: selectedRecipient ? "pointer" : "not-allowed",
                fontFamily: "'Nunito',sans-serif",
                boxShadow: selectedRecipient ? `0 4px 16px ${RARITY_CONFIG[sendModal.rarity].glow}` : "none",
                transition: "all 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>
                {sending ? <Spinner small /> : <><Icon name="Gift" size={15} /> Подарить · {sendModal.price_rub} ₽</>}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}} @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

function GiftCard({ gift, index, onSend }: { gift: Gift; index: number; onSend: () => void }) {
  const [hov, setHov] = useState(false);
  const cfg = RARITY_CONFIG[gift.rarity];
  return (
    <div
      className="animate-fade-in"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        animationDelay: `${index * 0.05}s`,
        padding: "16px 12px", borderRadius: 16, cursor: "pointer",
        background: hov ? cfg.bg : "rgba(13,31,56,0.6)",
        border: `1px solid ${hov ? cfg.border : "rgba(0,212,232,0.08)"}`,
        boxShadow: hov ? cfg.glow : "none",
        transition: "all 0.25s cubic-bezier(0.16,1,0.3,1)",
        transform: hov ? "translateY(-3px) scale(1.02)" : "scale(1)",
        textAlign: "center",
      }}
      onClick={onSend}
    >
      <div style={{ fontSize: 42, marginBottom: 8, display: "block", animation: hov ? "float 1.5s ease-in-out infinite" : "none" }}>
        {gift.emoji}
      </div>
      <div style={{ color: cfg.color, fontWeight: 800, fontSize: 12, marginBottom: 2 }}>{gift.name}</div>
      <div style={{ color: "rgba(0,212,232,0.35)", fontSize: 10, marginBottom: 8 }}>{gift.character_name}</div>
      <div style={{ display: "inline-block", padding: "2px 8px", borderRadius: 20, background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color, fontSize: 10, fontWeight: 700, marginBottom: 10 }}>
        {cfg.label}
      </div>
      <div style={{
        padding: "7px 0", borderRadius: 10, width: "100%",
        background: hov ? `linear-gradient(135deg, ${cfg.color}, #00d4e8)` : "rgba(0,212,232,0.06)",
        color: hov ? "#060e1a" : cfg.color, fontWeight: 800, fontSize: 12,
        border: hov ? "none" : `1px solid ${cfg.border}`,
        transition: "all 0.2s", boxSizing: "border-box",
      }}>
        🎁 {gift.price_rub} ₽
      </div>
    </div>
  );
}

function Spinner({ small }: { small?: boolean }) {
  const s = small ? 14 : 20;
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: small ? 0 : 32 }}>
      <div style={{ width: s, height: s, border: `2px solid rgba(0,212,232,0.2)`, borderTopColor: "#00d4e8", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

const lbl: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(0,212,232,0.6)", marginBottom: 7, textTransform: "uppercase" };
const inp: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "10px 14px", background: "rgba(0,212,232,0.04)", border: "1px solid rgba(0,212,232,0.15)", borderRadius: 10, color: "#e0f7ff", fontSize: 13, outline: "none", fontFamily: "'Nunito',sans-serif" };

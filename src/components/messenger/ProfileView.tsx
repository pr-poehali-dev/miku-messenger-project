import { useState } from "react";
import { auth, fileToBase64 } from "@/lib/api";
import Icon from "@/components/ui/icon";
import { toast } from "sonner";

const LOGO = "https://cdn.poehali.dev/projects/2517e84a-2f8e-4a4f-b13c-5a42ec90f4ff/bucket/9bdd7766-8a03-4453-91bb-0bc20a4c0d91.jpg";

const BG_PRESETS = [
  "linear-gradient(135deg,#003d5e,#00d4e8)",
  "linear-gradient(135deg,#1a0533,#6c3eb9)",
  "linear-gradient(135deg,#002a1a,#00d484)",
  "linear-gradient(135deg,#1a1a2e,#e94560)",
  "linear-gradient(135deg,#0d1b2a,#1b4f72)",
  "linear-gradient(135deg,#1a0a00,#ff6b35)",
];

interface ProfileViewProps {
  user: Record<string, unknown> | null;
  onUpdate: (user: Record<string, unknown>) => void;
}

export default function ProfileView({ user, onUpdate }: ProfileViewProps) {
  const [displayName, setDisplayName] = useState((user?.display_name as string) || "");
  const [bio, setBio] = useState((user?.bio as string) || "");
  const [avatarUrl, setAvatarUrl] = useState((user?.avatar_url as string) || "");
  const [bgColor, setBgColor] = useState((user?.background_color as string) || BG_PRESETS[0]);
  const [bgUrl, setBgUrl] = useState((user?.background_url as string) || "");
  const [saving, setSaving] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [bgLoading, setBgLoading] = useState(false);
  const [visible, setVisible] = useState(true);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarLoading(true);
    const b64 = await fileToBase64(file);
    const { api } = await import("@/lib/api");
    const res = await api.upload(b64, file.type, "avatars");
    if (res.url) { setAvatarUrl(res.url); toast.success("Аватарка загружена!"); }
    else toast.error("Ошибка загрузки");
    setAvatarLoading(false);
  };

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBgLoading(true);
    const b64 = await fileToBase64(file);
    const { api } = await import("@/lib/api");
    const res = await api.upload(b64, file.type, "backgrounds");
    if (res.url) { setBgUrl(res.url); toast.success("Фон установлен!"); }
    else toast.error("Ошибка загрузки");
    setBgLoading(false);
  };

  const save = async () => {
    setSaving(true);
    const res = await auth.updateProfile({
      display_name: displayName, bio,
      avatar_url: avatarUrl,
      background_url: bgUrl,
      background_color: bgColor,
    });
    if (res.ok) {
      toast.success("Профиль обновлён!");
      onUpdate({ ...user, display_name: displayName, bio, avatar_url: avatarUrl, background_url: bgUrl, background_color: bgColor });
    } else {
      toast.error("Ошибка сохранения");
    }
    setSaving(false);
  };

  const isVerified = user?.is_verified as boolean;

  return (
    <div style={{
      height: "100%", overflowY: "auto", background: "var(--miku-panel)",
      opacity: visible ? 1 : 0, transition: "opacity 0.3s",
    }}>
      {/* Preview card */}
      <div style={{
        height: 160,
        background: bgUrl ? `url(${bgUrl}) center/cover` : bgColor,
        position: "relative", flexShrink: 0,
      }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 50%, rgba(6,14,26,0.9) 100%)" }} />
        <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 6 }}>
          <label style={{
            padding: "5px 10px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 8, color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: 700, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 4,
          }}>
            {bgLoading ? <div style={{ width: 10, height: 10, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /> : <Icon name="Image" size={12} />}
            Фон
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleBgUpload} />
          </label>
        </div>
      </div>

      <div style={{ padding: "0 24px 32px", position: "relative" }}>
        {/* Avatar */}
        <div style={{ marginTop: -40, marginBottom: 20, position: "relative", display: "inline-block" }}>
          <div style={{
            width: 80, height: 80, borderRadius: "50%",
            border: "4px solid rgba(6,14,26,1)",
            background: avatarUrl ? "transparent" : "linear-gradient(135deg,#00d4e8,#0ea5e9)",
            overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 20px rgba(0,212,232,0.25)",
          }}>
            {avatarUrl
              ? <img src={avatarUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
              : <span style={{ color: "#060e1a", fontWeight: 800, fontSize: 24 }}>{(displayName || "M")[0]?.toUpperCase()}</span>
            }
          </div>
          <label style={{
            position: "absolute", bottom: 0, right: -4,
            width: 26, height: 26, borderRadius: "50%",
            background: "#00d4e8", border: "2px solid rgba(6,14,26,1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}>
            {avatarLoading
              ? <div style={{ width: 10, height: 10, border: "2px solid rgba(6,14,26,0.4)", borderTopColor: "#060e1a", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              : <Icon name="Camera" size={12} />
            }
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarUpload} />
          </label>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ color: "#e0f7ff", fontWeight: 800, fontSize: 20 }}>{displayName || user?.username as string}</span>
          {isVerified && (
            <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#00d4e8", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="Check" size={11} />
            </div>
          )}
        </div>
        <div style={{ color: "rgba(0,212,232,0.5)", fontSize: 13, marginBottom: 24 }}>@{user?.username as string}</div>

        {/* Logo watermark */}
        <div style={{ position: "absolute", top: -30, right: 24 }}>
          <img src={LOGO} alt="" style={{ width: 50, height: 50, borderRadius: "50%", opacity: 0.15, border: "2px solid rgba(0,212,232,0.2)" }} />
        </div>

        {/* Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Field label="Отображаемое имя">
            <input value={displayName} onChange={e => setDisplayName(e.target.value)}
              placeholder="Твоё имя" style={iStyle} />
          </Field>

          <Field label="О себе">
            <textarea value={bio} onChange={e => setBio(e.target.value)}
              placeholder="Расскажи о себе..." rows={3}
              style={{ ...iStyle, resize: "none" }} />
          </Field>

          <Field label="Цвет фона профиля">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {BG_PRESETS.map(bg => (
                <div key={bg} onClick={() => { setBgColor(bg); setBgUrl(""); }}
                  style={{
                    width: 36, height: 36, borderRadius: 10, background: bg, cursor: "pointer",
                    border: bgColor === bg && !bgUrl ? "2px solid #00d4e8" : "2px solid transparent",
                    boxShadow: bgColor === bg && !bgUrl ? "0 0 10px rgba(0,212,232,0.4)" : "none",
                    transition: "all 0.2s", transform: bgColor === bg && !bgUrl ? "scale(1.1)" : "scale(1)",
                  }}
                />
              ))}
            </div>
          </Field>
        </div>

        <button onClick={save} disabled={saving} style={{
          marginTop: 24, width: "100%", padding: "14px 0", border: "none", borderRadius: 14,
          background: saving ? "rgba(0,212,232,0.1)" : "linear-gradient(135deg,#00d4e8,#0ea5e9)",
          color: saving ? "rgba(0,212,232,0.4)" : "#060e1a",
          fontWeight: 800, fontSize: 15, cursor: "pointer",
          fontFamily: "'Nunito',sans-serif",
          boxShadow: saving ? "none" : "0 4px 20px rgba(0,212,232,0.25)",
          transition: "all 0.2s",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          {saving
            ? <><div style={{ width: 16, height: 16, border: "2px solid rgba(0,212,232,0.3)", borderTopColor: "#00d4e8", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /> Сохраняем...</>
            : <><Icon name="Save" size={16} /> Сохранить профиль</>
          }
        </button>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(0,212,232,0.6)", marginBottom: 8, textTransform: "uppercase" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const iStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  padding: "11px 14px",
  background: "rgba(0,212,232,0.04)", border: "1px solid rgba(0,212,232,0.15)",
  borderRadius: 10, color: "#e0f7ff", fontSize: 14, outline: "none",
  fontFamily: "'Nunito',sans-serif", transition: "border-color 0.2s",
};

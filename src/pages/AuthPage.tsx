import { useState, useEffect } from "react";
import { toast } from "sonner";
import { auth, setAuth } from "@/lib/api";
import Icon from "@/components/ui/icon";

const LOGO = "https://cdn.poehali.dev/projects/2517e84a-2f8e-4a4f-b13c-5a42ec90f4ff/bucket/9bdd7766-8a03-4453-91bb-0bc20a4c0d91.jpg";

type Mode = "login" | "register";

interface AuthPageProps {
  onLogin: (user: Record<string, unknown>) => void;
}

const InputField = ({
  label, type = "text", value, onChange, placeholder, icon,
}: {
  label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder: string; icon: string;
}) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ display: "block", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(0,212,232,0.7)", marginBottom: 6, textTransform: "uppercase" }}>
      {label}
    </label>
    <div style={{ position: "relative" }}>
      <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(0,212,232,0.4)", pointerEvents: "none" }}>
        <Icon name={icon} size={16} />
      </div>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", padding: "12px 14px 12px 42px",
          background: "rgba(0,212,232,0.04)",
          border: "1px solid rgba(0,212,232,0.15)",
          borderRadius: 10, color: "#e0f7ff",
          fontSize: 15, outline: "none",
          transition: "border-color 0.2s, box-shadow 0.2s",
          boxSizing: "border-box",
        }}
        onFocus={e => {
          e.target.style.borderColor = "rgba(0,212,232,0.5)";
          e.target.style.boxShadow = "0 0 0 3px rgba(0,212,232,0.08)";
        }}
        onBlur={e => {
          e.target.style.borderColor = "rgba(0,212,232,0.15)";
          e.target.style.boxShadow = "none";
        }}
      />
    </div>
  </div>
);

export default function AuthPage({ onLogin }: AuthPageProps) {
  const [mode, setMode] = useState<Mode>("login");
  const [prevMode, setPrevMode] = useState<Mode>("login");
  const [animating, setAnimating] = useState(false);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 100);
  }, []);

  const switchMode = (next: Mode) => {
    if (next === mode || animating) return;
    setPrevMode(mode);
    setAnimating(true);
    setTimeout(() => {
      setMode(next);
      setAnimating(false);
    }, 280);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let res;
      if (mode === "register") {
        res = await auth.register(email, username, password);
      } else {
        res = await auth.login(email, password);
      }
      if (res.error) {
        toast.error(res.error);
      } else {
        setAuth(res.token, res.user);
        toast.success(mode === "register" ? "Добро пожаловать в Miku! 🎵" : "С возвращением!");
        onLogin(res.user);
      }
    } catch {
      toast.error("Ошибка сети. Проверь подключение.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      width: "100%", height: "100%", display: "flex",
      alignItems: "center", justifyContent: "center",
      position: "relative", overflow: "hidden",
    }}>
      {/* Animated BG particles */}
      {[...Array(6)].map((_, i) => (
        <div key={i} style={{
          position: "absolute",
          width: 200 + i * 80,
          height: 200 + i * 80,
          borderRadius: "50%",
          border: `1px solid rgba(0,212,232,${0.03 + i * 0.01})`,
          top: "50%", left: "50%",
          transform: "translate(-50%,-50%)",
          animation: `spin${i % 2 === 0 ? "Cw" : "Ccw"} ${20 + i * 8}s linear infinite`,
          pointerEvents: "none",
        }} />
      ))}
      <style>{`
        @keyframes spinCw { from{transform:translate(-50%,-50%) rotate(0deg)}to{transform:translate(-50%,-50%) rotate(360deg)} }
        @keyframes spinCcw { from{transform:translate(-50%,-50%) rotate(0deg)}to{transform:translate(-50%,-50%) rotate(-360deg)} }
      `}</style>

      {/* Card */}
      <div style={{
        width: "100%", maxWidth: 440,
        padding: "0 20px",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0) scale(1)" : "translateY(30px) scale(0.96)",
        transition: "opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1)",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 100, height: 100, borderRadius: "50%",
            overflow: "hidden", margin: "0 auto 16px",
            border: "2px solid rgba(0,212,232,0.4)",
            boxShadow: "0 0 30px rgba(0,212,232,0.25), 0 0 80px rgba(0,212,232,0.08)",
            animation: "float 3s ease-in-out infinite",
          }}>
            <img src={LOGO} alt="Miku" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <h1 style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: 32, fontWeight: 900, margin: 0, letterSpacing: "0.1em",
            background: "linear-gradient(135deg, #00d4e8, #38bdf8)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            textShadow: "none",
          }}>MIKU</h1>
          <p style={{ color: "rgba(0,212,232,0.5)", fontSize: 13, margin: "4px 0 0", letterSpacing: "0.15em" }}>
            MESSENGER
          </p>
        </div>

        {/* Panel */}
        <div style={{
          background: "rgba(10,22,40,0.92)",
          border: "1px solid rgba(0,212,232,0.15)",
          borderRadius: 20,
          backdropFilter: "blur(30px)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(0,212,232,0.05)",
          overflow: "hidden",
        }}>
          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid rgba(0,212,232,0.1)" }}>
            {(["login", "register"] as Mode[]).map(m => (
              <button key={m} onClick={() => switchMode(m)} style={{
                flex: 1, padding: "16px 0", border: "none", cursor: "pointer",
                background: mode === m ? "rgba(0,212,232,0.08)" : "transparent",
                color: mode === m ? "#00d4e8" : "rgba(148,196,220,0.5)",
                fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: 14,
                letterSpacing: "0.05em",
                borderBottom: mode === m ? "2px solid #00d4e8" : "2px solid transparent",
                transition: "all 0.25s ease",
              }}>
                {m === "login" ? "Войти" : "Регистрация"}
              </button>
            ))}
          </div>

          {/* Form */}
          <div style={{
            padding: "28px 32px 32px",
            opacity: animating ? 0 : 1,
            transform: animating ? "translateX(10px)" : "translateX(0)",
            transition: "opacity 0.25s ease, transform 0.25s ease",
          }}>
            <form onSubmit={handleSubmit}>
              <InputField label="Email" type="email" value={email} onChange={setEmail} placeholder="miku@example.com" icon="Mail" />
              {mode === "register" && (
                <div style={{
                  overflow: "hidden",
                  maxHeight: mode === "register" ? 80 : 0,
                  transition: "max-height 0.35s cubic-bezier(0.16,1,0.3,1)",
                }}>
                  <InputField label="Юзернейм" value={username} onChange={setUsername} placeholder="mikuFan39" icon="AtSign" />
                </div>
              )}
              <InputField label="Пароль" type="password" value={password} onChange={setPassword} placeholder="••••••••" icon="Lock" />

              <button type="submit" disabled={loading} style={{
                width: "100%", padding: "14px 0", marginTop: 8,
                background: loading ? "rgba(0,212,232,0.2)" : "linear-gradient(135deg, #00d4e8, #0ea5e9)",
                border: "none", borderRadius: 12, cursor: loading ? "not-allowed" : "pointer",
                color: loading ? "rgba(0,212,232,0.5)" : "#060e1a",
                fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: 15,
                letterSpacing: "0.05em",
                boxShadow: loading ? "none" : "0 4px 20px rgba(0,212,232,0.3)",
                transition: "all 0.25s ease",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
                onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; }}
              >
                {loading ? (
                  <div style={{ width: 18, height: 18, border: "2px solid rgba(0,212,232,0.3)", borderTopColor: "#00d4e8", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                ) : (
                  <>
                    <Icon name={mode === "login" ? "LogIn" : "UserPlus"} size={16} />
                    {mode === "login" ? "Войти в Miku" : "Создать аккаунт"}
                  </>
                )}
              </button>
              <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
            </form>
          </div>
        </div>

        <p style={{ textAlign: "center", color: "rgba(0,212,232,0.25)", fontSize: 12, marginTop: 20 }}>
          Miku Messenger © 2025 — Powered by Project Sekai
        </p>
      </div>
    </div>
  );
}

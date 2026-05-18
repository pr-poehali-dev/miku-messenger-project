import { useEffect, useState } from "react";
import { auth } from "@/lib/api";
import Icon from "@/components/ui/icon";

interface UserHoverCardProps {
  username: string;
  x: number;
  y: number;
  onClose: () => void;
}

interface UserData {
  username: string;
  display_name: string;
  avatar_url?: string;
  background_url?: string;
  background_color?: string;
  bio?: string;
  is_verified?: boolean;
  is_online?: boolean;
}

export default function UserHoverCard({ username, x, y, onClose }: UserHoverCardProps) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    auth.getUser(username).then(res => {
      if (!cancelled && res.user) {
        setUserData(res.user);
        setTimeout(() => setVisible(true), 30);
      }
    });
    return () => { cancelled = true; };
  }, [username]);

  if (!userData) return null;

  const cardW = 240;
  const safeX = Math.min(x, window.innerWidth - cardW - 16);
  const safeY = Math.max(8, Math.min(y, window.innerHeight - 220));

  return (
    <div
      onMouseLeave={onClose}
      style={{
        position: "fixed",
        left: safeX,
        top: safeY,
        width: cardW,
        zIndex: 9999,
        borderRadius: 16,
        overflow: "hidden",
        background: "rgba(10,22,40,0.98)",
        border: "1px solid rgba(0,212,232,0.2)",
        boxShadow: "0 16px 48px rgba(0,0,0,0.6), 0 0 30px rgba(0,212,232,0.08)",
        backdropFilter: "blur(30px)",
        opacity: visible ? 1 : 0,
        transform: visible ? "scale(1) translateY(0)" : "scale(0.92) translateY(-8px)",
        transition: "opacity 0.2s ease, transform 0.25s cubic-bezier(0.16,1,0.3,1)",
        pointerEvents: "all",
      }}
    >
      {/* Background */}
      <div style={{
        height: 70,
        background: userData.background_url
          ? `url(${userData.background_url}) center/cover`
          : userData.background_color || "linear-gradient(135deg,#003d5e,#00d4e8)",
        position: "relative",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to bottom, transparent 40%, rgba(10,22,40,0.8) 100%)",
        }} />
      </div>

      {/* Avatar */}
      <div style={{ padding: "0 16px 16px", marginTop: -24, position: "relative" }}>
        <div style={{
          width: 52, height: 52, borderRadius: "50%",
          border: "3px solid rgba(10,22,40,0.98)",
          overflow: "hidden",
          background: "linear-gradient(135deg,#00d4e8,#0ea5e9)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 12px rgba(0,212,232,0.25)",
        }}>
          {userData.avatar_url
            ? <img src={userData.avatar_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
            : <span style={{ color: "#060e1a", fontWeight: 800, fontSize: 18 }}>{userData.display_name?.[0]?.toUpperCase()}</span>
          }
        </div>

        <div style={{ marginTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#e0f7ff", fontWeight: 800, fontSize: 15 }}>
              {userData.display_name || userData.username}
            </span>
            {userData.is_verified && (
              <div style={{
                width: 16, height: 16, borderRadius: "50%",
                background: "#00d4e8", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon name="Check" size={9} />
              </div>
            )}
          </div>
          <div style={{ color: "rgba(0,212,232,0.5)", fontSize: 12, marginTop: 1 }}>
            @{userData.username}
          </div>
        </div>

        <div style={{
          display: "flex", alignItems: "center", gap: 6, marginTop: 8,
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: userData.is_online ? "#22c55e" : "#6b7280",
            boxShadow: userData.is_online ? "0 0 6px rgba(34,197,94,0.5)" : "none",
          }} />
          <span style={{ color: "rgba(0,212,232,0.4)", fontSize: 11 }}>
            {userData.is_online ? "онлайн" : "не в сети"}
          </span>
        </div>

        {userData.bio && (
          <p style={{
            color: "rgba(224,247,255,0.6)", fontSize: 12, marginTop: 10, lineHeight: 1.5,
            borderTop: "1px solid rgba(0,212,232,0.08)", paddingTop: 10,
          }}>
            {userData.bio}
          </p>
        )}
      </div>
    </div>
  );
}

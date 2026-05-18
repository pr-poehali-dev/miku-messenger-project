import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import ChatView from "@/components/messenger/ChatView";
import GroupsView from "@/components/messenger/GroupsView";
import ChannelsView from "@/components/messenger/ChannelsView";
import DMView from "@/components/messenger/DMView";
import ProfileView from "@/components/messenger/ProfileView";
import SettingsView from "@/components/messenger/SettingsView";
import GiftsView from "@/components/messenger/GiftsView";
import { auth, clearAuth } from "@/lib/api";
import { toast } from "sonner";

const LOGO = "https://cdn.poehali.dev/projects/2517e84a-2f8e-4a4f-b13c-5a42ec90f4ff/bucket/9bdd7766-8a03-4453-91bb-0bc20a4c0d91.jpg";

type Section = "dm" | "groups" | "channels" | "profile" | "settings" | "gifts";

interface NavItem { id: Section; icon: string; label: string; }
const NAV: NavItem[] = [
  { id: "dm", icon: "MessageCircle", label: "Сообщения" },
  { id: "groups", icon: "Users", label: "Группы" },
  { id: "channels", icon: "Radio", label: "Каналы" },
  { id: "gifts", icon: "Gift", label: "Подарки" },
  { id: "profile", icon: "User", label: "Профиль" },
  { id: "settings", icon: "Settings", label: "Настройки" },
];

// Smooth section transition wrapper
const SectionPanel = ({ children, active, id, current }: {
  children: React.ReactNode; active: boolean; id: string; current: string;
}) => {
  const [rendered, setRendered] = useState(active);
  useEffect(() => {
    if (active) setRendered(true);
  }, [active]);

  return (
    <div style={{
      position: "absolute", inset: 0,
      opacity: active ? 1 : 0,
      transform: active ? "translateX(0) scale(1)" : `translateX(${id < current ? "-18px" : "18px"}) scale(0.98)`,
      transition: "opacity 0.35s cubic-bezier(0.16,1,0.3,1), transform 0.35s cubic-bezier(0.16,1,0.3,1)",
      pointerEvents: active ? "all" : "none",
      willChange: "opacity, transform",
    }}>
      {rendered && children}
    </div>
  );
};

interface MessengerPageProps {
  user: Record<string, unknown> | null;
  onLogout: () => void;
}

export default function MessengerPage({ user: initialUser, onLogout }: MessengerPageProps) {
  const [section, setSection] = useState<Section>("dm");
  const [prevSection, setPrevSection] = useState<Section>("dm");
  const [currentUser, setCurrentUser] = useState(initialUser);
  const [activeChatContext, setActiveChatContext] = useState<{
    type: "group" | "channel" | "dm"; id: number; name: string; avatar?: string;
  } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 80);
  }, []);

  const navigate = (next: Section) => {
    if (next === section) return;
    setPrevSection(section);
    setSection(next);
  };

  const handleLogout = async () => {
    await auth.logout();
    clearAuth();
    toast.success("До встречи!");
    onLogout();
  };

  const openChat = (type: "group" | "channel" | "dm", id: number, name: string, avatar?: string) => {
    setActiveChatContext({ type, id, name, avatar });
  };

  const closeChat = () => setActiveChatContext(null);

  const avatarUrl = (currentUser?.avatar_url as string) || null;
  const displayName = (currentUser?.display_name as string) || (currentUser?.username as string) || "Miku";
  const isVerified = currentUser?.is_verified as boolean;

  return (
    <div style={{
      display: "flex", width: "100%", height: "100%",
      opacity: mounted ? 1 : 0,
      transition: "opacity 0.5s ease",
    }}>
      {/* Left nav rail */}
      <div style={{
        width: 72, flexShrink: 0,
        background: "rgba(6,14,26,0.98)",
        borderRight: "1px solid rgba(0,212,232,0.1)",
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "12px 0", gap: 4, zIndex: 10,
        backdropFilter: "blur(20px)",
      }}>
        {/* Logo */}
        <div style={{
          width: 44, height: 44, borderRadius: "50%", overflow: "hidden",
          border: "2px solid rgba(0,212,232,0.35)",
          boxShadow: "0 0 15px rgba(0,212,232,0.2)",
          marginBottom: 12, flexShrink: 0,
          animation: "float 4s ease-in-out infinite",
        }}>
          <img src={LOGO} alt="Miku" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>

        <div style={{ width: 40, height: 1, background: "rgba(0,212,232,0.12)", marginBottom: 8 }} />

        {NAV.map(item => (
          <NavButton
            key={item.id}
            item={item}
            active={section === item.id}
            onClick={() => navigate(item.id)}
          />
        ))}

        <div style={{ flex: 1 }} />

        {/* Avatar / Logout */}
        <div style={{ position: "relative", marginBottom: 4 }}>
          <div
            onClick={() => navigate("profile")}
            style={{
              width: 40, height: 40, borderRadius: "50%",
              background: avatarUrl ? "transparent" : "linear-gradient(135deg,#00d4e8,#0ea5e9)",
              border: `2px solid ${section === "profile" ? "#00d4e8" : "rgba(0,212,232,0.2)"}`,
              overflow: "hidden", cursor: "pointer",
              transition: "border-color 0.2s, box-shadow 0.2s",
              boxShadow: section === "profile" ? "0 0 12px rgba(0,212,232,0.4)" : "none",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {avatarUrl
              ? <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ color: "#060e1a", fontWeight: 800, fontSize: 14 }}>{displayName[0]?.toUpperCase()}</span>
            }
          </div>
          {isVerified && (
            <div style={{
              position: "absolute", bottom: -2, right: -2,
              width: 14, height: 14, borderRadius: "50%",
              background: "#00d4e8", border: "2px solid #060e1a",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon name="Check" size={8} />
            </div>
          )}
        </div>
        <button onClick={handleLogout} style={{
          width: 36, height: 36, borderRadius: 10, border: "none",
          background: "transparent", cursor: "pointer",
          color: "rgba(0,212,232,0.3)", transition: "color 0.2s, background 0.2s",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#ff6b6b"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,107,107,0.1)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(0,212,232,0.3)"; (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
          title="Выйти"
        >
          <Icon name="LogOut" size={16} />
        </button>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <SectionPanel active={section === "dm"} id="dm" current={section}>
          <DMView user={currentUser} onOpenChat={openChat} />
        </SectionPanel>
        <SectionPanel active={section === "groups"} id="groups" current={section}>
          <GroupsView user={currentUser} onOpenChat={openChat} />
        </SectionPanel>
        <SectionPanel active={section === "channels"} id="channels" current={section}>
          <ChannelsView user={currentUser} onOpenChat={openChat} />
        </SectionPanel>
        <SectionPanel active={section === "gifts"} id="gifts" current={section}>
          <GiftsView user={currentUser} />
        </SectionPanel>
        <SectionPanel active={section === "profile"} id="profile" current={section}>
          <ProfileView user={currentUser} onUpdate={setCurrentUser} />
        </SectionPanel>
        <SectionPanel active={section === "settings"} id="settings" current={section}>
          <SettingsView user={currentUser} />
        </SectionPanel>
      </div>

      {/* Chat overlay with smooth slide-in */}
      {activeChatContext && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 20,
          display: "flex",
        }}>
          <div
            onClick={closeChat}
            style={{
              position: "absolute", inset: 0,
              background: "rgba(0,0,0,0.3)",
              animation: "fadeIn 0.3s ease",
              backdropFilter: "blur(4px)",
            }}
          />
          <div style={{
            position: "absolute", right: 0, top: 0, bottom: 0,
            width: "calc(100% - 72px)",
            animation: "slideFromRight 0.4s cubic-bezier(0.16,1,0.3,1)",
          }}>
            <ChatView
              type={activeChatContext.type}
              id={activeChatContext.id}
              name={activeChatContext.name}
              avatar={activeChatContext.avatar}
              user={currentUser}
              onClose={closeChat}
            />
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideFromRight {
          from { transform: translateX(40px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes float {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes fadeIn { from{opacity:0}to{opacity:1} }
      `}</style>
    </div>
  );
}

function NavButton({ item, active, onClick }: { item: NavItem; active: boolean; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={item.label}
      style={{
        width: 48, height: 48, borderRadius: active ? 14 : 12,
        border: "none", cursor: "pointer",
        background: active
          ? "rgba(0,212,232,0.15)"
          : hovered ? "rgba(0,212,232,0.07)" : "transparent",
        color: active ? "#00d4e8" : hovered ? "rgba(0,212,232,0.7)" : "rgba(0,212,232,0.3)",
        boxShadow: active ? "0 0 14px rgba(0,212,232,0.2), inset 0 0 0 1px rgba(0,212,232,0.2)" : "none",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3,
        transition: "all 0.2s cubic-bezier(0.16,1,0.3,1)",
        transform: active ? "scale(1.05)" : hovered ? "scale(1.02)" : "scale(1)",
        position: "relative",
      }}
    >
      {active && (
        <div style={{
          position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
          width: 3, height: 24, background: "#00d4e8", borderRadius: "0 3px 3px 0",
          boxShadow: "0 0 8px rgba(0,212,232,0.6)",
        }} />
      )}
      <Icon name={item.icon} size={20} />
      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.03em", lineHeight: 1 }}>
        {item.label.slice(0, 5)}
      </span>
    </button>
  );
}

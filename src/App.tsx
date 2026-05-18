import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import AuthPage from "./pages/AuthPage";
import MessengerPage from "./pages/MessengerPage";
import { getToken, getUser } from "./lib/api";

type View = "auth" | "messenger";

const PageTransition = ({ children, show }: { children: React.ReactNode; show: boolean }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      opacity: show ? 1 : 0,
      transform: show ? "scale(1) translateY(0)" : "scale(0.97) translateY(12px)",
      transition: "opacity 0.45s cubic-bezier(0.16,1,0.3,1), transform 0.45s cubic-bezier(0.16,1,0.3,1)",
      pointerEvents: show ? "all" : "none",
    }}
  >
    {children}
  </div>
);

export default function App() {
  const [view, setView] = useState<View>("auth");
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const token = getToken();
    const savedUser = getUser();
    if (token && savedUser) {
      setUser(savedUser);
      setView("messenger");
    }
    setTimeout(() => setMounted(true), 50);
  }, []);

  const handleLogin = (userData: Record<string, unknown>) => {
    setUser(userData);
    setView("messenger");
  };

  const handleLogout = () => {
    setUser(null);
    setView("auth");
  };

  return (
    <TooltipProvider>
      <Toaster position="top-right" theme="dark" />
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "var(--miku-dark)",
          overflow: "hidden",
          opacity: mounted ? 1 : 0,
          transition: "opacity 0.6s ease",
        }}
      >
        {/* Ambient background */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
          background: `
            radial-gradient(ellipse 60% 40% at 20% 20%, rgba(0,212,232,0.06) 0%, transparent 60%),
            radial-gradient(ellipse 50% 50% at 80% 80%, rgba(14,165,233,0.05) 0%, transparent 60%),
            radial-gradient(ellipse 40% 60% at 50% 0%, rgba(0,100,160,0.08) 0%, transparent 50%)
          `
        }} />

        <PageTransition show={view === "auth"}>
          <AuthPage onLogin={handleLogin} />
        </PageTransition>

        <PageTransition show={view === "messenger"}>
          <MessengerPage user={user} onLogout={handleLogout} />
        </PageTransition>
      </div>
    </TooltipProvider>
  );
}

import React, { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => {
      document.head.removeChild(meta);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex overflow-hidden">
      {/* Sidebar — desktop only */}
      <aside className="w-64 bg-black text-white flex flex-col hidden md:flex shrink-0 border-r border-white/10">
        <div className="p-8 pb-4">
          <div className="font-serif text-2xl tracking-[0.3em] mb-1">
            VELORA
          </div>
          <div className="velora-label text-white/40">ADMINISTRATION</div>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-1 overflow-y-auto no-scrollbar">
          <div className="text-[10px] tracking-[0.2em] uppercase text-white/20 px-4 mb-4 font-bold">Menu</div>
          <p className="px-4 py-2 text-[11px] tracking-[0.2em] uppercase text-white/40 italic">Managed via Dashboard</p>
        </nav>

        <div className="p-6 border-t border-white/10">
          <button 
            onClick={() => { logout(); setLocation("/login"); }}
            className="velora-link text-white/60 hover:text-white"
          >
            Sign Out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden h-screen">
        <header className="h-20 border-b border-border flex items-center justify-between px-6 lg:px-10 bg-background shrink-0">
          <div className="flex items-center gap-4">
            <div className="md:hidden font-serif text-xl tracking-widest text-foreground">VELORA</div>
            <div className="velora-label opacity-40">
              Admin / Restricted Area
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-[11px] font-bold uppercase tracking-wider text-foreground">{user?.name}</div>
              <div className="text-[9px] text-muted-foreground uppercase tracking-widest">{user?.role}</div>
            </div>
            <div className="w-10 h-10 bg-primary flex items-center justify-center text-primary-foreground font-serif text-lg">
              {user?.name?.[0] || 'A'}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}

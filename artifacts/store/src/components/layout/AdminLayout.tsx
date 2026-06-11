import React, { useEffect } from "react";

export function AdminLayout({ children }: { children: React.ReactNode }) {
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
    <div className="min-h-[100dvh] flex flex-col w-full bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-black flex items-center justify-center">
            <span className="text-white text-xs font-bold">A</span>
          </div>
          <span className="font-semibold text-sm text-gray-900 dark:text-white tracking-wide">
            Admin Panel
          </span>
        </div>
        <span className="ml-auto text-xs text-gray-400 select-none">
          Restricted Area — Authorised Personnel Only
        </span>
      </header>
      <main className="flex-1 flex flex-col overflow-auto">{children}</main>
    </div>
  );
}

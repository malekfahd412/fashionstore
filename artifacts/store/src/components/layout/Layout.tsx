import React from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import CartDrawer from "@/components/CartDrawer";
import { AIConcierge } from "@/components/AIConcierge";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col w-full overflow-x-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:text-sm focus:font-medium focus:rounded"
      >
        Skip to main content
      </a>
      <Navbar />
      <CartDrawer />
      <main id="main-content" className="flex-1 flex flex-col">
        {children}
      </main>
      <Footer />
      <AIConcierge />
    </div>
  );
}

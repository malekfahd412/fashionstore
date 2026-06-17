import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface PublicSettings {
  social_instagram?: string;
  social_facebook?: string;
  social_twitter?: string;
  social_tiktok?: string;
}

export function Footer() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<PublicSettings>({});

  useEffect(() => {
    void fetch(`${BASE}/api/settings`)
      .then(r => r.json() as Promise<PublicSettings>)
      .then(data => setSettings(data))
      .catch(() => {});
  }, []);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/newsletter/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          toast({ title: t("footer.alreadySubscribed"), description: t("footer.alreadySubscribedDesc") });
        } else {
          throw new Error(data.error || "Failed");
        }
      } else {
        toast({ title: t("footer.subscribeSuccess"), description: t("footer.subscribeSuccessDesc") });
        setEmail("");
      }
    } catch {
      toast({ title: t("footer.subscribeError"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const socials = [
    { label: "IG", href: settings.social_instagram },
    { label: "FB", href: settings.social_facebook },
    { label: "X",  href: settings.social_twitter  },
    { label: "TK", href: settings.social_tiktok   },
  ].filter(s => s.href);

  return (
    <footer className="bg-[#111111] text-white/70 mt-auto">
      {/* Newsletter strip */}
      <div className="border-b border-white/8">
        <div className="max-w-screen-xl mx-auto px-6 py-12 md:py-16 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/40 mb-2">{t("footer.newsletter")}</p>
            <h3 className="font-serif text-2xl md:text-3xl font-bold text-white">{t("home.joinCommunity")}</h3>
            <p className="text-sm text-white/50 mt-2 max-w-sm">{t("footer.newsletterDesc")}</p>
          </div>
          <form onSubmit={handleSubscribe} className="flex gap-0 max-w-sm w-full md:w-auto">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={t("footer.emailPlaceholder")}
              required
              className="flex-1 bg-white/8 border border-white/15 border-r-0 text-white placeholder:text-white/30 px-4 py-3 text-sm focus:outline-none focus:border-white/40 transition-colors min-w-0"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-white text-[#111111] px-6 py-3 text-[10px] font-bold tracking-[0.18em] uppercase hover:bg-white/90 transition-colors disabled:opacity-60 shrink-0 whitespace-nowrap"
            >
              {loading ? "..." : t("footer.subscribe")}
            </button>
          </form>
        </div>
      </div>

      {/* Main columns */}
      <div className="max-w-screen-xl mx-auto px-6 py-14 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10">
        {/* Brand */}
        <div className="col-span-2 lg:col-span-2">
          <h2 className="font-serif text-3xl font-bold text-white mb-4">Velora</h2>
          <p className="text-sm text-white/40 leading-relaxed mb-6 max-w-xs">{t("footer.tagline")}</p>
          {socials.length > 0 && (
            <div className="flex gap-2">
              {socials.map(s => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 border border-white/15 flex items-center justify-center text-[10px] font-bold text-white/40 hover:text-white hover:border-white/40 transition-colors"
                >
                  {s.label}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Shop */}
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white mb-5">{t("footer.shop")}</p>
          <ul className="space-y-3">
            {[
              { to: "/products", label: t("footer.allProducts") },
              { to: "/categories", label: t("footer.categories") },
              { to: "/products?featured=true", label: t("footer.featured") },
              { to: "/about", label: t("footer.about") },
            ].map(({ to, label }) => (
              <li key={to}>
                <Link href={to} className="text-sm text-white/40 hover:text-white transition-colors">{label}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Support */}
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white mb-5">{t("footer.support")}</p>
          <ul className="space-y-3">
            {[
              { to: "/contact", label: t("footer.contactUs") },
              { to: "/faq", label: t("footer.faq") },
              { to: "/returns", label: t("footer.returns") },
              { to: "/shipping-policy", label: t("footer.shippingPolicy") },
            ].map(({ to, label }) => (
              <li key={to}>
                <Link href={to} className="text-sm text-white/40 hover:text-white transition-colors">{label}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Legal */}
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white mb-5">{t("footer.legal")}</p>
          <ul className="space-y-3">
            {[
              { to: "/privacy-policy", label: t("footer.privacyPolicy") },
              { to: "/terms", label: t("footer.terms") },
            ].map(({ to, label }) => (
              <li key={to}>
                <Link href={to} className="text-sm text-white/40 hover:text-white transition-colors">{label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/8">
        <div className="max-w-screen-xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-white/25">&copy; {new Date().getFullYear()} Velora. {t("footer.allRightsReserved")}</p>
          <div className="flex gap-6">
            <Link href="/privacy-policy" className="text-[11px] text-white/25 hover:text-white/60 transition-colors">{t("footer.privacy")}</Link>
            <Link href="/terms" className="text-[11px] text-white/25 hover:text-white/60 transition-colors">{t("footer.termsShort")}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

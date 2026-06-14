import React, { useState } from "react";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function Footer() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

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

  return (
    <footer className="bg-foreground text-background py-12 mt-auto">
      <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-2">
          <h3 className="font-serif text-2xl font-bold mb-4">Velora</h3>
          <p className="text-background/70 text-sm mb-4">{t("footer.tagline")}</p>
          <div className="flex gap-3">
            {["IG", "FB", "TW", "TK"].map((s) => (
              <a key={s} href="#" className="w-8 h-8 border border-background/30 flex items-center justify-center hover:bg-background/10 transition-colors text-xs font-medium text-background/70 hover:text-white">
                {s}
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-bold mb-4 uppercase tracking-wider text-sm">{t("footer.shop")}</h4>
          <ul className="space-y-2 text-sm text-background/70">
            <li><Link href="/products" className="hover:text-white transition-colors">{t("footer.allProducts")}</Link></li>
            <li><Link href="/categories" className="hover:text-white transition-colors">{t("footer.categories")}</Link></li>
            <li><Link href="/products?featured=true" className="hover:text-white transition-colors">{t("footer.featured")}</Link></li>
            <li><Link href="/about" className="hover:text-white transition-colors">{t("footer.about")}</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold mb-4 uppercase tracking-wider text-sm">{t("footer.support")}</h4>
          <ul className="space-y-2 text-sm text-background/70">
            <li><Link href="/contact" className="hover:text-white transition-colors">{t("footer.contactUs")}</Link></li>
            <li><Link href="/faq" className="hover:text-white transition-colors">{t("footer.faq")}</Link></li>
            <li><Link href="/returns" className="hover:text-white transition-colors">{t("footer.returns")}</Link></li>
            <li><Link href="/shipping-policy" className="hover:text-white transition-colors">{t("footer.shippingPolicy")}</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold mb-4 uppercase tracking-wider text-sm">{t("footer.legal")}</h4>
          <ul className="space-y-2 text-sm text-background/70 mb-6">
            <li><Link href="/privacy-policy" className="hover:text-white transition-colors">{t("footer.privacyPolicy")}</Link></li>
            <li><Link href="/terms" className="hover:text-white transition-colors">{t("footer.terms")}</Link></li>
          </ul>

          <h4 className="font-bold mb-3 uppercase tracking-wider text-sm">{t("footer.newsletter")}</h4>
          <p className="text-background/70 text-xs mb-3">{t("footer.newsletterDesc")}</p>
          <form onSubmit={handleSubscribe} className="flex flex-col gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("footer.emailPlaceholder")}
              required
              className="bg-background/10 border border-background/20 text-white placeholder:text-background/50 px-3 py-2 text-sm w-full focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {loading ? t("footer.subscribing") : t("footer.subscribe")}
            </button>
          </form>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-10 pt-8 border-t border-background/10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-background/50">
        <p>&copy; {new Date().getFullYear()} Velora. {t("footer.allRightsReserved")}</p>
        <div className="flex gap-4">
          <Link href="/privacy-policy" className="hover:text-background/80 transition-colors">{t("footer.privacy")}</Link>
          <Link href="/terms" className="hover:text-background/80 transition-colors">{t("footer.termsShort")}</Link>
        </div>
      </div>
    </footer>
  );
}

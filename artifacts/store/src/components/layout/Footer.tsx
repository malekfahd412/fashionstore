import React, { useState } from "react";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function Footer() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const isAr = language === "ar";

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
          toast({ title: isAr ? "أنت مشترك بالفعل!" : "Already subscribed!", description: isAr ? "بريدك الإلكتروني مسجل بالفعل." : "This email is already on our list." });
        } else {
          throw new Error(data.error || "Failed");
        }
      } else {
        toast({ title: isAr ? "تم الاشتراك بنجاح!" : "Successfully subscribed!", description: isAr ? "شكراً لاشتراكك في نشرتنا الإخبارية." : "Thank you for subscribing to our newsletter." });
        setEmail("");
      }
    } catch {
      toast({ title: isAr ? "حدث خطأ" : "Something went wrong", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="bg-foreground text-background py-12 mt-auto">
      <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-2">
          <h3 className="font-serif text-2xl font-bold mb-4">LUXE</h3>
          <p className="text-background/70 text-sm mb-4">
            {isAr ? "منصة أزياء راقية تجمع أفضل الماركات والمصممين من جميع أنحاء العالم." : "Premium fashion marketplace bringing you the finest curated collections from top vendors worldwide."}
          </p>
          <div className="flex gap-3">
            {["IG", "FB", "TW", "TK"].map((s) => (
              <a key={s} href="#" className="w-8 h-8 border border-background/30 flex items-center justify-center hover:bg-background/10 transition-colors text-xs font-medium text-background/70 hover:text-white">
                {s}
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-bold mb-4 uppercase tracking-wider text-sm">{isAr ? "تسوق" : "Shop"}</h4>
          <ul className="space-y-2 text-sm text-background/70">
            <li><Link href="/products" className="hover:text-white transition-colors">{isAr ? "جميع المنتجات" : "All Products"}</Link></li>
            <li><Link href="/categories" className="hover:text-white transition-colors">{isAr ? "الفئات" : "Categories"}</Link></li>
            <li><Link href="/products?featured=true" className="hover:text-white transition-colors">{isAr ? "المميز" : "Featured"}</Link></li>
            <li><Link href="/about" className="hover:text-white transition-colors">{isAr ? "من نحن" : "About Us"}</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold mb-4 uppercase tracking-wider text-sm">{isAr ? "دعم" : "Support"}</h4>
          <ul className="space-y-2 text-sm text-background/70">
            <li><Link href="/contact" className="hover:text-white transition-colors">{isAr ? "تواصل معنا" : "Contact Us"}</Link></li>
            <li><Link href="/faq" className="hover:text-white transition-colors">{isAr ? "الأسئلة الشائعة" : "FAQ"}</Link></li>
            <li><Link href="/returns" className="hover:text-white transition-colors">{isAr ? "الإرجاع والاستبدال" : "Returns & Exchanges"}</Link></li>
            <li><Link href="/shipping-policy" className="hover:text-white transition-colors">{isAr ? "سياسة الشحن" : "Shipping Policy"}</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold mb-4 uppercase tracking-wider text-sm">{isAr ? "قانوني" : "Legal"}</h4>
          <ul className="space-y-2 text-sm text-background/70 mb-6">
            <li><Link href="/privacy-policy" className="hover:text-white transition-colors">{isAr ? "سياسة الخصوصية" : "Privacy Policy"}</Link></li>
            <li><Link href="/terms" className="hover:text-white transition-colors">{isAr ? "الشروط والأحكام" : "Terms & Conditions"}</Link></li>
          </ul>

          <h4 className="font-bold mb-3 uppercase tracking-wider text-sm">{isAr ? "النشرة الإخبارية" : "Newsletter"}</h4>
          <p className="text-background/70 text-xs mb-3">
            {isAr ? "اشترك للحصول على العروض الحصرية." : "Subscribe for exclusive deals and updates."}
          </p>
          <form onSubmit={handleSubscribe} className="flex flex-col gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={isAr ? "بريدك الإلكتروني" : "your@email.com"}
              required
              className="bg-background/10 border border-background/20 text-white placeholder:text-background/50 px-3 py-2 text-sm w-full focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {loading ? (isAr ? "جاري..." : "...") : (isAr ? "اشترك" : "Subscribe")}
            </button>
          </form>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-10 pt-8 border-t border-background/10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-background/50">
        <p>&copy; {new Date().getFullYear()} LUXE Fashion Marketplace. {isAr ? "جميع الحقوق محفوظة." : "All rights reserved."}</p>
        <div className="flex gap-4">
          <Link href="/privacy-policy" className="hover:text-background/80 transition-colors">{isAr ? "الخصوصية" : "Privacy"}</Link>
          <Link href="/terms" className="hover:text-background/80 transition-colors">{isAr ? "الشروط" : "Terms"}</Link>
        </div>
      </div>
    </footer>
  );
}

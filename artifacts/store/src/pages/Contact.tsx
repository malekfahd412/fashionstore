import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useSEO } from "@/hooks/useSEO";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface PublicSettings {
  contact_email?: string;
  contact_phone?: string;
  contact_address?: string;
  contact_address_ar?: string;
  social_facebook?: string;
  social_instagram?: string;
  social_twitter?: string;
  social_tiktok?: string;
}

export default function Contact() {
  const { language } = useLanguage();
  useSEO({ title: "Contact Us", description: "Get in touch with Velora. We're here to help with your questions and feedback." });
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [settings, setSettings] = useState<PublicSettings>({});
  const isAr = language === "ar";

  useEffect(() => {
    void fetch(`${BASE}/api/settings`)
      .then(r => r.json() as Promise<PublicSettings>)
      .then(data => setSettings(data))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast({ title: isAr ? "يرجى ملء الحقول المطلوبة" : "Please fill in all required fields", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, phone: form.phone || undefined, subject: form.subject || undefined, message: form.message }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to send message");
      toast({ title: isAr ? "تم إرسال رسالتك بنجاح!" : "Message sent!", description: isAr ? "سنرد عليك في أقرب وقت ممكن." : "We'll get back to you within 1–2 business days." });
      setForm({ name: "", email: "", phone: "", subject: "", message: "" });
      setSent(true);
    } catch (err) {
      toast({ title: isAr ? "حدث خطأ" : "Something went wrong", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const contactItems = [
    settings.contact_email && {
      label: isAr ? "البريد الإلكتروني" : "EMAIL",
      value: settings.contact_email,
    },
    settings.contact_phone && {
      label: isAr ? "الهاتف" : "PHONE",
      value: settings.contact_phone,
    },
    (settings.contact_address || settings.contact_address_ar) && {
      label: isAr ? "العنوان" : "ADDRESS",
      value: isAr ? (settings.contact_address_ar || settings.contact_address || "") : (settings.contact_address || ""),
    },
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  const socials = [
    { key: "social_instagram", label: "INSTAGRAM", href: settings.social_instagram },
    { key: "social_facebook", label: "FACEBOOK", href: settings.social_facebook },
    { key: "social_twitter", label: "TWITTER", href: settings.social_twitter },
    { key: "social_tiktok", label: "TIKTOK", href: settings.social_tiktok },
  ].filter(s => s.href);

  return (
    <div className="bg-background min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-20">
          <h1 className="font-serif text-5xl md:text-7xl font-bold mb-6">{isAr ? "تواصل معنا" : "Contact"}</h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto uppercase tracking-widest">
            {isAr ? "نحن هنا للمساعدة. تواصل معنا وسنرد عليك في أقرب وقت ممكن." : "We are here to assist you. Reach out to our team."}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24">
          {/* Form Side */}
          <div className="order-2 lg:order-1">
            <h2 className="font-serif text-2xl font-bold mb-8">{isAr ? "أرسل رسالة" : "Send a Message"}</h2>

            {sent ? (
              <div className="border border-border p-12 text-center space-y-4">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <h3 className="font-serif text-2xl">{isAr ? "تم الاستلام" : "Received"}</h3>
                <p className="text-muted-foreground text-sm tracking-wide">{isAr ? "سنرد عليك خلال 1-2 يوم عمل." : "We'll get back to you within 1–2 business days."}</p>
                <button onClick={() => setSent(false)} className="velora-link mt-8 text-xs uppercase tracking-widest">
                  {isAr ? "إرسال رسالة أخرى" : "Send another"}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="velora-label">{isAr ? "الاسم *" : "Name *"}</label>
                    <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={isAr ? "اسمك الكامل" : "Jane Doe"} className="rounded-none h-12 border-border focus-visible:ring-1 focus-visible:ring-primary bg-transparent" required />
                  </div>
                  <div className="space-y-2">
                    <label className="velora-label">{isAr ? "رقم الهاتف" : "Phone"}</label>
                    <Input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder={isAr ? "+20 1xx xxx xxxx" : "+20 1xx xxx xxxx"} className="rounded-none h-12 border-border focus-visible:ring-1 focus-visible:ring-primary bg-transparent" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="velora-label">{isAr ? "البريد الإلكتروني *" : "Email *"}</label>
                  <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder={isAr ? "بريدك الإلكتروني" : "jane@example.com"} className="rounded-none h-12 border-border focus-visible:ring-1 focus-visible:ring-primary bg-transparent" required />
                </div>
                <div className="space-y-2">
                  <label className="velora-label">{isAr ? "الموضوع" : "Subject"}</label>
                  <Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder={isAr ? "موضوع رسالتك" : "Order Inquiry"} className="rounded-none h-12 border-border focus-visible:ring-1 focus-visible:ring-primary bg-transparent" />
                </div>
                <div className="space-y-2">
                  <label className="velora-label">{isAr ? "الرسالة *" : "Message *"}</label>
                  <textarea
                    value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    placeholder={isAr ? "اكتب رسالتك هنا..." : "How can we help you?"}
                    rows={5}
                    required
                    minLength={5}
                    className="w-full border border-border bg-transparent px-3 py-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary resize-none rounded-none"
                  />
                </div>
                <Button type="submit" disabled={loading} className="velora-btn-primary w-full h-12 mt-4">
                  {loading ? (isAr ? "جاري الإرسال..." : "Sending...") : (isAr ? "إرسال الرسالة" : "Submit")}
                </Button>
              </form>
            )}
          </div>

          {/* Info Side */}
          <div className="order-1 lg:order-2 space-y-16 lg:pl-12">
            <div>
              <h2 className="font-serif text-2xl font-bold mb-8">{isAr ? "المقر الرئيسي" : "Headquarters"}</h2>
              {contactItems.length > 0 ? (
                <div className="space-y-8">
                  {contactItems.map(({ label, value }) => (
                    <div key={label}>
                      <h3 className="velora-label text-muted-foreground mb-2">{label}</h3>
                      <p className="text-sm font-medium leading-relaxed">{value}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm tracking-wide">
                  {isAr ? "تواصل معنا عبر النموذج." : "Please use the form to get in touch."}
                </p>
              )}
            </div>

            <div>
              <h2 className="font-serif text-2xl font-bold mb-8">{isAr ? "ساعات العمل" : "Business Hours"}</h2>
              <div className="space-y-4 text-sm font-medium">
                <div className="flex justify-between border-b border-border pb-4">
                  <span className="text-muted-foreground uppercase tracking-wider text-xs">{isAr ? "الأحد – الخميس" : "Sunday – Thursday"}</span>
                  <span>{isAr ? "9 ص – 6 م" : "9:00 AM – 6:00 PM"}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-4">
                  <span className="text-muted-foreground uppercase tracking-wider text-xs">{isAr ? "الجمعة – السبت" : "Friday – Saturday"}</span>
                  <span>{isAr ? "10 ص – 4 م" : "10:00 AM – 4:00 PM"}</span>
                </div>
              </div>
            </div>

            {socials.length > 0 && (
              <div>
                <h2 className="font-serif text-2xl font-bold mb-8">{isAr ? "تابعنا" : "Social"}</h2>
                <div className="flex flex-col gap-4">
                  {socials.map((s) => (
                    <a key={s.key} href={s.href} target="_blank" rel="noopener noreferrer" className="velora-link text-xs uppercase tracking-widest self-start">
                      {s.label}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

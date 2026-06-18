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
    <div className="bg-background min-h-screen pt-32 pb-32">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="text-center mb-32">
          <p className="velora-label text-accent mb-6">CLIENT SERVICES</p>
          <h1 className="velora-heading text-6xl md:text-8xl mb-8">{isAr ? "تواصل معنا" : "Let's Talk."}</h1>
          <p className="text-muted-foreground text-[10px] uppercase tracking-[0.2em] max-w-xl mx-auto leading-loose">
            {isAr ? "نحن هنا للمساعدة. تواصل معنا وسنرد عليك في أقرب وقت ممكن." : "Our client advisors are available to assist you with any inquiries or bespoke requests."}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-24 lg:gap-32">
          {/* Form Side */}
          <div className="order-2 lg:order-1 bg-white border border-border p-10 md:p-16">
            <h2 className="velora-heading text-3xl mb-12">{isAr ? "أرسل رسالة" : "Send a Message"}</h2>

            {sent ? (
              <div className="py-12 text-center space-y-8">
                <div className="w-16 h-16 bg-accent text-accent-foreground rounded-full flex items-center justify-center mx-auto transition-transform duration-500 scale-110">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div className="space-y-4">
                  <h3 className="velora-heading text-3xl">{isAr ? "تم الاستلام" : "Received"}</h3>
                  <p className="text-muted-foreground text-[10px] uppercase tracking-widest">{isAr ? "سنرد عليك خلال 1-2 يوم عمل." : "We'll get back to you within 1–2 business days."}</p>
                </div>
                <div className="pt-8">
                  <button onClick={() => setSent(false)} className="velora-link">
                    {isAr ? "إرسال رسالة أخرى" : "Send another inquiry"}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-12">
                <div className="grid sm:grid-cols-2 gap-12">
                  <div className="space-y-4">
                    <label className="velora-label">{isAr ? "الاسم *" : "FULL NAME *"}</label>
                    <Input 
                      value={form.name} 
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))} 
                      placeholder={isAr ? "اسمك الكامل" : "Jane Doe"} 
                      className="w-full bg-transparent border-b border-border pb-4 text-sm font-light outline-none focus:border-accent transition-colors placeholder:text-muted-foreground/20 rounded-none h-auto border-t-0 border-x-0 focus-visible:ring-0 focus-visible:border-accent" 
                      required 
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="velora-label">{isAr ? "رقم الهاتف" : "PHONE"}</label>
                    <Input 
                      type="tel" 
                      value={form.phone} 
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} 
                      placeholder={isAr ? "+20 1xx xxx xxxx" : "+20 1xx xxx xxxx"} 
                      className="w-full bg-transparent border-b border-border pb-4 text-sm font-light outline-none focus:border-accent transition-colors placeholder:text-muted-foreground/20 rounded-none h-auto border-t-0 border-x-0 focus-visible:ring-0 focus-visible:border-accent" 
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="velora-label">{isAr ? "البريد الإلكتروني *" : "EMAIL ADDRESS *"}</label>
                  <Input 
                    type="email" 
                    value={form.email} 
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))} 
                    placeholder={isAr ? "بريدك الإلكتروني" : "jane@example.com"} 
                    className="w-full bg-transparent border-b border-border pb-4 text-sm font-light outline-none focus:border-accent transition-colors placeholder:text-muted-foreground/20 rounded-none h-auto border-t-0 border-x-0 focus-visible:ring-0 focus-visible:border-accent" 
                    required 
                  />
                </div>
                <div className="space-y-4">
                  <label className="velora-label">{isAr ? "الموضوع" : "SUBJECT"}</label>
                  <Input 
                    value={form.subject} 
                    onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} 
                    placeholder={isAr ? "موضوع رسالتك" : "Order Inquiry"} 
                    className="w-full bg-transparent border-b border-border pb-4 text-sm font-light outline-none focus:border-accent transition-colors placeholder:text-muted-foreground/20 rounded-none h-auto border-t-0 border-x-0 focus-visible:ring-0 focus-visible:border-accent" 
                  />
                </div>
                <div className="space-y-4">
                  <label className="velora-label">{isAr ? "الرسالة *" : "MESSAGE *"}</label>
                  <textarea
                    value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    placeholder={isAr ? "اكتب رسالتك هنا..." : "How can we help you?"}
                    rows={4}
                    required
                    minLength={5}
                    className="w-full bg-transparent border-b border-border pb-4 text-sm font-light outline-none focus:border-accent transition-colors placeholder:text-muted-foreground/20 resize-none"
                  />
                </div>
                <Button type="submit" disabled={loading} className="velora-btn-primary w-full h-14 mt-8">
                  {loading ? (isAr ? "جاري الإرسال..." : "SENDING...") : (isAr ? "إرسال الرسالة" : "SEND MESSAGE")}
                </Button>
              </form>
            )}
          </div>

          {/* Info Side */}
          <div className="order-1 lg:order-2 space-y-20 lg:pt-16 lg:pl-16">
            <div>
              <h2 className="velora-heading text-3xl mb-12">{isAr ? "المقر الرئيسي" : "Our Maison"}</h2>
              {contactItems.length > 0 ? (
                <div className="space-y-12">
                  {contactItems.map(({ label, value }) => (
                    <div key={label}>
                      <h3 className="velora-label text-accent mb-4">{label}</h3>
                      <p className="text-lg font-light leading-relaxed">{value}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-[10px] uppercase tracking-widest">
                  {isAr ? "تواصل معنا عبر النموذج." : "Please use the form to get in touch with our concierge."}
                </p>
              )}
            </div>

            <div>
              <h2 className="velora-heading text-3xl mb-12">{isAr ? "ساعات العمل" : "Concierge Hours"}</h2>
              <div className="space-y-6 text-[13px] font-light">
                <div className="flex justify-between border-b border-border pb-4">
                  <span className="velora-label text-muted-foreground">{isAr ? "الأحد – الخميس" : "Sunday – Thursday"}</span>
                  <span>{isAr ? "9 ص – 6 م" : "9:00 AM – 6:00 PM"}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-4">
                  <span className="velora-label text-muted-foreground">{isAr ? "الجمعة – السبت" : "Friday – Saturday"}</span>
                  <span>{isAr ? "10 ص – 4 م" : "10:00 AM – 4:00 PM"}</span>
                </div>
              </div>
            </div>

            {socials.length > 0 && (
              <div>
                <h2 className="velora-heading text-3xl mb-12">{isAr ? "تابعنا" : "Social Presence"}</h2>
                <div className="flex flex-col gap-6">
                  {socials.map((s) => (
                    <a key={s.key} href={s.href} target="_blank" rel="noopener noreferrer" className="velora-link self-start">
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

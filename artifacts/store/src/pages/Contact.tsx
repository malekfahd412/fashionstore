import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Contact() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to send message");
      toast({ title: language === "ar" ? "تم إرسال رسالتك بنجاح!" : "Message sent successfully!", description: language === "ar" ? "سنرد عليك في أقرب وقت ممكن." : "We'll get back to you as soon as possible." });
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch {
      toast({ title: language === "ar" ? "حدث خطأ" : "Something went wrong", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-6xl">
      <div className="text-center mb-12">
        <h1 className="font-serif text-4xl font-bold mb-4">{language === "ar" ? "تواصل معنا" : "Contact Us"}</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          {language === "ar" ? "نحن هنا للمساعدة. تواصل معنا وسنرد عليك في أقرب وقت ممكن." : "We're here to help. Reach out to us and we'll respond as soon as possible."}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-12">
        <div className="space-y-8">
          <div>
            <h2 className="font-serif text-2xl font-bold mb-6">{language === "ar" ? "معلومات التواصل" : "Get in Touch"}</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 border border-border">
                <div className="text-primary mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                </div>
                <div>
                  <p className="font-medium text-sm">{language === "ar" ? "البريد الإلكتروني" : "Email"}</p>
                  <p className="text-muted-foreground text-sm">support@luxefashion.com</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 border border-border">
                <div className="text-primary mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.62 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                </div>
                <div>
                  <p className="font-medium text-sm">{language === "ar" ? "الهاتف" : "Phone"}</p>
                  <p className="text-muted-foreground text-sm">+20 100 000 0000</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 border border-border">
                <div className="text-primary mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
                <div>
                  <p className="font-medium text-sm">{language === "ar" ? "العنوان" : "Address"}</p>
                  <p className="text-muted-foreground text-sm">{language === "ar" ? "القاهرة، مصر" : "Cairo, Egypt"}</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-4">{language === "ar" ? "تابعنا" : "Follow Us"}</h3>
            <div className="flex gap-3">
              {["Instagram", "Facebook", "Twitter", "TikTok"].map((s) => (
                <a key={s} href="#" className="w-10 h-10 border border-border flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors text-xs font-medium">
                  {s[0]}
                </a>
              ))}
            </div>
          </div>

          <div className="border border-border bg-muted/30 aspect-video flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2 opacity-40"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              <p className="text-sm">{language === "ar" ? "خريطة الموقع" : "Map Placeholder"}</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="font-serif text-2xl font-bold mb-6">{language === "ar" ? "أرسل لنا رسالة" : "Send Us a Message"}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">{language === "ar" ? "الاسم *" : "Name *"}</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={language === "ar" ? "اسمك الكامل" : "Your full name"} className="rounded-none" required />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">{language === "ar" ? "البريد الإلكتروني *" : "Email *"}</label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder={language === "ar" ? "بريدك الإلكتروني" : "your@email.com"} className="rounded-none" required />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">{language === "ar" ? "الموضوع" : "Subject"}</label>
              <Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder={language === "ar" ? "موضوع رسالتك" : "What is this about?"} className="rounded-none" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">{language === "ar" ? "الرسالة *" : "Message *"}</label>
              <textarea
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                placeholder={language === "ar" ? "اكتب رسالتك هنا..." : "Write your message here..."}
                rows={6}
                required
                className="w-full border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none rounded-none"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full rounded-none">
              {loading ? (language === "ar" ? "جاري الإرسال..." : "Sending...") : (language === "ar" ? "إرسال الرسالة" : "Send Message")}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

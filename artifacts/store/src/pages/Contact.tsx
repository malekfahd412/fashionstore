import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Contact() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const isAr = language === "ar";

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

  return (
    <div className="container mx-auto px-4 py-16 max-w-6xl">
      <div className="text-center mb-12">
        <h1 className="font-serif text-4xl font-bold mb-4">{isAr ? "تواصل معنا" : "Contact Us"}</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          {isAr ? "نحن هنا للمساعدة. تواصل معنا وسنرد عليك في أقرب وقت ممكن." : "We're here to help. Reach out to us and we'll respond as soon as possible."}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-12">
        {/* Left: Info */}
        <div className="space-y-8">
          <div>
            <h2 className="font-serif text-2xl font-bold mb-6">{isAr ? "معلومات التواصل" : "Get in Touch"}</h2>
            <div className="space-y-4">
              {[
                {
                  icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>,
                  label: isAr ? "البريد الإلكتروني" : "Email",
                  value: "support@luxefashion.com",
                },
                {
                  icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.62 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
                  label: isAr ? "الهاتف" : "Phone",
                  value: "+20 100 000 0000",
                },
                {
                  icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>,
                  label: isAr ? "العنوان" : "Address",
                  value: isAr ? "القاهرة، مصر" : "Cairo, Egypt",
                },
              ].map(({ icon, label, value }) => (
                <div key={label} className="flex items-start gap-4 p-4 border border-border">
                  <div className="text-primary mt-0.5">{icon}</div>
                  <div>
                    <p className="font-medium text-sm">{label}</p>
                    <p className="text-muted-foreground text-sm">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-4">{isAr ? "تابعنا" : "Follow Us"}</h3>
            <div className="flex gap-3">
              {["Instagram", "Facebook", "Twitter", "TikTok"].map((s) => (
                <a key={s} href="#" className="w-10 h-10 border border-border flex items-center justify-center hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors text-xs font-medium">
                  {s[0]}
                </a>
              ))}
            </div>
          </div>

          <div className="border border-border bg-muted/30 p-6 space-y-3">
            <h3 className="font-medium">{isAr ? "ساعات العمل" : "Business Hours"}</h3>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>{isAr ? "الأحد – الخميس: 9 ص – 6 م" : "Sun – Thu: 9:00 AM – 6:00 PM"}</p>
              <p>{isAr ? "الجمعة – السبت: 10 ص – 4 م" : "Fri – Sat: 10:00 AM – 4:00 PM"}</p>
            </div>
          </div>
        </div>

        {/* Right: Form */}
        <div>
          <h2 className="font-serif text-2xl font-bold mb-6">{isAr ? "أرسل لنا رسالة" : "Send Us a Message"}</h2>

          {sent ? (
            <div className="border border-green-200 bg-green-50 p-8 text-center space-y-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h3 className="font-bold text-lg text-green-800">{isAr ? "تم إرسال رسالتك!" : "Message sent!"}</h3>
              <p className="text-green-700 text-sm">{isAr ? "سنرد عليك خلال 1-2 يوم عمل." : "We'll get back to you within 1–2 business days."}</p>
              <button onClick={() => setSent(false)} className="mt-2 text-sm text-green-700 underline hover:no-underline">
                {isAr ? "إرسال رسالة أخرى" : "Send another message"}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">{isAr ? "الاسم *" : "Name *"}</label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={isAr ? "اسمك الكامل" : "Your full name"} className="rounded-none" required />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">{isAr ? "رقم الهاتف" : "Phone"}</label>
                  <Input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder={isAr ? "+20 1xx xxx xxxx" : "+20 1xx xxx xxxx"} className="rounded-none" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">{isAr ? "البريد الإلكتروني *" : "Email *"}</label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder={isAr ? "بريدك الإلكتروني" : "your@email.com"} className="rounded-none" required />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">{isAr ? "الموضوع" : "Subject"}</label>
                <Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder={isAr ? "موضوع رسالتك" : "What is this about?"} className="rounded-none" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">{isAr ? "الرسالة *" : "Message *"}</label>
                <textarea
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  placeholder={isAr ? "اكتب رسالتك هنا..." : "Write your message here..."}
                  rows={6}
                  required
                  minLength={5}
                  className="w-full border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none rounded-none"
                />
                <p className="text-xs text-muted-foreground mt-1">{form.message.length}/2000</p>
              </div>
              <Button type="submit" disabled={loading} className="w-full rounded-none">
                {loading ? (isAr ? "جاري الإرسال..." : "Sending...") : (isAr ? "إرسال الرسالة" : "Send Message")}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                {isAr ? "يمكنك أيضاً فتح تذكرة دعم من " : "You can also open a support ticket from "}
                <a href="/dashboard/customer" className="underline hover:text-foreground">{isAr ? "لوحة التحكم" : "your dashboard"}</a>.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQuery } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface FaqItem {
  id: number;
  category: string;
  questionEn: string;
  questionAr: string;
  answerEn: string;
  answerAr: string;
  sortOrder: number;
  active: boolean;
}

const CATEGORIES = [
  { id: "all", en: "All", ar: "الكل" },
  { id: "orders", en: "Orders", ar: "الطلبات" },
  { id: "shipping", en: "Shipping", ar: "الشحن" },
  { id: "payments", en: "Payments", ar: "المدفوعات" },
  { id: "returns", en: "Returns", ar: "الإرجاع" },
  { id: "account", en: "Account", ar: "الحساب" },
];

const FALLBACK_FAQS: FaqItem[] = [
  { id: 1, category: "orders", questionEn: "How do I track my order?", questionAr: "كيف أتتبع طلبي؟", answerEn: "Once your order is shipped, you'll receive a tracking link via email. You can also track it from your account dashboard under 'My Orders'.", answerAr: "بمجرد شحن طلبك، ستتلقى رابط تتبع عبر البريد الإلكتروني. يمكنك أيضاً تتبعه من لوحة التحكم تحت 'طلباتي'.", sortOrder: 0, active: true },
  { id: 2, category: "orders", questionEn: "Can I cancel or modify my order?", questionAr: "هل يمكنني إلغاء أو تعديل طلبي؟", answerEn: "Orders can be cancelled or modified within 1 hour of placement. Contact our support team immediately if you need changes.", answerAr: "يمكن إلغاء أو تعديل الطلبات خلال ساعة من الطلب. تواصل مع فريق الدعم فوراً إذا كنت بحاجة إلى تغييرات.", sortOrder: 1, active: true },
  { id: 3, category: "shipping", questionEn: "How long does delivery take?", questionAr: "كم يستغرق التوصيل؟", answerEn: "Standard delivery takes 3-5 business days. Express delivery is available for 1-2 business days.", answerAr: "يستغرق التوصيل العادي 3-5 أيام عمل. التوصيل السريع متاح خلال 1-2 يوم عمل.", sortOrder: 0, active: true },
  { id: 4, category: "payments", questionEn: "What payment methods do you accept?", questionAr: "ما طرق الدفع التي تقبلونها؟", answerEn: "We accept credit/debit cards, Paymob, Vodafone Cash, and Cash on Delivery (COD).", answerAr: "نقبل بطاقات الائتمان/الخصم، وPaymob، وفودافون كاش، والدفع عند الاستلام.", sortOrder: 0, active: true },
  { id: 5, category: "returns", questionEn: "What is your return policy?", questionAr: "ما هي سياسة الإرجاع؟", answerEn: "We accept returns within 14 days of delivery. Items must be unworn, unwashed, and in original packaging.", answerAr: "نقبل الإرجاع خلال 14 يوماً من التسليم. يجب أن تكون المنتجات غير مستخدمة وغير مغسولة وفي عبوتها الأصلية.", sortOrder: 0, active: true },
  { id: 6, category: "account", questionEn: "How do I create an account?", questionAr: "كيف أنشئ حساباً؟", answerEn: "Click 'Register' in the top navigation, fill in your details, and you're good to go.", answerAr: "انقر على 'تسجيل' في التنقل العلوي، أدخل بياناتك، وستكون جاهزاً.", sortOrder: 0, active: true },
  { id: 7, category: "account", questionEn: "I forgot my password. What do I do?", questionAr: "نسيت كلمة المرور. ماذا أفعل؟", answerEn: "Click 'Forgot Password' on the login page and we'll send a reset link to your email.", answerAr: "انقر على 'نسيت كلمة المرور' في صفحة تسجيل الدخول وسنرسل رابط إعادة التعيين إلى بريدك.", sortOrder: 1, active: true },
];

export default function FAQ() {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);

  const { data: apiFaqs } = useQuery<FaqItem[]>({
    queryKey: ["faqs-public", activeCategory],
    queryFn: async () => {
      const qs = activeCategory !== "all" ? `?category=${activeCategory}` : "";
      const res = await fetch(`${BASE}/api/faq${qs}`);
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<FaqItem[]>;
    },
    staleTime: 5 * 60 * 1000,
  });

  const allFaqs = (apiFaqs && apiFaqs.length > 0) ? apiFaqs : FALLBACK_FAQS;

  const filtered = allFaqs.filter(f => {
    const matchCat = activeCategory === "all" || f.category === activeCategory;
    const q = isAr ? f.questionAr : f.questionEn;
    const a = isAr ? f.answerAr : f.answerEn;
    const matchSearch = !search || q.toLowerCase().includes(search.toLowerCase()) || a.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <div className="text-center mb-12">
        <h1 className="font-serif text-4xl font-bold mb-4">{isAr ? "الأسئلة الشائعة" : "Frequently Asked Questions"}</h1>
        <p className="text-muted-foreground text-lg">{isAr ? "ابحث عن إجابات لأكثر الأسئلة شيوعاً" : "Find answers to the most common questions"}</p>
      </div>

      <div className="relative mb-8">
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setOpenId(null); }}
          placeholder={isAr ? "ابحث في الأسئلة..." : "Search questions..."}
          className="w-full border border-border bg-background px-4 py-3 text-sm ps-10 focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <svg className="absolute start-3 top-3.5 w-4 h-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        {search && <button onClick={() => setSearch("")} className="absolute end-3 top-3 text-muted-foreground hover:text-foreground">✕</button>}
      </div>

      <div className="flex flex-wrap gap-2 mb-10 justify-center">
        {CATEGORIES.map(cat => (
          <button key={cat.id} onClick={() => { setActiveCategory(cat.id); setOpenId(null); }}
            className={`px-4 py-2 text-sm font-medium transition-colors border ${activeCategory === cat.id ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>
            {isAr ? cat.ar : cat.en}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">{isAr ? "لا توجد نتائج." : "No results found."}</p>
          {search && <button onClick={() => setSearch("")} className="mt-2 text-sm text-primary underline">{isAr ? "مسح البحث" : "Clear search"}</button>}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(faq => (
            <div key={faq.id} className="border border-border">
              <button onClick={() => setOpenId(openId === faq.id ? null : faq.id)}
                className="w-full flex items-center justify-between px-6 py-4 text-left font-medium hover:bg-muted/50 transition-colors">
                <span className="text-sm leading-relaxed">{isAr ? faq.questionAr : faq.questionEn}</span>
                <span className="text-primary ms-4 shrink-0 text-lg">{openId === faq.id ? "−" : "+"}</span>
              </button>
              {openId === faq.id && (
                <div className="px-6 pb-5 text-muted-foreground text-sm leading-relaxed border-t border-border pt-4">
                  {isAr ? faq.answerAr : faq.answerEn}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-16 p-8 border border-border bg-muted/20 text-center">
        <h3 className="font-serif text-xl font-bold mb-2">{isAr ? "لم تجد إجابتك؟" : "Didn't find your answer?"}</h3>
        <p className="text-muted-foreground mb-4">{isAr ? "تواصل مع فريق الدعم وسنساعدك." : "Contact our support team and we'll help you out."}</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <a href="/contact" className="inline-block px-6 py-2.5 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            {isAr ? "تواصل معنا" : "Contact Us"}
          </a>
          <a href="/dashboard/customer" className="inline-block px-6 py-2.5 border border-border text-sm font-medium hover:bg-muted transition-colors">
            {isAr ? "فتح تذكرة دعم" : "Open Support Ticket"}
          </a>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSEO } from "@/hooks/useSEO";
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
  const { language, t } = useLanguage();
  useSEO({ title: t("home.faqTitle"), description: "Frequently asked questions about Velora orders, shipping, and more." });
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
    <div className="bg-background min-h-screen pt-32 pb-32">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="text-center mb-24">
          <p className="velora-label text-accent mb-6">INFORMATION CENTER</p>
          <h1 className="velora-heading text-6xl md:text-8xl mb-8">{isAr ? "الأسئلة الشائعة" : "Knowledge."}</h1>
          <p className="text-muted-foreground text-[10px] uppercase tracking-[0.2em] max-w-xl mx-auto leading-loose">
            {isAr ? "ابحث عن إجابات لأكثر الأسئلة شيوعاً" : "Everything you need to know about the Velora experience, from curation to delivery."}
          </p>
        </div>

        <div className="relative mb-16 max-w-2xl mx-auto">
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setOpenId(null); }}
            placeholder={isAr ? "ابحث في الأسئلة..." : "SEARCH KNOWLEDGE BASE..."}
            className="w-full border-b border-border bg-transparent px-0 py-6 text-[10px] uppercase tracking-[0.25em] focus:outline-none focus:border-accent transition-colors placeholder:text-muted-foreground/30"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute end-0 top-1/2 -translate-y-1/2 velora-link">
              {isAr ? "مسح" : "CLEAR"}
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-8 mb-20 justify-center">
          {CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => { setActiveCategory(cat.id); setOpenId(null); }}
              className={`text-[10px] uppercase tracking-[0.2em] transition-all duration-300 pb-2 border-b-2 ${activeCategory === cat.id ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {isAr ? cat.ar : cat.en}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-32 border-y border-border">
            <p className="velora-label text-muted-foreground">{isAr ? "لا توجد نتائج." : "No inquiries match your search."}</p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto border-t border-border">
            {filtered.map(faq => (
              <div key={faq.id} className="border-b border-border">
                <button onClick={() => setOpenId(openId === faq.id ? null : faq.id)}
                  className="w-full flex items-center justify-between py-10 text-left hover:text-accent transition-colors group">
                  <span className="velora-heading text-2xl md:text-3xl pr-12">{isAr ? faq.questionAr : faq.questionEn}</span>
                  <span className="shrink-0 text-3xl font-light text-muted-foreground group-hover:text-accent transition-colors">
                    {openId === faq.id ? "−" : "+"}
                  </span>
                </button>
                <div className={`overflow-hidden transition-all duration-500 ease-in-out ${openId === faq.id ? "max-h-[500px] pb-12 opacity-100" : "max-h-0 opacity-0"}`}>
                  <p className="text-muted-foreground text-base font-light leading-relaxed max-w-3xl">
                    {isAr ? faq.answerAr : faq.answerEn}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-32 text-center space-y-10 border-t border-border pt-32">
          <div className="space-y-4">
            <p className="velora-label text-accent">BESPOKE ASSISTANCE</p>
            <h3 className="velora-heading text-4xl">{isAr ? "لم تجد إجابتك؟" : "Still seeking clarity?"}</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed font-light">
              {isAr ? "فريق الدعم لدينا مستعد للمساعدة. تواصل معنا في أي وقت." : "Our dedicated client advisors are available to provide personal guidance for any specific requirements."}
            </p>
          </div>
          <div className="pt-4">
            <Link href="/contact" className="velora-btn-outline px-12 h-14">
              {isAr ? "تواصل معنا" : "CONTACT CONCIERGE"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

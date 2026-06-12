import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const DEFAULT_FAQS = [
  { category: "orders", questionEn: "How do I track my order?", questionAr: "كيف أتتبع طلبي؟", answerEn: "Once your order is shipped, you'll receive a tracking link via email. You can also track it from your account dashboard under 'My Orders'.", answerAr: "بمجرد شحن طلبك، ستتلقى رابط تتبع عبر البريد الإلكتروني. يمكنك أيضاً تتبعه من لوحة التحكم تحت 'طلباتي'." },
  { category: "orders", questionEn: "Can I cancel or modify my order?", questionAr: "هل يمكنني إلغاء أو تعديل طلبي؟", answerEn: "Orders can be cancelled or modified within 1 hour of placement. Contact our support team immediately if you need changes.", answerAr: "يمكن إلغاء أو تعديل الطلبات خلال ساعة من الطلب. تواصل مع فريق الدعم فوراً إذا كنت بحاجة إلى تغييرات." },
  { category: "shipping", questionEn: "How long does delivery take?", questionAr: "كم يستغرق التوصيل؟", answerEn: "Standard delivery takes 3-5 business days. Express delivery is available for 1-2 business days.", answerAr: "يستغرق التوصيل العادي 3-5 أيام عمل. التوصيل السريع متاح خلال 1-2 يوم عمل." },
  { category: "shipping", questionEn: "Do you offer free shipping?", questionAr: "هل تقدمون شحناً مجانياً؟", answerEn: "Yes! Orders over a certain amount qualify for free shipping. Check our current promotions for details.", answerAr: "نعم! الطلبات التي تتجاوز مبلغاً معيناً مؤهلة للشحن المجاني. تحقق من عروضنا الحالية للتفاصيل." },
  { category: "payments", questionEn: "What payment methods do you accept?", questionAr: "ما طرق الدفع التي تقبلونها؟", answerEn: "We accept credit/debit cards, Paymob, Vodafone Cash, and Cash on Delivery (COD).", answerAr: "نقبل بطاقات الائتمان/الخصم، وPaymob، وفودافون كاش، والدفع عند الاستلام." },
  { category: "payments", questionEn: "Is my payment information secure?", questionAr: "هل معلومات الدفع الخاصة بي آمنة؟", answerEn: "Absolutely. All payments are processed through secure, encrypted gateways. We never store your card details.", answerAr: "بالتأكيد. تتم معالجة جميع المدفوعات عبر بوابات آمنة ومشفرة. نحن لا نخزن تفاصيل بطاقتك أبداً." },
  { category: "returns", questionEn: "What is your return policy?", questionAr: "ما هي سياسة الإرجاع؟", answerEn: "We accept returns within 14 days of delivery. Items must be unworn, unwashed, and in original packaging.", answerAr: "نقبل الإرجاع خلال 14 يوماً من التسليم. يجب أن تكون المنتجات غير مستخدمة وغير مغسولة وفي عبوتها الأصلية." },
  { category: "returns", questionEn: "How do I start a return?", questionAr: "كيف أبدأ عملية الإرجاع؟", answerEn: "Contact our support team with your order number and reason for return. We'll guide you through the process.", answerAr: "تواصل مع فريق الدعم برقم طلبك وسبب الإرجاع. سنرشدك خلال العملية." },
  { category: "account", questionEn: "How do I create an account?", questionAr: "كيف أنشئ حساباً؟", answerEn: "Click 'Register' in the top navigation, fill in your details, and you're good to go.", answerAr: "انقر على 'تسجيل' في التنقل العلوي، أدخل بياناتك، وستكون جاهزاً." },
  { category: "account", questionEn: "I forgot my password. What do I do?", questionAr: "نسيت كلمة المرور. ماذا أفعل؟", answerEn: "Click 'Forgot Password' on the login page and we'll send a reset link to your email.", answerAr: "انقر على 'نسيت كلمة المرور' في صفحة تسجيل الدخول وسنرسل رابط إعادة التعيين إلى بريدك." },
];

const CATEGORIES = [
  { id: "all", en: "All", ar: "الكل" },
  { id: "orders", en: "Orders", ar: "الطلبات" },
  { id: "shipping", en: "Shipping", ar: "الشحن" },
  { id: "payments", en: "Payments", ar: "المدفوعات" },
  { id: "returns", en: "Returns", ar: "الإرجاع" },
  { id: "account", en: "Account", ar: "الحساب" },
];

export default function FAQ() {
  const { language } = useLanguage();
  const [activeCategory, setActiveCategory] = useState("all");
  const [openId, setOpenId] = useState<number | null>(null);

  const filtered = DEFAULT_FAQS.filter(f => activeCategory === "all" || f.category === activeCategory);

  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <div className="text-center mb-12">
        <h1 className="font-serif text-4xl font-bold mb-4">{language === "ar" ? "الأسئلة الشائعة" : "Frequently Asked Questions"}</h1>
        <p className="text-muted-foreground text-lg">{language === "ar" ? "ابحث عن إجابات لأكثر الأسئلة شيوعاً" : "Find answers to the most common questions"}</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-10 justify-center">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border ${activeCategory === cat.id ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
          >
            {language === "ar" ? cat.ar : cat.en}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((faq, i) => (
          <div key={i} className="border border-border">
            <button
              onClick={() => setOpenId(openId === i ? null : i)}
              className="w-full flex items-center justify-between px-6 py-4 text-left font-medium hover:bg-muted/50 transition-colors"
            >
              <span>{language === "ar" ? faq.questionAr : faq.questionEn}</span>
              <span className="text-primary ml-4 shrink-0">{openId === i ? "−" : "+"}</span>
            </button>
            {openId === i && (
              <div className="px-6 pb-5 text-muted-foreground text-sm leading-relaxed border-t border-border pt-4">
                {language === "ar" ? faq.answerAr : faq.answerEn}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-16 p-8 border border-border bg-muted/20 text-center">
        <h3 className="font-serif text-xl font-bold mb-2">{language === "ar" ? "لم تجد إجابتك؟" : "Didn't find your answer?"}</h3>
        <p className="text-muted-foreground mb-4">{language === "ar" ? "تواصل مع فريق الدعم وسنساعدك." : "Contact our support team and we'll help you out."}</p>
        <a href="/contact" className="inline-block px-6 py-2.5 bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          {language === "ar" ? "تواصل معنا" : "Contact Us"}
        </a>
      </div>
    </div>
  );
}

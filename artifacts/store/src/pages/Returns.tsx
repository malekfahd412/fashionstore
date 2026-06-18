import { useLanguage } from "@/contexts/LanguageContext";
import { useSEO } from "@/hooks/useSEO";
import { Link } from "wouter";

export default function Returns() {
  const { language, t } = useLanguage();
  useSEO({ title: language === 'ar' ? "سياسة الإرجاع والاستبدال" : "Returns & Exchanges", description: "Learn about Velora's return and exchange policies." });
  const isAr = language === "ar";

  const sections = [
    {
      en: { title: "Return Policy", body: "We accept returns within 14 days of delivery. Items must be unworn, unwashed, undamaged, and in their original packaging with all tags attached." },
      ar: { title: "سياسة الإرجاع", body: "نقبل المرتجعات خلال 14 يوماً من تاريخ التسليم. يجب أن تكون المنتجات غير مستخدمة وغير مغسولة وغير تالفة وفي عبوتها الأصلية مع جميع التذاكر المرفقة." },
    },
    {
      en: { title: "Non-Returnable Items", body: "The following items cannot be returned: underwear & swimwear (for hygiene reasons), pierced jewellery, sale items marked as final sale, and gift cards." },
      ar: { title: "المنتجات غير القابلة للإرجاع", body: "لا يمكن إرجاع المنتجات التالية: الملابس الداخلية وملابس السباحة (لأسباب صحية)، المجوهرات المثقوبة، منتجات البيع النهائي، وبطاقات الهدايا." },
    },
    {
      en: { title: "How to Return", body: "1. Contact our support team via the Contact Us page with your order number and reason for return.\n2. We will provide return instructions and a shipping label within 24 hours.\n3. Pack items securely and drop off at the nearest courier.\n4. Refunds are processed within 5-7 business days of receiving the return." },
      ar: { title: "كيفية الإرجاع", body: "1. تواصل مع فريق الدعم عبر صفحة اتصل بنا مع رقم طلبك وسبب الإرجاع.\n2. سنوفر تعليمات الإرجاع وملصق الشحن خلال 24 ساعة.\n3. احزم المنتجات بأمان وأودعها لدى أقرب ساعي.\n4. تتم معالجة المبالغ المستردة خلال 5-7 أيام عمل من استلام المرتجع." },
    },
    {
      en: { title: "Exchanges", body: "We offer free exchanges for the wrong size or colour within 14 days of delivery. Contact us and we'll arrange pickup and delivery of the replacement." },
      ar: { title: "التبديل", body: "نقدم تبديلاً مجانياً للمقاس أو اللون الخاطئ خلال 14 يوماً من التسليم. تواصل معنا وسنرتب الاستلام وتسليم البديل." },
    },
    {
      en: { title: "Refunds", body: "Refunds are issued to the original payment method. Bank transfers may take up to 7 additional business days depending on your bank. Cash on Delivery orders are refunded via bank transfer." },
      ar: { title: "المبالغ المستردة", body: "تُسترد المبالغ عبر نفس طريقة الدفع الأصلية. قد تستغرق التحويلات البنكية ما يصل إلى 7 أيام عمل إضافية حسب البنك. يتم استرداد طلبات الدفع عند الاستلام عبر تحويل بنكي." },
    },
  ];

  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <div className="text-center mb-12">
        <h1 className="font-serif text-4xl font-bold mb-4">{isAr ? "سياسة الإرجاع والاستبدال" : "Returns & Exchanges"}</h1>
        <p className="text-muted-foreground">{isAr ? "آخر تحديث: يناير 2025" : "Last updated: January 2025"}</p>
      </div>

      <div className="space-y-8">
        {sections.map((section, i) => (
          <div key={i} className="border-b border-border pb-8 last:border-0">
            <h2 className="font-serif text-xl font-bold mb-3">{isAr ? section.ar.title : section.en.title}</h2>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{isAr ? section.ar.body : section.en.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 p-6 border border-border bg-muted/20 text-center">
        <p className="text-sm text-muted-foreground mb-3">{isAr ? "هل لديك سؤال؟" : "Have a question?"}</p>
        <Link href="/contact" className="text-sm font-medium text-primary underline underline-offset-4">{isAr ? "تواصل معنا" : "Contact our support team"}</Link>
      </div>
    </div>
  );
}

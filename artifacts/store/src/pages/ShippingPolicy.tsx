import { useLanguage } from "@/contexts/LanguageContext";
import { useSEO } from "@/hooks/useSEO";
import { Link } from "wouter";

export default function ShippingPolicy() {
  const { language } = useLanguage();
  useSEO({ title: language === 'ar' ? "سياسة الشحن" : "Shipping Policy", description: "Information about Velora's shipping methods and times." });
  const isAr = language === "ar";

  const sections = [
    { en: { title: "Processing Time", body: "Orders are processed within 1-2 business days of payment confirmation. Orders placed after 2 PM or on weekends/holidays will be processed the next business day." }, ar: { title: "وقت المعالجة", body: "تتم معالجة الطلبات خلال 1-2 يوم عمل من تأكيد الدفع. الطلبات المقدمة بعد الساعة 2 مساءً أو في عطلات نهاية الأسبوع/العطلات الرسمية ستتم معالجتها في يوم العمل التالي." } },
    { en: { title: "Delivery Options", body: "Standard Delivery (3-5 business days): Free on orders over the minimum threshold. Express Delivery (1-2 business days): Additional fee applies. Same-Day Delivery: Available in select areas — contact us to check availability." }, ar: { title: "خيارات التوصيل", body: "التوصيل العادي (3-5 أيام عمل): مجاني للطلبات التي تتجاوز الحد الأدنى. التوصيل السريع (1-2 يوم عمل): رسوم إضافية مطبقة. التوصيل في نفس اليوم: متاح في مناطق محددة — تواصل معنا للتحقق من التوافر." } },
    { en: { title: "Order Tracking", body: "Once your order is shipped, you will receive an email with a tracking number. Use this to track your shipment in real time. You can also track orders from your account dashboard." }, ar: { title: "تتبع الطلب", body: "بمجرد شحن طلبك، ستتلقى بريداً إلكترونياً برقم التتبع. استخدمه لتتبع شحنتك في الوقت الفعلي. يمكنك أيضاً تتبع الطلبات من لوحة التحكم الخاصة بحسابك." } },
    { en: { title: "Shipping Costs", body: "Shipping costs are calculated at checkout based on your location and selected delivery method. Free shipping is available for qualifying orders. The exact threshold is shown during checkout." }, ar: { title: "تكاليف الشحن", body: "تُحسب تكاليف الشحن عند الدفع بناءً على موقعك وطريقة التوصيل المختارة. الشحن المجاني متاح للطلبات المؤهلة. يتم عرض الحد الدقيق أثناء الدفع." } },
    { en: { title: "Failed Deliveries", body: "If a delivery attempt fails, the courier will leave a notification. They will attempt delivery twice more before returning the package. You may need to collect from the courier's facility or pay a re-delivery fee." }, ar: { title: "محاولات التوصيل الفاشلة", body: "إذا فشلت محاولة التوصيل، سيترك الساعي إشعاراً. سيحاول التوصيل مرتين أخريين قبل إعادة الطرد. قد تحتاج إلى الاستلام من مرفق الساعي أو دفع رسوم إعادة التوصيل." } },
  ];

  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <div className="text-center mb-12">
        <h1 className="font-serif text-4xl font-bold mb-4">{isAr ? "سياسة الشحن" : "Shipping Policy"}</h1>
        <p className="text-muted-foreground">{isAr ? "آخر تحديث: يناير 2025" : "Last updated: January 2025"}</p>
      </div>
      <div className="space-y-8">
        {sections.map((s, i) => (
          <div key={i} className="border-b border-border pb-8 last:border-0">
            <h2 className="font-serif text-xl font-bold mb-3">{isAr ? s.ar.title : s.en.title}</h2>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{isAr ? s.ar.body : s.en.body}</p>
          </div>
        ))}
      </div>
      <div className="mt-12 p-6 border border-border bg-muted/20 text-center">
        <p className="text-sm text-muted-foreground mb-3">{isAr ? "هل لديك سؤال عن شحنتك؟" : "Have a question about your shipment?"}</p>
        <Link href="/contact" className="text-sm font-medium text-primary underline underline-offset-4">{isAr ? "تواصل معنا" : "Contact our support team"}</Link>
      </div>
    </div>
  );
}

import { useLanguage } from "@/contexts/LanguageContext";

export default function Terms() {
  const { language } = useLanguage();
  const isAr = language === "ar";

  const sections = [
    { en: { title: "Acceptance of Terms", body: "By accessing or using Velora, you agree to be bound by these Terms and Conditions and our Privacy Policy. If you do not agree, please do not use our service." }, ar: { title: "قبول الشروط", body: "باستخدام Velora، فإنك توافق على الالتزام بهذه الشروط والأحكام وسياسة الخصوصية. إذا لم توافق، يرجى عدم استخدام خدمتنا." } },
    { en: { title: "User Accounts", body: "You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized use of your account. We reserve the right to terminate accounts that violate our policies." }, ar: { title: "حسابات المستخدمين", body: "أنت مسؤول عن الحفاظ على سرية بيانات اعتماد حسابك. توافق على إخطارنا فوراً بأي استخدام غير مصرح به لحسابك. نحتفظ بحق إنهاء الحسابات التي تنتهك سياساتنا." } },
    { en: { title: "Products and Pricing", body: "All product descriptions and prices are subject to change without notice. We reserve the right to refuse or cancel orders for any reason, including pricing errors. In such cases, you will receive a full refund." }, ar: { title: "المنتجات والأسعار", body: "جميع أوصاف المنتجات والأسعار عرضة للتغيير دون إشعار. نحتفظ بحق رفض أو إلغاء الطلبات لأي سبب، بما في ذلك أخطاء التسعير. في مثل هذه الحالات، ستحصل على استرداد كامل." } },
    { en: { title: "Intellectual Property", body: "All content on Velora — including text, images, logos, and software — is the property of Velora or its content suppliers and is protected by intellectual property laws." }, ar: { title: "الملكية الفكرية", body: "جميع المحتوى على Velora — بما في ذلك النصوص والصور والشعارات والبرامج — هو ملك لـ Velora أو موردي المحتوى الخاصين بها ومحمي بموجب قوانين الملكية الفكرية." } },
    { en: { title: "Limitation of Liability", body: "Velora shall not be liable for any indirect, incidental, or consequential damages arising from your use of our services. Our total liability shall not exceed the amount paid for the order in question." }, ar: { title: "حدود المسؤولية", body: "لن تكون Velora مسؤولة عن أي أضرار غير مباشرة أو عرضية أو تبعية ناشئة عن استخدامك لخدماتنا. لن تتجاوز مسؤوليتنا الإجمالية المبلغ المدفوع عن الطلب المعني." } },
    { en: { title: "Governing Law", body: "These Terms shall be governed by the laws of Egypt. Any disputes shall be subject to the exclusive jurisdiction of the courts of Cairo, Egypt." }, ar: { title: "القانون المعمول به", body: "تخضع هذه الشروط لقوانين مصر. تخضع أي نزاعات للاختصاص القضائي الحصري لمحاكم القاهرة، مصر." } },
  ];

  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <div className="text-center mb-12">
        <h1 className="font-serif text-4xl font-bold mb-4">{isAr ? "الشروط والأحكام" : "Terms & Conditions"}</h1>
        <p className="text-muted-foreground">{isAr ? "آخر تحديث: يناير 2025" : "Last updated: January 2025"}</p>
      </div>
      <div className="space-y-8">
        {sections.map((s, i) => (
          <div key={i} className="border-b border-border pb-8 last:border-0">
            <h2 className="font-serif text-xl font-bold mb-3">{isAr ? s.ar.title : s.en.title}</h2>
            <p className="text-muted-foreground leading-relaxed">{isAr ? s.ar.body : s.en.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

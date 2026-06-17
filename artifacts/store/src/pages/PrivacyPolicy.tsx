import { useLanguage } from "@/contexts/LanguageContext";

export default function PrivacyPolicy() {
  const { language } = useLanguage();
  const isAr = language === "ar";

  const sections = [
    { en: { title: "Information We Collect", body: "We collect information you provide directly, such as name, email address, shipping address, and payment information. We also collect usage data like pages visited, items viewed, and purchase history." }, ar: { title: "المعلومات التي نجمعها", body: "نجمع المعلومات التي تقدمها مباشرةً مثل الاسم والبريد الإلكتروني وعنوان الشحن ومعلومات الدفع. كما نجمع بيانات الاستخدام مثل الصفحات المزارة والمنتجات المعروضة وسجل المشتريات." } },
    { en: { title: "How We Use Your Information", body: "We use your information to process orders, send order confirmations and updates, provide customer support, send marketing communications (with your consent), improve our services, and comply with legal obligations." }, ar: { title: "كيف نستخدم معلوماتك", body: "نستخدم معلوماتك لمعالجة الطلبات، وإرسال تأكيدات وتحديثات الطلبات، وتقديم دعم العملاء، وإرسال اتصالات تسويقية (بموافقتك)، وتحسين خدماتنا، والامتثال للالتزامات القانونية." } },
    { en: { title: "Information Sharing", body: "We do not sell your personal information. We share data only with service providers necessary to operate our platform (payment processors, shipping carriers, email services). All partners are bound by confidentiality agreements." }, ar: { title: "مشاركة المعلومات", body: "لا نبيع معلوماتك الشخصية. نشارك البيانات فقط مع مزودي الخدمات الضروريين لتشغيل منصتنا (معالجو الدفع، شركات الشحن، خدمات البريد الإلكتروني). جميع الشركاء ملزمون باتفاقيات سرية." } },
    { en: { title: "Data Security", body: "We implement industry-standard security measures including SSL encryption, secure payment processing, and regular security audits. However, no method of transmission over the internet is 100% secure." }, ar: { title: "أمان البيانات", body: "نطبق معايير أمان على مستوى الصناعة تشمل تشفير SSL، ومعالجة دفع آمنة، وعمليات تدقيق أمني منتظمة. ومع ذلك، لا توجد طريقة نقل عبر الإنترنت آمنة بنسبة 100٪." } },
    { en: { title: "Cookies", body: "We use cookies to maintain your session, remember your preferences, and improve your experience. You can disable cookies in your browser settings, but some features may not work correctly." }, ar: { title: "ملفات تعريف الارتباط", body: "نستخدم ملفات تعريف الارتباط للحفاظ على جلستك، وتذكر تفضيلاتك، وتحسين تجربتك. يمكنك تعطيل ملفات تعريف الارتباط في إعدادات المتصفح، لكن بعض الميزات قد لا تعمل بشكل صحيح." } },
    { en: { title: "Your Rights", body: "You have the right to access, correct, or delete your personal data. You may also opt out of marketing emails at any time. Use the Contact Us page to exercise these rights." }, ar: { title: "حقوقك", body: "لديك الحق في الوصول إلى بياناتك الشخصية أو تصحيحها أو حذفها. يمكنك أيضاً إلغاء الاشتراك في رسائل البريد الإلكتروني التسويقية في أي وقت. استخدم صفحة اتصل بنا لممارسة هذه الحقوق." } },
    { en: { title: "Changes to This Policy", body: "We may update this policy periodically. We will notify you of significant changes via email or a prominent notice on our site. Continued use of our service after changes constitutes acceptance." }, ar: { title: "تغييرات هذه السياسة", body: "قد نحدّث هذه السياسة دورياً. سنخطرك بالتغييرات الجوهرية عبر البريد الإلكتروني أو إشعار بارز على موقعنا. الاستمرار في استخدام خدمتنا بعد التغييرات يعني القبول بها." } },
  ];

  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <div className="text-center mb-12">
        <h1 className="font-serif text-4xl font-bold mb-4">{isAr ? "سياسة الخصوصية" : "Privacy Policy"}</h1>
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

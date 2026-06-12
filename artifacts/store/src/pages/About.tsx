import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "wouter";

export default function About() {
  const { language } = useLanguage();
  const isAr = language === "ar";

  return (
    <div className="pb-16">
      <div className="bg-secondary py-24 text-center mb-16">
        <h1 className="font-serif text-5xl font-bold mb-4">{isAr ? "من نحن" : "About LUXE"}</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto px-4">
          {isAr ? "منصة أزياء راقية تجمع أفضل الماركات والمصممين من جميع أنحاء العالم في مكان واحد." : "A premium fashion marketplace bringing the finest brands and designers from around the world to one curated destination."}
        </p>
      </div>

      <div className="container mx-auto px-4 max-w-5xl space-y-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="font-serif text-3xl font-bold mb-4">{isAr ? "قصتنا" : "Our Story"}</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              {isAr ? "تأسست LUXE برؤية بسيطة: جعل الأزياء الراقية في متناول الجميع. بدأنا كمتجر صغير وسرعان ما أصبحنا منصة رائدة تضم آلاف المنتجات من أفضل العلامات التجارية." : "LUXE was founded with a simple vision: make premium fashion accessible to everyone. What started as a small store quickly grew into a leading marketplace featuring thousands of products from the best brands."}
            </p>
            <p className="text-muted-foreground leading-relaxed">
              {isAr ? "نحن نؤمن بأن الأناقة ليست رفاهية — إنها تعبير عن الهوية." : "We believe style is not a luxury — it's an expression of identity."}
            </p>
          </div>
          <div className="aspect-[4/3] bg-muted flex items-center justify-center">
            <span className="font-serif text-6xl font-bold text-muted-foreground/20">LUXE</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center border-y border-border py-12">
          {[
            { en: "500+", label_en: "Brands", ar: "٥٠٠+", label_ar: "ماركة" },
            { en: "10,000+", label_en: "Products", ar: "١٠٬٠٠٠+", label_ar: "منتج" },
            { en: "50,000+", label_en: "Happy Customers", ar: "٥٠٬٠٠٠+", label_ar: "عميل سعيد" },
            { en: "100%", label_en: "Authentic", ar: "١٠٠٪", label_ar: "أصلي" },
          ].map((stat, i) => (
            <div key={i}>
              <div className="font-serif text-3xl font-bold text-primary mb-1">{isAr ? stat.ar : stat.en}</div>
              <div className="text-sm text-muted-foreground">{isAr ? stat.label_ar : stat.label_en}</div>
            </div>
          ))}
        </div>

        <div>
          <h2 className="font-serif text-3xl font-bold mb-8 text-center">{isAr ? "قيمنا" : "Our Values"}</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { en: { title: "Authenticity", body: "Every product on LUXE is 100% authentic. We partner only with verified brands and vendors." }, ar: { title: "الأصالة", body: "كل منتج على LUXE أصلي 100٪. نتعاون فقط مع ماركات وبائعين معتمدين." } },
              { en: { title: "Sustainability", body: "We're committed to responsible fashion — supporting brands that prioritise ethical production." }, ar: { title: "الاستدامة", body: "نحن ملتزمون بالموضة المسؤولة — ندعم الماركات التي تعطي الأولوية للإنتاج الأخلاقي." } },
              { en: { title: "Customer First", body: "Your satisfaction is our priority. From browse to delivery, we ensure a seamless experience." }, ar: { title: "العميل أولاً", body: "رضاك هو أولويتنا. من التصفح إلى التسليم، نضمن تجربة سلسة." } },
            ].map((value, i) => (
              <div key={i} className="border border-border p-6">
                <h3 className="font-serif text-xl font-bold mb-3">{isAr ? value.ar.title : value.en.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{isAr ? value.ar.body : value.en.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center py-8">
          <h2 className="font-serif text-2xl font-bold mb-4">{isAr ? "هل أنت جاهز للتسوق؟" : "Ready to Shop?"}</h2>
          <Link href="/products" className="inline-block px-8 py-3 bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
            {isAr ? "تسوق الآن" : "Explore Collection"}
          </Link>
        </div>
      </div>
    </div>
  );
}

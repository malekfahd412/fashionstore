import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "wouter";
import { useSEO } from "@/hooks/useSEO";

export default function About() {
  const { language } = useLanguage();
  useSEO({ title: "About Us", description: "Learn about Velora — our story, mission, and commitment to fashion that inspires." });
  const isAr = language === "ar";

  return (
    <div className="bg-background pt-24 pb-24">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-24 md:mb-32">
          <h1 className="font-serif text-6xl md:text-8xl lg:text-[120px] font-bold tracking-tight mb-8 leading-[0.9]">
            {isAr ? "رؤيتنا" : "VISION"}
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-2xl mx-auto uppercase tracking-[0.2em] leading-loose">
            {isAr ? "منصة أزياء راقية تجمع أفضل الماركات والمصممين من جميع أنحاء العالم في مكان واحد." : "A curated destination for uncompromising luxury and intentional design."}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-16 md:gap-24 items-center mb-32">
          <div className="order-2 md:order-1 space-y-8">
            <h2 className="font-serif text-4xl md:text-5xl font-bold">{isAr ? "القصة" : "The Narrative"}</h2>
            <div className="space-y-6 text-muted-foreground text-sm md:text-base leading-relaxed">
              <p>
                {isAr ? "تأسست Velora برؤية بسيطة: جعل الأزياء الراقية في متناول الجميع. بدأنا كمتجر صغير وسرعان ما أصبحنا منصة رائدة تضم آلاف المنتجات من أفضل العلامات التجارية." : "Velora emerged from a singular uncompromising vision: to curate the world's most exceptional fashion and present it with the reverence it deserves. We reject the noise of fast fashion in favor of permanence, craft, and intention."}
              </p>
              <p>
                {isAr ? "نحن نؤمن بأن الأناقة ليست رفاهية — إنها تعبير عن الهوية." : "We believe that true luxury whispers. It is found in the weight of the fabric, the precision of the cut, and the quiet confidence of the wearer."}
              </p>
            </div>
          </div>
          <div className="order-1 md:order-2 aspect-[3/4] bg-muted relative overflow-hidden group">
             {/* A placeholder for an editorial image, or just a stark minimal box */}
             <div className="absolute inset-0 bg-primary/5 transition-transform duration-700 group-hover:scale-105" />
             <div className="absolute inset-0 flex items-center justify-center">
               <span className="font-serif text-7xl font-bold text-background opacity-20">V.</span>
             </div>
          </div>
        </div>

        <div className="mb-32">
          <h2 className="font-serif text-4xl md:text-5xl font-bold mb-16 text-center">{isAr ? "المبادئ" : "The Principles"}</h2>
          <div className="grid md:grid-cols-3 gap-12 md:gap-8">
            {[
              { en: { title: "Authenticity", body: "Every piece curated on Velora is guaranteed authentic. We deal exclusively in truth." }, ar: { title: "الأصالة", body: "كل منتج على Velora أصلي 100٪. نتعاون فقط مع ماركات وبائعين معتمدين." } },
              { en: { title: "Restraint", body: "We believe in the power of curation. Not everything belongs here. Only what matters." }, ar: { title: "الانتقاء", body: "نحن نؤمن بقوة الانتقاء. ليس كل شيء ينتمي إلى هنا. فقط ما يهم." } },
              { en: { title: "Permanence", body: "Fashion fades, style endures. We prioritize garments built to outlast trends." }, ar: { title: "الاستدامة", body: "الموضة تتلاشى، الأناقة تدوم. نحن نعطي الأولوية للملابس المصممة لتدوم." } },
            ].map((value, i) => (
              <div key={i} className="group">
                <div className="h-px w-12 bg-primary mb-6 transition-all duration-500 group-hover:w-full" />
                <h3 className="font-serif text-2xl font-bold mb-4">{isAr ? value.ar.title : value.en.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{isAr ? value.ar.body : value.en.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center border-t border-border pt-24 pb-12">
          <h2 className="font-serif text-4xl md:text-5xl font-bold mb-8">{isAr ? "اكتشف المجموعة" : "Experience the Collection"}</h2>
          <Link href="/products" className="velora-btn-primary inline-flex items-center justify-center px-10 h-14 uppercase tracking-[0.2em] text-xs">
            {isAr ? "تسوق الآن" : "ENTER BOUTIQUE"}
          </Link>
        </div>
      </div>
    </div>
  );
}

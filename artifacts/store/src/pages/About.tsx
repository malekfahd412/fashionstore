import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "wouter";
import { useSEO } from "@/hooks/useSEO";

export default function About() {
  const { language } = useLanguage();
  useSEO({ title: "About Us", description: "Learn about Velora — our story, mission, and commitment to fashion that inspires." });
  const isAr = language === "ar";

  return (
    <div className="bg-background pt-32 pb-32">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="text-center mb-32">
          <p className="velora-label text-accent mb-6">THE MAISON</p>
          <h1 className="velora-heading text-6xl md:text-8xl lg:text-[140px] mb-12">
            {isAr ? "رؤيتنا" : "Vision."}
          </h1>
          <p className="text-muted-foreground text-sm md:text-lg max-w-2xl mx-auto uppercase tracking-[0.25em] leading-loose font-light">
            {isAr ? "منصة أزياء راقية تجمع أفضل الماركات والمصممين من جميع أنحاء العالم في مكان واحد." : "A curated destination where uncompromising luxury meets intentional design."}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-24 items-center mb-40">
          <div className="order-2 md:order-1 space-y-12">
            <h2 className="velora-heading text-4xl md:text-6xl">{isAr ? "القصة" : "The Narrative."}</h2>
            <div className="space-y-8 text-muted-foreground text-base md:text-lg leading-[1.8] font-light">
              <p>
                {isAr ? "تأسست Velora برؤية بسيطة: جعل الأزياء الراقية في متناول الجميع. بدأنا كمتجر صغير وسرعان ما أصبحنا منصة رائدة تضم آلاف المنتجات من أفضل العلامات التجارية." : "Founded in Cairo in 2019, Velora emerged from a singular uncompromising vision: to curate the world's most exceptional fashion and present it with the reverence it deserves."}
              </p>
              <p>
                {isAr ? "نحن نؤمن بأن الأناقة ليست رفاهية — إنها تعبير عن الهوية." : "We believe that true luxury whispers. It is found in the weight of the fabric, the precision of the cut, and the quiet confidence of the wearer. We reject the noise of fast fashion in favor of permanence."}
              </p>
            </div>
          </div>
          <div className="order-1 md:order-2 aspect-[4/5] bg-white border border-border relative overflow-hidden group">
             <div className="absolute inset-0 bg-accent/5 transition-transform duration-1000 group-hover:scale-110" />
             <div className="absolute inset-0 flex items-center justify-center">
               <span className="velora-heading text-9xl text-accent/10 select-none">V.</span>
             </div>
             <img src="/images/story-fabric.png" alt="Velora Craft" className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-multiply transition-transform duration-1000 group-hover:scale-105" onError={(e) => e.currentTarget.style.display = 'none'} />
          </div>
        </div>

        <div className="mb-40">
          <p className="velora-label text-accent text-center mb-16">OUR VALUES</p>
          <h2 className="velora-heading text-4xl md:text-6xl mb-24 text-center">{isAr ? "المبادئ" : "The Principles."}</h2>
          <div className="grid md:grid-cols-3 gap-16">
            {[
              { en: { title: "Authenticity", body: "Every piece curated on Velora is guaranteed authentic. We deal exclusively in truth and verified provenance." }, ar: { title: "الأصالة", body: "كل منتج على Velora أصلي 100٪. نتعاون فقط مع ماركات وبائعين معتمدين." } },
              { en: { title: "Restraint", body: "We believe in the power of curation. Not everything belongs here. Only what captures the essence of excellence." }, ar: { title: "الانتقاء", body: "نحن نؤمن بقوة الانتقاء. ليس كل شيء ينتمي إلى هنا. فقط ما يهم." } },
              { en: { title: "Permanence", body: "Fashion fades, style endures. We prioritize garments built to outlast trends and inspire generations." }, ar: { title: "الاستدامة", body: "الموضة تتلاشى، الأناقة تدوم. نحن نعطي الأولوية للملابس المصممة لتدوم." } },
            ].map((value, i) => (
              <div key={i} className="group space-y-8">
                <div className="h-px w-12 bg-accent transition-all duration-700 group-hover:w-full" />
                <h3 className="velora-heading text-3xl">{isAr ? value.ar.title : value.en.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed font-light">{isAr ? value.ar.body : value.en.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center border-t border-border pt-32 pb-16">
          <p className="velora-label text-accent mb-8">JOIN THE JOURNEY</p>
          <h2 className="velora-heading text-4xl md:text-6xl mb-12">{isAr ? "اكتشف المجموعة" : "Experience Excellence."}</h2>
          <div className="pt-4">
            <Link href="/products" className="velora-btn-primary px-16 h-16">
              {isAr ? "تسوق الآن" : "ENTER BOUTIQUE"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

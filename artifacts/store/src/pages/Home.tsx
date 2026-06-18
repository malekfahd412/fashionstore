import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useListBanners, useGetFeaturedProducts, useGetNewArrivals, useListCategories, useGetBestSellers } from "@workspace/api-client-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSEO } from "@/hooks/useSEO";
import { Link } from "wouter";
import { ChevronDown, ArrowRight } from "lucide-react";
import ProductCard, { ProductCardSkeleton } from "@/components/ProductCard";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
type FaqItem = { id: number; questionEn: string; questionAr: string; answerEn: string; answerAr: string };

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.08 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

function RevealSection({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useScrollReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.85s ease ${delay}ms, transform 0.85s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

export default function Home() {
  const { language, t } = useLanguage();
  useSEO({ title: "Home", description: "Discover curated fashion collections at Velora." });

  const { data: bannersRaw } = useListBanners();
  const { data: featured, isLoading: featuredLoading } = useGetFeaturedProducts();
  const { data: newArrivals, isLoading: newLoading } = useGetNewArrivals();
  const { data: bestSellers, isLoading: bestLoading } = useGetBestSellers({ query: { queryKey: [] } });
  const { data: categories } = useListCategories();
  const { data: faqs = [] } = useQuery<FaqItem[]>({
    queryKey: ["faqs"],
    queryFn: () => fetch(`${BASE}/api/faq`).then(r => r.json()) as Promise<FaqItem[]>,
    staleTime: 300_000,
  });

  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [heroLoaded, setHeroLoaded] = useState(false);
  const banners = (bannersRaw ?? []).filter(b => b.active);
  const hero = banners[0];

  const faqSchema = faqs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": language === "en" ? faq.questionEn : faq.questionAr,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": language === "en" ? faq.answerEn : faq.answerAr
      }
    }))
  } : null;

  const marqueeItems = [
    t("home.trust1"),
    t("home.trust2"),
    t("home.trust3"),
    t("home.trust4"),
    "New Arrivals Every Week",
    "Members Get Exclusive Access",
  ];

  return (
    <div className="bg-background min-h-screen selection:bg-primary selection:text-primary-foreground">
      {faqSchema && (
        <script type="application/ld+json">
          {JSON.stringify(faqSchema)}
        </script>
      )}

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="relative h-[100dvh] min-h-[640px] overflow-hidden bg-[#0F172A]">
        {hero?.imageUrl ? (
          <img
            src={hero.imageUrl}
            alt=""
            onLoad={() => setHeroLoaded(true)}
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-[1.4s] ease-out ${heroLoaded ? "opacity-60 scale-100" : "opacity-0 scale-105"}`}
            loading="eager"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] via-[#0F172A] to-[#0a0a0a]" />
        )}

        <div className="absolute inset-0 bg-gradient-to-r from-[#0F172A] via-[#0F172A]/40 to-transparent" />

        <div
          className="absolute inset-0 flex flex-col justify-center px-8 md:px-16 lg:px-24 z-10"
          style={{ opacity: heroLoaded || !hero?.imageUrl ? 1 : 0, transition: "opacity 1s ease 0.3s" }}
        >
          <div className="max-w-4xl">
            <p className="text-accent text-[10px] tracking-[0.4em] font-bold uppercase mb-8 flex items-center gap-4">
              <span className="w-10 h-[1px] bg-accent/50 inline-block" />
              {hero?.subtitleEn || hero?.subtitleAr ? (
                 language === "en" ? hero.subtitleEn : (hero.subtitleAr ?? hero.subtitleEn)
              ) : (
                `${t("home.newCollection")} — SS 2026`
              )}
            </p>
            <h1
              className="text-[clamp(3.5rem,10vw,8.5rem)] font-bold text-white leading-[1.05] mb-12 tracking-[-0.03em] font-serif"
            >
              {hero
                ? (language === "en" ? hero.titleEn : (hero.titleAr ?? hero.titleEn))
                : t("home.heroTitle")}
            </h1>

            <div className="w-16 h-px bg-accent mb-12" />

            <div className="flex items-center gap-10 flex-wrap">
              <Link
                href={hero?.linkUrl ?? "/products"}
                className="inline-flex items-center gap-4 text-white hover:text-accent transition-colors duration-300 text-[10px] font-bold tracking-[0.3em] uppercase"
              >
                {t("home.shopNow")}
                <ArrowRight className="w-4 h-4" strokeWidth={1} />
              </Link>
              <Link
                href="/categories"
                className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/40 hover:text-white transition-colors duration-200"
              >
                {t("home.exploreCategories")}
              </Link>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 text-white/40 animate-bounce">
          <span className="text-[8px] tracking-[0.4em] uppercase font-bold">Scroll</span>
          <div className="w-[1px] h-12 bg-gradient-to-b from-white/40 to-transparent" />
        </div>

        {banners.length > 1 && (
          <div className="absolute bottom-12 right-12 md:right-20 flex gap-3 items-center">
            {banners.map((_, i) => (
              <div
                key={i}
                className={`transition-all duration-500 h-[1px] ${i === 0 ? "w-10 bg-accent" : "w-3 bg-white/20"}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── MARQUEE STRIP ────────────────────────────────────────────── */}
      <div className="bg-[#0F172A] py-4 overflow-hidden border-y border-white/5">
        <div
          className="flex whitespace-nowrap text-accent text-[10px] tracking-[0.3em] font-bold uppercase"
          style={{ animation: "marquee 40s linear infinite" }}
        >
          {[...Array(4)].map((_, ri) => (
            <span key={ri} className="flex">
              {marqueeItems.map((item, ii) => (
                <span key={ii} className="mx-10 flex items-center">
                  {item}
                  <span className="mx-10 text-accent/30 text-xs">◆</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* ── CATEGORIES — EDITORIAL GRID ──────────────────────────── */}
      {(categories ?? []).length > 0 && (
        <section className="py-24 md:py-40 bg-background">
          <div className="max-w-[1400px] mx-auto px-10 md:px-20">
            <RevealSection className="flex flex-col md:flex-row items-baseline justify-between mb-20 gap-6">
              <div>
                <p className="velora-label mb-6">{t("home.shopBy")}</p>
                <h2 className="velora-heading text-[clamp(2.5rem,5vw,5rem)] text-foreground italic">
                  {t("home.categories")}.
                </h2>
              </div>
              <Link href="/categories" className="velora-link">
                {t("home.viewAll")}
              </Link>
            </RevealSection>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {(categories ?? []).slice(0, 3).map((cat, i) => (
                <RevealSection key={cat.id} delay={i * 100}>
                  <Link
                    href={`/products?categoryId=${cat.id}`}
                    className="group block relative overflow-hidden bg-white aspect-[3/4]"
                  >
                    {cat.imageUrl ? (
                      <img
                        src={cat.imageUrl}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-[800ms] ease-out"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-secondary" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A]/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
                    <div className="absolute bottom-0 left-0 right-0 p-10">
                      <h3
                        className="text-3xl md:text-4xl font-serif text-white mb-2"
                      >
                        {language === "en" ? cat.nameEn : (cat.nameAr ?? cat.nameEn)}
                      </h3>
                      <p className="text-[9px] font-bold tracking-[0.35em] uppercase text-white/50 group-hover:text-accent transition-colors">
                        {t("home.shopNow")}
                      </p>
                    </div>
                  </Link>
                </RevealSection>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── NEW ARRIVALS — LUXURY GRID ─────────────────────────── */}
      <section className="py-24 md:py-40 bg-secondary/30 dark:bg-card border-y border-border">
        <div className="max-w-[1400px] mx-auto px-10 md:px-20">
          <RevealSection className="flex items-end justify-between mb-20">
            <div>
              <p className="velora-label mb-6">{t("home.justIn")}</p>
              <h2 className="velora-heading text-[clamp(2.5rem,5vw,5rem)] text-foreground italic">
                {t("home.newArrivals")}.
              </h2>
            </div>
            <Link href="/products?sortBy=newest" className="velora-link hidden md:block">
              {t("home.viewAll")}
            </Link>
          </RevealSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {newLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                    <ProductCardSkeleton key={i} />
                ))
              : (newArrivals ?? []).slice(0, 4).map((p, i) => (
                  <RevealSection key={p.id} delay={i * 80}>
                    <ProductCard
                      id={p.id}
                      nameEn={p.nameEn}
                      nameAr={p.nameAr}
                      price={p.price}
                      salePrice={p.salePrice}
                      imageUrl={p.images?.[0]?.imageUrl}
                      variants={p.variants}
                      averageRating={p.averageRating}
                      reviewCount={p.reviewCount}
                    />
                  </RevealSection>
                ))}
          </div>

          <RevealSection className="mt-20 text-center" delay={150}>
            <Link href="/products?sortBy=newest" className="velora-btn-outline">
              {t("home.viewAllNew")}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </RevealSection>
        </div>
      </section>

      {/* ── EDITORIAL STRIP ───────────────────────────────────────────── */}
      <section className="w-full bg-[#0F172A] flex flex-col md:flex-row overflow-hidden">
        <div className="flex-1 flex items-center justify-center p-12 md:p-24 text-center md:text-left">
          <RevealSection>
            <h2 className="font-serif italic text-[clamp(2rem,4vw,3.5rem)] text-white leading-[1.2] max-w-lg mb-10">
              "Style is a way to say who you are without having to speak."
            </h2>
            <div className="w-16 h-px bg-accent mb-6 hidden md:block" />
            <p className="text-accent text-[10px] tracking-[0.35em] uppercase font-bold">
              — RACHEL ZOE
            </p>
          </RevealSection>
        </div>
        <div className="flex-1 h-[60vh] md:h-[80vh] relative">
           <img 
            src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80" 
            alt="Editorial" 
            className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-1000" 
            loading="lazy"
          />
          <div className="absolute inset-0 bg-[#0F172A]/20" />
        </div>
      </section>

      {/* ── BEST SELLERS ─────────────────────────────────────────────── */}
      <section className="py-24 md:py-40 bg-background">
        <div className="max-w-[1400px] mx-auto px-10 md:px-20">
          <RevealSection className="flex items-end justify-between mb-20">
            <div>
              <p className="velora-label mb-6">{t("home.trending")}</p>
              <h2 className="velora-heading text-[clamp(2.5rem,5vw,5rem)] text-foreground italic">
                {t("home.bestSellers")}.
              </h2>
            </div>
            <Link href="/products?sortBy=bestseller" className="velora-link hidden md:block">
              {t("home.viewAll")}
            </Link>
          </RevealSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {bestLoading
              ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : (bestSellers ?? []).slice(0, 4).map((p, i) => (
                  <RevealSection key={p.id} delay={i * 80}>
                    <div className="relative">
                      {p.salePrice && (
                        <div className="absolute top-0 left-0 z-10 bg-primary text-primary-foreground text-[8px] tracking-[0.2em] font-bold uppercase px-3 py-1.5">
                          {t("home.bestSellerBadge")}
                        </div>
                      )}
                      <ProductCard
                        id={p.id}
                        nameEn={p.nameEn}
                        nameAr={p.nameAr}
                        price={p.price}
                        salePrice={p.salePrice}
                        imageUrl={p.images?.[0]?.imageUrl}
                        variants={p.variants}
                        averageRating={p.averageRating}
                        reviewCount={p.reviewCount}
                      />
                    </div>
                  </RevealSection>
                ))}
          </div>
        </div>
      </section>

      {/* ── EDITORIAL SPLIT (BANNER 1) ────────────────────────────────── */}
      {banners[1] && (
        <section className="grid md:grid-cols-2 min-h-[700px] border-y border-border">
          <div className="relative overflow-hidden bg-[#0F172A] min-h-[400px] md:min-h-0 order-2 md:order-1">
            {banners[1].imageUrl ? (
              <img
                src={banners[1].imageUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-80 transition-opacity duration-1000"
                loading="lazy"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-[#2c2420] to-[#0F172A]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-[#0F172A]/40 to-transparent" />
          </div>
          <div className="bg-background flex flex-col justify-center px-10 md:px-20 py-20 md:py-32 order-1 md:order-2">
            <RevealSection>
              <p className="velora-label mb-10 flex items-center gap-6">
                <span className="w-12 h-[1px] bg-accent" />
                {t("home.editorial")}
              </p>
              <h2
                className="text-[clamp(2.5rem,4vw,4.5rem)] font-bold mb-10 leading-[1.1] text-foreground tracking-[-0.03em] font-serif italic"
              >
                {language === "en" ? banners[1].titleEn : (banners[1].titleAr ?? banners[1].titleEn)}
              </h2>
              {banners[1].subtitleEn && (
                <p className="text-muted-foreground text-base leading-relaxed mb-14 max-w-sm font-light">
                  {language === "en" ? banners[1].subtitleEn : (banners[1].subtitleAr ?? banners[1].subtitleEn)}
                </p>
              )}
              <Link href={banners[1].linkUrl ?? "/products"} className="velora-btn-primary self-start">
                {t("home.discoverMore")}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </RevealSection>
          </div>
        </section>
      )}

      {/* ── BRAND STORY — CINEMATIC ───────────────────────────────────────────────── */}
      <section className="py-24 md:py-40 bg-secondary/20 dark:bg-card">
        <div className="max-w-[1400px] mx-auto px-10 md:px-20 grid grid-cols-1 lg:grid-cols-2 gap-20 lg:gap-32 items-center">
          <RevealSection className="order-2 lg:order-1">
            <div className="aspect-[3/4] lg:aspect-[4/5] w-full overflow-hidden bg-white border border-border">
              <img
                src={banners[2]?.imageUrl || "https://images.unsplash.com/photo-1445205170230-053b830c6050?auto=format&fit=crop&q=80"}
                alt=""
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-[2s]"
                loading="lazy"
              />
            </div>
          </RevealSection>
          <RevealSection delay={150} className="max-w-xl order-1 lg:order-2">
            <p className="velora-label mb-8">
              {language === "en" ? "Our Story" : "قصتنا"}
            </p>
            <h2
              className="text-[clamp(2.5rem,5vw,5rem)] font-bold mb-10 leading-[1] text-foreground tracking-[-0.03em] font-serif italic"
            >
              {banners[2]
                ? (language === "en" ? banners[2].titleEn : (banners[2].titleAr ?? banners[2].titleEn))
                : (language === "en" ? "Crafted for the Discerning Few." : "مصنوعة للقلة المميزة.")}
            </h2>
            <div className="w-20 h-px bg-accent mb-10" />
            <p className="text-muted-foreground mb-14 leading-relaxed text-lg font-light italic">
              {banners[2]?.subtitleEn
                ? (language === "en" ? banners[2].subtitleEn : (banners[2].subtitleAr ?? banners[2].subtitleEn))
                : (language === "en"
                  ? "Every stitch, every cut, every fabric choice is an exercise in restraint and precision. We design for those who understand that true luxury doesn't scream—it whispers."
                  : "كل غرزة، كل قطعة، كل اختيار قماش هو تمرين في ضبط النفس والدقة. نصمم لأولئك الذين يفهمون أن الرفاهية الحقيقية لا تصرخ—بل تهمس.")}
            </p>
            <Link
              href={banners[2]?.linkUrl ?? "/products"}
              className="velora-link"
            >
              {t("home.discoverMore")}
            </Link>
          </RevealSection>
        </div>
      </section>

      {/* ── FEATURED — DARK SECTION ────────────────────────── */}
      {(featured ?? []).length > 0 && (
        <section className="py-24 md:py-40 bg-[#0F172A]">
          <div className="max-w-[1400px] mx-auto px-10 md:px-20">
            <RevealSection className="flex items-end justify-between mb-20">
              <div>
                <p className="text-[10px] font-bold tracking-[0.4em] uppercase text-accent/50 mb-6">{t("home.curated")}</p>
                <h2
                  className="text-[clamp(2.5rem,5vw,5rem)] font-bold text-white leading-[1] tracking-[-0.03em] font-serif italic"
                >
                  {t("home.featured")}.
                </h2>
              </div>
              <Link
                href="/products?featured=true"
                className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/50 hover:text-accent transition-colors border-b border-white/10 pb-2 hidden md:block"
              >
                {t("home.viewAll")}
              </Link>
            </RevealSection>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
              {featuredLoading
                ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
                : (featured ?? []).slice(0, 4).map((p, i) => (
                    <RevealSection key={p.id} delay={i * 80}>
                      <ProductCard
                        id={p.id}
                        nameEn={p.nameEn}
                        nameAr={p.nameAr}
                        price={p.price}
                        salePrice={p.salePrice}
                        imageUrl={p.images?.[0]?.imageUrl}
                        variants={p.variants}
                        averageRating={p.averageRating}
                        reviewCount={p.reviewCount}
                      />
                    </RevealSection>
                  ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      {faqs.length > 0 && (
        <section className="py-24 md:py-40 bg-background border-t border-border">
          <div className="max-w-[1400px] mx-auto px-10 md:px-20">
            <div className="grid lg:grid-cols-3 gap-20">
              <RevealSection>
                <p className="velora-label mb-8">{t("home.faqLabel")}</p>
                <h2
                  className="text-[clamp(2.5rem,4vw,4rem)] font-bold text-foreground leading-[1.1] tracking-[-0.03em] font-serif italic mb-8"
                >
                  Common<br />Inquiries.
                </h2>
                <div className="w-16 h-px bg-accent" />
              </RevealSection>

              <div className="lg:col-span-2 space-y-2">
                {faqs.map((faq, idx) => (
                  <RevealSection key={faq.id} delay={idx * 50}>
                    <div className="border-b border-border group">
                      <button
                        onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
                        className="w-full py-8 flex items-center justify-between text-left group-hover:text-accent transition-colors"
                      >
                        <span className="text-lg md:text-xl font-serif">
                          {language === "en" ? faq.questionEn : faq.questionAr}
                        </span>
                        <div className={`transition-transform duration-500 ${openFaq === faq.id ? "rotate-180" : ""}`}>
                           <ChevronDown className="w-5 h-5" strokeWidth={1} />
                        </div>
                      </button>
                      <div
                        className={`overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                          openFaq === faq.id ? "max-h-[500px] pb-10 opacity-100" : "max-h-0 opacity-0"
                        }`}
                      >
                        <p className="text-muted-foreground text-base leading-relaxed font-light max-w-2xl">
                          {language === "en" ? faq.answerEn : faq.answerAr}
                        </p>
                      </div>
                    </div>
                  </RevealSection>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

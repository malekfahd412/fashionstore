import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useListBanners, useGetFeaturedProducts, useGetNewArrivals, useListCategories, useGetBestSellers } from "@workspace/api-client-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSEO } from "@/hooks/useSEO";
import { Link } from "wouter";
import { ChevronDown, ArrowRight, Heart } from "lucide-react";
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
    <div className="bg-background">
      {faqSchema && (
        <script type="application/ld+json">
          {JSON.stringify(faqSchema)}
        </script>
      )}

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="relative h-[100dvh] min-h-[640px] overflow-hidden bg-[#0d0d0d]">
        {hero?.imageUrl ? (
          <img
            src={hero.imageUrl}
            alt=""
            onLoad={() => setHeroLoaded(true)}
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-[1.4s] ease-out ${heroLoaded ? "opacity-50 scale-100" : "opacity-0 scale-105"}`}
            loading="eager"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] via-[#111] to-[#0a0a0a]" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30" />

        <div
          className="absolute inset-0 flex flex-col justify-center px-8 md:px-16 lg:px-24"
          style={{ opacity: heroLoaded || !hero?.imageUrl ? 1 : 0, transition: "opacity 1s ease 0.3s" }}
        >
          <div className="max-w-3xl">
            <p className="text-[#C9A227] text-[9px] tracking-[0.4em] font-bold uppercase mb-8 flex items-center gap-4">
              <span className="w-10 h-[1px] bg-[#C9A227]/50 inline-block" />
              {t("home.newCollection")} — SS 2026
            </p>
            <h1
              className="text-[clamp(3.5rem,10vw,9rem)] font-bold text-white leading-[0.85] mb-10 tracking-[-0.03em]"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {hero
                ? (language === "en" ? hero.titleEn : (hero.titleAr ?? hero.titleEn))
                : t("home.heroTitle")}
            </h1>

            {hero && (hero.subtitleEn || hero.subtitleAr) && (
              <p className="text-sm text-white/45 mb-12 max-w-sm leading-relaxed tracking-[0.04em] font-light">
                {language === "en" ? (hero.subtitleEn ?? "") : (hero.subtitleAr ?? hero.subtitleEn ?? "")}
              </p>
            )}

            <div className="flex items-center gap-10 flex-wrap">
              <Link
                href={hero?.linkUrl ?? "/products"}
                className="inline-flex items-center gap-4 border-b border-white text-white hover:text-[#C9A227] hover:border-[#C9A227] transition-all duration-300 pb-1 text-[9px] font-bold tracking-[0.32em] uppercase"
              >
                {t("home.shopNow")}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/categories"
                className="text-[9px] font-bold tracking-[0.3em] uppercase text-white/40 hover:text-white transition-colors duration-200"
              >
                {t("home.exploreCategories")}
              </Link>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/40 animate-bounce">
          <span className="text-[8px] tracking-[0.4em] uppercase font-bold">Scroll</span>
          <div className="w-[1px] h-12 bg-gradient-to-b from-white/40 to-transparent" />
        </div>

        {banners.length > 1 && (
          <div className="absolute bottom-8 right-8 md:right-16 flex gap-2 items-center">
            {banners.map((_, i) => (
              <div
                key={i}
                className={`transition-all duration-500 ${i === 0 ? "w-8 h-[1.5px] bg-white" : "w-2 h-[1px] bg-white/25"}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── MARQUEE STRIP ────────────────────────────────────────────── */}
      <div className="bg-[#0B0B0B] dark:bg-[#050505] py-3 overflow-hidden border-y border-white/5">
        <div
          className="flex whitespace-nowrap text-[#C9A227] text-[9px] tracking-[0.25em] font-bold uppercase"
          style={{ animation: "marquee 28s linear infinite" }}
        >
          {[...Array(4)].map((_, ri) => (
            <span key={ri} className="flex">
              {marqueeItems.map((item, ii) => (
                <span key={ii} className="mx-6">
                  {item}
                  <span className="mx-6 text-[#C9A227]/30">·</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* ── CATEGORIES — EDITORIAL 2×2 GRID ──────────────────────────── */}
      {(categories ?? []).length > 0 && (
        <section className="py-24 md:py-36 bg-background">
          <div className="max-w-screen-xl mx-auto px-6 md:px-12">
            <RevealSection className="flex items-end justify-between mb-14">
              <div>
                <p className="velora-label mb-5">{t("home.shopBy")}</p>
                <h2 className="velora-heading text-[clamp(2.8rem,6vw,5.5rem)] text-foreground">
                  {t("home.categories")}
                </h2>
              </div>
              <Link href="/categories" className="velora-link hidden md:block">
                {t("home.viewAll")}
              </Link>
            </RevealSection>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(categories ?? []).slice(0, 4).map((cat, i) => (
                <RevealSection key={cat.id} delay={i * 80}>
                  <Link
                    href={`/products?categoryId=${cat.id}`}
                    className="group block relative overflow-hidden bg-secondary"
                    style={{ aspectRatio: "3/4" }}
                  >
                    {cat.imageUrl ? (
                      <img
                        src={cat.imageUrl}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-700 ease-out"
                        loading="lazy"
                      />
                    ) : (
                      <div
                        className="w-full h-full"
                        style={{
                          background: [
                            "linear-gradient(135deg, #c9b99a, #8d7b68)",
                            "linear-gradient(135deg, #4a4e54, #1a1c1f)",
                            "linear-gradient(135deg, #b8a88a, #7a6a52)",
                            "linear-gradient(135deg, #3d3530, #1a1512)",
                          ][i % 4],
                        }}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-8 md:p-10">
                      <p className="text-[8px] font-bold tracking-[0.35em] uppercase text-white/40 mb-3 group-hover:text-[#C9A227] transition-colors">
                        {t("home.shopNow")}
                      </p>
                      <h3
                        className="text-2xl md:text-3xl font-bold text-white leading-tight"
                        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                      >
                        {language === "en" ? cat.nameEn : (cat.nameAr ?? cat.nameEn)}
                      </h3>
                    </div>
                  </Link>
                </RevealSection>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── NEW ARRIVALS — HORIZONTAL SCROLL ─────────────────────────── */}
      <section className="py-24 md:py-36 bg-secondary dark:bg-[#0d0d0d] border-y border-border dark:border-white/5">
        <div className="max-w-screen-xl mx-auto">
          <RevealSection className="flex items-end justify-between mb-14 px-6 md:px-12">
            <div>
              <p className="velora-label mb-5">{t("home.justIn")}</p>
              <h2 className="velora-heading text-[clamp(2.8rem,6vw,5.5rem)] text-foreground">
                {t("home.newArrivals")}
              </h2>
            </div>
            <Link href="/products?sortBy=newest" className="velora-link hidden md:block">
              {t("home.viewAll")}
            </Link>
          </RevealSection>

          {/* Horizontal scroll rail */}
          <div
            className="flex overflow-x-auto gap-5 pb-6 px-6 md:px-12 snap-x snap-mandatory"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {newLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="min-w-[260px] md:min-w-[300px] snap-start shrink-0">
                    <ProductCardSkeleton />
                  </div>
                ))
              : (newArrivals ?? []).slice(0, 8).map((p) => (
                  <div key={p.id} className="min-w-[260px] md:min-w-[300px] snap-start shrink-0">
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
                ))}
          </div>

          <RevealSection className="mt-10 text-center" delay={100}>
            <Link href="/products?sortBy=newest" className="velora-btn-outline">
              {t("home.viewAllNew")}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </RevealSection>
        </div>
      </section>

      {/* ── EDITORIAL QUOTE ───────────────────────────────────────────── */}
      <section className="py-32 bg-[#111111] dark:bg-[#0B0B0B] text-center px-6">
        <RevealSection className="max-w-4xl mx-auto">
          <div className="w-12 h-0.5 bg-[#C9A227] mx-auto mb-10" />
          <h2
            className="text-3xl md:text-5xl lg:text-6xl text-white leading-tight"
            style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: "italic" }}
          >
            "Style is a way to say who you are without having to speak."
          </h2>
          <p className="text-[#C9A227] mt-8 text-[9px] tracking-[0.35em] uppercase font-bold">
            — Rachel Zoe
          </p>
        </RevealSection>
      </section>

      {/* ── BEST SELLERS ─────────────────────────────────────────────── */}
      <section className="py-24 md:py-36 bg-background">
        <div className="max-w-screen-xl mx-auto px-6 md:px-12">
          <RevealSection className="flex items-end justify-between mb-14">
            <div>
              <p className="velora-label mb-5">{t("home.trending")}</p>
              <h2 className="velora-heading text-[clamp(2.8rem,6vw,5.5rem)] text-foreground">
                {t("home.bestSellers")}
              </h2>
            </div>
            <Link href="/products?sortBy=bestseller" className="velora-link hidden md:block">
              {t("home.viewAll")}
            </Link>
          </RevealSection>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-16">
            {bestLoading
              ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : (bestSellers ?? []).slice(0, 4).map((p, i) => (
                  <RevealSection key={p.id} delay={i * 80}>
                    <div className="relative">
                      <div className="absolute top-3 left-3 z-10 bg-[#C9A227] text-white text-[7px] tracking-[0.2em] font-bold uppercase px-2 py-1">
                        {t("home.bestSellerBadge")}
                      </div>
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
        <section className="grid md:grid-cols-2 min-h-[560px] md:min-h-[680px]">
          <div className="relative overflow-hidden bg-[#0d0d0d] min-h-[380px] md:min-h-0 order-2 md:order-1">
            {banners[1].imageUrl ? (
              <img
                src={banners[1].imageUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-65 hover:opacity-75 transition-opacity duration-700"
                loading="lazy"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-[#2c2420] to-[#1a1512]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />
          </div>
          <div className="bg-background flex flex-col justify-center px-10 md:px-16 lg:px-24 py-20 md:py-32 order-1 md:order-2">
            <RevealSection>
              <p className="velora-label mb-8 flex items-center gap-4">
                <span className="w-8 h-[1px] bg-foreground/20" />
                {t("home.editorial")}
              </p>
              <h2
                className="text-[clamp(2rem,4vw,3.8rem)] font-bold mb-8 leading-[0.9] text-foreground tracking-[-0.03em]"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {language === "en" ? banners[1].titleEn : (banners[1].titleAr ?? banners[1].titleEn)}
              </h2>
              {banners[1].subtitleEn && (
                <p className="text-foreground/45 text-sm leading-relaxed mb-12 max-w-xs tracking-[0.03em] font-light">
                  {language === "en" ? banners[1].subtitleEn : (banners[1].subtitleAr ?? banners[1].subtitleEn)}
                </p>
              )}
              <Link href={banners[1].linkUrl ?? "/products"} className="velora-btn-primary self-start">
                {t("home.discoverMore")}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </RevealSection>
          </div>
        </section>
      )}

      {/* ── BRAND STORY ───────────────────────────────────────────────── */}
      <section className="py-24 md:py-36 bg-secondary dark:bg-[#0d0d0d] border-y border-border dark:border-white/5">
        <div className="max-w-screen-xl mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-20 items-center">
          <RevealSection>
            <div
              className="aspect-[3/4] lg:aspect-[4/5] w-full overflow-hidden"
              style={{ background: "linear-gradient(135deg, #2c2420, #1a1512)" }}
            >
              {banners[2]?.imageUrl && (
                <img
                  src={banners[2].imageUrl}
                  alt=""
                  className="w-full h-full object-cover opacity-80"
                  loading="lazy"
                />
              )}
            </div>
          </RevealSection>
          <RevealSection delay={120} className="max-w-lg">
            <p className="velora-label mb-6">
              {language === "en" ? "Our Story" : "قصتنا"}
            </p>
            <h2
              className="text-[clamp(2.5rem,4vw,4.5rem)] font-bold mb-8 leading-[0.9] text-foreground tracking-[-0.03em]"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {banners[2]
                ? (language === "en" ? banners[2].titleEn : (banners[2].titleAr ?? banners[2].titleEn))
                : (language === "en" ? "Crafted for the Discerning Few." : "مصنوعة للقلة المميزة.")}
            </h2>
            <p className="text-foreground/50 mb-10 leading-relaxed text-base font-light">
              {banners[2]?.subtitleEn
                ? (language === "en" ? banners[2].subtitleEn : (banners[2].subtitleAr ?? banners[2].subtitleEn))
                : (language === "en"
                  ? "Every stitch, every cut, every fabric choice is an exercise in restraint and precision. We design for those who understand that true luxury doesn't scream—it whispers."
                  : "كل غرزة، كل قطعة، كل اختيار قماش هو تمرين في ضبط النفس والدقة. نصمم لأولئك الذين يفهمون أن الرفاهية الحقيقية لا تصرخ—بل تهمس.")}
            </p>
            <Link
              href={banners[2]?.linkUrl ?? "/products"}
              className="inline-flex items-center gap-2 border-b border-[#C9A227] text-[#C9A227] pb-1 text-[9px] tracking-[0.2em] uppercase font-bold hover:text-foreground hover:border-foreground transition-colors"
            >
              {t("home.discoverMore")}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </RevealSection>
        </div>
      </section>

      {/* ── FEATURED — DARK CINEMATIC SECTION ────────────────────────── */}
      {(featured ?? []).length > 0 && (
        <section className="py-24 md:py-36 bg-[#111111] dark:bg-[#0d0d0d]">
          <div className="max-w-screen-xl mx-auto px-6 md:px-12">
            <RevealSection className="flex items-end justify-between mb-14">
              <div>
                <p className="text-[8px] font-bold tracking-[0.4em] uppercase text-white/25 mb-5">{t("home.curated")}</p>
                <h2
                  className="text-[clamp(2.8rem,6vw,5.5rem)] font-bold text-white leading-[0.88] tracking-[-0.03em]"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {t("home.featured")}
                </h2>
              </div>
              <Link
                href="/products?featured=true"
                className="text-[9px] font-bold tracking-[0.28em] uppercase text-white/25 hover:text-white transition-colors border-b border-white/15 pb-0.5 hidden md:block"
              >
                {t("home.viewAll")}
              </Link>
            </RevealSection>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-16">
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
        <section className="py-24 md:py-36 bg-secondary dark:bg-[#0d0d0d]">
          <div className="max-w-screen-xl mx-auto px-6 md:px-12">
            <div className="grid md:grid-cols-3 gap-16 md:gap-24">
              <RevealSection>
                <p className="velora-label mb-7">{t("home.faqLabel")}</p>
                <h2
                  className="text-[clamp(2rem,4vw,3rem)] font-bold text-foreground leading-[0.9] tracking-[-0.02em]"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {t("home.faqTitle")}
                </h2>
              </RevealSection>
              <RevealSection className="md:col-span-2 divide-y divide-border" delay={100}>
                {faqs.map(faq => (
                  <div key={faq.id}>
                    <button
                      className="w-full flex items-center justify-between py-7 text-left gap-8"
                      onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
                    >
                      <span className="font-medium text-sm leading-snug tracking-[0.02em] text-foreground">
                        {language === "en" ? faq.questionEn : faq.questionAr}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-foreground/30 shrink-0 transition-transform duration-300 ${openFaq === faq.id ? "rotate-180" : ""}`}
                      />
                    </button>
                    <div className={`overflow-hidden transition-all duration-400 ${openFaq === faq.id ? "max-h-96 pb-7" : "max-h-0"}`}>
                      <p className="text-sm text-foreground/50 leading-relaxed tracking-[0.02em] font-light">
                        {language === "en" ? faq.answerEn : faq.answerAr}
                      </p>
                    </div>
                  </div>
                ))}
              </RevealSection>
            </div>
          </div>
        </section>
      )}

      {/* ── NEWSLETTER ───────────────────────────────────────────────── */}
      <section className="py-28 md:py-36 bg-[#0B0B0B] dark:bg-[#050505] text-center px-6">
        <div className="max-w-2xl mx-auto">
          <RevealSection>
            <p className="text-[#C9A227] text-[9px] tracking-[0.4em] font-bold uppercase mb-6 flex items-center justify-center gap-4">
              <span className="w-8 h-[1px] bg-[#C9A227]/40" />
              {t("home.exclusive")}
              <span className="w-8 h-[1px] bg-[#C9A227]/40" />
            </p>
            <h2
              className="text-[clamp(2rem,4.5vw,4rem)] font-bold text-white leading-[0.9] tracking-[-0.03em] mb-12"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {t("home.joinCommunity")}
            </h2>
            <p className="text-white/38 text-sm mb-12 leading-relaxed tracking-[0.03em] max-w-sm mx-auto font-light">
              {t("home.newsletterDesc")}
            </p>
          </RevealSection>
          <RevealSection delay={150}>
            <form
              className="flex flex-col sm:flex-row gap-0 justify-center"
              onSubmit={e => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const inp = form.elements.namedItem("nl_email") as HTMLInputElement;
                void fetch(`${BASE}/api/newsletter/subscribe`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email: inp.value }),
                }).then(() => { inp.value = ""; });
              }}
            >
              <input
                name="nl_email"
                type="email"
                required
                placeholder={t("home.enterEmail")}
                className="flex-1 border border-white/15 bg-white/5 text-white px-6 py-4 text-sm focus:outline-none focus:border-white/40 transition-colors placeholder:text-white/25 min-w-0 tracking-[0.02em] font-light"
              />
              <button
                type="submit"
                className="bg-white text-[#0B0B0B] px-10 py-4 text-[9px] font-bold tracking-[0.3em] uppercase hover:bg-[#C9A227] hover:text-white transition-colors shrink-0"
              >
                {t("footer.subscribe")}
              </button>
            </form>
            <p className="text-[8px] text-white/20 mt-5 tracking-[0.2em] uppercase font-medium">
              No spam. Unsubscribe at any time.
            </p>
          </RevealSection>
        </div>
      </section>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes scrollLine {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
      `}</style>
    </div>
  );
}

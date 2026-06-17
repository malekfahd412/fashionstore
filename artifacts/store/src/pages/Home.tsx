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
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.1 });
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
        transform: visible ? "translateY(0)" : "translateY(32px)",
        transition: `opacity 0.8s ease ${delay}ms, transform 0.8s ease ${delay}ms`,
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

  return (
    <div className="bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="relative h-[100dvh] min-h-[640px] overflow-hidden bg-[#0d0d0d]">
        {hero?.imageUrl ? (
          <img
            src={hero.imageUrl}
            alt=""
            onLoad={() => setHeroLoaded(true)}
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-[1.4s] ease-out ${heroLoaded ? "opacity-55 scale-100" : "opacity-0 scale-105"}`}
            loading="eager"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] via-[#111] to-[#0a0a0a]" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent" />

        <div
          className="absolute inset-0 flex flex-col justify-end px-8 md:px-16 lg:px-24 pb-16 md:pb-24"
          style={{ opacity: heroLoaded || !hero?.imageUrl ? 1 : 0, transition: "opacity 1s ease 0.3s" }}
        >
          <div className="max-w-4xl">
            <p className="text-[8px] font-bold tracking-[0.5em] uppercase text-white/35 mb-8 flex items-center gap-4">
              <span className="w-12 h-[1px] bg-white/25 inline-block" />
              {t("home.newCollection")}
            </p>
            <h1
              className="text-[clamp(3.5rem,10vw,9rem)] font-bold text-white leading-[0.85] mb-8 tracking-[-0.03em]"
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
                className="inline-flex items-center gap-4 bg-white text-[#111111] px-10 py-4 text-[9px] font-bold tracking-[0.32em] uppercase hover:bg-[#C9A227] hover:text-white transition-all duration-300"
              >
                {t("home.shopNow")}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/categories"
                className="text-[9px] font-bold tracking-[0.3em] uppercase text-white/40 hover:text-white transition-colors duration-200 flex items-center gap-3"
              >
                {t("home.exploreCategories")}
                <span className="w-8 h-[1px] bg-white/30 inline-block" />
              </Link>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 right-8 md:right-16 flex flex-col items-center gap-2 opacity-35">
          <div className="w-[1px] h-12 bg-white overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-full bg-white/50 animate-[scrollLine_2s_ease_infinite]" />
          </div>
          <p className="text-[7px] font-bold tracking-[0.4em] uppercase text-white rotate-90 origin-center mt-4 whitespace-nowrap">scroll</p>
        </div>

        {banners.length > 1 && (
          <div className="absolute bottom-8 left-8 md:left-16 flex gap-2 items-center">
            {banners.map((_, i) => (
              <div
                key={i}
                className={`transition-all duration-500 ${i === 0 ? "w-10 h-[1.5px] bg-white" : "w-2.5 h-[1px] bg-white/25"}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── EDITORIAL STRIP ──────────────────────────────────────────── */}
      <section className="bg-[#111111] border-y border-white/5">
        <div className="max-w-screen-2xl mx-auto px-6 md:px-16 grid grid-cols-2 md:grid-cols-4">
          {[t("home.trust1"), t("home.trust2"), t("home.trust3"), t("home.trust4")].map((text, i) => (
            <div
              key={i}
              className={`py-5 px-4 text-center ${i < 3 ? "border-r border-white/8" : ""}`}
            >
              <p className="text-[8px] font-bold tracking-[0.32em] uppercase text-white/30">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CATEGORIES — ASYMMETRIC EDITORIAL GRID ───────────────────── */}
      {(categories ?? []).length > 0 && (
        <section className="py-28 md:py-44">
          <div className="max-w-screen-xl mx-auto px-6 md:px-12">
            <RevealSection className="flex items-end justify-between mb-16">
              <div>
                <p className="text-[8px] font-bold tracking-[0.4em] uppercase text-black/28 mb-5">
                  {t("home.shopBy")}
                </p>
                <h2
                  className="text-[clamp(2.8rem,6vw,5.5rem)] font-bold text-[#111111] leading-[0.88] tracking-[-0.03em]"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {t("home.categories")}
                </h2>
              </div>
              <Link href="/categories" className="velora-link hidden md:block">
                {t("home.viewAll")}
              </Link>
            </RevealSection>

            {/* Asymmetric 2+3 editorial layout */}
            <div className="grid grid-cols-12 gap-3 md:gap-4">
              {/* Large feature — col-span-7 */}
              {(categories ?? []).slice(0, 1).map(cat => (
                <RevealSection key={cat.id} className="col-span-12 md:col-span-7" delay={0}>
                  <Link href={`/products?categoryId=${cat.id}`} className="group block relative overflow-hidden bg-[#EBEBEB]" style={{ aspectRatio: "7/6" }}>
                    {cat.imageUrl ? (
                      <img src={cat.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-700 ease-out" loading="lazy" />
                    ) : (
                      <div className="w-full h-full bg-[#E0DFD8]" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
                      <p className="text-[8px] font-bold tracking-[0.35em] uppercase text-white/40 mb-3 group-hover:text-[#C9A227] transition-colors">{t("home.shopNow")}</p>
                      <h3 className="text-2xl md:text-4xl font-bold text-white leading-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                        {language === "en" ? cat.nameEn : (cat.nameAr ?? cat.nameEn)}
                      </h3>
                    </div>
                  </Link>
                </RevealSection>
              ))}

              {/* Right stack — col-span-5 */}
              <div className="col-span-12 md:col-span-5 grid grid-rows-2 gap-3 md:gap-4">
                {(categories ?? []).slice(1, 3).map((cat, i) => (
                  <RevealSection key={cat.id} delay={i * 120 + 80}>
                    <Link href={`/products?categoryId=${cat.id}`} className="group block relative overflow-hidden bg-[#EBEBEB]" style={{ aspectRatio: "5/3" }}>
                      {cat.imageUrl ? (
                        <img src={cat.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-700 ease-out" loading="lazy" />
                      ) : (
                        <div className="w-full h-full bg-[#E0DFD8]" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8">
                        <h3 className="text-xl md:text-2xl font-bold text-white leading-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                          {language === "en" ? cat.nameEn : (cat.nameAr ?? cat.nameEn)}
                        </h3>
                        <p className="text-[8px] font-bold tracking-[0.32em] uppercase text-white/40 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">{t("home.shopNow")}</p>
                      </div>
                    </Link>
                  </RevealSection>
                ))}
              </div>

              {/* Bottom row of 3 */}
              {(categories ?? []).slice(3, 6).map((cat, i) => (
                <RevealSection key={cat.id} className="col-span-4" delay={i * 100 + 200}>
                  <Link href={`/products?categoryId=${cat.id}`} className="group block relative overflow-hidden bg-[#EBEBEB]" style={{ aspectRatio: "1/1.2" }}>
                    {cat.imageUrl ? (
                      <img src={cat.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-700 ease-out" loading="lazy" />
                    ) : (
                      <div className="w-full h-full bg-[#E0DFD8]" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <h3 className="text-base md:text-lg font-bold text-white leading-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
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

      {/* ── NEW ARRIVALS ─────────────────────────────────────────────── */}
      <section className="py-28 md:py-40 bg-[#F5F4F2]">
        <div className="max-w-screen-xl mx-auto px-6 md:px-12">
          <RevealSection className="flex items-end justify-between mb-16">
            <div>
              <p className="text-[8px] font-bold tracking-[0.4em] uppercase text-black/28 mb-5">{t("home.justIn")}</p>
              <h2
                className="text-[clamp(2.8rem,6vw,5.5rem)] font-bold text-[#111111] leading-[0.88] tracking-[-0.03em]"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {t("home.newArrivals")}
              </h2>
            </div>
            <Link href="/products?sortBy=newest" className="velora-link hidden md:block">{t("home.viewAll")}</Link>
          </RevealSection>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-16">
            {newLoading
              ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : (newArrivals ?? []).slice(0, 8).map((p, i) => (
                  <RevealSection key={p.id} delay={i * 60}>
                    <ProductCard id={p.id} nameEn={p.nameEn} nameAr={p.nameAr} price={p.price} salePrice={p.salePrice} imageUrl={p.images?.[0]?.imageUrl} variants={p.variants} averageRating={p.averageRating} reviewCount={p.reviewCount} />
                  </RevealSection>
                ))
            }
          </div>

          <RevealSection className="mt-20 text-center" delay={100}>
            <Link
              href="/products?sortBy=newest"
              className="inline-flex items-center gap-4 border border-[#111111]/18 px-14 py-4 text-[9px] font-bold tracking-[0.32em] uppercase hover:bg-[#111111] hover:text-white hover:border-[#111111] transition-all duration-300"
            >
              {t("home.viewAllNew")}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </RevealSection>
        </div>
      </section>

      {/* ── FULL-BLEED EDITORIAL SPLIT ───────────────────────────────── */}
      {banners[1] && (
        <section className="grid md:grid-cols-2 min-h-[560px] md:min-h-[680px]">
          <div className="relative overflow-hidden bg-[#0d0d0d] min-h-[380px] md:min-h-0 order-2 md:order-1">
            {banners[1].imageUrl && (
              <img
                src={banners[1].imageUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-65 hover:opacity-75 transition-opacity duration-700"
                loading="lazy"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />
          </div>
          <div className="bg-white flex flex-col justify-center px-10 md:px-16 lg:px-24 py-20 md:py-32 order-1 md:order-2">
            <RevealSection>
              <p className="text-[8px] font-bold tracking-[0.4em] uppercase text-black/25 mb-8 flex items-center gap-4">
                <span className="w-8 h-[1px] bg-black/20" />
                {t("home.editorial")}
              </p>
              <h2
                className="text-[clamp(2rem,4vw,3.8rem)] font-bold mb-8 leading-[0.9] text-[#111111] tracking-[-0.03em]"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {language === "en" ? banners[1].titleEn : (banners[1].titleAr ?? banners[1].titleEn)}
              </h2>
              {banners[1].subtitleEn && (
                <p className="text-black/45 text-sm leading-relaxed mb-12 max-w-xs tracking-[0.03em] font-light">
                  {language === "en" ? banners[1].subtitleEn : (banners[1].subtitleAr ?? banners[1].subtitleEn)}
                </p>
              )}
              <Link
                href={banners[1].linkUrl ?? "/products"}
                className="self-start inline-flex items-center gap-4 bg-[#111111] text-white px-10 py-4 text-[9px] font-bold tracking-[0.3em] uppercase hover:bg-[#C9A227] transition-colors duration-300"
              >
                {t("home.discoverMore")}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </RevealSection>
          </div>
        </section>
      )}

      {/* ── BEST SELLERS ─────────────────────────────────────────────── */}
      <section className="py-28 md:py-40">
        <div className="max-w-screen-xl mx-auto px-6 md:px-12">
          <RevealSection className="flex items-end justify-between mb-16">
            <div>
              <p className="text-[8px] font-bold tracking-[0.4em] uppercase text-black/28 mb-5">{t("home.trending")}</p>
              <h2
                className="text-[clamp(2.8rem,6vw,5.5rem)] font-bold text-[#111111] leading-[0.88] tracking-[-0.03em]"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {t("home.bestSellers")}
              </h2>
            </div>
            <Link href="/products?sortBy=bestseller" className="velora-link hidden md:block">{t("home.viewAll")}</Link>
          </RevealSection>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-16">
            {bestLoading
              ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : (bestSellers ?? []).slice(0, 4).map((p, i) => (
                  <RevealSection key={p.id} delay={i * 80}>
                    <ProductCard id={p.id} nameEn={p.nameEn} nameAr={p.nameAr} price={p.price} salePrice={p.salePrice} imageUrl={p.images?.[0]?.imageUrl} variants={p.variants} averageRating={p.averageRating} reviewCount={p.reviewCount} />
                  </RevealSection>
                ))
            }
          </div>
        </div>
      </section>

      {/* ── FEATURED — CINEMATIC DARK SECTION ────────────────────────── */}
      {(featured ?? []).length > 0 && (
        <section className="py-28 md:py-40 bg-[#111111]">
          <div className="max-w-screen-xl mx-auto px-6 md:px-12">
            <RevealSection className="flex items-end justify-between mb-16">
              <div>
                <p className="text-[8px] font-bold tracking-[0.4em] uppercase text-white/20 mb-5">{t("home.curated")}</p>
                <h2
                  className="text-[clamp(2.8rem,6vw,5.5rem)] font-bold text-white leading-[0.88] tracking-[-0.03em]"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {t("home.featured")}
                </h2>
              </div>
              <Link href="/products?featured=true" className="text-[9px] font-bold tracking-[0.28em] uppercase text-white/25 hover:text-white transition-colors border-b border-white/15 pb-0.5 hidden md:block">
                {t("home.viewAll")}
              </Link>
            </RevealSection>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-16">
              {featuredLoading
                ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
                : (featured ?? []).slice(0, 4).map((p, i) => (
                    <RevealSection key={p.id} delay={i * 80}>
                      <ProductCard id={p.id} nameEn={p.nameEn} nameAr={p.nameAr} price={p.price} salePrice={p.salePrice} imageUrl={p.images?.[0]?.imageUrl} variants={p.variants} averageRating={p.averageRating} reviewCount={p.reviewCount} />
                    </RevealSection>
                  ))
              }
            </div>
          </div>
        </section>
      )}

      {/* ── FULL-WIDTH BANNER 3 ───────────────────────────────────────── */}
      {banners[2] && (
        <section className="relative h-[70vh] min-h-[480px] overflow-hidden bg-[#111111]">
          {banners[2].imageUrl && (
            <img
              src={banners[2].imageUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-40"
              loading="lazy"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8">
            <RevealSection>
              <p className="text-[8px] font-bold tracking-[0.5em] uppercase text-white/30 mb-8 flex items-center justify-center gap-4">
                <span className="w-10 h-[1px] bg-white/20" />
                {t("home.limitedEdition")}
                <span className="w-10 h-[1px] bg-white/20" />
              </p>
              <h2
                className="text-[clamp(3rem,8vw,7rem)] font-bold text-white mb-12 leading-[0.88] tracking-[-0.03em] max-w-2xl mx-auto"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {language === "en" ? banners[2].titleEn : (banners[2].titleAr ?? banners[2].titleEn)}
              </h2>
              <Link
                href={banners[2].linkUrl ?? "/products"}
                className="inline-flex items-center gap-4 border border-white/50 text-white px-14 py-4 text-[9px] font-bold tracking-[0.32em] uppercase hover:bg-white hover:text-[#111111] transition-all duration-300"
              >
                {t("home.shopCollection")}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </RevealSection>
          </div>
        </section>
      )}

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      {faqs.length > 0 && (
        <section className="py-28 md:py-40 bg-[#F5F4F2]">
          <div className="max-w-screen-xl mx-auto px-6 md:px-12">
            <div className="grid md:grid-cols-3 gap-16 md:gap-24">
              <RevealSection>
                <p className="text-[8px] font-bold tracking-[0.4em] uppercase text-black/25 mb-7">{t("home.faqLabel")}</p>
                <h2
                  className="text-[clamp(2rem,4vw,3rem)] font-bold text-[#111111] leading-[0.9] tracking-[-0.02em]"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {t("home.faqTitle")}
                </h2>
              </RevealSection>
              <RevealSection className="md:col-span-2 divide-y divide-black/7" delay={100}>
                {faqs.map(faq => (
                  <div key={faq.id}>
                    <button
                      className="w-full flex items-center justify-between py-7 text-left gap-8"
                      onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
                    >
                      <span className="font-medium text-sm leading-snug tracking-[0.02em] text-[#111111]">
                        {language === "en" ? faq.questionEn : faq.questionAr}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-black/30 shrink-0 transition-transform duration-400 ${openFaq === faq.id ? "rotate-180" : ""}`} />
                    </button>
                    <div className={`overflow-hidden transition-all duration-400 ${openFaq === faq.id ? "max-h-96 pb-7" : "max-h-0"}`}>
                      <p className="text-sm text-black/48 leading-relaxed tracking-[0.02em] font-light">
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
      <section className="py-28 md:py-36 bg-[#111111]">
        <div className="max-w-screen-xl mx-auto px-6 md:px-12">
          <div className="grid md:grid-cols-2 gap-16 md:gap-24 items-center">
            <RevealSection>
              <p className="text-[8px] font-bold tracking-[0.4em] uppercase text-white/22 mb-7 flex items-center gap-4">
                <span className="w-8 h-[1px] bg-white/20" />
                {t("home.exclusive")}
              </p>
              <h2
                className="text-[clamp(2rem,4.5vw,4rem)] font-bold text-white leading-[0.9] tracking-[-0.03em]"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {t("home.joinCommunity")}
              </h2>
              <p className="text-white/38 text-sm mt-6 leading-relaxed tracking-[0.03em] max-w-sm font-light">{t("home.newsletterDesc")}</p>
            </RevealSection>
            <RevealSection delay={150}>
              <form
                className="flex gap-0"
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
                  placeholder={t("footer.emailPlaceholder")}
                  className="flex-1 border border-white/10 border-r-0 bg-white/5 text-white px-5 py-4 text-sm focus:outline-none focus:border-white/35 transition-colors placeholder:text-white/22 min-w-0 tracking-[0.02em] font-light"
                />
                <button
                  type="submit"
                  className="bg-[#C9A227] text-white px-8 py-4 text-[9px] font-bold tracking-[0.3em] uppercase hover:bg-[#b8912a] transition-colors shrink-0"
                >
                  {t("footer.subscribe")}
                </button>
              </form>
              <p className="text-[8px] text-white/20 mt-4 tracking-[0.2em] uppercase font-medium">
                No spam. Unsubscribe at any time.
              </p>
            </RevealSection>
          </div>
        </div>
      </section>

      <style>{`
        @keyframes scrollLine {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
      `}</style>
    </div>
  );
}

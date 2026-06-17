import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useListBanners, useGetFeaturedProducts, useGetNewArrivals, useListCategories, useGetBestSellers } from "@workspace/api-client-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSEO } from "@/hooks/useSEO";
import { Link } from "wouter";
import { ChevronRight, ChevronDown } from "lucide-react";
import ProductCard, { ProductCardSkeleton } from "@/components/ProductCard";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
type FaqItem = { id: number; questionEn: string; questionAr: string; answerEn: string; answerAr: string };

function SectionLabel({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return <p className={`text-[10px] font-bold tracking-[0.25em] uppercase mb-4 ${light ? "text-white/35" : "text-foreground/38"}`}>{children}</p>;
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

  const banners = (bannersRaw ?? []).filter(b => b.active);
  const hero = banners[0];

  return (
    <div className="bg-white">

      {/* ── HERO ──────────────────────────────────────────── */}
      <section className="relative h-[90dvh] min-h-[540px] max-h-[900px] overflow-hidden bg-[#111111]">
        {hero?.imageUrl ? (
          <img
            src={hero.imageUrl}
            alt={language === "en" ? hero.titleEn : (hero.titleAr ?? hero.titleEn)}
            className="absolute inset-0 w-full h-full object-cover opacity-72"
            loading="eager"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1c1c1c] via-[#232323] to-[#111111]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-black/0" />

        <div className="absolute inset-0 flex flex-col items-start justify-end px-8 md:px-16 pb-16 md:pb-24 max-w-screen-xl mx-auto left-0 right-0">
          <div className="max-w-2xl">
            <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/45 mb-4">
              {t("home.newCollection")}
            </p>
            <h1 className="font-serif text-5xl md:text-7xl lg:text-[5.5rem] font-bold text-white leading-[0.9] mb-6">
              {hero
                ? (language === "en" ? hero.titleEn : (hero.titleAr ?? hero.titleEn))
                : t("home.heroTitle")}
            </h1>
            {hero && (hero.subtitleEn || hero.subtitleAr) && (
              <p className="text-base text-white/55 mb-10 max-w-sm leading-relaxed">
                {language === "en" ? (hero.subtitleEn ?? "") : (hero.subtitleAr ?? hero.subtitleEn ?? "")}
              </p>
            )}
            <div className="flex items-center gap-6 flex-wrap">
              <Link
                href={hero?.linkUrl ?? "/products"}
                className="inline-flex items-center gap-2.5 bg-white text-[#111111] px-8 py-4 text-[10px] font-bold tracking-[0.22em] uppercase hover:bg-white/88 transition-colors"
              >
                {t("home.shopNow")}
                <ChevronRight className="w-3 h-3" />
              </Link>
              <Link
                href="/categories"
                className="text-[10px] font-bold tracking-[0.22em] uppercase text-white/55 hover:text-white transition-colors border-b border-white/25 pb-0.5"
              >
                {t("home.exploreCategories")}
              </Link>
            </div>
          </div>
        </div>

        {banners.length > 1 && (
          <div className="absolute bottom-8 right-8 flex gap-1.5">
            {banners.map((_, i) => (
              <div key={i} className={`h-[2px] transition-all duration-300 ${i === 0 ? "w-6 bg-white" : "w-2 bg-white/28"}`} />
            ))}
          </div>
        )}
      </section>

      {/* ── TRUST BAR ─────────────────────────────────────── */}
      <section className="border-y border-black/6 bg-[#F5F5F5]">
        <div className="max-w-screen-xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 divide-x divide-black/6">
          {[t("home.trust1"), t("home.trust2"), t("home.trust3"), t("home.trust4")].map((text, i) => (
            <div key={i} className="text-center py-4 px-4">
              <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-foreground/42">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CATEGORIES GRID ───────────────────────────────── */}
      {(categories ?? []).length > 0 && (
        <section className="py-20 md:py-28 max-w-screen-xl mx-auto px-6">
          <div className="flex items-end justify-between mb-10">
            <div>
              <SectionLabel>{t("home.shopBy")}</SectionLabel>
              <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold">{t("home.categories")}</h2>
            </div>
            <Link href="/categories" className="hidden md:flex items-center gap-1 text-[10px] font-bold tracking-[0.2em] uppercase text-foreground/38 hover:text-foreground transition-colors">
              {t("home.viewAll")} <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {(categories ?? []).slice(0, 8).map((cat, i) => (
              <Link key={cat.id} href={`/products?categoryId=${cat.id}`} className="group relative overflow-hidden bg-[#F5F5F5]">
                <div className={`${i === 0 ? "aspect-[3/5]" : "aspect-[3/4]"} overflow-hidden`}>
                  {cat.imageUrl ? (
                    <img
                      src={cat.imageUrl}
                      alt={language === "en" ? cat.nameEn : (cat.nameAr ?? cat.nameEn)}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#E8E8E8]" />
                  )}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/0 flex items-end p-5">
                  <div>
                    <p className="text-white font-serif text-xl font-bold leading-tight">
                      {language === "en" ? cat.nameEn : (cat.nameAr ?? cat.nameEn)}
                    </p>
                    <p className="text-white/55 text-[10px] tracking-[0.2em] uppercase font-semibold mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      {t("home.shopNow")} →
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-6 text-center md:hidden">
            <Link href="/categories" className="text-[10px] font-bold tracking-[0.2em] uppercase text-foreground/38 hover:text-foreground transition-colors border-b border-current pb-0.5">
              {t("home.viewAll")}
            </Link>
          </div>
        </section>
      )}

      {/* ── NEW ARRIVALS ──────────────────────────────────── */}
      <section className="py-20 md:py-28 bg-[#F9F9F9]">
        <div className="max-w-screen-xl mx-auto px-6">
          <div className="flex items-end justify-between mb-10">
            <div>
              <SectionLabel>{t("home.justIn")}</SectionLabel>
              <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold">{t("home.newArrivals")}</h2>
            </div>
            <Link href="/products?sortBy=newest" className="hidden md:flex items-center gap-1 text-[10px] font-bold tracking-[0.2em] uppercase text-foreground/38 hover:text-foreground transition-colors">
              {t("home.viewAll")} <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-10">
            {newLoading
              ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : (newArrivals ?? []).slice(0, 8).map(p => (
                  <ProductCard key={p.id} id={p.id} nameEn={p.nameEn} nameAr={p.nameAr} price={p.price} salePrice={p.salePrice} imageUrl={p.images?.[0]?.imageUrl} variants={p.variants} averageRating={p.averageRating} reviewCount={p.reviewCount} />
                ))
            }
          </div>
          <div className="mt-12 text-center">
            <Link href="/products?sortBy=newest" className="inline-flex items-center gap-2 border border-foreground/25 px-10 py-4 text-[10px] font-bold tracking-[0.22em] uppercase hover:bg-foreground hover:text-background hover:border-foreground transition-colors">
              {t("home.viewAllNew")}
            </Link>
          </div>
        </div>
      </section>

      {/* ── EDITORIAL SPLIT (banner 2) ────────────────────── */}
      {banners[1] && (
        <section className="grid md:grid-cols-2 min-h-[480px]">
          <div className="relative overflow-hidden bg-[#111111] min-h-[300px] md:min-h-0">
            {banners[1].imageUrl && (
              <img src={banners[1].imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-65" loading="lazy" />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black/35 to-transparent" />
          </div>
          <div className="bg-[#F5F5F5] flex flex-col justify-center px-10 md:px-14 py-14 md:py-20">
            <SectionLabel>{t("home.editorial")}</SectionLabel>
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-5 leading-snug">
              {language === "en" ? banners[1].titleEn : (banners[1].titleAr ?? banners[1].titleEn)}
            </h2>
            {banners[1].subtitleEn && (
              <p className="text-foreground/52 text-sm leading-relaxed mb-8 max-w-sm">
                {language === "en" ? banners[1].subtitleEn : (banners[1].subtitleAr ?? banners[1].subtitleEn)}
              </p>
            )}
            <Link
              href={banners[1].linkUrl ?? "/products"}
              className="self-start inline-flex items-center gap-2 bg-[#111111] text-white px-8 py-4 text-[10px] font-bold tracking-[0.22em] uppercase hover:bg-[#111111]/82 transition-colors"
            >
              {t("home.discoverMore")}
            </Link>
          </div>
        </section>
      )}

      {/* ── BEST SELLERS ──────────────────────────────────── */}
      <section className="py-20 md:py-28 max-w-screen-xl mx-auto px-6">
        <div className="flex items-end justify-between mb-10">
          <div>
            <SectionLabel>{t("home.trending")}</SectionLabel>
            <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold">{t("home.bestSellers")}</h2>
          </div>
          <Link href="/products?sortBy=bestseller" className="hidden md:flex items-center gap-1 text-[10px] font-bold tracking-[0.2em] uppercase text-foreground/38 hover:text-foreground transition-colors">
            {t("home.viewAll")} <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-10">
          {bestLoading
            ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : (bestSellers ?? []).slice(0, 4).map(p => (
                <ProductCard key={p.id} id={p.id} nameEn={p.nameEn} nameAr={p.nameAr} price={p.price} salePrice={p.salePrice} imageUrl={p.images?.[0]?.imageUrl} variants={p.variants} averageRating={p.averageRating} reviewCount={p.reviewCount} />
              ))
          }
        </div>
      </section>

      {/* ── FEATURED (dark background) ────────────────────── */}
      {(featured ?? []).length > 0 && (
        <section className="py-20 md:py-28 bg-[#111111]">
          <div className="max-w-screen-xl mx-auto px-6">
            <div className="flex items-end justify-between mb-10">
              <div>
                <SectionLabel light>{t("home.curated")}</SectionLabel>
                <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold text-white">{t("home.featured")}</h2>
              </div>
              <Link href="/products?featured=true" className="hidden md:flex items-center gap-1 text-[10px] font-bold tracking-[0.2em] uppercase text-white/28 hover:text-white transition-colors">
                {t("home.viewAll")} <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-10">
              {featuredLoading
                ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
                : (featured ?? []).slice(0, 4).map(p => (
                    <ProductCard key={p.id} id={p.id} nameEn={p.nameEn} nameAr={p.nameAr} price={p.price} salePrice={p.salePrice} imageUrl={p.images?.[0]?.imageUrl} variants={p.variants} averageRating={p.averageRating} reviewCount={p.reviewCount} />
                  ))
              }
            </div>
          </div>
        </section>
      )}

      {/* ── FULL-WIDTH BANNER 3 ───────────────────────────── */}
      {banners[2] && (
        <section className="relative h-[55vh] min-h-[360px] overflow-hidden bg-[#111111]">
          {banners[2].imageUrl && (
            <img src={banners[2].imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" loading="lazy" />
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/38 mb-4">{t("home.limitedEdition")}</p>
            <h2 className="font-serif text-4xl md:text-6xl font-bold text-white mb-6 max-w-xl leading-tight">
              {language === "en" ? banners[2].titleEn : (banners[2].titleAr ?? banners[2].titleEn)}
            </h2>
            <Link
              href={banners[2].linkUrl ?? "/products"}
              className="inline-flex items-center gap-2 border border-white text-white px-10 py-4 text-[10px] font-bold tracking-[0.22em] uppercase hover:bg-white hover:text-[#111111] transition-colors"
            >
              {t("home.shopCollection")}
            </Link>
          </div>
        </section>
      )}

      {/* ── FAQ ───────────────────────────────────────────── */}
      {faqs.length > 0 && (
        <section className="py-20 md:py-28 max-w-screen-xl mx-auto px-6">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <SectionLabel>{t("home.faqLabel")}</SectionLabel>
              <h2 className="font-serif text-3xl md:text-4xl font-bold">{t("home.faqTitle")}</h2>
            </div>
            <div className="divide-y divide-black/8">
              {faqs.map(faq => (
                <div key={faq.id}>
                  <button
                    className="w-full flex items-center justify-between py-5 text-left gap-4"
                    onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
                  >
                    <span className="font-medium text-sm leading-snug">
                      {language === "en" ? faq.questionEn : faq.questionAr}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-foreground/40 shrink-0 transition-transform duration-300 ${openFaq === faq.id ? "rotate-180" : ""}`} />
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ${openFaq === faq.id ? "max-h-96 pb-5" : "max-h-0"}`}>
                    <p className="text-sm text-foreground/55 leading-relaxed">
                      {language === "en" ? faq.answerEn : faq.answerAr}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── NEWSLETTER ────────────────────────────────────── */}
      <section className="py-20 md:py-24 border-t border-black/6">
        <div className="max-w-screen-xl mx-auto px-6">
          <div className="max-w-xl mx-auto text-center">
            <SectionLabel>{t("home.exclusive")}</SectionLabel>
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-3">{t("home.joinCommunity")}</h2>
            <p className="text-foreground/48 text-sm mt-2 mb-8 leading-relaxed">{t("home.newsletterDesc")}</p>
            <form
              className="flex gap-0 max-w-sm mx-auto"
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
                className="flex-1 border border-black/14 border-r-0 px-4 py-3.5 text-sm focus:outline-none focus:border-foreground transition-colors placeholder:text-foreground/28 min-w-0"
              />
              <button type="submit" className="bg-[#111111] text-white px-6 py-3.5 text-[10px] font-bold tracking-[0.18em] uppercase hover:bg-[#111111]/80 transition-colors shrink-0">
                {t("footer.subscribe")}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}

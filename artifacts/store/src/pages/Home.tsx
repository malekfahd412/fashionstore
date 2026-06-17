import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useListBanners, useGetFeaturedProducts, useGetNewArrivals, useListCategories, useGetBestSellers } from "@workspace/api-client-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSEO } from "@/hooks/useSEO";
import { Link } from "wouter";
import { ChevronDown } from "lucide-react";
import ProductCard, { ProductCardSkeleton } from "@/components/ProductCard";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
type FaqItem = { id: number; questionEn: string; questionAr: string; answerEn: string; answerAr: string };

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
    <div className="bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="relative h-[95dvh] min-h-[600px] overflow-hidden bg-[#111111]">
        {hero?.imageUrl ? (
          <img
            src={hero.imageUrl}
            alt={language === "en" ? hero.titleEn : (hero.titleAr ?? hero.titleEn)}
            className="absolute inset-0 w-full h-full object-cover opacity-60"
            loading="eager"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] via-[#222] to-[#111111]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        <div className="absolute inset-0 flex flex-col items-start justify-end px-8 md:px-16 lg:px-24 pb-20 md:pb-32">
          <div className="max-w-3xl">
            <p className="text-[9px] font-bold tracking-[0.4em] uppercase text-white/40 mb-6">
              {t("home.newCollection")}
            </p>
            <h1
              className="text-[3.8rem] md:text-[6rem] lg:text-[7.5rem] font-bold text-white leading-[0.88] mb-8 tracking-tight"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {hero
                ? (language === "en" ? hero.titleEn : (hero.titleAr ?? hero.titleEn))
                : t("home.heroTitle")}
            </h1>
            {hero && (hero.subtitleEn || hero.subtitleAr) && (
              <p className="text-sm text-white/50 mb-12 max-w-md leading-relaxed tracking-wide">
                {language === "en" ? (hero.subtitleEn ?? "") : (hero.subtitleAr ?? hero.subtitleEn ?? "")}
              </p>
            )}
            <div className="flex items-center gap-8 flex-wrap">
              <Link
                href={hero?.linkUrl ?? "/products"}
                className="inline-flex items-center gap-3 bg-white text-[#111111] px-10 py-4 text-[9px] font-bold tracking-[0.3em] uppercase hover:bg-[#C9A227] hover:text-white transition-colors duration-300"
              >
                {t("home.shopNow")}
              </Link>
              <Link
                href="/categories"
                className="text-[9px] font-bold tracking-[0.3em] uppercase text-white/45 hover:text-white transition-colors"
              >
                {t("home.exploreCategories")} —
              </Link>
            </div>
          </div>
        </div>

        {banners.length > 1 && (
          <div className="absolute bottom-10 right-8 flex gap-2">
            {banners.map((_, i) => (
              <div key={i} className={`h-[1px] transition-all duration-300 ${i === 0 ? "w-8 bg-white" : "w-2 bg-white/25"}`} />
            ))}
          </div>
        )}
      </section>

      {/* ── MARQUEE TRUST BAR ────────────────────────────────────────── */}
      <section className="border-y border-black/8 bg-[#F7F6F4] overflow-hidden">
        <div className="max-w-screen-xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 divide-x divide-black/8">
          {[t("home.trust1"), t("home.trust2"), t("home.trust3"), t("home.trust4")].map((text, i) => (
            <div key={i} className="text-center py-5 px-4">
              <p className="text-[9px] font-semibold tracking-[0.25em] uppercase text-black/38">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CATEGORIES — EDITORIAL GRID ─────────────────────────────── */}
      {(categories ?? []).length > 0 && (
        <section className="py-24 md:py-36 max-w-screen-xl mx-auto px-6 md:px-10">
          <div className="flex items-end justify-between mb-14">
            <div>
              <p className="text-[9px] font-bold tracking-[0.35em] uppercase text-black/30 mb-4">{t("home.shopBy")}</p>
              <h2
                className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#111111] leading-[0.92]"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {t("home.categories")}
              </h2>
            </div>
            <Link
              href="/categories"
              className="hidden md:block text-[9px] font-bold tracking-[0.28em] uppercase text-black/30 hover:text-black transition-colors border-b border-black/20 pb-0.5"
            >
              {t("home.viewAll")}
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {(categories ?? []).slice(0, 8).map((cat, i) => (
              <Link
                key={cat.id}
                href={`/products?categoryId=${cat.id}`}
                className={`group relative overflow-hidden bg-[#EFEFED] ${i === 0 ? "md:col-span-2 md:row-span-2" : ""}`}
              >
                <div className={`overflow-hidden ${i === 0 ? "aspect-[4/5]" : "aspect-[3/4]"}`}>
                  {cat.imageUrl ? (
                    <img
                      src={cat.imageUrl}
                      alt={language === "en" ? cat.nameEn : (cat.nameAr ?? cat.nameEn)}
                      className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-700 ease-out"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#E5E4E2]" />
                  )}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-6">
                  <div>
                    <p
                      className="text-white font-bold leading-tight text-xl group-hover:tracking-wider transition-all duration-300"
                      style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                    >
                      {language === "en" ? cat.nameEn : (cat.nameAr ?? cat.nameEn)}
                    </p>
                    <p className="text-[9px] tracking-[0.28em] uppercase text-white/50 font-bold mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      {t("home.shopNow")}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── NEW ARRIVALS ─────────────────────────────────────────────── */}
      <section className="py-24 md:py-36 bg-[#F7F6F4]">
        <div className="max-w-screen-xl mx-auto px-6 md:px-10">
          <div className="flex items-end justify-between mb-14">
            <div>
              <p className="text-[9px] font-bold tracking-[0.35em] uppercase text-black/30 mb-4">{t("home.justIn")}</p>
              <h2
                className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#111111] leading-[0.92]"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {t("home.newArrivals")}
              </h2>
            </div>
            <Link
              href="/products?sortBy=newest"
              className="hidden md:block text-[9px] font-bold tracking-[0.28em] uppercase text-black/30 hover:text-black transition-colors border-b border-black/20 pb-0.5"
            >
              {t("home.viewAll")}
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-12">
            {newLoading
              ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : (newArrivals ?? []).slice(0, 8).map(p => (
                  <ProductCard key={p.id} id={p.id} nameEn={p.nameEn} nameAr={p.nameAr} price={p.price} salePrice={p.salePrice} imageUrl={p.images?.[0]?.imageUrl} variants={p.variants} averageRating={p.averageRating} reviewCount={p.reviewCount} />
                ))
            }
          </div>
          <div className="mt-16 text-center">
            <Link
              href="/products?sortBy=newest"
              className="inline-flex items-center gap-3 border border-[#111111]/20 px-12 py-4 text-[9px] font-bold tracking-[0.3em] uppercase hover:bg-[#111111] hover:text-white hover:border-[#111111] transition-colors duration-300"
            >
              {t("home.viewAllNew")}
            </Link>
          </div>
        </div>
      </section>

      {/* ── EDITORIAL SPLIT (banner 2) ───────────────────────────────── */}
      {banners[1] && (
        <section className="grid md:grid-cols-2 min-h-[520px]">
          <div className="relative overflow-hidden bg-[#111111] min-h-[360px] md:min-h-0">
            {banners[1].imageUrl && (
              <img
                src={banners[1].imageUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-60"
                loading="lazy"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black/25 to-transparent" />
          </div>
          <div className="bg-white flex flex-col justify-center px-10 md:px-16 lg:px-20 py-16 md:py-24">
            <p className="text-[9px] font-bold tracking-[0.35em] uppercase text-black/28 mb-6">{t("home.editorial")}</p>
            <h2
              className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-[0.92] text-[#111111]"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {language === "en" ? banners[1].titleEn : (banners[1].titleAr ?? banners[1].titleEn)}
            </h2>
            {banners[1].subtitleEn && (
              <p className="text-black/45 text-sm leading-relaxed mb-10 max-w-xs tracking-wide">
                {language === "en" ? banners[1].subtitleEn : (banners[1].subtitleAr ?? banners[1].subtitleEn)}
              </p>
            )}
            <Link
              href={banners[1].linkUrl ?? "/products"}
              className="self-start inline-flex items-center gap-3 bg-[#111111] text-white px-10 py-4 text-[9px] font-bold tracking-[0.3em] uppercase hover:bg-[#C9A227] transition-colors duration-300"
            >
              {t("home.discoverMore")}
            </Link>
          </div>
        </section>
      )}

      {/* ── BEST SELLERS ─────────────────────────────────────────────── */}
      <section className="py-24 md:py-36 max-w-screen-xl mx-auto px-6 md:px-10">
        <div className="flex items-end justify-between mb-14">
          <div>
            <p className="text-[9px] font-bold tracking-[0.35em] uppercase text-black/30 mb-4">{t("home.trending")}</p>
            <h2
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#111111] leading-[0.92]"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {t("home.bestSellers")}
            </h2>
          </div>
          <Link
            href="/products?sortBy=bestseller"
            className="hidden md:block text-[9px] font-bold tracking-[0.28em] uppercase text-black/30 hover:text-black transition-colors border-b border-black/20 pb-0.5"
          >
            {t("home.viewAll")}
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-12">
          {bestLoading
            ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : (bestSellers ?? []).slice(0, 4).map(p => (
                <ProductCard key={p.id} id={p.id} nameEn={p.nameEn} nameAr={p.nameAr} price={p.price} salePrice={p.salePrice} imageUrl={p.images?.[0]?.imageUrl} variants={p.variants} averageRating={p.averageRating} reviewCount={p.reviewCount} />
              ))
          }
        </div>
      </section>

      {/* ── FEATURED — DARK ──────────────────────────────────────────── */}
      {(featured ?? []).length > 0 && (
        <section className="py-24 md:py-36 bg-[#111111]">
          <div className="max-w-screen-xl mx-auto px-6 md:px-10">
            <div className="flex items-end justify-between mb-14">
              <div>
                <p className="text-[9px] font-bold tracking-[0.35em] uppercase text-white/25 mb-4">{t("home.curated")}</p>
                <h2
                  className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[0.92]"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {t("home.featured")}
                </h2>
              </div>
              <Link
                href="/products?featured=true"
                className="hidden md:block text-[9px] font-bold tracking-[0.28em] uppercase text-white/25 hover:text-white transition-colors border-b border-white/15 pb-0.5"
              >
                {t("home.viewAll")}
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-12">
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

      {/* ── FULL-WIDTH BANNER 3 ───────────────────────────────────────── */}
      {banners[2] && (
        <section className="relative h-[60vh] min-h-[400px] overflow-hidden bg-[#111111]">
          {banners[2].imageUrl && (
            <img src={banners[2].imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-45" loading="lazy" />
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            <p className="text-[9px] font-bold tracking-[0.4em] uppercase text-white/30 mb-6">{t("home.limitedEdition")}</p>
            <h2
              className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-10 max-w-2xl leading-[0.9]"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {language === "en" ? banners[2].titleEn : (banners[2].titleAr ?? banners[2].titleEn)}
            </h2>
            <Link
              href={banners[2].linkUrl ?? "/products"}
              className="inline-flex items-center gap-3 border border-white/60 text-white px-12 py-4 text-[9px] font-bold tracking-[0.3em] uppercase hover:bg-white hover:text-[#111111] transition-colors duration-300"
            >
              {t("home.shopCollection")}
            </Link>
          </div>
        </section>
      )}

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      {faqs.length > 0 && (
        <section className="py-24 md:py-36 bg-[#F7F6F4]">
          <div className="max-w-screen-xl mx-auto px-6 md:px-10">
            <div className="grid md:grid-cols-3 gap-16">
              <div>
                <p className="text-[9px] font-bold tracking-[0.35em] uppercase text-black/28 mb-6">{t("home.faqLabel")}</p>
                <h2
                  className="text-3xl md:text-4xl font-bold text-[#111111] leading-tight"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {t("home.faqTitle")}
                </h2>
              </div>
              <div className="md:col-span-2 divide-y divide-black/8">
                {faqs.map(faq => (
                  <div key={faq.id}>
                    <button
                      className="w-full flex items-center justify-between py-6 text-left gap-6"
                      onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
                    >
                      <span className="font-medium text-sm leading-snug tracking-wide">
                        {language === "en" ? faq.questionEn : faq.questionAr}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-black/35 shrink-0 transition-transform duration-300 ${openFaq === faq.id ? "rotate-180" : ""}`} />
                    </button>
                    <div className={`overflow-hidden transition-all duration-300 ${openFaq === faq.id ? "max-h-96 pb-6" : "max-h-0"}`}>
                      <p className="text-sm text-black/50 leading-relaxed tracking-wide">
                        {language === "en" ? faq.answerEn : faq.answerAr}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── NEWSLETTER ───────────────────────────────────────────────── */}
      <section className="py-24 md:py-32 bg-[#111111]">
        <div className="max-w-screen-xl mx-auto px-6 md:px-10">
          <div className="grid md:grid-cols-2 gap-14 items-center">
            <div>
              <p className="text-[9px] font-bold tracking-[0.35em] uppercase text-white/25 mb-6">{t("home.exclusive")}</p>
              <h2
                className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-[0.92]"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {t("home.joinCommunity")}
              </h2>
              <p className="text-white/40 text-sm mt-5 leading-relaxed tracking-wide max-w-sm">{t("home.newsletterDesc")}</p>
            </div>
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
                className="flex-1 border border-white/12 border-r-0 bg-white/5 text-white px-5 py-4 text-sm focus:outline-none focus:border-white/40 transition-colors placeholder:text-white/25 min-w-0 tracking-wide"
              />
              <button
                type="submit"
                className="bg-[#C9A227] text-white px-8 py-4 text-[9px] font-bold tracking-[0.28em] uppercase hover:bg-[#b8912a] transition-colors shrink-0"
              >
                {t("footer.subscribe")}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}

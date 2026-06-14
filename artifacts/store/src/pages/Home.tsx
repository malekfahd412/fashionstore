import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useListBanners, useGetFeaturedProducts, useGetNewArrivals, useListCategories, useGetBestSellers } from "@workspace/api-client-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSEO } from "@/hooks/useSEO";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Truck, RotateCcw, ShieldCheck, CreditCard, Star, ChevronLeft, ChevronRight } from "lucide-react";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`w-4 h-4 ${i < rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
      ))}
    </div>
  );
}

type FaqItem = { id: number; questionEn: string; questionAr: string; answerEn: string; answerAr: string };

export default function Home() {
  const { language, t } = useLanguage();
  useSEO({ title: "Fashion for the Modern World", description: "Discover curated fashion collections at Velora. Shop new arrivals, featured pieces, and exclusive styles." });
  const { data: banners } = useListBanners();
  const { data: featured } = useGetFeaturedProducts();
  const { data: newArrivals } = useGetNewArrivals();
  const { data: bestSellers } = useGetBestSellers({ query: { queryKey: [] } });
  const { data: categories } = useListCategories();
  const { data: faqs = [] } = useQuery<FaqItem[]>({
    queryKey: ["public-faqs"],
    queryFn: () => fetch("/api/faq").then(r => r.json()) as Promise<FaqItem[]>,
    staleTime: 5 * 60_000,
  });

  const activeBanners = banners?.filter(b => b.active).sort((a, b) => a.sortOrder - b.sortOrder) || [];
  const [bannerIdx, setBannerIdx] = useState(0);

  useEffect(() => {
    if (activeBanners.length <= 1) return;
    const timer = setInterval(() => setBannerIdx(i => (i + 1) % activeBanners.length), 5000);
    return () => clearInterval(timer);
  }, [activeBanners.length]);

  const currentBanner = activeBanners[bannerIdx];

  const TRUST_ITEMS = [
    { icon: Truck, title: t("home.trust.freeShipping"), subtitle: t("home.trust.freeShippingDesc") },
    { icon: RotateCcw, title: t("home.trust.easyReturns"), subtitle: t("home.trust.easyReturnsDesc") },
    { icon: ShieldCheck, title: t("home.trust.securePayment"), subtitle: t("home.trust.securePaymentDesc") },
    { icon: CreditCard, title: t("home.trust.multiplePayment"), subtitle: t("home.trust.multiplePaymentDesc") },
  ];


  return (
    <div className="flex flex-col gap-16 pb-24">
      {/* ── Hero Section ───────────────────────────────────────────────── */}
      <section className="relative h-[85vh] w-full bg-secondary overflow-hidden">
        {currentBanner ? (
          <div className="absolute inset-0">
            <img
              src={currentBanner.imageUrl}
              alt={language === "en" ? currentBanner.titleEn : currentBanner.titleAr}
              className="w-full h-full object-cover transition-opacity duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/60" />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center p-4">
              <p className="text-xs uppercase tracking-[0.3em] font-medium mb-4 opacity-80">{t("home.newCollection")}</p>
              <h1 className="font-serif text-5xl md:text-7xl font-bold mb-4 drop-shadow-lg leading-tight">
                {language === "en" ? currentBanner.titleEn : currentBanner.titleAr}
              </h1>
              <p className="text-lg md:text-2xl mb-10 font-light drop-shadow-md max-w-2xl opacity-90">
                {language === "en" ? currentBanner.subtitleEn : currentBanner.subtitleAr}
              </p>
              {currentBanner.linkUrl && (
                <Button size="lg" className="bg-white text-black hover:bg-white/90 rounded-none px-10 py-6 text-base font-semibold tracking-widest uppercase" asChild>
                  <Link href={currentBanner.linkUrl}>{t("home.shopNow")}</Link>
                </Button>
              )}
            </div>
            {activeBanners.length > 1 && (
              <>
                <button onClick={() => setBannerIdx(i => (i - 1 + activeBanners.length) % activeBanners.length)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white rounded-full p-2 transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button onClick={() => setBannerIdx(i => (i + 1) % activeBanners.length)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white rounded-full p-2 transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                  {activeBanners.map((_, i) => (
                    <button key={i} onClick={() => setBannerIdx(i)}
                      className={`w-2 h-2 rounded-full transition-all ${i === bannerIdx ? "bg-white w-6" : "bg-white/50"}`} />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center p-4">
              <p className="text-xs uppercase tracking-[0.3em] font-medium mb-6 text-primary/60">{t("home.newCollection")} 2025</p>
              <h1 className="font-serif text-6xl md:text-8xl font-bold mb-6 text-primary">Velora</h1>
              <p className="text-lg text-primary/70 mb-10 max-w-md mx-auto">{t("home.curatedFashion")}</p>
              <Button size="lg" className="rounded-none px-10 py-6 text-base font-semibold tracking-widest uppercase" asChild>
                <Link href="/products">{t("home.exploreCollection")}</Link>
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* ── Trust Indicators ────────────────────────────────────────────── */}
      <section className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {TRUST_ITEMS.map(({ icon: Icon, title, subtitle }) => (
            <div key={title} className="flex flex-col items-center text-center p-5 border border-border hover:border-primary/30 transition-colors">
              <div className="w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center mb-3">
                <Icon className="w-6 h-6 text-primary" />
              </div>
              <p className="font-semibold text-sm">{title}</p>
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Shop by Category ────────────────────────────────────────────── */}
      <section className="container mx-auto px-4">
        <div className="flex justify-between items-end mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">{t("home.browse")}</p>
            <h2 className="font-serif text-3xl font-bold">{t("home.shopByCategory")}</h2>
          </div>
          <Link href="/categories" className="text-sm font-medium underline underline-offset-4 hover:text-primary">
            {t("home.viewAll")}
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          {categories?.slice(0, 4).map(category => (
            <Link key={category.id} href={`/products?categoryId=${category.id}`} className="group block">
              <div className="aspect-[3/4] overflow-hidden bg-muted mb-4 relative">
                {category.imageUrl ? (
                  <img src={category.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">{t("product.noImage")}</div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              </div>
              <h3 className="text-base font-medium text-center uppercase tracking-wider group-hover:text-primary transition-colors">
                {language === "en" ? category.nameEn : category.nameAr}
              </h3>
            </Link>
          ))}
        </div>
      </section>

      {/* ── New Arrivals ─────────────────────────────────────────────────── */}
      <section className="container mx-auto px-4">
        <div className="flex justify-between items-end mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">{t("home.freshIn")}</p>
            <h2 className="font-serif text-3xl font-bold">{t("home.newArrivals")}</h2>
          </div>
          <Link href="/products?sort=newest" className="text-sm font-medium underline underline-offset-4 hover:text-primary">
            {t("home.viewAll")}
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-8">
          {newArrivals?.slice(0, 8).map(product => (
            <Link key={product.id} href={`/products/${product.id}`} className="group">
              <div className="aspect-[3/4] overflow-hidden bg-muted mb-4 relative">
                {product.images?.[0] ? (
                  <img src={product.images[0].imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : null}
                {product.salePrice && (
                  <div className="absolute top-2 left-2 bg-destructive text-white text-xs px-2 py-1 font-bold">{t("home.saleBadge")}</div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3">
                  <p className="text-white text-xs font-medium text-center uppercase tracking-wide">{t("home.quickView")}</p>
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-medium line-clamp-1 group-hover:text-primary transition-colors">
                  {language === "en" ? product.nameEn : product.nameAr}
                </h3>
                <div className="flex items-center gap-2 text-sm">
                  {product.salePrice ? (
                    <>
                      <span className="font-bold text-destructive">{Number(product.salePrice).toLocaleString()} EGP</span>
                      <span className="line-through text-muted-foreground">{Number(product.price).toLocaleString()} EGP</span>
                    </>
                  ) : (
                    <span className="font-bold">{Number(product.price).toLocaleString()} EGP</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-12 text-center">
          <Button variant="outline" className="rounded-none border-primary text-primary px-10 py-5 uppercase tracking-widest text-sm font-semibold" asChild>
            <Link href="/products">{t("home.viewAllProducts")}</Link>
          </Button>
        </div>
      </section>

      {/* ── Best Sellers ──────────────────────────────────────────────────── */}
      {(bestSellers?.length ?? 0) > 0 && (
        <section className="bg-secondary/50 py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">{t("home.mostLoved")}</p>
              <h2 className="font-serif text-3xl font-bold">{t("home.bestSellers")}</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-8">
              {bestSellers?.slice(0, 4).map(product => (
                <Link key={product.id} href={`/products/${product.id}`} className="group">
                  <div className="aspect-[3/4] overflow-hidden bg-muted mb-4 relative">
                    {product.images?.[0] ? (
                      <img src={product.images[0].imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : null}
                    <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 font-bold uppercase tracking-wide">
                      {t("home.bestSellerBadge")}
                    </div>
                  </div>
                  <h3 className="text-sm font-medium line-clamp-1 group-hover:text-primary transition-colors">
                    {language === "en" ? product.nameEn : product.nameAr}
                  </h3>
                  <p className="font-bold mt-1">
                    {product.salePrice
                      ? `${Number(product.salePrice).toLocaleString()} EGP`
                      : `${Number(product.price).toLocaleString()} EGP`}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Featured Products ────────────────────────────────────────────── */}
      {(featured?.length ?? 0) > 0 && (
        <section className="container mx-auto px-4">
          <div className="text-center mb-10">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">{t("home.curatedForYou")}</p>
            <h2 className="font-serif text-3xl font-bold">{t("home.featuredCollection")}</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-8">
            {featured?.slice(0, 6).map(product => (
              <Link key={product.id} href={`/products/${product.id}`} className="group">
                <div className="aspect-[3/4] overflow-hidden bg-muted mb-4">
                  {product.images?.[0] ? (
                    <img src={product.images[0].imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : null}
                </div>
                <h3 className="text-sm font-medium line-clamp-1 group-hover:text-primary transition-colors">
                  {language === "en" ? product.nameEn : product.nameAr}
                </h3>
                <p className="font-bold mt-1 text-sm">
                  {product.salePrice ? (
                    <>
                      <span className="text-destructive">{Number(product.salePrice).toLocaleString()} EGP</span>
                      <span className="line-through text-muted-foreground ms-2 font-normal">{Number(product.price).toLocaleString()} EGP</span>
                    </>
                  ) : (
                    `${Number(product.price).toLocaleString()} EGP`
                  )}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}


      {/* ── Newsletter ───────────────────────────────────────────────────── */}
      <section className="container mx-auto px-4">
        <div className="border border-border bg-secondary/30 p-10 md:p-16 text-center max-w-2xl mx-auto">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">{t("home.stayInLoop")}</p>
          <h2 className="font-serif text-3xl font-bold mb-3">{t("home.joinCommunity")}</h2>
          <p className="text-muted-foreground mb-8 text-sm">{t("home.newsletterDesc")}</p>
          <NewsletterForm />
        </div>
      </section>

      {/* ── FAQ Preview ──────────────────────────────────────────────────── */}
      {faqs.length > 0 && (
        <section className="container mx-auto px-4 max-w-2xl">
          <div className="text-center mb-8">
            <h2 className="font-serif text-2xl font-bold">{t("home.faq")}</h2>
          </div>
          <div className="space-y-3">
            {faqs.slice(0, 3).map((faq) => {
              const q = language === "ar" ? faq.questionAr || faq.questionEn : faq.questionEn;
              const a = language === "ar" ? faq.answerAr || faq.answerEn : faq.answerEn;
              return (
                <details key={faq.id} className="group border border-border">
                  <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-medium text-sm list-none select-none">
                    {q}
                    <span className="ms-4 shrink-0 text-muted-foreground group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <div className="px-5 pb-4 text-sm text-muted-foreground border-t border-border pt-3">{a}</div>
                </details>
              );
            })}
          </div>
          <div className="text-center mt-6">
            <Link href="/faq" className="text-sm text-primary underline underline-offset-4 hover:opacity-80">
              {t("home.viewAllFaqs")}
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

function NewsletterForm() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setStatus("success");
        setEmail("");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return <p className="text-primary font-semibold">{t("home.subscribed")}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 max-w-sm mx-auto">
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder={t("home.enterEmail")}
        required
        className="flex-1 border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
      />
      <Button type="submit" disabled={status === "loading"} className="rounded-none px-6 shrink-0">
        {status === "loading" ? t("btn.subscribing") : t("btn.subscribe")}
      </Button>
    </form>
  );
}

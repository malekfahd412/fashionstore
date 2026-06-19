import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useListProducts, useListCategories } from "@workspace/api-client-react";
import { useSEO } from "@/hooks/useSEO";
import { X, Search, SlidersHorizontal } from "lucide-react";
import ProductCard, { ProductCardSkeleton } from "@/components/ProductCard";
import { useLocation } from "wouter";

export default function Products() {
  const { language, t } = useLanguage();
  useSEO({ title: "Shop", description: "Browse Velora's full collection of fashion for women and men." });
  const [location] = useLocation();

  const urlParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );
  const initialSearch = urlParams.get("search") ?? "";
  const initialCategory = urlParams.get("categoryId") ?? "all";

  const [searchInput, setSearchInput] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [categoryId, setCategoryId] = useState<string>(initialCategory);
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [sortOpen, setSortOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(searchInput); setPage(1); }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: categories } = useListCategories();
  const { data: productsData, isLoading } = useListProducts({
    search: debouncedSearch || undefined,
    categoryId: categoryId !== "all" ? Number(categoryId) : undefined,
    sortBy,
    page,
    limit: 12,
  });

  const hasActiveFilters = searchInput !== "" || categoryId !== "all";
  const totalPages = productsData ? Math.ceil(productsData.total / productsData.limit) : 0;
  const clearFilters = () => { setSearchInput(""); setCategoryId("all"); setSortBy("newest"); setPage(1); };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get("search");
    if (s !== null && s !== searchInput) setSearchInput(s);
    const c = params.get("categoryId");
    if (c !== null && c !== categoryId) setCategoryId(c);
  }, [location]);

  const sortOptions = [
    { value: "newest", label: t("products.newestFirst") },
    { value: "price_asc", label: t("products.priceLowHigh") },
    { value: "price_desc", label: t("products.priceHighLow") },
    { value: "rating", label: t("products.topRated") },
  ];
  const currentSort = sortOptions.find(o => o.value === sortBy);

  const productCountLabel = !isLoading && productsData
    ? productsData.total === 0
      ? t("products.noProductsFound")
      : `${productsData.total} ${productsData.total !== 1 ? t("products.count_other") : t("products.count_one")}`
    : " ";

  return (
    <div className="bg-background min-h-screen">

      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="bg-background">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 pt-16 md:pt-24 pb-8 md:pb-12">
          <p className="velora-label mb-6 text-foreground/40">{t("home.shopBy")}</p>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <h1 className="velora-heading text-[clamp(2.5rem,8vw,5rem)] leading-[0.85] text-foreground">
              {t("products.title")}
            </h1>
            <p className="velora-label text-foreground/35 mb-1">{productCountLabel}</p>
          </div>
          <div className="velora-divider ml-0 mt-8" />
        </div>
      </div>

      {/* ── Filter & Sort Bar ────────────────────────────────────────── */}
      <div className="sticky top-16 z-30 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-6 flex flex-col md:flex-row items-center gap-8 justify-between">
          <div className="flex flex-wrap items-center gap-8">
            <button
              onClick={() => { setCategoryId("all"); setPage(1); }}
              className={`velora-link pb-1 transition-all ${
                categoryId === "all" ? "text-foreground border-b border-foreground" : "text-foreground/40"
              }`}
            >
              {t("products.allCategories")}
            </button>
            {(categories ?? []).map(cat => (
              <button
                key={cat.id}
                onClick={() => { setCategoryId(cat.id.toString()); setPage(1); }}
                className={`velora-link pb-1 transition-all whitespace-nowrap ${
                  categoryId === cat.id.toString() ? "text-foreground border-b border-foreground" : "text-foreground/40"
                }`}
              >
                {language === "en" ? cat.nameEn : cat.nameAr}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-8">
            {/* Search */}
            <div className="relative group">
              <Search className="absolute start-0 top-1/2 -translate-y-1/2 w-3 h-3 text-foreground/40 pointer-events-none group-focus-within:text-accent transition-colors" />
              <input
                type="search"
                placeholder={t("products.searchPlaceholder")}
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="w-40 md:w-56 h-8 ps-6 pe-2 text-[10px] tracking-widest uppercase bg-transparent border-b border-border/50 focus:border-accent outline-none transition-all placeholder:text-foreground/20"
              />
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <button
                onClick={() => setSortOpen(o => !o)}
                className="velora-link flex items-center gap-2 text-foreground/60 hover:text-foreground transition-colors"
              >
                {currentSort?.label ?? t("products.sortBy")}
                <span className={`text-[8px] transition-transform duration-300 ${sortOpen ? 'rotate-180' : ''}`}>▼</span>
              </button>
              {sortOpen && (
                <div className="absolute top-full right-0 mt-4 w-56 bg-background border border-border shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-300">
                  {sortOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setSortBy(opt.value); setPage(1); setSortOpen(false); }}
                      className={`w-full text-left px-6 py-4 velora-label transition-colors ${
                        sortBy === opt.value ? "bg-accent text-accent-foreground" : "text-foreground/60 hover:bg-secondary hover:text-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Active Filter Pills */}
      {hasActiveFilters && (
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 pt-8 flex flex-wrap gap-4 items-center">
          {searchInput && (
            <span className="velora-label flex items-center gap-2 bg-foreground text-background px-3 py-2">
              "{searchInput}"
              <button onClick={() => setSearchInput("")}><X className="w-2.5 h-2.5" /></button>
            </span>
          )}
          <button
            onClick={clearFilters}
            className="velora-label text-foreground/40 hover:text-foreground transition-colors flex items-center gap-2"
          >
            <X className="w-3 h-3" />
            {t("products.clearFilters")}
          </button>
        </div>
      )}

      {/* ── Product Grid ─────────────────────────────────────────────── */}
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-16 md:py-24">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-20">
            {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : productsData?.products.length === 0 ? (
          <div className="text-center py-40">
            <div className="velora-divider mb-12" />
            <h3 className="velora-heading text-4xl mb-6 text-foreground">
              {t("products.noProductsFound")}
            </h3>
            <p className="velora-label text-foreground/40 mb-12">
              {hasActiveFilters ? t("products.tryAdjusting") : t("products.noProductsYet")}
            </p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="velora-btn-outline">
                {t("btn.clearFilters")}
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-20">
              {productsData?.products.map(product => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  nameEn={product.nameEn}
                  nameAr={product.nameAr}
                  price={product.price}
                  salePrice={product.salePrice}
                  imageUrl={product.images?.[0]?.imageUrl}
                  variants={(product.variants ?? []).map(v => ({
                    id: v.id,
                    color: v.color ?? null,
                    size: v.size ?? null,
                    stockQuantity: v.stockQuantity ?? 0,
                  }))}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-32 flex justify-center items-center gap-4">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="velora-btn-outline px-8 py-3 disabled:opacity-20"
                >
                  {t("common.previous")}
                </button>
                <div className="flex gap-2">
                  {(() => {
                    const pages: number[] = [];
                    if (totalPages <= 7) {
                      for (let i = 1; i <= totalPages; i++) pages.push(i);
                    } else {
                      const start = Math.max(2, Math.min(page - 1, totalPages - 4));
                      const end = Math.min(totalPages - 1, start + 3);
                      pages.push(1);
                      for (let i = start; i <= end; i++) pages.push(i);
                      if (totalPages > 1) pages.push(totalPages);
                    }
                    return pages.map(p => (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-10 h-10 velora-label transition-all ${
                          page === p ? "bg-foreground text-background" : "border border-border text-foreground/40 hover:border-foreground/40 hover:text-foreground"
                        }`}
                      >
                        {p}
                      </button>
                    ));
                  })()}
                </div>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= totalPages}
                  className="velora-btn-outline px-8 py-3 disabled:opacity-20"
                >
                  {t("common.next")}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

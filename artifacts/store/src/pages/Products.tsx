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
  const [filterOpen, setFilterOpen] = useState(false);

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
  const currentCat = categoryId !== "all" ? categories?.find(c => c.id.toString() === categoryId) : null;

  const productCountLabel = !isLoading && productsData
    ? productsData.total === 0
      ? t("products.noProductsFound")
      : `${productsData.total} ${productsData.total !== 1 ? t("products.count_other") : t("products.count_one")}`
    : " ";

  return (
    <div className="bg-white min-h-screen" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="bg-[#F5F4F2]">
        <div className="max-w-screen-xl mx-auto px-6 md:px-12 pt-16 md:pt-24 pb-12 md:pb-16">
          <p className="text-[8px] font-bold tracking-[0.45em] uppercase text-black/25 mb-6">{t("home.shopBy")}</p>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <h1
              className="text-[clamp(3rem,7vw,6rem)] font-bold text-[#111111] leading-[0.87] tracking-[-0.03em]"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {t("products.title")}
            </h1>
            <p className="text-[9px] text-black/35 tracking-[0.25em] uppercase font-bold mb-1">{productCountLabel}</p>
          </div>
        </div>
      </div>

      {/* ── Category Tabs ────────────────────────────────────────────── */}
      {(categories ?? []).length > 0 && (
        <div className="border-b border-black/7 bg-white">
          <div className="max-w-screen-xl mx-auto px-6 md:px-12">
            <div className="flex items-center gap-0 overflow-x-auto no-scrollbar">
              <button
                onClick={() => { setCategoryId("all"); setPage(1); }}
                className={`shrink-0 py-4 px-5 text-[9px] font-bold tracking-[0.22em] uppercase border-b-[1.5px] transition-all ${
                  categoryId === "all"
                    ? "border-[#111111] text-[#111111]"
                    : "border-transparent text-black/35 hover:text-[#111111]"
                }`}
              >
                {t("products.allCategories")}
              </button>
              {(categories ?? []).map(cat => (
                <button
                  key={cat.id}
                  onClick={() => { setCategoryId(cat.id.toString()); setPage(1); }}
                  className={`shrink-0 py-4 px-5 text-[9px] font-bold tracking-[0.22em] uppercase border-b-[1.5px] transition-all whitespace-nowrap ${
                    categoryId === cat.id.toString()
                      ? "border-[#111111] text-[#111111]"
                      : "border-transparent text-black/35 hover:text-[#111111]"
                  }`}
                >
                  {language === "en" ? cat.nameEn : cat.nameAr}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Filter Bar ──────────────────────────────────────────────── */}
      <div className="sticky top-16 z-30 bg-white border-b border-black/6">
        <div className="max-w-screen-xl mx-auto px-6 md:px-12 py-3.5 flex items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-3 h-3 text-black/28 pointer-events-none" />
              <input
                type="search"
                placeholder={t("products.searchPlaceholder")}
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="w-52 h-9 ps-9 pe-3 text-[11px] border border-black/8 bg-[#F5F4F2] focus:outline-none focus:border-black/35 transition-colors placeholder:text-black/28 tracking-[0.04em]"
              />
            </div>

            {/* Active filter pills */}
            {searchInput && (
              <span className="flex items-center gap-1.5 text-[8px] font-bold tracking-[0.18em] uppercase bg-[#111111] text-white px-3 py-1.5">
                "{searchInput}"
                <button onClick={() => setSearchInput("")}><X className="w-2.5 h-2.5" /></button>
              </span>
            )}

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 text-[9px] font-bold tracking-[0.22em] uppercase text-black/35 hover:text-[#111111] transition-colors"
              >
                <X className="w-3 h-3" />
                {t("products.clearFilters")}
              </button>
            )}
          </div>

          {/* Sort */}
          <div className="relative flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => { setSortOpen(o => !o); }}
                className="flex items-center gap-2 h-9 px-4 text-[9px] font-bold tracking-[0.2em] uppercase border border-black/8 bg-white hover:border-black/35 transition-colors"
              >
                <SlidersHorizontal className="w-3 h-3 text-black/40" />
                {currentSort?.label ?? t("products.sortBy")}
              </button>
              {sortOpen && (
                <div className="absolute top-full right-0 mt-1 w-56 bg-white border border-black/8 z-40 shadow-lg shadow-black/5">
                  {sortOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setSortBy(opt.value); setPage(1); setSortOpen(false); }}
                      className={`w-full text-left px-5 py-3.5 text-[9px] font-bold tracking-[0.18em] uppercase transition-colors ${
                        sortBy === opt.value ? "bg-[#111111] text-white" : "text-black/45 hover:bg-[#F5F4F2] hover:text-[#111111]"
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

      {/* ── Product Grid ─────────────────────────────────────────────── */}
      <div className="max-w-screen-xl mx-auto px-6 md:px-12 py-14 md:py-20">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-20">
            {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : productsData?.products.length === 0 ? (
          <div className="text-center py-40">
            <div className="w-12 h-[1px] bg-black/15 mx-auto mb-12" />
            <h3
              className="text-3xl font-bold mb-5 text-[#111111] tracking-[-0.02em]"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {t("products.noProductsFound")}
            </h3>
            <p className="text-black/35 text-[9px] tracking-[0.28em] uppercase font-bold mb-12">
              {hasActiveFilters ? t("products.tryAdjusting") : t("products.noProductsYet")}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="border border-[#111111]/18 px-12 py-4 text-[9px] font-bold tracking-[0.3em] uppercase hover:bg-[#111111] hover:text-white hover:border-[#111111] transition-all duration-300"
              >
                {t("btn.clearFilters")}
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-20">
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
              <div className="mt-28 flex justify-center items-center gap-1.5">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-11 px-10 border border-black/10 text-[9px] font-bold tracking-[0.25em] uppercase hover:bg-[#111111] hover:text-white hover:border-[#111111] transition-all disabled:opacity-20 disabled:pointer-events-none"
                >
                  {t("common.previous")}
                </button>
                <div className="flex gap-1 mx-2">
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    const p = totalPages <= 7 ? i + 1 : i === 0 ? 1 : i === 6 ? totalPages : page - 2 + i;
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-11 h-11 text-[9px] font-bold tracking-widest transition-all ${
                          page === p ? "bg-[#111111] text-white" : "border border-black/10 hover:border-black/35 text-black/40 hover:text-[#111111]"
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= totalPages}
                  className="h-11 px-10 border border-black/10 text-[9px] font-bold tracking-[0.25em] uppercase hover:bg-[#111111] hover:text-white hover:border-[#111111] transition-all disabled:opacity-20 disabled:pointer-events-none"
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

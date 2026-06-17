import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useListProducts, useListCategories } from "@workspace/api-client-react";
import { useSEO } from "@/hooks/useSEO";
import { X, Search, ChevronDown } from "lucide-react";
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
  const [catOpen, setCatOpen] = useState(false);

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
      {/* ── Page Header ────────────────────────────────────────────────── */}
      <div className="bg-[#F7F6F4] border-b border-black/6">
        <div className="max-w-screen-xl mx-auto px-6 md:px-10 py-14 md:py-20">
          <p className="text-[9px] font-bold tracking-[0.35em] uppercase text-black/28 mb-5">{t("home.shopBy")}</p>
          <h1
            className="text-5xl md:text-6xl lg:text-7xl font-bold text-[#111111] leading-[0.88]"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {t("products.title")}
          </h1>
          <p className="text-black/38 text-xs tracking-widest uppercase mt-4 font-medium">{productCountLabel}</p>
        </div>
      </div>

      {/* ── Filter Bar ─────────────────────────────────────────────────── */}
      <div className="sticky top-16 z-30 bg-white border-b border-black/6">
        <div className="max-w-screen-xl mx-auto px-6 md:px-10 py-4 flex items-center gap-4 flex-wrap">

          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black/28 pointer-events-none" />
            <input
              type="search"
              placeholder={t("products.searchPlaceholder")}
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="w-full h-10 ps-9 pe-3 text-xs border border-black/10 bg-[#F7F6F4] focus:outline-none focus:border-black/40 transition-colors placeholder:text-black/28 tracking-wide"
            />
          </div>

          {/* Category Dropdown */}
          <div className="relative">
            <button
              onClick={() => { setCatOpen(o => !o); setSortOpen(false); }}
              className="flex items-center gap-2 h-10 px-4 text-xs font-bold tracking-[0.18em] uppercase border border-black/10 hover:border-black/40 transition-colors bg-white"
            >
              {currentCat ? (language === "en" ? currentCat.nameEn : currentCat.nameAr) : t("products.allCategories")}
              <ChevronDown className={`w-3 h-3 transition-transform ${catOpen ? "rotate-180" : ""}`} />
            </button>
            {catOpen && (
              <div className="absolute top-full start-0 mt-1 w-52 bg-white border border-black/10 z-40 shadow-sm">
                <button onClick={() => { setCategoryId("all"); setPage(1); setCatOpen(false); }} className={`w-full text-left px-5 py-3 text-xs font-bold tracking-[0.15em] uppercase hover:bg-[#F7F6F4] transition-colors ${categoryId === "all" ? "text-[#111111]" : "text-black/45"}`}>
                  {t("products.allCategories")}
                </button>
                {categories?.map(c => (
                  <button key={c.id} onClick={() => { setCategoryId(c.id.toString()); setPage(1); setCatOpen(false); }} className={`w-full text-left px-5 py-3 text-xs font-bold tracking-[0.15em] uppercase hover:bg-[#F7F6F4] transition-colors ${categoryId === c.id.toString() ? "text-[#111111]" : "text-black/45"}`}>
                    {language === "en" ? c.nameEn : c.nameAr}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <button
              onClick={() => { setSortOpen(o => !o); setCatOpen(false); }}
              className="flex items-center gap-2 h-10 px-4 text-xs font-bold tracking-[0.18em] uppercase border border-black/10 hover:border-black/40 transition-colors bg-white"
            >
              {currentSort?.label ?? t("products.sortBy")}
              <ChevronDown className={`w-3 h-3 transition-transform ${sortOpen ? "rotate-180" : ""}`} />
            </button>
            {sortOpen && (
              <div className="absolute top-full start-0 mt-1 w-52 bg-white border border-black/10 z-40 shadow-sm">
                {sortOptions.map(opt => (
                  <button key={opt.value} onClick={() => { setSortBy(opt.value); setPage(1); setSortOpen(false); }} className={`w-full text-left px-5 py-3 text-xs font-bold tracking-[0.15em] uppercase hover:bg-[#F7F6F4] transition-colors ${sortBy === opt.value ? "text-[#111111]" : "text-black/45"}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 text-[9px] font-bold tracking-[0.2em] uppercase text-black/40 hover:text-black transition-colors h-10 px-4 border border-black/10 hover:border-black/40"
            >
              <X className="w-3 h-3" />
              {t("products.clearFilters")}
            </button>
          )}

          {/* Active filter pills */}
          {searchInput && (
            <span className="flex items-center gap-1.5 text-[9px] font-bold tracking-[0.15em] uppercase bg-[#111111] text-white px-3 py-1.5">
              "{searchInput}"
              <button onClick={() => setSearchInput("")}><X className="w-2.5 h-2.5" /></button>
            </span>
          )}
          {categoryId !== "all" && (
            <span className="flex items-center gap-1.5 text-[9px] font-bold tracking-[0.15em] uppercase bg-[#111111] text-white px-3 py-1.5">
              {currentCat ? (language === "en" ? currentCat.nameEn : currentCat.nameAr) : t("products.allCategories")}
              <button onClick={() => setCategoryId("all")}><X className="w-2.5 h-2.5" /></button>
            </span>
          )}
        </div>
      </div>

      {/* ── Product Grid ───────────────────────────────────────────────── */}
      <div className="max-w-screen-xl mx-auto px-6 md:px-10 py-12 md:py-16">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-14">
            {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : productsData?.products.length === 0 ? (
          <div className="text-center py-32 border border-dashed border-black/10">
            <div className="w-10 h-[1px] bg-black/20 mx-auto mb-8" />
            <h3
              className="text-2xl font-bold mb-4 text-[#111111]"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {t("products.noProductsFound")}
            </h3>
            <p className="text-black/38 text-xs tracking-widest uppercase mb-10">
              {hasActiveFilters ? t("products.tryAdjusting") : t("products.noProductsYet")}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="border border-[#111111]/20 px-10 py-3.5 text-[9px] font-bold tracking-[0.28em] uppercase hover:bg-[#111111] hover:text-white hover:border-[#111111] transition-colors"
              >
                {t("btn.clearFilters")}
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-14">
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
              <div className="mt-20 flex justify-center items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-10 px-8 border border-black/12 text-[9px] font-bold tracking-[0.22em] uppercase hover:bg-[#111111] hover:text-white hover:border-[#111111] transition-colors disabled:opacity-25 disabled:pointer-events-none"
                >
                  {t("common.previous")}
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    const p = totalPages <= 7 ? i + 1 : i === 0 ? 1 : i === 6 ? totalPages : page - 2 + i;
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-10 h-10 text-[9px] font-bold tracking-widest transition-colors ${
                          page === p ? "bg-[#111111] text-white" : "border border-black/12 hover:border-black/40 text-black/45 hover:text-[#111111]"
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
                  className="h-10 px-8 border border-black/12 text-[9px] font-bold tracking-[0.22em] uppercase hover:bg-[#111111] hover:text-white hover:border-[#111111] transition-colors disabled:opacity-25 disabled:pointer-events-none"
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

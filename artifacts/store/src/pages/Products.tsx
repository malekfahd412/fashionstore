import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useListProducts, useListCategories } from "@workspace/api-client-react";
import { useSEO } from "@/hooks/useSEO";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SlidersHorizontal, X, Search } from "lucide-react";
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
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  const productCountLabel = !isLoading && productsData
    ? productsData.total === 0
      ? t("products.noProductsFound")
      : `${productsData.total} ${productsData.total !== 1 ? t("products.count_other") : t("products.count_one")}`
    : " ";

  return (
    <div className="bg-white min-h-screen">
      {/* Page header */}
      <div className="border-b border-black/6 bg-[#F9F9F9]">
        <div className="max-w-screen-xl mx-auto px-6 py-10 md:py-14">
          <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-foreground/38 mb-3">{t("home.shopBy")}</p>
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold">{t("products.title")}</h1>
          <p className="text-foreground/42 text-sm mt-2">{productCountLabel}</p>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="sticky top-16 z-30 bg-white border-b border-black/6 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-6 py-3 flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/30 pointer-events-none" />
            <input
              type="search"
              placeholder={t("products.searchPlaceholder")}
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="w-full h-9 ps-9 pe-3 text-sm border border-black/12 focus:outline-none focus:border-foreground transition-colors bg-transparent placeholder:text-foreground/30"
            />
          </div>

          {/* Category */}
          <Select value={categoryId} onValueChange={v => { setCategoryId(v); setPage(1); }}>
            <SelectTrigger className="w-[160px] h-9 text-xs font-medium border-black/12 focus:ring-0 focus:border-foreground">
              <SelectValue placeholder={t("products.allCategories")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("products.allCategories")}</SelectItem>
              {categories?.map(c => (
                <SelectItem key={c.id} value={c.id.toString()}>
                  {language === "en" ? c.nameEn : c.nameAr}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={sortBy} onValueChange={v => { setSortBy(v); setPage(1); }}>
            <SelectTrigger className="w-[160px] h-9 text-xs font-medium border-black/12 focus:ring-0 focus:border-foreground">
              <SelectValue placeholder={t("products.sortBy")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{t("products.newestFirst")}</SelectItem>
              <SelectItem value="price_asc">{t("products.priceLowHigh")}</SelectItem>
              <SelectItem value="price_desc">{t("products.priceHighLow")}</SelectItem>
              <SelectItem value="rating">{t("products.topRated")}</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.15em] uppercase text-foreground/45 hover:text-foreground transition-colors border border-black/12 px-3 h-9"
            >
              <X className="w-3 h-3" />
              {t("products.clearFilters")}
            </button>
          )}
        </div>

        {/* Active filter pills */}
        {hasActiveFilters && (
          <div className="max-w-screen-xl mx-auto px-6 pb-3 flex flex-wrap gap-2">
            {searchInput && (
              <span className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.12em] uppercase bg-[#111111] text-white px-3 py-1">
                "{searchInput}"
                <button onClick={() => setSearchInput("")}><X className="w-2.5 h-2.5" /></button>
              </span>
            )}
            {categoryId !== "all" && (
              <span className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.12em] uppercase bg-[#111111] text-white px-3 py-1">
                {(() => {
                  const cat = categories?.find(c => c.id.toString() === categoryId);
                  return cat ? (language === "en" ? cat.nameEn : cat.nameAr) : t("products.allCategories");
                })()}
                <button onClick={() => setCategoryId("all")}><X className="w-2.5 h-2.5" /></button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Product grid */}
      <div className="max-w-screen-xl mx-auto px-6 py-10 md:py-14">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-12">
            {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : productsData?.products.length === 0 ? (
          <div className="text-center py-28 border border-dashed border-black/10">
            <SlidersHorizontal className="w-8 h-8 text-foreground/20 mx-auto mb-5" />
            <h3 className="font-serif text-2xl font-bold mb-3">{t("products.noProductsFound")}</h3>
            <p className="text-foreground/45 text-sm mb-8">
              {hasActiveFilters ? t("products.tryAdjusting") : t("products.noProductsYet")}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="border border-foreground/25 px-8 py-3 text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-foreground hover:text-background transition-colors"
              >
                {t("btn.clearFilters")}
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-12">
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
              <div className="mt-16 flex justify-center items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-10 px-6 border border-black/14 text-[10px] font-bold tracking-[0.18em] uppercase hover:bg-foreground hover:text-background hover:border-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none"
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
                        className={`w-10 h-10 text-xs font-bold transition-colors ${
                          page === p ? "bg-foreground text-background" : "border border-black/14 hover:border-foreground text-foreground/60 hover:text-foreground"
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
                  className="h-10 px-6 border border-black/14 text-[10px] font-bold tracking-[0.18em] uppercase hover:bg-foreground hover:text-background hover:border-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none"
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

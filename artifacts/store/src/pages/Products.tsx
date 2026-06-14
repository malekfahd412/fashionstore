import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useListProducts, useListCategories } from "@workspace/api-client-react";
import { useSEO } from "@/hooks/useSEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SlidersHorizontal, X } from "lucide-react";
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
    <div className="container mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-4xl md:text-5xl font-bold mb-2">{t("products.title")}</h1>
        <p className="text-muted-foreground text-sm">{productCountLabel}</p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-8 items-center">
        <div className="flex-1 min-w-[200px] max-w-xs">
          <Input
            type="search"
            placeholder={t("products.searchPlaceholder")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-10"
          />
        </div>

        <Select value={categoryId} onValueChange={v => { setCategoryId(v); setPage(1); }}>
          <SelectTrigger className="w-[180px] h-10">
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

        <Select value={sortBy} onValueChange={v => { setSortBy(v); setPage(1); }}>
          <SelectTrigger className="w-[180px] h-10">
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
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border px-3 py-2 rounded-md transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            {t("products.clearFilters")}
          </button>
        )}
      </div>

      {/* Active filter pills */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mb-6">
          {searchInput && (
            <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-3 py-1 rounded-full">
              {t("products.search")}: "{searchInput}"
              <button onClick={() => setSearchInput("")}><X className="w-3 h-3" /></button>
            </span>
          )}
          {categoryId !== "all" && (
            <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-3 py-1 rounded-full">
              {(() => {
                const cat = categories?.find(c => c.id.toString() === categoryId);
                return cat ? (language === "en" ? cat.nameEn : cat.nameAr) : t("products.allCategories");
              })()}
              <button onClick={() => setCategoryId("all")}><X className="w-3 h-3" /></button>
            </span>
          )}
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10">
          {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      ) : productsData?.products.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border">
          <SlidersHorizontal className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t("products.noProductsFound")}</h3>
          <p className="text-muted-foreground text-sm mb-6">
            {hasActiveFilters ? t("products.tryAdjusting") : t("products.noProductsYet")}
          </p>
          {hasActiveFilters && <Button onClick={clearFilters}>{t("btn.clearFilters")}</Button>}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10">
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
            <div className="mt-12 flex justify-center items-center gap-3">
              <Button variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                {t("common.previous")}
              </Button>
              <span className="text-sm text-muted-foreground">
                {t("common.page")} {page} {t("common.of")} {totalPages}
              </span>
              <Button variant="outline" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>
                {t("common.next")}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

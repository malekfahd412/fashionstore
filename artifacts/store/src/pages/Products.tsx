import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useListProducts, useListCategories } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SlidersHorizontal, X } from "lucide-react";
import ProductCard, { ProductCardSkeleton } from "@/components/ProductCard";
import { useLocation } from "wouter";

export default function Products() {
  const { language } = useLanguage();
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
  const [showFilters, setShowFilters] = useState(false);

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

  // Sync URL search param to state (e.g., from navbar search)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get("search");
    if (s !== null && s !== searchInput) setSearchInput(s);
    const c = params.get("categoryId");
    if (c !== null && c !== categoryId) setCategoryId(c);
  }, [location]);

  return (
    <div className="container mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-4xl md:text-5xl font-bold mb-2">Shop Collection</h1>
        <p className="text-muted-foreground text-sm">
          {!isLoading && productsData
            ? productsData.total === 0
              ? "No products found"
              : `${productsData.total} product${productsData.total !== 1 ? "s" : ""}`
            : " "}
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-8 items-center">
        <div className="flex-1 min-w-[200px] max-w-xs">
          <Input
            type="search"
            placeholder="Search products…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-10"
          />
        </div>

        <Select value={categoryId} onValueChange={v => { setCategoryId(v); setPage(1); }}>
          <SelectTrigger className="w-[180px] h-10">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories?.map(c => (
              <SelectItem key={c.id} value={c.id.toString()}>
                {language === "en" ? c.nameEn : c.nameAr}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={v => { setSortBy(v); setPage(1); }}>
          <SelectTrigger className="w-[180px] h-10">
            <SelectValue placeholder="Sort By" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="price_asc">Price: Low → High</SelectItem>
            <SelectItem value="price_desc">Price: High → Low</SelectItem>
            <SelectItem value="rating">Top Rated</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border px-3 py-2 rounded-md transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Clear filters
          </button>
        )}
      </div>

      {/* Active filter pills */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mb-6">
          {searchInput && (
            <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-3 py-1 rounded-full">
              Search: "{searchInput}"
              <button onClick={() => setSearchInput("")}><X className="w-3 h-3" /></button>
            </span>
          )}
          {categoryId !== "all" && (
            <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-3 py-1 rounded-full">
              {categories?.find(c => c.id.toString() === categoryId)?.nameEn ?? "Category"}
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
          <h3 className="text-lg font-semibold mb-2">No products found</h3>
          <p className="text-muted-foreground text-sm mb-6">
            {hasActiveFilters ? "Try adjusting your search or filters." : "No products available yet."}
          </p>
          {hasActiveFilters && <Button onClick={clearFilters}>Clear Filters</Button>}
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
                ← Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button variant="outline" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>
                Next →
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

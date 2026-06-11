import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useListProducts, useListCategories } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Products() {
  const { language } = useLanguage();
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleCategoryChange = (value: string) => {
    setCategoryId(value);
    setPage(1);
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
    setPage(1);
  };

  const { data: categories } = useListCategories({ query: { enabled: true, queryKey: [] } });

  const { data: productsData, isLoading } = useListProducts({
    search: debouncedSearch || undefined,
    categoryId: categoryId !== "all" ? Number(categoryId) : undefined,
    sortBy,
    page,
    limit: 12
  });

  const hasActiveFilters = searchInput !== "" || categoryId !== "all";
  const totalPages = productsData ? Math.ceil(productsData.total / productsData.limit) : 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-4">
          <h1 className="font-serif text-4xl font-bold">Shop Collection</h1>
          {!isLoading && productsData && (
            <p className="text-sm text-muted-foreground shrink-0">
              {productsData.total === 0
                ? "No products found"
                : `${productsData.total} ${productsData.total === 1 ? "product" : "products"}`}
            </p>
          )}
        </div>
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="w-full md:w-1/3">
            <Input
              type="search"
              placeholder="Search products..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="bg-muted border-none"
            />
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <Select value={categoryId} onValueChange={handleCategoryChange}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories?.map(c => (
                  <SelectItem key={c.id} value={c.id.toString()}>
                    {language === 'en' ? c.nameEn : c.nameAr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={handleSortChange}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="price_asc">Price: Low to High</SelectItem>
                <SelectItem value="price_desc">Price: High to Low</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-muted aspect-[3/4] mb-4"></div>
              <div className="bg-muted h-4 w-3/4 mb-2"></div>
              <div className="bg-muted h-4 w-1/4"></div>
            </div>
          ))}
        </div>
      ) : productsData?.products.length === 0 ? (
        <div className="text-center py-16 bg-muted/30">
          <h3 className="text-xl font-medium mb-2">No products found</h3>
          <p className="text-muted-foreground mb-6">
            {hasActiveFilters ? "Try adjusting your search or filters." : "No products available yet."}
          </p>
          {hasActiveFilters && (
            <Button onClick={() => { setSearchInput(""); setCategoryId("all"); }}>Clear Filters</Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 gap-y-10">
            {productsData?.products.map(product => (
              <Link key={product.id} href={`/products/${product.id}`} className="group">
                <div className="aspect-[3/4] overflow-hidden bg-muted mb-4 relative">
                  {product.images?.[0] ? (
                    <img src={product.images[0].imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  ) : null}
                  {product.salePrice && (
                    <div className="absolute top-2 left-2 bg-destructive text-white text-xs px-2 py-1 font-bold">SALE</div>
                  )}
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-medium line-clamp-1">{language === 'en' ? product.nameEn : product.nameAr}</h3>
                  <div className="flex items-center gap-2 text-sm">
                    {product.salePrice ? (
                      <>
                        <span className="font-bold text-destructive">${product.salePrice}</span>
                        <span className="line-through text-muted-foreground">${product.price}</span>
                      </>
                    ) : (
                      <span className="font-bold">${product.price}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {productsData && productsData.total > productsData.limit && (
            <div className="mt-12 flex justify-center items-center gap-4">
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage(p => p + 1)}
                disabled={page * productsData.limit >= productsData.total}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

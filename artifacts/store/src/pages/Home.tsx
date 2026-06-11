import { useListBanners, useGetFeaturedProducts, useGetNewArrivals, useListCategories } from "@workspace/api-client-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { language } = useLanguage();
  const { data: banners } = useListBanners({ query: { enabled: true, queryKey: [] } });
  const { data: featured } = useGetFeaturedProducts({ query: { enabled: true, queryKey: [] } });
  const { data: newArrivals } = useGetNewArrivals({ query: { enabled: true, queryKey: [] } });
  const { data: categories } = useListCategories({ query: { enabled: true, queryKey: [] } });

  const activeBanners = banners?.filter(b => b.active).sort((a, b) => a.sortOrder - b.sortOrder) || [];

  return (
    <div className="flex flex-col gap-16 pb-16">
      {/* Hero Section */}
      <section className="relative h-[80vh] w-full bg-muted overflow-hidden">
        {activeBanners.length > 0 ? (
          <div className="absolute inset-0">
            <img 
              src={activeBanners[0].imageUrl} 
              alt={language === 'en' ? activeBanners[0].titleEn : activeBanners[0].titleAr} 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/30" />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center p-4">
              <h1 className="font-serif text-5xl md:text-7xl font-bold mb-4 drop-shadow-lg">
                {language === 'en' ? activeBanners[0].titleEn : activeBanners[0].titleAr}
              </h1>
              <p className="text-xl md:text-2xl mb-8 font-light drop-shadow-md max-w-2xl">
                {language === 'en' ? activeBanners[0].subtitleEn : activeBanners[0].subtitleAr}
              </p>
              {activeBanners[0].linkUrl && (
                <Button size="lg" className="bg-white text-black hover:bg-white/90 rounded-none px-8 py-6 text-lg" asChild>
                  <Link href={activeBanners[0].linkUrl}>Shop Now</Link>
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-secondary">
            <div className="text-center p-4">
              <h1 className="font-serif text-5xl md:text-7xl font-bold mb-4 text-primary">LUXE</h1>
              <p className="text-xl text-primary/80 mb-8">Curated Fashion for the Modern Minimalist</p>
              <Button size="lg" className="rounded-none" asChild>
                <Link href="/products">Explore Collection</Link>
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* Featured Categories */}
      <section className="container mx-auto px-4">
        <div className="flex justify-between items-end mb-8">
          <h2 className="font-serif text-3xl font-bold">Shop by Category</h2>
          <Link href="/categories" className="text-sm font-medium underline underline-offset-4 hover:text-primary">
            View All
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          {categories?.slice(0, 4).map(category => (
            <Link key={category.id} href={`/products?categoryId=${category.id}`} className="group block">
              <div className="aspect-[3/4] overflow-hidden bg-muted mb-4">
                {category.imageUrl ? (
                  <img src={category.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">No Image</div>
                )}
              </div>
              <h3 className="text-lg font-medium text-center uppercase tracking-wider">
                {language === 'en' ? category.nameEn : category.nameAr}
              </h3>
            </Link>
          ))}
        </div>
      </section>

      {/* New Arrivals */}
      <section className="container mx-auto px-4">
        <h2 className="font-serif text-3xl font-bold mb-8 text-center">New Arrivals</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-8">
          {newArrivals?.map(product => (
            <Link key={product.id} href={`/products/${product.id}`} className="group">
              <div className="aspect-[3/4] overflow-hidden bg-muted mb-4 relative">
                {product.images?.[0] ? (
                  <img src={product.images[0].imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : null}
                {product.salePrice && (
                  <div className="absolute top-2 left-2 bg-destructive text-white text-xs px-2 py-1 font-bold">
                    SALE
                  </div>
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
        <div className="mt-12 text-center">
          <Button variant="outline" className="rounded-none border-primary text-primary px-8" asChild>
            <Link href="/products">View All Products</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

import { useListCategories } from "@workspace/api-client-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSEO } from "@/hooks/useSEO";
import { Link } from "wouter";

export default function Categories() {
  const { language, t } = useLanguage();
  useSEO({ title: t("nav.categories"), description: "Explore Velora's collections and categories." });
  const { data: categories, isLoading } = useListCategories();

  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="font-serif text-4xl font-bold mb-10 text-center">Collections</h1>
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse bg-muted aspect-square"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
          {categories?.map((cat) => (
            <Link key={cat.id} href={`/products?categoryId=${cat.id}`} className="group relative block aspect-square overflow-hidden bg-muted">
              {cat.imageUrl && (
                <img 
                  src={cat.imageUrl} 
                  alt="" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                />
              )}
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-background/90 backdrop-blur-sm px-8 py-4 text-center transform translate-y-4 group-hover:translate-y-0 transition-transform">
                  <h2 className="font-serif text-2xl font-bold mb-1">
                    {language === 'en' ? cat.nameEn : cat.nameAr}
                  </h2>
                  <p className="text-sm text-muted-foreground uppercase tracking-wider">
                    {cat.productCount || 0} Products
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

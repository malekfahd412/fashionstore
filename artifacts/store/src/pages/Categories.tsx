import { useListCategories } from "@workspace/api-client-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSEO } from "@/hooks/useSEO";
import { Link } from "wouter";

export default function Categories() {
  const { language, t } = useLanguage();
  useSEO({ title: t("nav.categories"), description: "Explore Velora's collections and categories." });
  const { data: categories, isLoading } = useListCategories();

  const isAr = language === 'ar';

  return (
    <div className="bg-background min-h-screen pt-32 pb-32">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="text-center mb-32">
          <p className="velora-label text-accent mb-6">COLLECTIONS</p>
          <h1 className="velora-heading text-6xl md:text-8xl mb-8">{isAr ? "التصنيفات" : "Curation."}</h1>
          <p className="text-muted-foreground text-[10px] uppercase tracking-[0.2em] max-w-xl mx-auto leading-loose">
            {isAr ? "استكشف مجموعتنا المختارة بعناية من أفضل الماركات والمصممين." : "Explore our meticulously curated taxonomy of global excellence and intentional design."}
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white border border-border aspect-[4/5]"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-12 gap-y-24">
            {categories?.map((cat) => (
              <Link key={cat.id} href={`/products?categoryId=${cat.id}`} className="group cursor-pointer space-y-8">
                <div className="aspect-[4/5] bg-white border border-border overflow-hidden relative">
                  <div className="absolute inset-0 bg-accent/5 transition-transform duration-1000 group-hover:scale-110" />
                  {cat.imageUrl ? (
                    <img 
                      src={cat.imageUrl} 
                      alt="" 
                      className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-accent/5">
                      <span className="velora-heading text-6xl text-accent/10">V.</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-700" />
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="velora-heading text-3xl group-hover:text-accent transition-colors">
                      {isAr ? cat.nameAr : cat.nameEn}
                    </h2>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      {cat.productCount || 0} ITEMS
                    </span>
                  </div>
                  <div className="pt-4 overflow-hidden">
                    <div className="flex items-center gap-4 text-accent translate-y-8 group-hover:translate-y-0 transition-transform duration-500">
                      <span className="velora-label">{isAr ? "استكشف المجموعة" : "EXPLORE COLLECTION"}</span>
                      <div className="h-px w-8 bg-accent" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!isLoading && categories?.length === 0 && (
          <div className="text-center py-40 border-y border-border">
            <p className="velora-label text-muted-foreground">{isAr ? "لا توجد تصنيفات حالياً." : "The archive is currently being updated."}</p>
          </div>
        )}
      </div>
    </div>
  );
}

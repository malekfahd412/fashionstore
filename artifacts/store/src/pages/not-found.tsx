import { useTranslation } from "@/contexts/LanguageContext";
import { Link } from "wouter";

export default function NotFound() {
  const { t, language } = useTranslation();
  const isAr = language === "ar";
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <Link href="/" className="inline-block velora-heading text-4xl hover:opacity-70 transition-opacity mb-12">
        VELORA
      </Link>
      <div className="text-center space-y-6 max-w-md">
        <h1 className="font-serif text-5xl font-bold">{isAr ? "الصفحة غير موجودة" : "404"}</h1>
        <p className="text-muted-foreground text-sm uppercase tracking-widest leading-loose">
          {isAr ? "عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها." : "The page you are looking for does not exist or has been moved."}
        </p>
        <div className="pt-8">
          <Link href="/" className="velora-btn-outline inline-flex items-center justify-center h-12 px-8 uppercase tracking-[0.2em] text-xs">
            {isAr ? "العودة للرئيسية" : "Return Home"}
          </Link>
        </div>
      </div>
    </div>
  );
}

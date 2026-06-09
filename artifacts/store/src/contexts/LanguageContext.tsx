import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "en" | "ar";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<Language, Record<string, string>> = {
  en: {
    "nav.home": "Home",
    "nav.shop": "Shop",
    "nav.categories": "Categories",
    "nav.login": "Login",
    "nav.register": "Register",
    "nav.dashboard": "Dashboard",
    "nav.cart": "Cart",
    "nav.search": "Search...",
    "btn.logout": "Logout",
  },
  ar: {
    "nav.home": "الرئيسية",
    "nav.shop": "المتجر",
    "nav.categories": "الفئات",
    "nav.login": "تسجيل الدخول",
    "nav.register": "إنشاء حساب",
    "nav.dashboard": "لوحة التحكم",
    "nav.cart": "عربة التسوق",
    "nav.search": "بحث...",
    "btn.logout": "تسجيل خروج",
  }
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem("language");
    return (stored === "ar" || stored === "en") ? stored : "en";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
  };

  useEffect(() => {
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

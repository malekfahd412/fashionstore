import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { ShoppingBag, User, Search, Menu, Globe, LogOut, X, Heart, ChevronRight, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useGetCart, getGetCartQueryKey, useListCategories } from "@workspace/api-client-react";
import { useGuestCart } from "@/hooks/useGuestCart";
import { useCartDrawer } from "@/contexts/CartDrawerContext";

export function Navbar() {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [showMegaMenu, setShowMegaMenu] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const megaMenuRef = useRef<HTMLDivElement>(null);
  
  const { openCart } = useCartDrawer();

  const { data: cart } = useGetCart({ query: { enabled: !!user, queryKey: getGetCartQueryKey() } });
  const { data: categories } = useListCategories();
  const { totalItems: guestCartCount } = useGuestCart();

  const cartItemCount = user
    ? (cart?.items?.reduce((acc, item) => acc + item.quantity, 0) || 0)
    : guestCartCount;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [searchOpen]);

  useEffect(() => { 
    setMobileOpen(false); 
    setSearchOpen(false);
    setShowMegaMenu(false);
  }, [location]);

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  const getDashboardLink = () => {
    if (!user) return "/login";
    switch (user.role) {
      case "admin": return "/admin-panel";
      case "vendor": return "/dashboard/vendor";
      default: return "/dashboard/customer";
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  const activeLinkClass = "text-foreground after:scale-x-100";
  const linkClass = "relative px-2 py-1 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-primary after:scale-x-0 after:origin-left after:transition-transform hover:after:scale-x-100";

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full transition-all duration-300 border-b border-border/50 ${
          scrolled || showMegaMenu || searchOpen
            ? "bg-background/95 backdrop-blur-md shadow-sm"
            : "bg-background/80 backdrop-blur-sm"
        }`}
        onMouseLeave={() => setShowMegaMenu(false)}
      >
        <div className="container mx-auto px-4 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 min-w-0">
            <button
              className="md:hidden flex items-center justify-center w-10 h-10 -ml-2 text-foreground"
              onClick={() => setMobileOpen(v => !v)}
              aria-label="Toggle menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            <Link href="/" className="shrink-0 pt-1">
              <span className="font-serif text-3xl font-bold tracking-tight text-primary">Velora</span>
            </Link>

            <nav className="hidden md:flex items-center gap-6 ml-8">
              <Link href="/" className={`${linkClass} ${location === "/" ? activeLinkClass : ""}`}>
                {t("nav.home")}
              </Link>
              <Link href="/products" className={`${linkClass} ${location === "/products" ? activeLinkClass : ""}`}>
                {t("nav.shop")}
              </Link>
              <div 
                className="h-20 flex items-center"
                onMouseEnter={() => setShowMegaMenu(true)}
              >
                <Link href="/categories" className={`${linkClass} flex items-center gap-1 ${location === "/categories" ? activeLinkClass : ""}`}>
                  {t("nav.categories")}
                  <ChevronDown className="w-3 h-3" />
                </Link>
              </div>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="flex items-center justify-center w-10 h-10 text-foreground hover:bg-muted rounded-full transition-colors"
              onClick={() => setSearchOpen(v => !v)}
              aria-label={t("nav.search")}
            >
              {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
            </button>

            <button
              className="hidden sm:flex items-center justify-center w-10 h-10 text-foreground hover:bg-muted rounded-full transition-colors font-medium text-xs tracking-wider uppercase"
              onClick={() => setLanguage(language === "en" ? "ar" : "en")}
              aria-label="Switch language"
            >
              {language === "en" ? "عربى" : "EN"}
            </button>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button aria-label="Account menu" className="hidden sm:flex items-center justify-center w-10 h-10 text-foreground hover:bg-muted rounded-full transition-colors">
                    <User className="h-5 w-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-none border-border">
                  <div className="px-3 py-3 border-b border-border mb-1 bg-muted/20">
                    <p className="font-semibold text-sm truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <DropdownMenuItem asChild className="cursor-pointer py-2.5">
                    <Link href={getDashboardLink()}>
                      <User className="me-2 h-4 w-4" />
                      {t("nav.dashboard")}
                    </Link>
                  </DropdownMenuItem>
                  {user.role === "customer" && (
                    <DropdownMenuItem asChild className="cursor-pointer py-2.5">
                      <Link href="/dashboard/customer?tab=wishlist">
                        <Heart className="me-2 h-4 w-4" />
                        {t("nav.wishlist")}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-destructive focus:text-destructive cursor-pointer py-2.5"
                  >
                    <LogOut className="me-2 h-4 w-4" />
                    {t("btn.logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden sm:flex items-center gap-4 ml-2">
                <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors uppercase tracking-wider">
                  {t("nav.login")}
                </Link>
              </div>
            )}

            <button
              className="relative flex items-center justify-center w-10 h-10 text-foreground hover:bg-muted rounded-full transition-colors ml-1"
              onClick={openCart}
              aria-label={t("nav.cart")}
            >
              <ShoppingBag className="h-5 w-5" />
              {cartItemCount > 0 && (
                <span className="absolute top-1.5 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground border-2 border-background">
                  {cartItemCount > 9 ? "9+" : cartItemCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mega Menu */}
        <div 
          ref={megaMenuRef}
          className={`absolute top-full left-0 w-full bg-background border-b border-border shadow-lg transition-all duration-300 origin-top overflow-hidden ${
            showMegaMenu ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0 pointer-events-none h-0"
          }`}
        >
          <div className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-4 gap-6">
              {categories?.slice(0, 8).map(category => (
                <Link 
                  key={category.id} 
                  href={`/products?categoryId=${category.id}`}
                  className="group flex items-center gap-4 p-2 hover:bg-muted/30 transition-colors"
                  onClick={() => setShowMegaMenu(false)}
                >
                  <div className="w-16 h-16 bg-muted shrink-0 overflow-hidden">
                    {category.imageUrl ? (
                      <img src={category.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted/50" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium group-hover:text-primary transition-colors">
                      {language === "en" ? category.nameEn : (category.nameAr || category.nameEn)}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider flex items-center group-hover:text-foreground">
                      Shop <ChevronRight className="w-3 h-3 ml-0.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </p>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-8 pt-4 border-t border-border flex justify-center">
              <Button variant="link" asChild className="uppercase tracking-widest text-xs font-semibold text-primary">
                <Link href="/categories" onClick={() => setShowMegaMenu(false)}>
                  View All Categories →
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Search bar */}
        <div
          className={`overflow-hidden transition-all duration-300 bg-background ${
            searchOpen ? "max-h-20 border-t border-border/50 shadow-md" : "max-h-0"
          }`}
        >
          <form onSubmit={handleSearch} className="container mx-auto px-4 py-4">
            <div className="relative max-w-3xl mx-auto">
              <Search className="absolute start-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
              <input
                ref={searchRef}
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t("nav.searchPlaceholder")}
                className="w-full bg-muted/50 border-0 rounded-none py-3.5 ps-12 pe-24 text-base focus:outline-none focus:ring-1 focus:ring-primary focus:bg-background transition-colors"
              />
              <button
                type="submit"
                className="absolute end-2 top-1/2 -translate-y-1/2 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 hover:bg-primary/90 transition-colors uppercase tracking-wider"
              >
                {t("nav.searchBtn")}
              </button>
            </div>
          </form>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed top-0 left-0 bottom-0 w-4/5 max-w-sm z-[70] bg-background border-r border-border shadow-2xl md:hidden flex flex-col animate-in slide-in-from-left duration-300">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <span className="font-serif text-2xl font-bold tracking-tight text-primary">Velora</span>
              <button onClick={() => setMobileOpen(false)} className="p-2 text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <nav className="p-4 space-y-1">
                <Link
                  href="/"
                  className="flex items-center justify-between p-4 text-base font-medium hover:bg-muted transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  {t("nav.home")}
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Link>
                <Link
                  href="/products"
                  className="flex items-center justify-between p-4 text-base font-medium hover:bg-muted transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  {t("nav.shop")}
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Link>
                <Link
                  href="/categories"
                  className="flex items-center justify-between p-4 text-base font-medium hover:bg-muted transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  {t("nav.categories")}
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Link>
              </nav>
            </div>

            <div className="p-4 border-t border-border bg-muted/10 space-y-4">
              <div className="flex items-center justify-between px-2">
                <span className="text-sm font-medium">Language</span>
                <button
                  className="flex items-center gap-2 text-sm font-bold text-primary tracking-wider uppercase"
                  onClick={() => { setLanguage(language === "en" ? "ar" : "en"); setMobileOpen(false); }}
                >
                  <Globe className="w-4 h-4" />
                  {language === "en" ? "عربى" : "English"}
                </button>
              </div>

              <div className="border-t border-border/50 pt-4 space-y-2">
                {user ? (
                  <>
                    <p className="text-xs text-muted-foreground px-2 mb-3">
                      {t("nav.signedInAs")} <span className="font-semibold text-foreground">{user.name}</span>
                    </p>
                    <Button variant="outline" className="w-full justify-start h-12 rounded-none" asChild>
                      <Link href={getDashboardLink()} onClick={() => setMobileOpen(false)}>
                        <User className="me-3 h-4 w-4" />
                        {t("nav.dashboard")}
                      </Link>
                    </Button>
                    {user.role === "customer" && (
                      <Button variant="outline" className="w-full justify-start h-12 rounded-none" asChild>
                        <Link href="/dashboard/customer?tab=wishlist" onClick={() => setMobileOpen(false)}>
                          <Heart className="me-3 h-4 w-4" />
                          {t("nav.wishlist")}
                        </Link>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      className="w-full justify-start h-12 rounded-none text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={handleLogout}
                    >
                      <LogOut className="me-3 h-4 w-4" />
                      {t("btn.logout")}
                    </Button>
                  </>
                ) : (
                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" className="flex-1 rounded-none h-12 uppercase tracking-widest text-xs" asChild>
                      <Link href="/login" onClick={() => setMobileOpen(false)}>{t("nav.login")}</Link>
                    </Button>
                    <Button className="flex-1 rounded-none h-12 uppercase tracking-widest text-xs" asChild>
                      <Link href="/register" onClick={() => setMobileOpen(false)}>{t("nav.register")}</Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { ShoppingBag, User, Search, Menu, LogOut, X, Heart, ChevronRight, ChevronDown, Globe } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
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
  const { openCart } = useCartDrawer();

  const { data: cart } = useGetCart({ query: { enabled: !!user, queryKey: getGetCartQueryKey() } });
  const { data: categories } = useListCategories();
  const { totalItems: guestCartCount } = useGuestCart();

  const cartItemCount = user
    ? (cart?.items?.reduce((acc, item) => acc + item.quantity, 0) || 0)
    : guestCartCount;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchRef.current?.focus(), 50);
  }, [searchOpen]);

  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
    setShowMegaMenu(false);
  }, [location]);

  const handleLogout = () => { logout(); setLocation("/"); };

  const getDashboardLink = () => {
    if (!user) return "/login";
    if (user.role === "admin") return "/admin-panel";
    if (user.role === "vendor") return "/dashboard/vendor";
    return "/dashboard/customer";
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  const isActive = (path: string) => location === path;

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full transition-all duration-500 ${
          scrolled ? "bg-white/98 backdrop-blur-md border-b border-black/8 shadow-[0_1px_0_rgba(0,0,0,0.06)]" : "bg-white border-b border-black/6"
        }`}
        onMouseLeave={() => setShowMegaMenu(false)}
      >
        <div className="max-w-screen-xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          {/* Left: mobile hamburger + desktop nav */}
          <div className="flex items-center gap-8 flex-1">
            <button
              className="md:hidden w-9 h-9 flex items-center justify-center text-foreground"
              onClick={() => setMobileOpen(v => !v)}
              aria-label="Toggle menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <nav className="hidden md:flex items-center gap-8">
              <Link
                href="/"
                className={`text-[11px] font-semibold tracking-[0.14em] uppercase transition-colors ${isActive("/") ? "text-foreground" : "text-foreground/50 hover:text-foreground"}`}
              >
                {t("nav.home")}
              </Link>
              <Link
                href="/products"
                className={`text-[11px] font-semibold tracking-[0.14em] uppercase transition-colors ${isActive("/products") ? "text-foreground" : "text-foreground/50 hover:text-foreground"}`}
              >
                {t("nav.shop")}
              </Link>
              <div
                className="h-16 flex items-center"
                onMouseEnter={() => setShowMegaMenu(true)}
              >
                <button className={`flex items-center gap-1 text-[11px] font-semibold tracking-[0.14em] uppercase transition-colors ${showMegaMenu ? "text-foreground" : "text-foreground/50 hover:text-foreground"}`}>
                  {t("nav.categories")}
                  <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${showMegaMenu ? "rotate-180" : ""}`} />
                </button>
              </div>
            </nav>
          </div>

          {/* Center: Logo */}
          <Link href="/" className="absolute left-1/2 -translate-x-1/2">
            <span className="font-serif text-2xl font-bold tracking-tight text-foreground">Velora</span>
          </Link>

          {/* Right: actions */}
          <div className="flex items-center gap-1 flex-1 justify-end">
            <button
              className="w-9 h-9 flex items-center justify-center text-foreground/60 hover:text-foreground transition-colors"
              onClick={() => setSearchOpen(v => !v)}
              aria-label={t("nav.search")}
            >
              {searchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
            </button>

            <button
              className="hidden sm:flex w-9 h-9 items-center justify-center text-[10px] font-bold tracking-widest text-foreground/60 hover:text-foreground transition-colors uppercase"
              onClick={() => setLanguage(language === "en" ? "ar" : "en")}
              aria-label="Switch language"
            >
              {language === "en" ? "ع" : "EN"}
            </button>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button aria-label="Account" className="hidden sm:flex w-9 h-9 items-center justify-center text-foreground/60 hover:text-foreground transition-colors">
                    <User className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 border-black/10 shadow-xl">
                  <div className="px-3 py-3 border-b border-black/8 mb-1">
                    <p className="font-semibold text-sm truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
                  </div>
                  <DropdownMenuItem asChild className="cursor-pointer py-2.5 text-sm">
                    <Link href={getDashboardLink()}>
                      <User className="me-2 h-3.5 w-3.5" />{t("nav.dashboard")}
                    </Link>
                  </DropdownMenuItem>
                  {user.role === "customer" && (
                    <DropdownMenuItem asChild className="cursor-pointer py-2.5 text-sm">
                      <Link href="/dashboard/customer?tab=wishlist">
                        <Heart className="me-2 h-3.5 w-3.5" />{t("nav.wishlist")}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive cursor-pointer py-2.5 text-sm">
                    <LogOut className="me-2 h-3.5 w-3.5" />{t("btn.logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/login" className="hidden sm:flex items-center text-[11px] font-semibold tracking-[0.12em] uppercase text-foreground/60 hover:text-foreground transition-colors px-2">
                {t("nav.login")}
              </Link>
            )}

            <button
              className="relative w-9 h-9 flex items-center justify-center text-foreground/60 hover:text-foreground transition-colors"
              onClick={openCart}
              aria-label={t("nav.cart")}
            >
              <ShoppingBag className="w-4 h-4" />
              {cartItemCount > 0 && (
                <span className="absolute top-1 right-0.5 w-4 h-4 bg-foreground text-background text-[9px] font-bold flex items-center justify-center rounded-full">
                  {cartItemCount > 9 ? "9+" : cartItemCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mega Menu */}
        <div
          className={`absolute top-full left-0 w-full bg-white border-b border-black/8 shadow-lg transition-all duration-300 origin-top ${
            showMegaMenu ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0 pointer-events-none"
          }`}
        >
          <div className="max-w-screen-xl mx-auto px-6 py-10">
            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-6">
              {categories?.slice(0, 8).map(category => (
                <Link
                  key={category.id}
                  href={`/products?categoryId=${category.id}`}
                  className="group"
                  onClick={() => setShowMegaMenu(false)}
                >
                  <div className="aspect-square bg-secondary overflow-hidden mb-3">
                    {category.imageUrl ? (
                      <img src={category.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full bg-secondary" />
                    )}
                  </div>
                  <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-foreground/60 group-hover:text-foreground transition-colors text-center">
                    {language === "en" ? category.nameEn : (category.nameAr || category.nameEn)}
                  </p>
                </Link>
              ))}
            </div>
            <div className="mt-8 pt-6 border-t border-black/6 text-center">
              <Link
                href="/categories"
                onClick={() => setShowMegaMenu(false)}
                className="text-[10px] font-bold tracking-[0.2em] uppercase text-foreground/50 hover:text-foreground transition-colors"
              >
                View All Categories →
              </Link>
            </div>
          </div>
        </div>

        {/* Search overlay */}
        <div className={`overflow-hidden transition-all duration-300 bg-white ${searchOpen ? "max-h-24 border-t border-black/6" : "max-h-0"}`}>
          <form onSubmit={handleSearch} className="max-w-screen-xl mx-auto px-6 py-5">
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute start-0 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30 pointer-events-none" />
              <input
                ref={searchRef}
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t("nav.searchPlaceholder")}
                className="w-full bg-transparent border-0 border-b border-black/15 py-2 ps-8 pe-24 text-sm focus:outline-none focus:border-foreground transition-colors placeholder:text-foreground/30"
              />
              <button
                type="submit"
                className="absolute end-0 top-1/2 -translate-y-1/2 text-[10px] font-bold tracking-[0.2em] uppercase text-foreground/50 hover:text-foreground transition-colors"
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
          <div className="fixed inset-0 z-[60] bg-black/50 md:hidden" onClick={() => setMobileOpen(false)} />
          <div className="fixed top-0 left-0 bottom-0 w-[85vw] max-w-xs z-[70] bg-white border-r border-black/8 shadow-2xl md:hidden flex flex-col">
            <div className="h-16 px-5 border-b border-black/8 flex items-center justify-between">
              <span className="font-serif text-xl font-bold text-foreground">Velora</span>
              <button onClick={() => setMobileOpen(false)} className="w-8 h-8 flex items-center justify-center text-foreground/40 hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
              {[
                { href: "/", label: t("nav.home") },
                { href: "/products", label: t("nav.shop") },
                { href: "/categories", label: t("nav.categories") },
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center justify-between px-5 py-4 text-[11px] font-semibold tracking-[0.14em] uppercase text-foreground/70 hover:text-foreground hover:bg-secondary transition-colors"
                >
                  {label}
                  <ChevronRight className="w-3.5 h-3.5 text-foreground/30" />
                </Link>
              ))}

              {categories?.slice(0, 6).map(cat => (
                <Link
                  key={cat.id}
                  href={`/products?categoryId=${cat.id}`}
                  className="flex items-center justify-between px-8 py-3 text-[10px] font-medium tracking-[0.12em] uppercase text-foreground/50 hover:text-foreground transition-colors"
                >
                  {language === "en" ? cat.nameEn : (cat.nameAr || cat.nameEn)}
                </Link>
              ))}
            </div>

            <div className="border-t border-black/8 p-5 space-y-3">
              <button
                className="flex items-center gap-2 text-[10px] font-bold tracking-[0.15em] uppercase text-foreground/50 hover:text-foreground transition-colors"
                onClick={() => { setLanguage(language === "en" ? "ar" : "en"); setMobileOpen(false); }}
              >
                <Globe className="w-3.5 h-3.5" />
                {language === "en" ? "عربى" : "English"}
              </button>
              {user ? (
                <div className="space-y-2 pt-2 border-t border-black/6">
                  <p className="text-[10px] tracking-wide text-foreground/40">Signed in as <span className="font-semibold text-foreground">{user.name}</span></p>
                  <Link href={getDashboardLink()} className="flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase text-foreground/70 hover:text-foreground py-2 transition-colors" onClick={() => setMobileOpen(false)}>
                    <User className="w-3.5 h-3.5" /> {t("nav.dashboard")}
                  </Link>
                  <button onClick={handleLogout} className="flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase text-destructive/70 hover:text-destructive transition-colors py-2">
                    <LogOut className="w-3.5 h-3.5" /> {t("btn.logout")}
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 pt-2 border-t border-black/6">
                  <Link href="/login" onClick={() => setMobileOpen(false)} className="flex-1 h-10 border border-foreground flex items-center justify-center text-[10px] font-bold tracking-[0.15em] uppercase hover:bg-foreground hover:text-background transition-colors">
                    {t("nav.login")}
                  </Link>
                  <Link href="/register" onClick={() => setMobileOpen(false)} className="flex-1 h-10 bg-foreground text-background flex items-center justify-center text-[10px] font-bold tracking-[0.15em] uppercase hover:bg-foreground/80 transition-colors">
                    {t("nav.register")}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

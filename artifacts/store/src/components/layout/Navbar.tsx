import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { ShoppingBag, User, Search, Menu, LogOut, X, Heart, ChevronRight, ChevronDown, Globe, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useGetCart, getGetCartQueryKey, useListCategories } from "@workspace/api-client-react";
import { useGuestCart } from "@/hooks/useGuestCart";
import { useCartDrawer } from "@/contexts/CartDrawerContext";

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-9 h-9" />;
  const isDark = resolvedTheme === "dark";
  return (
    <button
      className="w-9 h-9 flex items-center justify-center text-foreground/60 hover:text-foreground transition-colors"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark
        ? <Sun className="w-4 h-4" />
        : <Moon className="w-4 h-4" />
      }
    </button>
  );
}

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
          scrolled
            ? "bg-background/95 backdrop-blur-md border-b border-border shadow-none"
            : "bg-background border-b border-transparent"
        }`}
        onMouseLeave={() => setShowMegaMenu(false)}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-12 h-20 flex items-center justify-between gap-4">
          {/* Left: mobile hamburger + desktop nav */}
          <div className="flex items-center gap-8 flex-1">
            <button
              className="md:hidden w-10 h-10 flex items-center justify-center text-foreground"
              onClick={() => setMobileOpen(v => !v)}
              aria-label="Toggle menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <nav className="hidden md:flex items-center gap-8">
              <Link
                href="/"
                className={`velora-link ${isActive("/") ? "text-foreground after:w-full" : ""}`}
              >
                {t("nav.home")}
              </Link>
              <Link
                href="/products"
                className={`velora-link ${isActive("/products") ? "text-foreground after:w-full" : ""}`}
              >
                {t("nav.shop")}
              </Link>
              <div
                className="h-20 flex items-center"
                onMouseEnter={() => setShowMegaMenu(true)}
              >
                <button className={`velora-link flex items-center gap-1.5 ${showMegaMenu ? "text-foreground after:w-full" : ""}`}>
                  {t("nav.categories")}
                  <ChevronDown className={`w-2.5 h-2.5 transition-transform duration-300 ${showMegaMenu ? "rotate-180" : ""}`} />
                </button>
              </div>
            </nav>
          </div>

          {/* Center: Logo */}
          <Link href="/" className="absolute left-1/2 -translate-x-1/2 group">
            <span className="font-serif text-3xl font-bold tracking-[0.4em] uppercase text-foreground transition-all duration-300 group-hover:tracking-[0.45em]">VELORA</span>
          </Link>

          {/* Right: actions */}
          <div className="flex items-center gap-2 flex-1 justify-end">
            <button
              className="w-10 h-10 flex items-center justify-center text-foreground/60 hover:text-foreground transition-colors"
              onClick={() => setSearchOpen(v => !v)}
              aria-label={t("nav.search")}
            >
              {searchOpen ? <X className="w-4 h-4" strokeWidth={1.5} /> : <Search className="w-4 h-4" strokeWidth={1.5} />}
            </button>

            <ThemeToggle />

            <button
              className="hidden sm:flex w-10 h-10 items-center justify-center text-[9px] font-bold tracking-[0.2em] text-foreground/60 hover:text-foreground transition-colors uppercase"
              onClick={() => setLanguage(language === "en" ? "ar" : "en")}
              aria-label="Switch language"
            >
              {language === "en" ? "ع" : "EN"}
            </button>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button aria-label="Account" className="hidden sm:flex w-10 h-10 items-center justify-center text-foreground/60 hover:text-foreground transition-colors">
                    <User className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 shadow-xl rounded-none border-border bg-background">
                  <div className="px-4 py-4 border-b border-border mb-1">
                    <p className="font-serif text-base font-semibold truncate">{user.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5 tracking-wider uppercase">{user.email}</p>
                  </div>
                  <DropdownMenuItem asChild className="cursor-pointer py-3 text-[10px] font-bold tracking-widest uppercase rounded-none focus:bg-secondary">
                    <Link href={getDashboardLink()}>
                      <User className="me-2 h-3.5 w-3.5" />{t("nav.dashboard")}
                    </Link>
                  </DropdownMenuItem>
                  {user.role === "customer" && (
                    <DropdownMenuItem asChild className="cursor-pointer py-3 text-[10px] font-bold tracking-widest uppercase rounded-none focus:bg-secondary">
                      <Link href="/dashboard/customer?tab=wishlist">
                        <Heart className="me-2 h-3.5 w-3.5" />{t("nav.wishlist")}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive focus:bg-destructive/5 cursor-pointer py-3 text-[10px] font-bold tracking-widest uppercase rounded-none">
                    <LogOut className="me-2 h-3.5 w-3.5" />{t("btn.logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/login" className="hidden sm:flex items-center text-[9px] font-bold tracking-[0.2em] uppercase text-foreground/60 hover:text-foreground transition-colors px-3">
                {t("nav.login")}
              </Link>
            )}

            <button
              className="relative w-10 h-10 flex items-center justify-center text-foreground/60 hover:text-foreground transition-colors"
              onClick={openCart}
              aria-label={t("nav.cart")}
            >
              <ShoppingBag className="w-4 h-4" strokeWidth={1.5} />
              {cartItemCount > 0 && (
                <span className="absolute top-2 right-1.5 w-4 h-4 bg-primary text-primary-foreground text-[8px] font-bold flex items-center justify-center rounded-none">
                  {cartItemCount > 9 ? "9+" : cartItemCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mega Menu */}
        <div
          className={`absolute top-full left-0 w-full bg-background border-b border-border shadow-xl transition-all duration-500 origin-top ${
            showMegaMenu ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"
          }`}
        >
          <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-8">
              {categories?.slice(0, 8).map(category => (
                <Link
                  key={category.id}
                  href={`/products?categoryId=${category.id}`}
                  className="group"
                  onClick={() => setShowMegaMenu(false)}
                >
                  <div className="aspect-[3/4] bg-secondary overflow-hidden mb-4 rounded-none">
                    {category.imageUrl ? (
                      <img src={category.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    ) : (
                      <div className="w-full h-full bg-secondary flex items-center justify-center">
                         <span className="velora-label opacity-20">Velora</span>
                      </div>
                    )}
                  </div>
                  <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-foreground/60 group-hover:text-foreground transition-colors text-center">
                    {language === "en" ? category.nameEn : (category.nameAr || category.nameEn)}
                  </p>
                </Link>
              ))}
            </div>
            <div className="mt-12 pt-8 border-t border-border/50 text-center">
              <Link
                href="/categories"
                onClick={() => setShowMegaMenu(false)}
                className="velora-link"
              >
                View All Categories →
              </Link>
            </div>
          </div>
        </div>

        {/* Search overlay */}
        <div className={`overflow-hidden transition-all duration-500 bg-background ${searchOpen ? "max-h-32 border-t border-border" : "max-h-0"}`}>
          <form onSubmit={handleSearch} className="max-w-7xl mx-auto px-6 lg:px-12 py-8">
            <div className="relative max-w-3xl mx-auto">
              <Search className="absolute start-0 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30 pointer-events-none" strokeWidth={1.5} />
              <input
                ref={searchRef}
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t("nav.searchPlaceholder")}
                className="w-full bg-transparent border-0 border-b border-border/50 py-3 ps-10 pe-24 text-sm font-light focus:outline-none focus:border-primary transition-colors placeholder:text-foreground/30"
              />
              <button
                type="submit"
                className="absolute end-0 top-1/2 -translate-y-1/2 text-[9px] font-bold tracking-[0.25em] uppercase text-foreground/50 hover:text-primary transition-colors"
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
          <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm md:hidden transition-opacity duration-500" onClick={() => setMobileOpen(false)} />
          <div className="fixed top-0 left-0 bottom-0 w-[85vw] max-w-sm z-[70] bg-background border-r border-border md:hidden flex flex-col transition-transform duration-500">
            <div className="h-20 px-6 border-b border-border flex items-center justify-between">
              <span className="font-serif text-2xl font-bold tracking-[0.3em] text-foreground">VELORA</span>
              <button onClick={() => setMobileOpen(false)} className="w-10 h-10 flex items-center justify-center text-foreground/40 hover:text-foreground">
                <X className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-8">
              {[
                { href: "/", label: t("nav.home") },
                { href: "/products", label: t("nav.shop") },
                { href: "/categories", label: t("nav.categories") },
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center justify-between px-6 py-5 text-[10px] font-bold tracking-[0.25em] uppercase text-foreground/70 hover:text-foreground hover:bg-secondary/50 transition-colors"
                >
                  {label}
                  <ChevronRight className="w-4 h-4 text-foreground/20" />
                </Link>
              ))}

              <div className="mt-8 px-6">
                <p className="velora-label mb-6 text-foreground/30">Curated Collections</p>
                <div className="grid grid-cols-2 gap-4">
                  {categories?.slice(0, 6).map(cat => (
                    <Link
                      key={cat.id}
                      href={`/products?categoryId=${cat.id}`}
                      className="text-[9px] font-bold tracking-[0.18em] uppercase text-foreground/50 hover:text-primary transition-colors py-1"
                    >
                      {language === "en" ? cat.nameEn : (cat.nameAr || cat.nameEn)}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-border p-6 space-y-5">
              <div className="flex items-center justify-between">
                <button
                  className="flex items-center gap-2.5 text-[10px] font-bold tracking-[0.2em] uppercase text-foreground/50 hover:text-foreground transition-colors"
                  onClick={() => { setLanguage(language === "en" ? "ar" : "en"); setMobileOpen(false); }}
                >
                  <Globe className="w-4 h-4" strokeWidth={1.5} />
                  {language === "en" ? "عربى" : "English"}
                </button>
                <ThemeToggle />
              </div>
              {user ? (
                <div className="space-y-4 pt-4 border-t border-border">
                  <div className="px-1">
                    <p className="velora-label text-foreground/30 mb-1">Authenticated</p>
                    <p className="text-[11px] font-medium text-foreground">{user.name}</p>
                  </div>
                  <Link href={getDashboardLink()} className="flex items-center gap-3 text-[10px] font-bold tracking-widest uppercase text-foreground/70 hover:text-foreground py-2 transition-colors" onClick={() => setMobileOpen(false)}>
                    <User className="w-4 h-4" strokeWidth={1.5} /> {t("nav.dashboard")}
                  </Link>
                  <button onClick={handleLogout} className="flex items-center gap-3 text-[10px] font-bold tracking-widest uppercase text-destructive/70 hover:text-destructive transition-colors py-2 w-full text-left">
                    <LogOut className="w-4 h-4" strokeWidth={1.5} /> {t("btn.logout")}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3 pt-4 border-t border-border">
                  <Link href="/login" onClick={() => setMobileOpen(false)} className="w-full h-12 border border-border flex items-center justify-center text-[10px] font-bold tracking-[0.25em] uppercase hover:bg-foreground hover:text-background transition-all duration-300">
                    {t("nav.login")}
                  </Link>
                  <Link href="/register" onClick={() => setMobileOpen(false)} className="w-full h-12 bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold tracking-[0.25em] uppercase hover:bg-primary/90 transition-all duration-300">
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

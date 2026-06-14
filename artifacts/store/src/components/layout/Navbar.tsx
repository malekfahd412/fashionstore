import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { ShoppingBag, User, Search, Menu, Globe, LogOut, X, Heart, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useGetCart, getGetCartQueryKey } from "@workspace/api-client-react";
import { useGuestCart } from "@/hooks/useGuestCart";

export function Navbar() {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const { data: cart } = useGetCart({ query: { enabled: !!user, queryKey: getGetCartQueryKey() } });
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

  useEffect(() => { setMobileOpen(false); setSearchOpen(false); }, [location]);

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

  const navLinks = [
    { href: "/", label: t("nav.home") },
    { href: "/products", label: t("nav.shop") },
    { href: "/categories", label: t("nav.categories") },
  ];

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full border-b transition-all duration-200 ${
          scrolled
            ? "bg-background/98 backdrop-blur-md shadow-sm"
            : "bg-background/95 backdrop-blur"
        }`}
      >
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Left: Hamburger + Logo + Desktop Nav */}
          <div className="flex items-center gap-4 min-w-0">
            <button
              className="md:hidden flex items-center justify-center w-9 h-9 -ml-1 hover:bg-muted rounded-md transition-colors"
              onClick={() => setMobileOpen(v => !v)}
              aria-label="Toggle menu"
            >
              <span
                className={`block w-5 relative transition-all duration-300 ${mobileOpen ? "h-0" : "h-[2px] bg-foreground rounded-full"}`}
                style={{
                  boxShadow: mobileOpen
                    ? "none"
                    : "0 5px 0 currentColor, 0 -5px 0 currentColor",
                }}
              />
              {mobileOpen && <X className="w-5 h-5" />}
            </button>

            <Link href="/" className="shrink-0">
              <span className="font-serif text-2xl font-bold tracking-tight text-primary">LUXE</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1 ml-4">
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors hover:bg-muted ${
                    location === link.href ? "text-primary" : "text-foreground/70 hover:text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1">
            <button
              className="flex items-center justify-center w-9 h-9 hover:bg-muted rounded-md transition-colors"
              onClick={() => setSearchOpen(v => !v)}
              aria-label={t("nav.search")}
            >
              {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
            </button>

            <button
              className="hidden sm:flex items-center justify-center w-9 h-9 hover:bg-muted rounded-md transition-colors"
              onClick={() => setLanguage(language === "en" ? "ar" : "en")}
              aria-label="Switch language"
            >
              <Globe className="h-5 w-5" />
            </button>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="hidden sm:flex items-center justify-center w-9 h-9 hover:bg-muted rounded-md transition-colors">
                    <User className="h-5 w-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2 border-b border-border mb-1">
                    <p className="font-medium text-sm truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <DropdownMenuItem asChild>
                    <Link href={getDashboardLink()} className="cursor-pointer">
                      <User className="me-2 h-4 w-4" />
                      {t("nav.dashboard")}
                    </Link>
                  </DropdownMenuItem>
                  {user.role === "customer" && (
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/customer?tab=wishlist" className="cursor-pointer">
                        <Heart className="me-2 h-4 w-4" />
                        {t("nav.wishlist")}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-destructive focus:text-destructive cursor-pointer"
                  >
                    <LogOut className="me-2 h-4 w-4" />
                    {t("btn.logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login">{t("nav.login")}</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/register">{t("nav.register")}</Link>
                </Button>
              </div>
            )}

            <button
              className="relative flex items-center justify-center w-9 h-9 hover:bg-muted rounded-md transition-colors"
              onClick={() => setLocation("/cart")}
              aria-label={t("nav.cart")}
            >
              <ShoppingBag className="h-5 w-5" />
              {cartItemCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {cartItemCount > 9 ? "9+" : cartItemCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div
          className={`overflow-hidden transition-all duration-200 ${
            searchOpen ? "max-h-16 border-t border-border" : "max-h-0"
          }`}
        >
          <form onSubmit={handleSearch} className="container mx-auto px-4 py-2">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                ref={searchRef}
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t("nav.searchPlaceholder")}
                className="w-full bg-muted border-0 rounded-md py-2.5 ps-9 pe-20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                type="submit"
                className="absolute end-2 top-1/2 -translate-y-1/2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded hover:bg-primary/90 transition-colors"
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
            className="fixed inset-0 z-40 bg-black/20 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed top-16 left-0 right-0 z-40 bg-background border-b border-border shadow-xl md:hidden">
            <nav className="container mx-auto px-4 py-2">
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center justify-between py-3.5 border-b border-border/50 text-sm font-medium hover:text-primary transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Link>
              ))}

              <div className="pt-3 pb-2 space-y-2">
                {user ? (
                  <>
                    <p className="text-xs text-muted-foreground px-0.5 mb-2">
                      {t("nav.signedInAs")} <span className="font-medium text-foreground">{user.name}</span>
                    </p>
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <Link href={getDashboardLink()} onClick={() => setMobileOpen(false)}>
                        <User className="me-2 h-4 w-4" />
                        {t("nav.dashboard")}
                      </Link>
                    </Button>
                    {user.role === "customer" && (
                      <Button variant="outline" className="w-full justify-start" asChild>
                        <Link href="/dashboard/customer?tab=wishlist" onClick={() => setMobileOpen(false)}>
                          <Heart className="me-2 h-4 w-4" />
                          {t("nav.wishlist")}
                        </Link>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-destructive hover:text-destructive"
                      onClick={handleLogout}
                    >
                      <LogOut className="me-2 h-4 w-4" />
                      {t("btn.logout")}
                    </Button>
                  </>
                ) : (
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" asChild>
                      <Link href="/login" onClick={() => setMobileOpen(false)}>{t("nav.login")}</Link>
                    </Button>
                    <Button className="flex-1" asChild>
                      <Link href="/register" onClick={() => setMobileOpen(false)}>{t("nav.register")}</Link>
                    </Button>
                  </div>
                )}
                <button
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-1"
                  onClick={() => { setLanguage(language === "en" ? "ar" : "en"); setMobileOpen(false); }}
                >
                  <Globe className="w-4 h-4" />
                  {language === "en" ? "عربى" : "English"}
                </button>
              </div>
            </nav>
          </div>
        </>
      )}
    </>
  );
}

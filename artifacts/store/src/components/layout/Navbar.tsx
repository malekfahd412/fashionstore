import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ShoppingBag, User, Search, Menu, Globe, LogOut, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useGetCart } from "@workspace/api-client-react";

export function Navbar() {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: cart } = useGetCart({ query: { enabled: !!user } });

  const cartItemCount = cart?.items?.reduce((acc, item) => acc + item.quantity, 0) || 0;

  const handleLogout = () => {
    logout();
    setLocation("/");
    setMobileMenuOpen(false);
  };

  const closeMobile = () => setMobileMenuOpen(false);

  const getDashboardLink = () => {
    if (!user) return "/login";
    switch (user.role) {
      case "admin": return "/admin-panel";
      case "vendor": return "/dashboard/vendor";
      default: return "/dashboard/customer";
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(prev => !prev)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <Link href="/" className="flex items-center gap-2" onClick={closeMobile}>
            <span className="font-serif text-2xl font-bold tracking-tight text-primary">LUXE</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 ml-6">
            <Link href="/" className="text-sm font-medium transition-colors hover:text-primary">{t("nav.home")}</Link>
            <Link href="/products" className="text-sm font-medium transition-colors hover:text-primary">{t("nav.shop")}</Link>
            <Link href="/categories" className="text-sm font-medium transition-colors hover:text-primary">{t("nav.categories")}</Link>
          </nav>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <Button variant="ghost" size="icon" className="hidden sm:flex" onClick={() => setLocation('/products')}>
            <Search className="h-5 w-5" />
            <span className="sr-only">Search</span>
          </Button>

          <Button variant="ghost" size="icon" onClick={() => setLanguage(language === "en" ? "ar" : "en")}>
            <Globe className="h-5 w-5" />
            <span className="sr-only">Language</span>
          </Button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium">{user.name}</p>
                    <p className="w-[200px] truncate text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <DropdownMenuItem asChild>
                  <Link href={getDashboardLink()} className="cursor-pointer w-full">{t("nav.dashboard")}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  {t("btn.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Button variant="ghost" asChild>
                <Link href="/login">{t("nav.login")}</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">{t("nav.register")}</Link>
              </Button>
            </div>
          )}

          <Button variant="ghost" size="icon" className="relative" onClick={() => setLocation('/cart')}>
            <ShoppingBag className="h-5 w-5" />
            {cartItemCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                {cartItemCount}
              </span>
            )}
            <span className="sr-only">Cart</span>
          </Button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background px-4 py-3 space-y-1 shadow-lg">
          <Link href="/" className="flex py-3 text-sm font-medium border-b border-border/50 hover:text-primary transition-colors" onClick={closeMobile}>
            {t("nav.home")}
          </Link>
          <Link href="/products" className="flex py-3 text-sm font-medium border-b border-border/50 hover:text-primary transition-colors" onClick={closeMobile}>
            {t("nav.shop")}
          </Link>
          <Link href="/categories" className="flex py-3 text-sm font-medium border-b border-border/50 hover:text-primary transition-colors" onClick={closeMobile}>
            {t("nav.categories")}
          </Link>
          <div className="pt-3">
            {user ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground px-1 pb-1">Signed in as <span className="font-medium text-foreground">{user.name}</span></p>
                <Button variant="outline" className="w-full" asChild>
                  <Link href={getDashboardLink()} onClick={closeMobile}>{t("nav.dashboard")}</Link>
                </Button>
                <Button variant="ghost" className="w-full text-destructive hover:text-destructive" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {t("btn.logout")}
                </Button>
              </div>
            ) : (
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" asChild>
                  <Link href="/login" onClick={closeMobile}>{t("nav.login")}</Link>
                </Button>
                <Button className="flex-1" asChild>
                  <Link href="/register" onClick={closeMobile}>{t("nav.register")}</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

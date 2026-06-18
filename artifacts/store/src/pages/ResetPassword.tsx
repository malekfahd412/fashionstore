import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/contexts/LanguageContext";
import { useSEO } from "@/hooks/useSEO";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, AlertCircle } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function ResetPassword() {
  const { t } = useTranslation();
  useSEO({ title: t("reset.title"), description: "Create a new password for your Velora account." });
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tok = params.get("token") ?? "";
    setToken(tok);
  }, []);

  const validate = () => {
    const errs: typeof errors = {};
    if (password.length < 8) errs.password = t("reset.passwordMin");
    if (password !== confirm) errs.confirm = t("reset.passwordMismatch");
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Reset failed");
      }
      setSuccess(true);
      setTimeout(() => setLocation("/login"), 3000);
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? "Failed to reset password";
      toast({ title: t("reset.errorTitle"), description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-16">
        <div className="w-full max-w-[400px] text-center space-y-6">
          <Link href="/" className="inline-block velora-heading text-3xl hover:opacity-70 transition-opacity mb-4">
            VELORA
          </Link>
          <div className="flex justify-center">
            <AlertCircle className="w-12 h-12 text-destructive" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold mb-2">{t("reset.invalidTitle")}</h1>
            <p className="text-muted-foreground text-sm">{t("reset.invalidDesc")}</p>
          </div>
          <Button asChild className="velora-btn-outline w-full h-12">
            <Link href="/forgot-password">{t("reset.requestNew")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-16">
        <div className="w-full max-w-[400px] text-center space-y-8">
          <Link href="/" className="inline-block velora-heading text-3xl hover:opacity-70 transition-opacity mb-4">
            VELORA
          </Link>
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div>
            <h1 className="font-serif text-3xl font-bold mb-3">{t("reset.successTitle")}</h1>
            <p className="text-muted-foreground tracking-wide text-sm">{t("reset.successDesc")}</p>
          </div>
          <div className="pt-6 border-t border-border">
            <Link href="/login" className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-primary hover:opacity-80 transition-opacity">
              <ArrowLeft className="w-4 h-4" />
              {t("reset.goToLogin")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel: Editorial Brand Image/Pattern */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-midnight overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=2070')] bg-cover bg-center" />
        <div className="relative z-10 text-center">
          <Link href="/" className="inline-block velora-heading text-8xl text-white mb-6 tracking-[0.2em]">
            VELORA
          </Link>
          <div className="velora-divider bg-white/30" />
          <p className="text-white/60 velora-label text-sm mt-8">Restoring the standard of excellence.</p>
        </div>
      </div>

      {/* Right Panel: Clean Form on Ivory Background */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-16">
        <div className="w-full max-w-[400px]">
          <div className="mb-12">
            <Link href="/" className="lg:hidden inline-block velora-heading text-4xl mb-8">
              VELORA
            </Link>
            <h1 className="font-serif text-5xl font-bold tracking-tight text-foreground mb-4">{t("reset.title")}</h1>
            <p className="text-muted-foreground text-sm tracking-wide">{t("reset.subtitle")}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-1">
              <label htmlFor="password" className="velora-label block">{t("reset.newPassword")}</label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t("reset.minChars")}
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
                  }}
                  className={`rounded-none border-0 border-b border-border bg-transparent px-0 focus-visible:ring-0 focus-visible:border-accent h-12 transition-colors text-foreground pr-10 ${errors.password ? "border-destructive" : ""}`}
                  disabled={loading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                  onClick={() => setShowPassword(v => !v)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-[10px] uppercase tracking-wider text-destructive mt-2">{errors.password}</p>}
            </div>

            <div className="space-y-1">
              <label htmlFor="confirm" className="velora-label block">{t("reset.confirmPassword")}</label>
              <div className="relative">
                <Input
                  id="confirm"
                  type={showPassword ? "text" : "password"}
                  placeholder={t("reset.repeatPassword")}
                  value={confirm}
                  onChange={e => {
                    setConfirm(e.target.value);
                    if (errors.confirm) setErrors(prev => ({ ...prev, confirm: undefined }));
                  }}
                  className={`rounded-none border-0 border-b border-border bg-transparent px-0 focus-visible:ring-0 focus-visible:border-accent h-12 transition-colors text-foreground pr-10 ${errors.confirm ? "border-destructive" : ""}`}
                  disabled={loading}
                  autoComplete="new-password"
                />
              </div>
              {errors.confirm && <p className="text-[10px] uppercase tracking-wider text-destructive mt-2">{errors.confirm}</p>}
            </div>

            <Button
              type="submit"
              className="velora-btn-primary w-full h-14 mt-2"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  {t("reset.resetting")}
                </span>
              ) : (
                t("reset.resetBtn")
              )}
            </Button>
          </form>

          <div className="mt-12 pt-12 border-t border-border text-center">
            <Link href="/login" className="velora-link inline-flex items-center gap-2">
              <ArrowLeft className="w-3 h-3" />
              {t("reset.backToLogin")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

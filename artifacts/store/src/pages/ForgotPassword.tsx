import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/contexts/LanguageContext";
import { useSEO } from "@/hooks/useSEO";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function ForgotPassword() {
  const { t } = useTranslation();
  useSEO({ title: t("forgot.title"), description: "Reset your Velora account password." });
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError(t("forgot.emailRequired"));
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Something went wrong");
      }
      setSent(true);
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? "Failed to send reset email";
      toast({ title: t("forgot.errorTitle"), description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
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
            <h1 className="font-serif text-3xl font-bold mb-4">{t("forgot.sentTitle")}</h1>
            <p className="text-muted-foreground leading-relaxed">
              {t("forgot.sentDesc")} <strong className="text-foreground">{email}</strong>. {t("forgot.sentInstructions")}
            </p>
          </div>
          <p className="text-sm text-muted-foreground pt-4 border-t border-border">
            {t("forgot.didntReceive")}{" "}
            <button
              className="velora-link text-primary"
              onClick={() => setSent(false)}
            >
              {t("forgot.tryAgain")}
            </button>
          </p>
          <div className="pt-4">
            <Link href="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest text-[10px]">
              <ArrowLeft className="w-3 h-3" />
              {t("forgot.backToLogin")}
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
        <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&q=80&w=2070')] bg-cover bg-center" />
        <div className="relative z-10 text-center">
          <Link href="/" className="inline-block velora-heading text-8xl text-white mb-6 tracking-[0.2em]">
            VELORA
          </Link>
          <div className="velora-divider bg-white/30" />
          <p className="text-white/60 velora-label text-sm mt-8">Secure your sanctuary.</p>
        </div>
      </div>

      {/* Right Panel: Clean Form on Ivory Background */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-16">
        <div className="w-full max-w-[400px]">
          <div className="mb-12">
            <Link href="/" className="lg:hidden inline-block velora-heading text-4xl mb-8">
              VELORA
            </Link>
            <h1 className="font-serif text-5xl font-bold tracking-tight text-foreground mb-4">{t("forgot.title")}</h1>
            <p className="text-muted-foreground text-sm tracking-wide">{t("forgot.subtitle")}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-10">
            <div className="space-y-1">
              <label htmlFor="email" className="velora-label block">
                {t("forgot.emailLabel")}
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  if (error) setError("");
                }}
                className={`rounded-none border-0 border-b border-border bg-transparent px-0 focus-visible:ring-0 focus-visible:border-accent h-12 transition-colors text-foreground ${error ? "border-destructive" : ""}`}
                disabled={loading}
                autoFocus
                autoComplete="email"
              />
              {error && <p className="text-[10px] uppercase tracking-wider text-destructive mt-2">{error}</p>}
            </div>

            <Button
              type="submit"
              className="velora-btn-primary w-full h-14"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  {t("forgot.sending")}
                </span>
              ) : (
                t("forgot.sendLink")
              )}
            </Button>
          </form>

          <div className="mt-12 pt-12 border-t border-border text-center">
            <Link href="/login" className="velora-link inline-flex items-center gap-2">
              <ArrowLeft className="w-3 h-3" />
              {t("forgot.backToLogin")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

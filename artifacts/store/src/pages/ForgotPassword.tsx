import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/contexts/LanguageContext";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function ForgotPassword() {
  const { t } = useTranslation();
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
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div>
            <h1 className="font-serif text-3xl font-bold mb-3">{t("forgot.sentTitle")}</h1>
            <p className="text-muted-foreground leading-relaxed">
              {t("forgot.sentDesc")} <strong>{email}</strong>. {t("forgot.sentInstructions")}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("forgot.didntReceive")}{" "}
            <button
              className="text-primary underline underline-offset-2 hover:text-primary/80"
              onClick={() => setSent(false)}
            >
              {t("forgot.tryAgain")}
            </button>
            .
          </p>
          <Link href="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            {t("forgot.backToLogin")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link href="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          {t("forgot.backToLogin")}
        </Link>

        <div className="mb-8">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-5">
            <Mail className="w-6 h-6 text-muted-foreground" />
          </div>
          <h1 className="font-serif text-3xl font-bold mb-2">{t("forgot.title")}</h1>
          <p className="text-muted-foreground">{t("forgot.subtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
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
              className={error ? "border-destructive focus-visible:ring-destructive" : ""}
              disabled={loading}
              autoFocus
              autoComplete="email"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <Button
            type="submit"
            className="w-full h-12 rounded-none uppercase tracking-widest"
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

        <p className="text-center text-sm text-muted-foreground mt-6">
          {t("forgot.remember")}{" "}
          <Link href="/login" className="text-primary underline underline-offset-2 hover:text-primary/80">
            {t("forgot.signIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}

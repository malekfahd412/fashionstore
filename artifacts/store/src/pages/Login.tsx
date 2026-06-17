import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link, useLocation } from "wouter";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import GoogleButton from "@/components/GoogleButton";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { login: setAuthData } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);

  const redirectTo = new URLSearchParams(window.location.search).get("from") || "/";

  const loginMutation = useLogin();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (data: LoginFormValues) => {
    loginMutation.mutate({ data: { ...data, rememberDevice } }, {
      onSuccess: (result) => {
        setAuthData(result.user, result.token, result.refreshToken);
        toast({ title: t("auth.loginSuccess"), description: `${t("auth.loginSuccessDesc")} ${result.user.name}` });
        setLocation(redirectTo);
      },
      onError: (error: unknown) => {
        const msg = error instanceof Error ? error.message : t("auth.loginError");
        toast({ title: t("auth.loginFailed"), description: msg, variant: "destructive" });
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-16 px-4">
      <div className="w-full max-w-[440px] space-y-10">
        <div className="text-center space-y-4">
          <Link href="/" className="inline-block velora-heading text-4xl hover:opacity-70 transition-opacity">
            VELORA
          </Link>
          <h1 className="font-serif text-3xl font-bold tracking-tight">{t("nav.login")}</h1>
          <p className="text-muted-foreground text-sm tracking-wide">{t("auth.welcomeBack")}</p>
        </div>

        <div className="space-y-6">
          <GoogleButton onSuccess={() => setLocation(redirectTo)} label="signin_with" />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-widest">
              <span className="bg-background px-4 text-muted-foreground">{t("auth.orWithEmail")}</span>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="velora-label">{t("auth.email")}</FormLabel>
                    <FormControl>
                      <Input className="rounded-none border-border focus-visible:ring-1 focus-visible:ring-primary h-12" type="email" placeholder={t("auth.emailPlaceholder")} autoComplete="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between mb-1">
                      <FormLabel className="velora-label mb-0">{t("auth.password")}</FormLabel>
                      <Link href="/forgot-password" className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
                        {t("auth.forgotPassword")}
                      </Link>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder={t("auth.passwordPlaceholder")}
                          autoComplete="current-password"
                          className="rounded-none border-border focus-visible:ring-1 focus-visible:ring-primary h-12 pr-10"
                          {...field}
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => setShowPassword(v => !v)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-start gap-3 border border-border p-4 bg-muted/10">
                <div className="relative flex items-center justify-center mt-0.5">
                  <input
                    type="checkbox"
                    id="remember-device"
                    checked={rememberDevice}
                    onChange={(e) => setRememberDevice(e.target.checked)}
                    className="peer appearance-none w-4 h-4 border border-foreground/20 checked:bg-foreground checked:border-foreground transition-colors cursor-pointer"
                  />
                  <ShieldCheck className="absolute w-2.5 h-2.5 text-background opacity-0 peer-checked:opacity-100 pointer-events-none" />
                </div>
                <div className="space-y-1 leading-none flex-1">
                  <label htmlFor="remember-device" className="text-xs font-bold uppercase tracking-widest cursor-pointer text-foreground block">
                    {t("auth.rememberDevice")}
                  </label>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t("auth.rememberDeviceDesc")}
                  </p>
                </div>
              </div>

              <Button type="submit" className="velora-btn-primary w-full h-12 text-sm mt-4" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? t("auth.signingIn") : t("nav.login")}
              </Button>
            </form>
          </Form>
        </div>

        <div className="text-center text-sm text-muted-foreground pt-4">
          {t("auth.dontHaveAccount")}{" "}
          <Link href="/register" className="velora-link text-primary font-medium">
            {t("nav.register")}
          </Link>
        </div>
      </div>
    </div>
  );
}

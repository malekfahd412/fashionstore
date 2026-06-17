import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link, useLocation } from "wouter";
import { Eye, EyeOff } from "lucide-react";
import { useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import GoogleButton from "@/components/GoogleButton";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  role: z.enum(["customer", "vendor"]).default("customer"),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const { login: setAuthData } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const registerMutation = useRegister();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "", role: "customer" },
  });

  const onSubmit = (data: RegisterFormValues) => {
    const { confirmPassword: _, ...submitData } = data;
    registerMutation.mutate({ data: submitData }, {
      onSuccess: (result) => {
        setAuthData(result.user, result.token, result.refreshToken);
        toast({ title: t("auth.registerSuccess"), description: t("auth.registerSuccessDesc") });
        setLocation("/");
      },
      onError: (error: unknown) => {
        const msg = error instanceof Error ? error.message : "An error occurred";
        toast({ title: t("auth.registerFailed"), description: msg, variant: "destructive" });
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
          <h1 className="font-serif text-3xl font-bold tracking-tight">{t("nav.register")}</h1>
          <p className="text-muted-foreground text-sm tracking-wide">{t("auth.joinCommunity")}</p>
        </div>

        <div className="space-y-6">
          <GoogleButton onSuccess={() => setLocation("/")} label="signup_with" />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-widest">
              <span className="bg-background px-4 text-muted-foreground">{t("auth.orRegisterWithEmail")}</span>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="velora-label">{t("auth.fullName")}</FormLabel>
                    <FormControl>
                      <Input className="rounded-none border-border focus-visible:ring-1 focus-visible:ring-primary h-12" placeholder={t("auth.fullNamePlaceholder")} autoComplete="name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                    <FormLabel className="velora-label">{t("auth.password")}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder={t("auth.newPasswordPlaceholder")}
                          autoComplete="new-password"
                          className="rounded-none border-border focus-visible:ring-1 focus-visible:ring-primary h-12 pr-10"
                          {...field}
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => setShowPassword(v => !v)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="velora-label">{t("auth.confirmPassword")}</FormLabel>
                    <FormControl>
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder={t("auth.confirmPasswordPlaceholder")}
                        autoComplete="new-password"
                        className="rounded-none border-border focus-visible:ring-1 focus-visible:ring-primary h-12"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="velora-label">{t("auth.accountType")}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-none border-border focus-visible:ring-1 focus-visible:ring-primary h-12">
                          <SelectValue placeholder={t("auth.accountTypePlaceholder")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-none">
                        <SelectItem value="customer" className="cursor-pointer">
                          <span className="font-medium">{t("auth.customer")}</span>
                          <span className="text-xs text-muted-foreground ms-2">{t("auth.customerDesc")}</span>
                        </SelectItem>
                        <SelectItem value="vendor" className="cursor-pointer">
                          <span className="font-medium">{t("auth.vendor")}</span>
                          <span className="text-xs text-muted-foreground ms-2">{t("auth.vendorDesc")}</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="velora-btn-primary w-full h-12 text-sm mt-4" disabled={registerMutation.isPending}>
                {registerMutation.isPending ? t("auth.creatingAccount") : t("nav.register")}
              </Button>
            </form>
          </Form>
        </div>

        <div className="text-center text-sm text-muted-foreground pt-4">
          {t("auth.alreadyHaveAccount")}{" "}
          <Link href="/login" className="velora-link text-primary font-medium">
            {t("nav.login")}
          </Link>
        </div>
      </div>
    </div>
  );
}

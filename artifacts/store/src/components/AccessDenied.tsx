import { useLocation, Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

type Reason = "admin_required" | "vendor_required" | "login_required";

const REASON_COPY: Record<Reason, { title: string; subtitle: string; detail: string }> = {
  admin_required: {
    title: "Access Denied",
    subtitle: "Admin privileges required",
    detail: "This area is restricted to platform administrators. Your current account does not have the required permissions.",
  },
  vendor_required: {
    title: "Access Denied",
    subtitle: "Vendor account required",
    detail: "This dashboard is only available to registered vendors. Contact support if you believe this is an error.",
  },
  login_required: {
    title: "Sign In Required",
    subtitle: "Authentication needed",
    detail: "Please sign in to access this page. If you don't have an account, you can register for free.",
  },
};

interface AccessDeniedProps {
  reason: Reason;
  redirectTo?: string;
}

export default function AccessDenied({ reason, redirectTo }: AccessDeniedProps) {
  const { logout } = useAuth();
  const [, setLocation] = useLocation();

  const copy = REASON_COPY[reason];

  const handleSwitchAccount = () => {
    logout();
    const target = redirectTo ? `/login?from=${encodeURIComponent(redirectTo)}` : "/login";
    setLocation(target);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <Link href="/" className="inline-block velora-heading text-4xl hover:opacity-70 transition-opacity mb-16">
        VELORA
      </Link>

      <div className="w-full max-w-[440px] text-center space-y-8">
        <div>
          <h1 className="font-serif text-4xl font-bold mb-4">{copy.title}</h1>
          <p className="velora-label text-muted-foreground mb-4">{copy.subtitle}</p>
          <p className="text-muted-foreground text-sm leading-relaxed">{copy.detail}</p>
        </div>

        <div className="flex flex-col gap-4 pt-8 border-t border-border">
          <Link href="/" className="velora-btn-primary inline-flex items-center justify-center h-12 uppercase tracking-widest text-xs">
            Return Home
          </Link>
          <button onClick={handleSwitchAccount} className="velora-btn-outline h-12 uppercase tracking-widest text-xs">
            Switch Account
          </button>
        </div>
      </div>
    </div>
  );
}

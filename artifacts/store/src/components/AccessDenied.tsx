import { useLocation, Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { ShieldX, Home, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

type Reason = "admin_required" | "vendor_required" | "login_required";

const REASON_COPY: Record<Reason, { title: string; subtitle: string; detail: string }> = {
  admin_required: {
    title: "Access Denied",
    subtitle: "Admin privileges required",
    detail:
      "This area is restricted to platform administrators. Your current account does not have the required permissions to view this page.",
  },
  vendor_required: {
    title: "Access Denied",
    subtitle: "Vendor account required",
    detail:
      "This dashboard is only available to registered vendors. If you're a seller and believe this is an error, please contact support.",
  },
  login_required: {
    title: "Sign In Required",
    subtitle: "You must be logged in to continue",
    detail:
      "Please sign in to access this page. If you don't have an account yet, you can register for free.",
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
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldX className="w-10 h-10 text-destructive" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold font-serif tracking-tight">{copy.title}</h1>
          <p className="text-muted-foreground font-medium">{copy.subtitle}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{copy.detail}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="outline">
            <Link href="/">
              <Home className="w-4 h-4 mr-2" />
              Go to Home
            </Link>
          </Button>
          <Button onClick={handleSwitchAccount}>
            <LogIn className="w-4 h-4 mr-2" />
            Switch Account
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          "Switch Account" signs you out and redirects you to login.
        </p>
      </div>
    </div>
  );
}

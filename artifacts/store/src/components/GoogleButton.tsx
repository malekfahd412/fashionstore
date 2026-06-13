import { useEffect, useRef, useState } from "react";
import { useGetPublicSettings } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface GoogleButtonProps {
  onSuccess?: () => void;
  label?: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            config: {
              theme?: string;
              size?: string;
              text?: string;
              shape?: string;
              width?: number;
            }
          ) => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

export default function GoogleButton({ onSuccess, label = "continue_with" }: GoogleButtonProps) {
  const { data: settings } = useGetPublicSettings({ query: { queryKey: [], staleTime: 60_000 } });
  const { login: setAuthData } = useAuth();
  const { toast } = useToast();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  const clientId = settings?.google_client_id;

  useEffect(() => {
    if (!clientId) return;

    const scriptId = "google-gsi-script";
    if (document.getElementById(scriptId)) {
      if (window.google?.accounts?.id) initGoogle();
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initGoogle;
    document.head.appendChild(script);

    function initGoogle() {
      if (!window.google?.accounts?.id || !clientId) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredential,
        auto_select: false,
        cancel_on_tap_outside: true,
      });
      setReady(true);
    }
  }, [clientId]);

  useEffect(() => {
    if (!ready || !buttonRef.current || !window.google?.accounts?.id) return;
    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: "outline",
      size: "large",
      text: label,
      shape: "rectangular",
      width: buttonRef.current.offsetWidth || 400,
    });
  }, [ready, label]);

  async function handleCredential(response: { credential: string }) {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Google sign-in failed");
      setAuthData(data.user, data.token, data.refreshToken);
      toast({ title: `Welcome, ${data.user.name}!` });
      onSuccess?.();
    } catch (err: unknown) {
      toast({
        title: "Google sign-in failed",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  if (!clientId) return null;

  return (
    <div className="w-full relative">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70">
          <span className="w-5 h-5 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
        </div>
      )}
      <div ref={buttonRef} className="w-full" />
    </div>
  );
}

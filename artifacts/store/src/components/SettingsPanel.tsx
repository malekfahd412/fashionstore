import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Settings = Record<string, string>;

async function apiFetch<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const token = localStorage.getItem("auth_token");
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

const SETTING_SECTIONS = [
  {
    key: "general",
    label: "General",
    fields: [
      { key: "store_name", label: "Store Name (English)", type: "text" },
      { key: "store_name_ar", label: "Store Name (Arabic)", type: "text", dir: "rtl" },
      { key: "store_logo", label: "Logo URL", type: "url", hint: "Paste a direct image URL or upload via Cloudinary" },
      { key: "google_client_id", label: "Google Client ID", type: "text", hint: "From Google Cloud Console → OAuth 2.0 Client IDs. Required for Google Sign-In." },
    ],
  },
  {
    key: "contact",
    label: "Contact",
    fields: [
      { key: "contact_email", label: "Contact Email", type: "email" },
      { key: "contact_phone", label: "Contact Phone", type: "tel" },
      { key: "contact_address", label: "Address (English)", type: "text" },
      { key: "contact_address_ar", label: "Address (Arabic)", type: "text", dir: "rtl" },
    ],
  },
  {
    key: "social",
    label: "Social Links",
    fields: [
      { key: "social_instagram", label: "Instagram URL", type: "url" },
      { key: "social_facebook", label: "Facebook URL", type: "url" },
      { key: "social_twitter", label: "Twitter / X URL", type: "url" },
      { key: "social_tiktok", label: "TikTok URL", type: "url" },
      { key: "social_youtube", label: "YouTube URL", type: "url" },
    ],
  },
  {
    key: "email",
    label: "Email",
    fields: [
      { key: "email_from_name", label: "From Name", type: "text", hint: "e.g. Velora Store" },
      { key: "email_from_address", label: "From Email", type: "email", hint: "Must be verified in Resend" },
    ],
  },
  {
    key: "payment",
    label: "Payment",
    fields: [
      { key: "payment_cod_enabled", label: "Cash on Delivery", type: "boolean" },
      { key: "payment_paymob_enabled", label: "Paymob (Card / Meeza / Vodafone Cash)", type: "boolean" },
      { key: "paymob_iframe_id", label: "Paymob iFrame ID", type: "text", hint: "From Paymob Dashboard → Payment Integrations" },
      { key: "paymob_integration_id_card", label: "Paymob Integration ID — Card", type: "text" },
      { key: "paymob_integration_id_meeza", label: "Paymob Integration ID — Meeza", type: "text" },
      { key: "paymob_integration_id_vodafone", label: "Paymob Integration ID — Vodafone Cash", type: "text" },
    ],
  },
  {
    key: "shipping",
    label: "Shipping",
    fields: [
      { key: "shipping_fee", label: "Base Shipping Fee (EGP)", type: "number" },
      { key: "shipping_free_threshold", label: "Free Shipping Threshold (EGP)", type: "number", hint: "0 to disable free shipping" },
    ],
  },
  {
    key: "seo",
    label: "SEO",
    fields: [
      { key: "seo_title", label: "Meta Title", type: "text" },
      { key: "seo_description", label: "Meta Description", type: "text" },
      { key: "seo_keywords", label: "Keywords", type: "text", hint: "Comma-separated" },
    ],
  },
  {
    key: "homepage",
    label: "Homepage Sections",
    fields: [
      { key: "homepage_show_banners", label: "Banners", type: "boolean" },
      { key: "homepage_show_featured", label: "Featured Products", type: "boolean" },
      { key: "homepage_show_new_arrivals", label: "New Arrivals", type: "boolean" },
      { key: "homepage_show_best_sellers", label: "Best Sellers", type: "boolean" },
      { key: "homepage_show_categories", label: "Category Grid", type: "boolean" },
    ],
  },
];

export default function SettingsPanel() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings>({});
  const [activeSection, setActiveSection] = useState("general");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<Settings>("/api/settings/admin")
      .then(setSettings)
      .catch(() => toast({ title: "Failed to load settings", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  function setValue(key: string, value: string) {
    setSettings(prev => ({ ...prev, [key]: value }));
  }

  async function saveSection(sectionKey: string) {
    const section = SETTING_SECTIONS.find(s => s.key === sectionKey);
    if (!section) return;
    setSaving(true);
    const patch: Settings = {};
    for (const f of section.fields) patch[f.key] = settings[f.key] ?? "";
    try {
      const updated = await apiFetch<Settings>("/api/settings", "PATCH", patch);
      setSettings(updated);
      toast({ title: "Settings saved" });
    } catch {
      toast({ title: "Failed to save settings", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function seedDefaults() {
    setSaving(true);
    try {
      const result = await apiFetch<Settings>("/api/settings/seed", "POST");
      setSettings(result);
      toast({ title: "Default settings seeded" });
    } catch {
      toast({ title: "Failed to seed settings", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading settings...</div>;

  const section = SETTING_SECTIONS.find(s => s.key === activeSection)!;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-serif">Store Settings</h1>
        <Button variant="outline" size="sm" onClick={seedDefaults} disabled={saving}>Seed Defaults</Button>
      </div>

      <div className="flex gap-6">
        {/* Section sidebar */}
        <nav className="w-44 shrink-0 space-y-1">
          {SETTING_SECTIONS.map(s => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${activeSection === s.key ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              {s.label}
            </button>
          ))}
        </nav>

        {/* Fields */}
        <div className="flex-1 border border-border bg-card p-6 space-y-6">
          <h2 className="text-lg font-semibold">{section.label}</h2>

          {section.fields.map(field => (
            <div key={field.key} className="space-y-2">
              {field.type === "boolean" ? (
                <div className="flex items-center justify-between">
                  <Label htmlFor={field.key}>{field.label}</Label>
                  <Switch
                    id={field.key}
                    checked={settings[field.key] === "true"}
                    onCheckedChange={v => setValue(field.key, v ? "true" : "false")}
                  />
                </div>
              ) : (
                <>
                  <Label htmlFor={field.key}>{field.label}</Label>
                  <Input
                    id={field.key}
                    type={field.type === "number" ? "number" : "text"}
                    dir={(field as { dir?: string }).dir}
                    value={settings[field.key] ?? ""}
                    onChange={e => setValue(field.key, e.target.value)}
                    placeholder={field.label}
                  />
                  {(field as { hint?: string }).hint && (
                    <p className="text-xs text-muted-foreground">{(field as { hint?: string }).hint}</p>
                  )}
                </>
              )}
            </div>
          ))}

          <div className="pt-4 border-t">
            <Button onClick={() => saveSection(activeSection)} disabled={saving} className="rounded-none">
              {saving ? "Saving..." : `Save ${section.label}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

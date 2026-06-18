import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { X, Send, Sparkles, ImagePlus, ChevronDown, ArrowRight, Loader2 } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  imagePreview?: string;
  products?: { id: number; name: string; price: number; salePrice?: number | null; imageUrl?: string | null }[];
  navigateTo?: string | null;
  loading?: boolean;
}

function uid() {
  return Math.random().toString(36).slice(2);
}

const GREETING_EN = "Welcome to Velora Concierge. How may I assist you today? I can help you find pieces, suggest outfits, track orders, or answer any questions.";
const GREETING_AR = "مرحباً بك في خدمة كونسييرج فيلورا. كيف يمكنني مساعدتك اليوم؟ يمكنني مساعدتك في إيجاد القطع، واقتراح الإطلالات، وتتبع الطلبات أو الإجابة على أي أسئلة.";

const SUGGESTIONS_EN = [
  "Show me new arrivals",
  "I need an outfit for a formal event",
  "What's your return policy?",
  "Track my latest order",
];
const SUGGESTIONS_AR = [
  "أرني المنتجات الجديدة",
  "أحتاج إطلالة لحفل رسمي",
  "ما هي سياسة الإرجاع؟",
  "تتبع آخر طلب لي",
];

export function AIConcierge() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const isAr = language === "ar";

  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "greeting",
      role: "assistant",
      text: isAr ? GREETING_AR : GREETING_EN,
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ base64: string; mimeType: string; preview: string } | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [hasUnread, setHasUnread] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setHasUnread(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const getHistory = useCallback(() => {
    return messages
      .filter(m => !m.loading && m.id !== "greeting")
      .slice(-8)
      .map(m => ({ role: m.role === "assistant" ? "model" as const : "user" as const, text: m.text }));
  }, [messages]);

  const sendMessage = useCallback(async (text: string, img?: { base64: string; mimeType: string; preview: string } | null) => {
    if (!text.trim() && !img) return;
    setShowSuggestions(false);

    const userMsg: Message = {
      id: uid(),
      role: "user",
      text: text.trim(),
      imagePreview: img?.preview,
    };
    const loadingMsg: Message = { id: uid(), role: "assistant", text: "", loading: true };

    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setInput("");
    setPendingImage(null);
    setLoading(true);

    try {
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const body: Record<string, unknown> = {
        message: text.trim(),
        history: getHistory(),
      };
      if (img) {
        body.imageBase64 = img.base64;
        body.imageMimeType = img.mimeType;
      }

      const res = await fetch(`${BASE}/api/ai/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Service unavailable" }));
        throw new Error(err.error ?? "Failed");
      }

      const data = await res.json() as {
        reply: string;
        suggestedProducts?: { id: number; name: string; price: number; salePrice?: number | null; imageUrl?: string | null }[] | null;
        navigateTo?: string | null;
      };

      setMessages(prev => prev.map(m =>
        m.loading
          ? {
              ...m,
              text: data.reply,
              products: data.suggestedProducts ?? undefined,
              navigateTo: data.navigateTo,
              loading: false,
            }
          : m
      ));

      if (data.navigateTo && !open) {
        setHasUnread(true);
      }
    } catch (err: any) {
      setMessages(prev => prev.map(m =>
        m.loading
          ? {
              ...m,
              text: isAr
                ? "عذراً، حدث خطأ. يرجى المحاولة مرة أخرى."
                : "I apologize — something went wrong. Please try again.",
              loading: false,
            }
          : m
      ));
      toast({ title: "Concierge error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [getHistory, isAr, open, toast]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!loading) sendMessage(input, pendingImage);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      toast({ title: "Image too large", description: "Please use an image under 4MB", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const [header, base64] = dataUrl.split(",");
      const mimeType = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
      const preview = dataUrl;
      setPendingImage({ base64, mimeType, preview });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const suggestions = isAr ? SUGGESTIONS_AR : SUGGESTIONS_EN;

  return (
    <>
      {/* ── Floating trigger button ─────────────────────────────────── */}
      <button
        onClick={() => { setOpen(v => !v); setMinimized(false); }}
        aria-label="Open AI Concierge"
        className={`fixed bottom-6 ${isAr ? "left-6" : "right-6"} z-50 group transition-all duration-500`}
        style={{ transform: open ? "scale(0.92)" : "scale(1)" }}
      >
        <div className="relative">
          {/* Pulse ring when closed */}
          {!open && (
            <span className="absolute inset-0 rounded-none animate-ping opacity-20 bg-[#5B1E2D]" style={{ animationDuration: "2.5s" }} />
          )}
          <div
            className={`w-14 h-14 flex items-center justify-center transition-all duration-300 ${
              open
                ? "bg-[#5B1E2D] text-white"
                : "bg-[#0F172A] dark:bg-[#C8A96B] text-white dark:text-[#0F0F0F] group-hover:bg-[#5B1E2D]"
            }`}
          >
            {open ? <X className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
          </div>
          {/* Unread badge */}
          {hasUnread && !open && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#C8A96B] rounded-full" />
          )}
        </div>
      </button>

      {/* ── Chat panel ─────────────────────────────────────────────── */}
      <div
        className={`fixed ${isAr ? "left-6" : "right-6"} bottom-24 z-40 w-[380px] max-w-[calc(100vw-1.5rem)] transition-all duration-500 ease-out ${
          open && !minimized
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-6 pointer-events-none"
        }`}
        style={{ maxHeight: "min(640px, calc(100dvh - 9rem))" }}
      >
        <div className="flex flex-col h-full bg-background border border-border shadow-none overflow-hidden" style={{ maxHeight: "inherit" }}>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 bg-[#0F172A] dark:bg-[#1A1A1A] shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#C8A96B] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[#0F172A]" />
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-[0.3em] text-white/40 uppercase">{isAr ? "فيلورا" : "VELORA"}</p>
                <p className="text-sm font-medium text-white leading-none font-serif">{isAr ? "كونسييرج" : "Concierge"}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMinimized(v => !v)}
                className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white transition-colors"
                aria-label="Minimize"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] ${msg.role === "user" ? "order-1" : "order-2"}`}>
                  {/* Image preview if attached */}
                  {msg.imagePreview && (
                    <div className="mb-2 flex justify-end">
                      <img
                        src={msg.imagePreview}
                        alt="Uploaded"
                        className="w-32 h-32 object-cover border border-border"
                      />
                    </div>
                  )}

                  {/* Message bubble */}
                  {(msg.text || msg.loading) && (
                    <div
                      className={`px-4 py-3 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-[#0F172A] text-white dark:bg-[#C8A96B] dark:text-[#0F0F0F]"
                          : "bg-secondary text-foreground"
                      }`}
                    >
                      {msg.loading ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span className="text-[11px] tracking-widest uppercase">{isAr ? "جارٍ المعالجة..." : "Processing..."}</span>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      )}
                    </div>
                  )}

                  {/* Product cards */}
                  {msg.products && msg.products.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {msg.products.slice(0, 4).map(p => (
                        <Link
                          key={p.id}
                          href={`/products/${p.id}`}
                          onClick={() => setOpen(false)}
                          className="group block bg-background border border-border hover:border-[#C8A96B] transition-colors"
                        >
                          <div className="aspect-[3/4] bg-secondary overflow-hidden">
                            {p.imageUrl ? (
                              <img
                                src={p.imageUrl}
                                alt={p.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="p-2">
                            <p className="text-[11px] font-medium leading-tight line-clamp-2 font-serif">{p.name}</p>
                            <div className="flex items-center gap-1.5 mt-1">
                              {p.salePrice ? (
                                <>
                                  <span className="text-[11px] font-bold text-[#C8A96B]">EGP {p.salePrice}</span>
                                  <span className="text-[10px] text-muted-foreground line-through">EGP {p.price}</span>
                                </>
                              ) : (
                                <span className="text-[11px] font-bold text-[#C8A96B]">EGP {p.price}</span>
                              )}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Navigate CTA */}
                  {msg.navigateTo && (
                    <button
                      onClick={() => { setLocation(msg.navigateTo!); setOpen(false); }}
                      className="mt-2 flex items-center gap-1.5 text-[10px] font-bold tracking-[0.2em] uppercase text-[#5B1E2D] dark:text-[#C8A96B] hover:opacity-70 transition-opacity"
                    >
                      {isAr ? "عرض الكل" : "VIEW ALL"}
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Quick suggestions (shown only initially) */}
            {showSuggestions && messages.length <= 1 && (
              <div className="pt-2">
                <p className="velora-label text-center mb-3">{isAr ? "اقتراحات سريعة" : "QUICK SUGGESTIONS"}</p>
                <div className="grid grid-cols-1 gap-2">
                  {suggestions.map(s => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="text-left px-4 py-3 text-[11px] border border-border hover:border-[#C8A96B] hover:text-[#5B1E2D] dark:hover:text-[#C8A96B] transition-colors leading-relaxed"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Image preview strip */}
          {pendingImage && (
            <div className="px-4 py-2 border-t border-border bg-secondary/30 shrink-0">
              <div className="flex items-center gap-3">
                <img src={pendingImage.preview} alt="" className="w-12 h-12 object-cover border border-border" />
                <div className="flex-1 min-w-0">
                  <p className="velora-label">{isAr ? "صورة مرفقة" : "IMAGE ATTACHED"}</p>
                  <p className="text-[11px] text-muted-foreground">{isAr ? "سأحلل الصورة وأجد منتجات مشابهة" : "I'll analyze this and find similar pieces"}</p>
                </div>
                <button
                  onClick={() => setPendingImage(null)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Input area */}
          <div className="border-t border-border shrink-0 bg-background">
            <form onSubmit={handleSubmit} className="flex items-end gap-2 p-3">
              {/* Image upload */}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="shrink-0 w-9 h-9 flex items-center justify-center text-muted-foreground hover:text-[#5B1E2D] dark:hover:text-[#C8A96B] transition-colors"
                title={isAr ? "رفع صورة" : "Upload image for visual search"}
              >
                <ImagePlus className="w-4 h-4" />
              </button>

              {/* Text input */}
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isAr ? "اسأل عن المنتجات، الأحجام، الطلبات..." : "Ask about products, sizing, orders..."}
                rows={1}
                disabled={loading}
                className="flex-1 resize-none bg-transparent border-b border-border focus:border-[#C8A96B] focus:outline-none text-sm leading-relaxed py-2 placeholder:text-muted-foreground/40 transition-colors disabled:opacity-50"
                style={{ maxHeight: "80px", overflowY: "auto" }}
                onInput={e => {
                  const t = e.currentTarget;
                  t.style.height = "auto";
                  t.style.height = Math.min(t.scrollHeight, 80) + "px";
                }}
              />

              {/* Send */}
              <button
                type="submit"
                disabled={loading || (!input.trim() && !pendingImage)}
                className="shrink-0 w-9 h-9 flex items-center justify-center bg-[#5B1E2D] text-white disabled:opacity-30 hover:bg-[#7A2841] transition-colors"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>

            {/* Powered-by note */}
            <p className="text-center velora-label pb-2 opacity-40">
              {isAr ? "مدعوم بـ Gemini" : "POWERED BY GEMINI"}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

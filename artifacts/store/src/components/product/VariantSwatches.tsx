interface VariantSwatchesProps {
  colors: string[];
  selected: string;
  onSelect: (color: string) => void;
  label?: string;
}

const CSS_COLORS = new Set([
  "black", "white", "red", "blue", "green", "yellow", "orange", "purple",
  "pink", "brown", "gray", "grey", "beige", "navy", "cream", "ivory",
  "gold", "silver", "bronze", "tan", "khaki", "coral", "teal", "cyan",
  "magenta", "maroon", "olive", "lime", "indigo", "violet", "turquoise",
  "lavender", "mint", "rose", "burgundy", "charcoal", "camel", "sand",
  "rust", "chocolate", "nude", "blush", "mustard", "forest", "sky",
]);

function isCssColor(c: string): boolean {
  if (CSS_COLORS.has(c.toLowerCase())) return true;
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c) ||
    /^rgb\(/i.test(c) ||
    /^hsl\(/i.test(c);
}

const COLOR_MAP: Record<string, string> = {
  black: "#111",
  white: "#f9f9f9",
  ivory: "#fffff0",
  cream: "#fffdd0",
  beige: "#f5f5dc",
  nude: "#e3bc9a",
  blush: "#ffb6c1",
  champagne: "#f7e7ce",
  camel: "#c19a6b",
  sand: "#c2b280",
  tan: "#d2b48c",
  khaki: "#c3b091",
  mustard: "#e1a800",
  gold: "#c9a227",
  silver: "#c0c0c0",
  bronze: "#cd7f32",
  rust: "#b7410e",
  burgundy: "#800020",
  maroon: "#800000",
  navy: "#001f5b",
  forest: "#228b22",
  teal: "#008080",
  coral: "#ff7f50",
  rose: "#ff007f",
  lavender: "#e6e6fa",
  mint: "#98ff98",
  charcoal: "#36454f",
  chocolate: "#7b3f00",
};

export default function VariantSwatches({ colors, selected, onSelect, label = "Color" }: VariantSwatchesProps) {
  if (colors.length === 0) return null;

  const getBg = (color: string): string => {
    const lower = color.toLowerCase();
    if (COLOR_MAP[lower]) return COLOR_MAP[lower];
    if (isCssColor(color)) return color;
    return "#888";
  };

  const isLight = (color: string): boolean => {
    const bg = getBg(color).toLowerCase();
    return ["#f9f9f9", "#fffff0", "#fffdd0", "#f5f5dc", "white", "ivory", "cream", "beige"].includes(bg) ||
      bg === "#f9f9f9" || bg.includes("white") || bg.includes("ivory") || bg.includes("cream");
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-foreground">{label}</p>
        {selected && (
          <span className="text-[9px] tracking-[0.2em] uppercase text-foreground/40 font-medium">{selected}</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2.5">
        {colors.map(color => (
          <button
            key={color}
            onClick={() => onSelect(color)}
            title={color}
            className={`relative w-7 h-7 rounded-full transition-all duration-200 ${
              selected === color
                ? "ring-2 ring-[#C9A227] ring-offset-2 ring-offset-background"
                : "ring-1 ring-foreground/15 hover:ring-foreground/40"
            } ${isLight(color) ? "border border-foreground/10" : ""}`}
            style={{ backgroundColor: getBg(color) }}
            aria-label={color}
            aria-pressed={selected === color}
          >
            {selected === color && (
              <span
                className="absolute inset-0 flex items-center justify-center"
                style={{ color: isLight(color) ? "#333" : "#fff" }}
              >
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

interface SizeSelectorProps {
  sizes: string[];
  selected: string;
  onSelect: (size: string) => void;
  variants: { size: string; color: string | null; stockQuantity: number }[];
  selectedColor?: string;
  label?: string;
}

export default function SizeSelector({ sizes, selected, onSelect, variants, selectedColor, label = "Size" }: SizeSelectorProps) {
  if (sizes.length === 0) return null;

  const getStockForSize = (size: string): number => {
    const matching = variants.filter(v =>
      v.size === size && (!selectedColor || v.color === selectedColor)
    );
    return matching.reduce((sum, v) => sum + v.stockQuantity, 0);
  };

  const isUnavailable = (size: string): boolean => {
    if (!selectedColor) return false;
    const relevant = variants.filter(v => v.color === selectedColor && v.size === size);
    if (relevant.length === 0) return true;
    return relevant.every(v => v.stockQuantity === 0);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-foreground">{label}</p>
        <button className="text-[9px] tracking-[0.18em] uppercase text-foreground/35 font-bold hover:text-foreground transition-colors border-b border-border pb-0.5">
          Size Guide
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {sizes.map(size => {
          const unavailable = isUnavailable(size);
          const stock = getStockForSize(size);
          const lowStock = !unavailable && stock > 0 && stock <= 5;

          return (
            <div key={size} className="relative">
              <button
                disabled={unavailable}
                onClick={() => !unavailable && onSelect(size)}
                className={`relative min-w-[3rem] h-11 px-4 text-xs font-bold tracking-[0.12em] uppercase transition-all overflow-hidden ${
                  selected === size
                    ? "bg-foreground text-background border border-foreground"
                    : unavailable
                    ? "border border-border text-foreground/18 cursor-not-allowed"
                    : "border border-border text-foreground hover:border-foreground"
                }`}
              >
                {size}
                {unavailable && (
                  <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="w-full h-[1px] bg-foreground/15 rotate-45 transform absolute" />
                  </span>
                )}
              </button>
              {lowStock && (
                <span className="absolute -top-1.5 -right-1.5 w-2 h-2 bg-amber-500 rounded-full" title={`Only ${stock} left`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Low-stock warning for selected size */}
      {selected && (() => {
        const stock = getStockForSize(selected);
        if (stock > 0 && stock <= 5) {
          return (
            <p className="mt-2.5 text-[9px] text-amber-600 dark:text-amber-400 font-bold tracking-[0.2em] uppercase">
              Only {stock} left
            </p>
          );
        }
        return null;
      })()}
    </div>
  );
}

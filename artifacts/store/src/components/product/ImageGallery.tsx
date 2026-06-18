import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, X, ZoomIn, Maximize2 } from "lucide-react";

interface GalleryImage {
  id: number;
  imageUrl: string;
}

interface ImageGalleryProps {
  images: GalleryImage[];
  productName: string;
  savePct?: number | null;
  badge?: React.ReactNode;
}

export default function ImageGallery({ images, productName, savePct, badge }: ImageGalleryProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const mainRef = useRef<HTMLDivElement>(null);

  const activeImage = images[activeIdx]?.imageUrl ?? "";

  const prev = useCallback(() => setActiveIdx(i => (i - 1 + images.length) % images.length), [images.length]);
  const next = useCallback(() => setActiveIdx(i => (i + 1) % images.length), [images.length]);

  const openLightbox = (idx: number) => { setLightboxIdx(idx); setLightboxOpen(true); };
  const closeLightbox = () => setLightboxOpen(false);
  const lightboxPrev = () => setLightboxIdx(i => (i - 1 + images.length) % images.length);
  const lightboxNext = () => setLightboxIdx(i => (i + 1) % images.length);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") lightboxPrev();
      if (e.key === "ArrowRight") lightboxNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen]);

  useEffect(() => {
    if (!lightboxOpen) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [lightboxOpen]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mainRef.current) return;
    const rect = mainRef.current.getBoundingClientRect();
    setZoomPos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  if (images.length === 0) {
    return (
      <div className="aspect-[3/4] bg-secondary flex items-center justify-center text-foreground/20 text-xs tracking-[0.2em] uppercase">
        No Image
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-3">
        {/* Thumbnail strip — left on desktop, bottom on mobile */}
        {images.length > 1 && (
          <div className="order-2 lg:order-1 flex lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto lg:overflow-x-hidden pb-1 lg:pb-0 no-scrollbar lg:max-h-[calc(100vh-5rem)] lg:w-[72px] shrink-0">
            {images.map((img, idx) => (
              <button
                key={img.id}
                onClick={() => setActiveIdx(idx)}
                className={`shrink-0 bg-secondary overflow-hidden transition-all duration-200 ${
                  activeIdx === idx
                    ? "ring-1 ring-foreground opacity-100"
                    : "opacity-40 hover:opacity-80"
                }`}
                style={{ width: 64, minWidth: 64, aspectRatio: "3/4" }}
              >
                <img src={img.imageUrl} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Main image */}
        <div className="order-1 lg:order-2 flex-1 relative">
          <div
            ref={mainRef}
            className={`relative bg-secondary overflow-hidden select-none ${zoomed ? "cursor-zoom-out" : "cursor-zoom-in"}`}
            style={{ aspectRatio: "3/4" }}
            onMouseEnter={() => setZoomed(true)}
            onMouseLeave={() => setZoomed(false)}
            onMouseMove={handleMouseMove}
            onClick={() => openLightbox(activeIdx)}
          >
            <img
              src={activeImage}
              alt={productName}
              className="w-full h-full object-cover transition-transform duration-150"
              style={zoomed ? {
                transform: "scale(2)",
                transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                transition: "transform 0.1s ease",
              } : {}}
              draggable={false}
            />

            {/* Badges */}
            <div className="absolute top-4 start-4 flex flex-col gap-1.5 pointer-events-none">
              {savePct && (
                <span className="bg-foreground text-background text-[8px] font-bold px-2.5 py-1.5 tracking-[0.22em] uppercase">
                  −{savePct}%
                </span>
              )}
              {badge}
            </div>

            {/* Fullscreen hint */}
            <button
              onClick={(e) => { e.stopPropagation(); openLightbox(activeIdx); }}
              className="absolute top-4 end-4 w-8 h-8 bg-background/80 backdrop-blur flex items-center justify-center opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity"
              aria-label="View fullscreen"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            {/* Nav arrows */}
            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); prev(); }}
                  className="absolute start-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-background/80 backdrop-blur hover:bg-background flex items-center justify-center transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); next(); }}
                  className="absolute end-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-background/80 backdrop-blur hover:bg-background flex items-center justify-center transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}

            {/* Image counter */}
            {images.length > 1 && (
              <div className="absolute bottom-4 end-4 bg-background/70 backdrop-blur px-2 py-1 text-[9px] font-bold tracking-widest">
                {activeIdx + 1}/{images.length}
              </div>
            )}

            {/* Zoom indicator */}
            <div className="absolute bottom-4 start-4 flex items-center gap-1.5 text-[8px] text-background/70 tracking-[0.18em] uppercase font-bold bg-foreground/30 backdrop-blur px-2 py-1 pointer-events-none transition-opacity duration-200"
              style={{ opacity: zoomed ? 0 : 1 }}>
              <ZoomIn className="w-3 h-3" /> Hover to zoom
            </div>
          </div>
        </div>
      </div>

      {/* ── Lightbox ──────────────────────────────────────────────────────── */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center" onClick={closeLightbox}>
          <button
            onClick={closeLightbox}
            className="absolute top-5 right-5 z-10 w-10 h-10 flex items-center justify-center text-white/70 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          {images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); lightboxPrev(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center text-white/70 hover:text-white bg-white/10 hover:bg-white/20 transition-all"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); lightboxNext(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center text-white/70 hover:text-white bg-white/10 hover:bg-white/20 transition-all"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          <div className="relative max-w-4xl max-h-screen p-16 w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
            <img
              src={images[lightboxIdx]?.imageUrl}
              alt={productName}
              className="max-w-full max-h-full object-contain select-none"
              draggable={false}
            />
          </div>

          {/* Thumbnail strip */}
          {images.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10" onClick={e => e.stopPropagation()}>
              {images.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => setLightboxIdx(idx)}
                  className={`w-12 h-16 overflow-hidden transition-all ${lightboxIdx === idx ? "ring-1 ring-white opacity-100" : "opacity-40 hover:opacity-75"}`}
                >
                  <img src={img.imageUrl} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Index */}
          <div className="absolute top-5 left-5 text-white/50 text-sm font-mono">
            {lightboxIdx + 1} / {images.length}
          </div>
        </div>
      )}
    </>
  );
}

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export interface UploadedImage {
  url: string;
  publicId: string;
  width: number;
  height: number;
}

interface Props {
  productId?: number;
  existingImages?: Array<{ id: number; imageUrl: string; isPrimary: boolean; cloudinaryPublicId?: string }>;
  onImagesChange?: (images: UploadedImage[]) => void;
  onImageUrlsChange?: (urls: string[]) => void;
  maxImages?: number;
  folder?: string;
}

export default function ImageUpload({
  existingImages = [],
  onImagesChange,
  onImageUrlsChange,
  maxImages = 8,
  folder = "products",
}: Props) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploaded, setUploaded] = useState<UploadedImage[]>([]);

  const allImages = [
    ...existingImages.map(i => ({ url: i.imageUrl, publicId: i.cloudinaryPublicId ?? "", width: 0, height: 0, existing: true, id: i.id, isPrimary: i.isPrimary })),
    ...uploaded.map(u => ({ ...u, existing: false, id: null, isPrimary: false })),
  ];

  async function uploadFile(file: File) {
    if (allImages.length >= maxImages) {
      toast({ title: `Maximum ${maxImages} images allowed`, variant: "destructive" }); return;
    }
    const token = localStorage.getItem("token");
    const form = new FormData();
    form.append("image", file);
    form.append("folder", folder);

    const res = await fetch(`${BASE}/api/uploads/image`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(err.error ?? "Upload failed");
    }
    return res.json() as Promise<UploadedImage>;
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    const results: UploadedImage[] = [];
    for (const file of Array.from(files)) {
      try {
        const result = await uploadFile(file);
        if (result) results.push(result);
      } catch (err) {
        toast({ title: "Upload failed", description: (err as Error).message, variant: "destructive" });
      }
    }
    const next = [...uploaded, ...results];
    setUploaded(next);
    onImagesChange?.(next);
    onImageUrlsChange?.(next.map(i => i.url));
    setUploading(false);
  }

  async function removeUploaded(idx: number) {
    const img = uploaded[idx];
    if (img?.publicId) {
      const token = localStorage.getItem("token");
      await fetch(`${BASE}/api/uploads/image/0`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ publicId: img.publicId }),
      });
    }
    const next = uploaded.filter((_, i) => i !== idx);
    setUploaded(next);
    onImagesChange?.(next);
    onImageUrlsChange?.(next.map(i => i.url));
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [uploaded, allImages.length]);

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded cursor-pointer transition-colors p-8 text-center
          ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium">Drop images here or click to select</p>
            <p className="text-xs text-muted-foreground">JPEG, PNG, WebP · Max 15 MB · Auto-converted to WebP</p>
            <p className="text-xs text-muted-foreground">{allImages.length}/{maxImages} images</p>
          </div>
        )}
      </div>

      {/* Image grid */}
      {allImages.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {allImages.map((img, i) => (
            <div key={i} className="relative group aspect-[3/4] bg-muted overflow-hidden rounded">
              <img src={img.url} alt="" className="w-full h-full object-cover" />
              {img.isPrimary && (
                <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-sm">
                  Primary
                </span>
              )}
              {!img.existing && (
                <button
                  type="button"
                  onClick={() => removeUploaded(i - existingImages.length)}
                  className="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

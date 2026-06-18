type BadgeType = "new" | "sale" | "low-stock" | "best-seller" | "out-of-stock";

interface ProductBadgeProps {
  type: BadgeType;
  className?: string;
}

const BADGE_STYLES: Record<BadgeType, string> = {
  "new": "bg-[#C9A227] text-white",
  "sale": "bg-foreground text-background",
  "low-stock": "bg-amber-500 text-white",
  "best-seller": "bg-[#065f46] text-white",
  "out-of-stock": "bg-foreground/20 text-foreground/50",
};

const BADGE_LABELS: Record<BadgeType, string> = {
  "new": "New",
  "sale": "Sale",
  "low-stock": "Low Stock",
  "best-seller": "Best Seller",
  "out-of-stock": "Sold Out",
};

export function ProductBadge({ type, className = "" }: ProductBadgeProps) {
  return (
    <span
      className={`inline-block text-[7px] font-bold tracking-[0.25em] uppercase px-2 py-1 ${BADGE_STYLES[type]} ${className}`}
    >
      {BADGE_LABELS[type]}
    </span>
  );
}

interface BadgeComputeProps {
  createdAt: string;
  salePrice?: string | number | null;
  totalStock?: number;
  featured?: boolean;
}

export function computeBadge(props: BadgeComputeProps): BadgeType | null {
  const { createdAt, salePrice, totalStock, featured } = props;

  if (typeof totalStock === "number" && totalStock === 0) return "out-of-stock";
  if (typeof totalStock === "number" && totalStock > 0 && totalStock <= 5) return "low-stock";
  if (salePrice != null && Number(salePrice) > 0) return "sale";
  if (featured) return "best-seller";

  const age = Date.now() - new Date(createdAt).getTime();
  const days14 = 14 * 24 * 60 * 60 * 1000;
  if (age < days14) return "new";

  return null;
}

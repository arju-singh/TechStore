import { formatINR } from "@/lib/format";
import { discountPercent } from "@/lib/pricing";

export default function PriceTag({
  mrp,
  price,
  size = "md",
}: {
  mrp: number;
  price: number;
  size?: "sm" | "md" | "lg";
}) {
  const off = discountPercent({ mrp, price });
  const priceCls =
    size === "lg" ? "text-3xl" : size === "sm" ? "text-lg" : "text-2xl";

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex flex-wrap items-baseline gap-2">
        {off > 0 && (
          <span className="text-sm font-medium text-amz-deal">-{off}%</span>
        )}
        <span className={`font-medium text-ink ${priceCls}`}>
          <span className="align-top text-xs">₹</span>
          {price.toLocaleString("en-IN")}
        </span>
      </div>
      {off > 0 && (
        <span className="text-xs text-amz-borderdark">
          M.R.P: <span className="line-through">{formatINR(mrp)}</span>
        </span>
      )}
    </div>
  );
}

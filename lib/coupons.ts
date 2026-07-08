import { hasDatabase, connectToDatabase } from "@/lib/mongodb";
import CouponModel from "@/lib/models/Coupon";
import { coupons as seedCoupons } from "@/data/seed";
import { formatINR } from "@/lib/format";

export interface Coupon {
  code: string;
  type: "flat" | "percent";
  value: number;
  minSubtotal: number;
  /** Cap for percentage coupons (0 = uncapped). */
  maxDiscount: number;
  active: boolean;
  description: string;
}

export interface CouponResult {
  valid: boolean;
  code: string;
  discount: number;
  message: string;
  /** Present on success — the human-readable coupon description. */
  description?: string;
}

function normalize(code: string): string {
  return (code ?? "").trim().toUpperCase();
}

function toCoupon(doc: any): Coupon {
  return {
    code: doc.code,
    type: doc.type,
    value: doc.value,
    minSubtotal: doc.minSubtotal ?? 0,
    maxDiscount: doc.maxDiscount ?? 0,
    active: doc.active ?? true,
    description: doc.description ?? "",
  };
}

export async function getCoupon(code: string): Promise<Coupon | null> {
  const c = normalize(code);
  if (!c) return null;
  if (!hasDatabase) {
    return seedCoupons.find((x) => x.code.toUpperCase() === c) ?? null;
  }
  await connectToDatabase();
  const doc = await CouponModel.findOne({ code: c }).lean();
  return doc ? toCoupon(doc) : null;
}

export async function listActiveCoupons(): Promise<Coupon[]> {
  if (!hasDatabase) return seedCoupons.filter((c) => c.active);
  await connectToDatabase();
  const docs = await CouponModel.find({ active: true }).lean();
  if (docs.length === 0) return seedCoupons.filter((c) => c.active);
  return docs.map(toCoupon);
}

/** Compute the rupee discount a coupon yields for a given subtotal (0 if ineligible). */
export function discountFor(coupon: Coupon, subtotal: number): number {
  if (!coupon.active) return 0;
  if (subtotal < coupon.minSubtotal) return 0;
  let discount =
    coupon.type === "percent"
      ? Math.round((subtotal * coupon.value) / 100)
      : coupon.value;
  if (coupon.type === "percent" && coupon.maxDiscount > 0) {
    discount = Math.min(discount, coupon.maxDiscount);
  }
  // Never discount more than the subtotal.
  return Math.min(discount, subtotal);
}

/**
 * Validate a coupon code against a subtotal and return the applicable discount.
 * This is the single source of truth used by both the preview API and order
 * placement, so a client can never fake a discount.
 */
export async function validateCoupon(
  code: string,
  subtotal: number
): Promise<CouponResult> {
  const c = normalize(code);
  const coupon = await getCoupon(c);

  if (!coupon || !coupon.active) {
    return { valid: false, code: c, discount: 0, message: "This coupon code isn't valid." };
  }
  if (subtotal < coupon.minSubtotal) {
    return {
      valid: false,
      code: c,
      discount: 0,
      message: `Add ${formatINR(coupon.minSubtotal - subtotal)} more to use ${c} (min order ${formatINR(coupon.minSubtotal)}).`,
    };
  }

  const discount = discountFor(coupon, subtotal);
  return {
    valid: true,
    code: c,
    discount,
    message: `Coupon ${c} applied — you saved ${formatINR(discount)}!`,
    description: coupon.description,
  };
}

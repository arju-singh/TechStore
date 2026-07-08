/**
 * Pincode serviceability + delivery-estimate logic. Self-contained and
 * deterministic (no external courier API) so it works offline and in tests.
 *
 * Model:
 *  - Metro pincodes  → fastest ETA, COD available.
 *  - Standard        → most of India; ETA derived from the pincode, COD available.
 *  - Remote          → islands / far NE; longer ETA and PREPAID ONLY (no COD).
 *  - Invalid format  → not serviceable.
 */

export interface DeliveryEstimate {
  pincode: string;
  serviceable: boolean;
  codAvailable: boolean;
  /** Estimated delivery time in business days (0 when not serviceable). */
  etaDays: number;
  zone: string;
  message: string;
}

const PINCODE_RE = /^[1-9]\d{5}$/;

// A handful of metro hubs get next-day-ish delivery.
const METRO: Record<string, string> = {
  "110001": "New Delhi",
  "400001": "Mumbai",
  "560001": "Bengaluru",
  "600001": "Chennai",
  "700001": "Kolkata",
  "500001": "Hyderabad",
  "411001": "Pune",
  "380001": "Ahmedabad",
  "302001": "Jaipur",
  "226001": "Lucknow",
};

// Remote regions (Andaman & Nicobar 744, Lakshadweep 682, and parts of the
// North-East) — deliverable but prepaid only, with a longer ETA.
const REMOTE_PREFIXES = ["744", "682", "737", "790", "791", "792", "797", "799"];

function regionForFirstDigit(d: string): string {
  const map: Record<string, string> = {
    "1": "Northern India",
    "2": "Northern India",
    "3": "Western India",
    "4": "Western India",
    "5": "Southern India",
    "6": "Southern India",
    "7": "Eastern India",
    "8": "Eastern India",
  };
  return map[d] ?? "India";
}

export function checkPincode(rawPincode: string): DeliveryEstimate {
  const pincode = (rawPincode ?? "").trim();

  if (!PINCODE_RE.test(pincode)) {
    return {
      pincode,
      serviceable: false,
      codAvailable: false,
      etaDays: 0,
      zone: "",
      message: "Please enter a valid 6-digit pincode.",
    };
  }

  if (METRO[pincode]) {
    return {
      pincode,
      serviceable: true,
      codAvailable: true,
      etaDays: 2,
      zone: `${METRO[pincode]} (Metro)`,
      message: `Delivery to ${METRO[pincode]} in 1–2 business days.`,
    };
  }

  const prefix3 = pincode.slice(0, 3);
  if (REMOTE_PREFIXES.includes(prefix3)) {
    return {
      pincode,
      serviceable: true,
      codAvailable: false,
      etaDays: 7,
      zone: "Remote area",
      message: "Delivery in 6–8 business days. Prepaid only — Cash on Delivery isn't available here.",
    };
  }

  // Standard: derive a stable 3–6 day ETA from a digit of the pincode.
  const eta = 3 + (Number(pincode[2]) % 4);
  const region = regionForFirstDigit(pincode[0]);
  return {
    pincode,
    serviceable: true,
    codAvailable: true,
    etaDays: eta,
    zone: region,
    message: `Delivery in ${eta}–${eta + 1} business days. Cash on Delivery available.`,
  };
}

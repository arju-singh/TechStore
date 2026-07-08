import { requireDatabase, connectToDatabase } from "@/lib/mongodb";
import WholesaleCreditTermModel from "@/lib/models/WholesaleCreditTerm";

/** Wholesaler credit-terms data layer. DB-only, fail-loud. */

export interface CreditTerms {
  wholesalerId: string;
  creditLimit: number;
  termsDays: number;
  currentBalance: number;
  available: number;
}

function docToTerms(doc: any): CreditTerms {
  const creditLimit = Number(doc.creditLimit) || 0;
  const currentBalance = Number(doc.currentBalance) || 0;
  return {
    wholesalerId: doc.wholesalerId,
    creditLimit,
    termsDays: Number(doc.termsDays) || 30,
    currentBalance,
    available: Math.max(0, Math.round((creditLimit - currentBalance) * 100) / 100),
  };
}

/** The wholesaler's credit terms, or null if an admin hasn't granted any. */
export async function getCreditTerms(
  wholesalerId: string
): Promise<CreditTerms | null> {
  requireDatabase();
  await connectToDatabase();
  const doc = await WholesaleCreditTermModel.findOne({ wholesalerId })
    .lean()
    .catch(() => null);
  return doc ? docToTerms(doc) : null;
}

export async function setCreditTerms(
  wholesalerId: string,
  creditLimit: number,
  termsDays: number
): Promise<CreditTerms> {
  requireDatabase();
  await connectToDatabase();
  const doc = await WholesaleCreditTermModel.findOneAndUpdate(
    { wholesalerId },
    { $set: { creditLimit, termsDays }, $setOnInsert: { wholesalerId } },
    { new: true, upsert: true }
  ).lean();
  return docToTerms(doc);
}

/**
 * Atomically move the outstanding balance (positive = new credit drawn,
 * negative = repaid / released). Unconditional — used for releases/rollbacks.
 */
export async function adjustCreditBalance(
  wholesalerId: string,
  delta: number
): Promise<CreditTerms | null> {
  requireDatabase();
  await connectToDatabase();
  const doc = await WholesaleCreditTermModel.findOneAndUpdate(
    { wholesalerId },
    { $inc: { currentBalance: delta } },
    { new: true }
  )
    .lean()
    .catch(() => null);
  return doc ? docToTerms(doc) : null;
}

/**
 * Atomically DRAW credit — a single compare-and-swap that only succeeds while
 * `currentBalance + amount <= creditLimit`. Returns the updated terms, or null
 * when the draw would exceed the limit (or no terms exist). This closes the
 * read-check-then-increment race: two concurrent orders can never both draw past
 * the limit, because the guard lives in the query itself.
 */
export async function drawCredit(
  wholesalerId: string,
  amount: number
): Promise<CreditTerms | null> {
  requireDatabase();
  await connectToDatabase();
  const doc = await WholesaleCreditTermModel.findOneAndUpdate(
    {
      wholesalerId,
      $expr: { $lte: [{ $add: ["$currentBalance", amount] }, "$creditLimit"] },
    },
    { $inc: { currentBalance: amount } },
    { new: true }
  )
    .lean()
    .catch(() => null);
  return doc ? docToTerms(doc) : null;
}

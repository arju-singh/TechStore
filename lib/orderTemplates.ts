import { requireDatabase, connectToDatabase } from "@/lib/mongodb";
import OrderTemplateModel from "@/lib/models/OrderTemplate";

/** Saved bulk-order templates. DB-only, fail-loud. */

export interface TemplateLine {
  slug: string;
  qty: number;
}
export interface OrderTemplate {
  id: string;
  wholesalerId: string;
  name: string;
  lines: TemplateLine[];
  createdAt: string;
}

function docToTemplate(doc: any): OrderTemplate {
  return {
    id: String(doc._id ?? doc.id),
    wholesalerId: doc.wholesalerId,
    name: doc.name,
    lines: Array.isArray(doc.lines)
      ? doc.lines.map((l: any) => ({ slug: l.slug, qty: Number(l.qty) || 0 }))
      : [],
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : String(doc.createdAt ?? ""),
  };
}

export async function createTemplate(
  wholesalerId: string,
  name: string,
  lines: TemplateLine[]
): Promise<OrderTemplate> {
  requireDatabase();
  await connectToDatabase();
  const doc = await OrderTemplateModel.create({ wholesalerId, name, lines });
  return docToTemplate(doc.toObject());
}

export async function listTemplates(
  wholesalerId: string
): Promise<OrderTemplate[]> {
  requireDatabase();
  await connectToDatabase();
  const docs = await OrderTemplateModel.find({ wholesalerId })
    .sort({ createdAt: -1 })
    .lean();
  return docs.map(docToTemplate);
}

/** Delete a template — scoped to its owner. */
export async function deleteTemplate(
  id: string,
  wholesalerId: string
): Promise<boolean> {
  requireDatabase();
  await connectToDatabase();
  const res = await OrderTemplateModel.deleteOne({ _id: id, wholesalerId }).catch(
    () => null
  );
  return Boolean(res && res.deletedCount > 0);
}

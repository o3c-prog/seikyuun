import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const VALID = new Set([
  "estimate",
  "purchase-order",
  "delivery",
  "invoice",
  "receipt",
  "cover-letter",
]);

const PREFIX: Record<string, string> = {};

async function nextDocNumber(type: string): Promise<string> {
  const existing = await prisma.document.findMany({
    where: { type },
    select: { documentNumber: true },
  });
  const ints = existing
    .map((d) => parseInt(String(d.documentNumber).replace(/^[^\d]+/, ""), 10))
    .filter((n) => !Number.isNaN(n));
  const max = ints.length > 0 ? Math.max(...ints) : 0;
  return String(max + 1).padStart(5, "0");
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string; type: string }> }
) {
  const { projectId, type } = await params;
  if (!VALID.has(type)) {
    return NextResponse.json({ error: "invalid type" }, { status: 400 });
  }
  let doc = await prisma.document.findUnique({
    where: { projectId_type: { projectId, type } },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!doc) {
    doc = await prisma.document.create({
      data: {
        projectId,
        type,
        documentNumber: await nextDocNumber(type),
        subject: "",
        primaryDate: new Date().toISOString().slice(0, 10),
        notes: "",
        status: "draft",
      },
      include: { items: true },
    });
  }
  return NextResponse.json(doc);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ projectId: string; type: string }> }
) {
  const { projectId, type } = await params;
  if (!VALID.has(type)) {
    return NextResponse.json({ error: "invalid type" }, { status: 400 });
  }
  const body = await req.json();
  const items = (body.items ?? []) as Array<{
    rowType?: string;
    name?: string;
    quantity?: number;
    unitPrice?: number;
    taxRate?: number;
    notes?: string | null;
    sortOrder?: number;
  }>;

  // Upsert: find existing by (projectId, type), update or create
  const existing = await prisma.document.findUnique({
    where: { projectId_type: { projectId, type } },
  });

  let docNumber: string = body.documentNumber ?? existing?.documentNumber ?? "";
  if (!docNumber) docNumber = await nextDocNumber(type);

  const data = {
    projectId,
    type,
    documentNumber: docNumber,
    subject: body.subject ?? "",
    primaryDate: body.primaryDate ?? null,
    secondaryDate: body.secondaryDate ?? null,
    notes: body.notes ?? "",
    status: body.status ?? "draft",
  };

  // Wrap in transaction to update items atomically
  const updated = await prisma.$transaction(async (tx) => {
    const doc = existing
      ? await tx.document.update({ where: { id: existing.id }, data })
      : await tx.document.create({ data });
    // Replace items
    await tx.documentItem.deleteMany({ where: { documentId: doc.id } });
    if (items.length > 0) {
      await tx.documentItem.createMany({
        data: items.map((it, i) => ({
          documentId: doc.id,
          rowType: it.rowType ?? "normal",
          name: it.name ?? "",
          quantity: (it.quantity ?? 1) as number,
          unitPrice: it.unitPrice ?? 0,
          taxRate: it.taxRate ?? 10,
          notes: it.notes ?? null,
          sortOrder: it.sortOrder ?? i,
        })),
      });
    }
    return tx.document.findUnique({
      where: { id: doc.id },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });
  });

  return NextResponse.json(updated);
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function nextProjectNumberFrom(numbers: string[]): string {
  const ints = numbers
    .map((n) => parseInt(n, 10))
    .filter((n) => !Number.isNaN(n));
  const max = ints.length > 0 ? Math.max(...ints) : 22614;
  return String(max + 1);
}

type ItemLite = {
  rowType: string;
  quantity: { toNumber(): number } | number;
  unitPrice: number;
  taxRate: number;
};

const num = (v: ItemLite["quantity"]): number =>
  typeof v === "number" ? v : v.toNumber();

function subtotalOf(items: ItemLite[]): number {
  let s = 0;
  for (const it of items) {
    if (it.rowType === "heading" || it.rowType === "subtotal") continue;
    s += Math.floor(num(it.quantity) * it.unitPrice);
  }
  return s;
}

function totalOf(items: ItemLite[]): number {
  let subtotal = 0;
  let tax = 0;
  for (const it of items) {
    if (it.rowType === "heading" || it.rowType === "subtotal") continue;
    const amount = Math.floor(num(it.quantity) * it.unitPrice);
    subtotal += amount;
    tax += Math.floor((amount * it.taxRate) / 100);
  }
  return subtotal + tax;
}

export async function GET() {
  const list = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      documents: {
        where: { type: { in: ["estimate", "invoice"] } },
        select: {
          type: true,
          items: {
            select: {
              rowType: true,
              quantity: true,
              unitPrice: true,
              taxRate: true,
            },
          },
        },
      },
    },
  });

  // Recompute estimate / invoice totals from the latest items so the
  // case list never shows stale numbers, even for projects whose
  // documents were saved before estimateAmount sync existed.
  const enriched = list.map((p) => {
    const estimate = p.documents.find((d) => d.type === "estimate");
    const invoice = p.documents.find((d) => d.type === "invoice");
    const { documents: _docs, ...rest } = p;
    return {
      ...rest,
      estimateAmount: estimate ? subtotalOf(estimate.items) : 0,
      invoiceAmount: invoice ? totalOf(invoice.items) : 0,
    };
  });

  return NextResponse.json(enriched);
}

export async function POST(req: Request) {
  const body = await req.json();
  const all = await prisma.project.findMany({
    select: { projectNumber: true },
  });
  const projectNumber =
    body.projectNumber ?? nextProjectNumberFrom(all.map((p) => p.projectNumber));
  const created = await prisma.project.create({
    data: {
      ...body,
      projectNumber,
      estimateAmount: body.estimateAmount ?? 0,
      invoiceAmount: body.invoiceAmount ?? 0,
    },
  });
  return NextResponse.json(created);
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function nextProjectNumberFrom(numbers: string[]): string {
  const ints = numbers
    .map((n) => parseInt(n, 10))
    .filter((n) => !Number.isNaN(n));
  const max = ints.length > 0 ? Math.max(...ints) : 22614;
  return String(max + 1);
}

export async function GET() {
  const list = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(list);
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

"use client";

import { useEffect, useState, useCallback } from "react";
import type { Document, DocumentItem, DocumentType, TaxRate } from "./types";

const EVENT = "documents-updated";

function generateId(prefix = "i"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function fetchDocument(
  projectId: string,
  type: DocumentType
): Promise<Document> {
  const r = await fetch(`/api/documents/${projectId}/${type}`, {
    cache: "no-store",
  });
  if (!r.ok) throw new Error("failed to fetch document");
  return r.json();
}

async function putDocument(
  projectId: string,
  type: DocumentType,
  body: Partial<Document>
): Promise<Document> {
  const r = await fetch(`/api/documents/${projectId}/${type}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error("failed to save document");
  return r.json();
}

export function useDocument(projectId: string, type: DocumentType) {
  const [document, setDocument] = useState<Document | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const load = useCallback(async () => {
    try {
      setDocument(await fetchDocument(projectId, type));
    } catch (e) {
      console.error(e);
    }
  }, [projectId, type]);

  useEffect(() => {
    let mounted = true;
    fetchDocument(projectId, type)
      .then((doc) => {
        if (mounted) {
          setDocument(doc);
          setHydrated(true);
        }
      })
      .catch(() => {
        if (mounted) setHydrated(true);
      });
    const onUpdate = () => load();
    window.addEventListener(EVENT, onUpdate);
    return () => {
      mounted = false;
      window.removeEventListener(EVENT, onUpdate);
    };
  }, [projectId, type, load]);

  const save = useCallback(
    async (next: Document): Promise<Document> => {
      const updated = await putDocument(projectId, type, next);
      setDocument(updated);
      window.dispatchEvent(new CustomEvent(EVENT));
      return updated;
    },
    [projectId, type]
  );

  return { document, hydrated, save };
}

export async function copyAndIssueDocument(
  fromProjectId: string,
  fromType: DocumentType,
  toType: DocumentType
): Promise<boolean> {
  const from = await fetchDocument(fromProjectId, fromType);
  if (!from || from.items.length === 0) return false;
  const newItems: DocumentItem[] = from.items.map((item) => ({
    ...item,
    id: generateId("i"),
  }));
  const target = await fetchDocument(fromProjectId, toType);
  await putDocument(fromProjectId, toType, {
    ...target,
    subject: target.subject || from.subject,
    notes: target.notes || from.notes,
    items: newItems,
    status: "issued",
  });
  window.dispatchEvent(new CustomEvent(EVENT));
  return true;
}

export async function copyItemsBetweenDocuments(
  fromProjectId: string,
  fromType: DocumentType,
  toProjectId: string,
  toType: DocumentType
): Promise<boolean> {
  const from = await fetchDocument(fromProjectId, fromType);
  if (!from || from.items.length === 0) return false;
  const target = await fetchDocument(toProjectId, toType);
  const newItems: DocumentItem[] = from.items.map((item) => ({
    ...item,
    id: generateId("i"),
  }));
  await putDocument(toProjectId, toType, {
    ...target,
    notes: from.notes ?? target.notes,
    items: newItems,
  });
  window.dispatchEvent(new CustomEvent(EVENT));
  return true;
}

export function calculateAmount(item: DocumentItem): number {
  if (item.rowType === "heading" || item.rowType === "subtotal") return 0;
  return Math.floor(item.quantity * item.unitPrice);
}

export function calculateTotals(items: DocumentItem[]) {
  const byRate: Record<TaxRate, { subtotal: number; tax: number }> = {
    10: { subtotal: 0, tax: 0 },
    8: { subtotal: 0, tax: 0 },
    0: { subtotal: 0, tax: 0 },
  };
  items.forEach((item) => {
    if (item.rowType === "heading" || item.rowType === "subtotal") return;
    const amount = calculateAmount(item);
    byRate[item.taxRate].subtotal += amount;
  });
  (Object.keys(byRate) as unknown as TaxRate[]).forEach((rate) => {
    byRate[rate].tax = Math.floor((byRate[rate].subtotal * Number(rate)) / 100);
  });
  const subtotal = byRate[10].subtotal + byRate[8].subtotal + byRate[0].subtotal;
  const tax = byRate[10].tax + byRate[8].tax + byRate[0].tax;
  const total = subtotal + tax;
  return { byRate, subtotal, tax, total };
}

export function makeNewItem(sortOrder: number): DocumentItem {
  return {
    id: generateId("i"),
    rowType: "normal",
    name: "",
    quantity: 1,
    unitPrice: 0,
    taxRate: 10,
    sortOrder,
  };
}

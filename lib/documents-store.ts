"use client";

import { useEffect, useState, useCallback } from "react";
import type { Document, DocumentItem, DocumentType, TaxRate } from "./types";

const STORAGE_KEY = "invoice-app:documents";

function loadAll(): Document[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Document[];
    // Migrate legacy documentNumber like "QT-00001" → "00001"
    let changed = false;
    const migrated = parsed.map((d) => {
      const stripped = (d.documentNumber ?? "").replace(/^[A-Za-z]+-/, "");
      if (stripped !== d.documentNumber) {
        changed = true;
        return { ...d, documentNumber: stripped };
      }
      return d;
    });
    if (changed) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    }
    return migrated;
  } catch {
    return [];
  }
}

function saveAll(documents: Document[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
  window.dispatchEvent(new CustomEvent("documents-updated"));
}

function generateId(prefix = "d"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function nextDocumentNumber(documents: Document[], type: DocumentType): string {
  const existing = documents
    .filter((d) => d.type === type)
    .map((d) => d.documentNumber)
    .map((n) => parseInt(n.replace(/^[^\d]+/, ""), 10))
    .filter((n) => !Number.isNaN(n));
  const max = existing.length > 0 ? Math.max(...existing) : 0;
  return String(max + 1).padStart(5, "0");
}

export function useDocument(projectId: string, type: DocumentType) {
  const [document, setDocument] = useState<Document | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const load = useCallback(() => {
    const all = loadAll();
    const found = all.find((d) => d.projectId === projectId && d.type === type);
    if (found) {
      setDocument(found);
    } else {
      const now = new Date().toISOString();
      const fresh: Document = {
        id: generateId(),
        projectId,
        type,
        documentNumber: nextDocumentNumber(all, type),
        subject: "",
        primaryDate: new Date().toISOString().slice(0, 10),
        secondaryDate: undefined,
        notes: "",
        status: "draft",
        items: [],
        createdAt: now,
        updatedAt: now,
      };
      setDocument(fresh);
    }
  }, [projectId, type]);

  useEffect(() => {
    load();
    setHydrated(true);
    const onUpdate = () => load();
    window.addEventListener("documents-updated", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("documents-updated", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, [load]);

  const save = useCallback(
    (next: Document) => {
      const all = loadAll();
      const idx = all.findIndex(
        (d) => d.projectId === projectId && d.type === type
      );
      const updated: Document = {
        ...next,
        updatedAt: new Date().toISOString(),
      };
      const newList = [...all];
      if (idx === -1) {
        newList.push(updated);
      } else {
        newList[idx] = updated;
      }
      saveAll(newList);
      setDocument(updated);
      return updated;
    },
    [projectId, type]
  );

  return { document, hydrated, save };
}

export function copyAndIssueDocument(
  fromProjectId: string,
  fromType: DocumentType,
  toType: DocumentType
): boolean {
  const all = loadAll();
  const from = all.find(
    (d) => d.projectId === fromProjectId && d.type === fromType
  );
  if (!from || from.items.length === 0) return false;
  const newItems: DocumentItem[] = from.items.map((item) => ({
    ...item,
    id: generateId("i"),
  }));
  const targetIdx = all.findIndex(
    (d) => d.projectId === fromProjectId && d.type === toType
  );
  const now = new Date().toISOString();
  if (targetIdx === -1) {
    const fresh: Document = {
      id: generateId(),
      projectId: fromProjectId,
      type: toType,
      documentNumber: nextDocumentNumber(all, toType),
      subject: from.subject,
      primaryDate: now.slice(0, 10),
      secondaryDate: undefined,
      notes: from.notes,
      status: "issued",
      items: newItems,
      createdAt: now,
      updatedAt: now,
    };
    saveAll([...all, fresh]);
  } else {
    const updated: Document = {
      ...all[targetIdx],
      items: newItems,
      status: "issued",
      updatedAt: now,
    };
    const newList = [...all];
    newList[targetIdx] = updated;
    saveAll(newList);
  }
  return true;
}

export function copyItemsBetweenDocuments(
  fromProjectId: string,
  fromType: DocumentType,
  toProjectId: string,
  toType: DocumentType
): boolean {
  const all = loadAll();
  const from = all.find((d) => d.projectId === fromProjectId && d.type === fromType);
  if (!from || from.items.length === 0) return false;
  const targetIdx = all.findIndex(
    (d) => d.projectId === toProjectId && d.type === toType
  );
  const newItems: DocumentItem[] = from.items.map((item) => ({
    ...item,
    id: generateId("i"),
  }));
  if (targetIdx === -1) {
    const now = new Date().toISOString();
    const fresh: Document = {
      id: generateId(),
      projectId: toProjectId,
      type: toType,
      documentNumber: nextDocumentNumber(all, toType),
      subject: from.subject,
      primaryDate: new Date().toISOString().slice(0, 10),
      secondaryDate: undefined,
      notes: from.notes ?? "",
      status: "draft",
      items: newItems,
      createdAt: now,
      updatedAt: now,
    };
    saveAll([...all, fresh]);
  } else {
    const updated = {
      ...all[targetIdx],
      items: newItems,
      notes: from.notes ?? all[targetIdx].notes,
      updatedAt: new Date().toISOString(),
    };
    const newList = [...all];
    newList[targetIdx] = updated;
    saveAll(newList);
  }
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

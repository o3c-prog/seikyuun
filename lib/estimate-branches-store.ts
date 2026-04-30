"use client";

import { useCallback, useEffect, useState } from "react";
import type { Document, DocumentItem } from "./types";

export type EstimateBranch = {
  id: string;
  projectId: string;
  name: string;
  items: DocumentItem[];
  notes?: string;
  subject?: string;
  primaryDate?: string;
  secondaryDate?: string;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = "invoice-app:estimate-branches";

function loadAll(): EstimateBranch[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as EstimateBranch[];
  } catch {
    return [];
  }
}

function saveAll(list: EstimateBranch[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("estimate-branches-updated"));
}

function generateId(): string {
  return `br-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function snapshotFromDoc(doc: Document, projectId: string, name: string): EstimateBranch {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    projectId,
    name,
    items: doc.items.map((it) => ({ ...it })),
    notes: doc.notes,
    subject: doc.subject,
    primaryDate: doc.primaryDate,
    secondaryDate: doc.secondaryDate,
    createdAt: now,
    updatedAt: now,
  };
}

export function useEstimateBranches(projectId: string) {
  const [branches, setBranches] = useState<EstimateBranch[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setBranches(loadAll());
    setHydrated(true);
    const onUpdate = () => setBranches(loadAll());
    window.addEventListener("estimate-branches-updated", onUpdate);
    return () =>
      window.removeEventListener("estimate-branches-updated", onUpdate);
  }, []);

  const create = useCallback(
    (
      name: string,
      seed?: Partial<Pick<EstimateBranch, "items" | "notes" | "subject" | "primaryDate" | "secondaryDate">>
    ) => {
      const list = loadAll();
      const now = new Date().toISOString();
      const next: EstimateBranch = {
        id: generateId(),
        projectId,
        name,
        items: (seed?.items ?? []).map((it) => ({ ...it })),
        notes: seed?.notes ?? "",
        subject: seed?.subject ?? "",
        primaryDate: seed?.primaryDate,
        secondaryDate: seed?.secondaryDate,
        createdAt: now,
        updatedAt: now,
      };
      saveAll([next, ...list]);
      return next;
    },
    [projectId]
  );

  const createSnapshot = useCallback(
    (name: string, fromDoc: Document) => {
      const list = loadAll();
      const next = snapshotFromDoc(fromDoc, projectId, name);
      saveAll([next, ...list]);
      return next;
    },
    [projectId]
  );

  const update = useCallback(
    (
      id: string,
      patch: Partial<
        Pick<EstimateBranch, "name" | "items" | "notes" | "subject" | "primaryDate" | "secondaryDate">
      >
    ) => {
      const list = loadAll();
      const idx = list.findIndex((b) => b.id === id);
      if (idx === -1) return null;
      const updated: EstimateBranch = {
        ...list[idx],
        ...patch,
        items: patch.items
          ? patch.items.map((it) => ({ ...it }))
          : list[idx].items,
        updatedAt: new Date().toISOString(),
      };
      const newList = [...list];
      newList[idx] = updated;
      saveAll(newList);
      return updated;
    },
    []
  );

  const remove = useCallback((id: string) => {
    const list = loadAll();
    saveAll(list.filter((b) => b.id !== id));
  }, []);

  const filtered = branches.filter((b) => b.projectId === projectId);

  return {
    branches: filtered,
    hydrated,
    create,
    createSnapshot,
    update,
    remove,
  };
}

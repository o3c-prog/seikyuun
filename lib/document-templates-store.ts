"use client";

import { useCallback, useEffect, useState } from "react";
import type { DocumentItem, DocumentType } from "./types";

export type DocumentTemplate = {
  id: string;
  name: string;
  type: DocumentType;
  items: DocumentItem[];
  notes?: string;
  createdAt: string;
};

const STORAGE_KEY = "invoice-app:document-templates";

function load(): DocumentTemplate[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as DocumentTemplate[];
  } catch {
    return [];
  }
}

function save(list: DocumentTemplate[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("document-templates-updated"));
}

function generateId(): string {
  return `tpl-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function useDocumentTemplates(type: DocumentType) {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setTemplates(load());
    setHydrated(true);
    const onUpdate = () => setTemplates(load());
    window.addEventListener("document-templates-updated", onUpdate);
    return () =>
      window.removeEventListener("document-templates-updated", onUpdate);
  }, []);

  const create = useCallback(
    (input: { name: string; items: DocumentItem[]; notes?: string }) => {
      const list = load();
      const next: DocumentTemplate = {
        id: generateId(),
        name: input.name,
        type,
        items: input.items.map((it) => ({ ...it })),
        notes: input.notes,
        createdAt: new Date().toISOString(),
      };
      save([next, ...list]);
      return next;
    },
    [type]
  );

  const remove = useCallback((id: string) => {
    const list = load();
    save(list.filter((t) => t.id !== id));
  }, []);

  const filtered = templates.filter((t) => t.type === type);

  return { templates: filtered, hydrated, create, remove };
}

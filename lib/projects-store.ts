"use client";

import { useEffect, useState, useCallback } from "react";
import type { Project, ProjectInput } from "./types";
import { mockProjects } from "./mock-data";

const STORAGE_KEY = "invoice-app:projects";

const LEGACY_ORDER_STATUS_MAP: Record<string, Project["orderStatus"]> = {
  estimate_high: "estimating",
  estimate_mid: "estimating",
  estimate_low: "estimating",
  estimate_excluded: "estimating",
  confirmed: "ordered",
};

function migrate(p: Project): Project {
  const legacy = LEGACY_ORDER_STATUS_MAP[p.orderStatus as string];
  if (legacy) {
    return { ...p, orderStatus: legacy };
  }
  return p;
}

function loadProjects(): Project[] {
  if (typeof window === "undefined") return mockProjects;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(mockProjects));
    return mockProjects;
  }
  try {
    const parsed = JSON.parse(raw) as Project[];
    const migrated = parsed.map(migrate);
    if (migrated.some((p, i) => p.orderStatus !== parsed[i].orderStatus)) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    }
    return migrated;
  } catch {
    return mockProjects;
  }
}

function saveProjects(projects: Project[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  window.dispatchEvent(new CustomEvent("projects-updated"));
}

function generateId(): string {
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function nextProjectNumber(projects: Project[]): string {
  const numbers = projects
    .map((p) => parseInt(p.projectNumber, 10))
    .filter((n) => !Number.isNaN(n));
  const max = numbers.length > 0 ? Math.max(...numbers) : 22614;
  return String(max + 1);
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setProjects(loadProjects());
    setHydrated(true);
    const onUpdate = () => setProjects(loadProjects());
    window.addEventListener("projects-updated", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("projects-updated", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, []);

  const create = useCallback((input: ProjectInput): Project => {
    const list = loadProjects();
    const now = new Date().toISOString();
    const next: Project = {
      ...input,
      estimateAmount: input.estimateAmount ?? 0,
      invoiceAmount: input.invoiceAmount ?? 0,
      id: generateId(),
      projectNumber: nextProjectNumber(list),
      createdAt: now,
      updatedAt: now,
    };
    saveProjects([next, ...list]);
    return next;
  }, []);

  const update = useCallback((id: string, input: Partial<ProjectInput>): Project | null => {
    const list = loadProjects();
    const idx = list.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    const next: Project = {
      ...list[idx],
      ...input,
      updatedAt: new Date().toISOString(),
    };
    const newList = [...list];
    newList[idx] = next;
    saveProjects(newList);
    return next;
  }, []);

  const remove = useCallback((id: string) => {
    const list = loadProjects();
    saveProjects(list.filter((p) => p.id !== id));
  }, []);

  return { projects, hydrated, create, update, remove };
}

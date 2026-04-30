"use client";

import { useEffect, useState, useCallback } from "react";
import type { Project, ProjectInput } from "./types";

const EVENT = "projects-updated";

async function fetchProjects(): Promise<Project[]> {
  const r = await fetch("/api/projects", { cache: "no-store" });
  if (!r.ok) throw new Error("failed to fetch projects");
  return r.json();
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const reload = useCallback(async () => {
    try {
      setProjects(await fetchProjects());
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    fetchProjects()
      .then((list) => {
        if (mounted) {
          setProjects(list);
          setHydrated(true);
        }
      })
      .catch(() => {
        if (mounted) setHydrated(true);
      });
    const onUpdate = () => reload();
    window.addEventListener(EVENT, onUpdate);
    return () => {
      mounted = false;
      window.removeEventListener(EVENT, onUpdate);
    };
  }, [reload]);

  const create = useCallback(async (input: ProjectInput): Promise<Project> => {
    const r = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!r.ok) throw new Error("failed to create project");
    const created = (await r.json()) as Project;
    setProjects((prev) => [created, ...prev]);
    window.dispatchEvent(new CustomEvent(EVENT));
    return created;
  }, []);

  const update = useCallback(
    async (id: string, input: Partial<ProjectInput>): Promise<Project | null> => {
      const r = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!r.ok) return null;
      const updated = (await r.json()) as Project;
      setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
      window.dispatchEvent(new CustomEvent(EVENT));
      return updated;
    },
    []
  );

  const remove = useCallback(async (id: string): Promise<void> => {
    const r = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (!r.ok) return;
    setProjects((prev) => prev.filter((p) => p.id !== id));
    window.dispatchEvent(new CustomEvent(EVENT));
  }, []);

  return { projects, hydrated, create, update, remove };
}

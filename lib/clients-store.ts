"use client";

import { useEffect, useState, useCallback } from "react";
import type { Client, ClientInput } from "./types";

const EVENT = "clients-updated";

async function fetchClients(): Promise<Client[]> {
  const r = await fetch("/api/clients", { cache: "no-store" });
  if (!r.ok) throw new Error("failed to fetch clients");
  return r.json();
}

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const reload = useCallback(async () => {
    try {
      setClients(await fetchClients());
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    fetchClients()
      .then((list) => {
        if (mounted) {
          setClients(list);
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

  const create = useCallback(async (input: ClientInput): Promise<Client> => {
    const r = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!r.ok) throw new Error("failed to create client");
    const created = (await r.json()) as Client;
    setClients((prev) => [created, ...prev]);
    window.dispatchEvent(new CustomEvent(EVENT));
    return created;
  }, []);

  const update = useCallback(
    async (id: string, input: Partial<ClientInput>): Promise<Client | null> => {
      const r = await fetch(`/api/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!r.ok) return null;
      const updated = (await r.json()) as Client;
      setClients((prev) => prev.map((c) => (c.id === id ? updated : c)));
      window.dispatchEvent(new CustomEvent(EVENT));
      return updated;
    },
    []
  );

  const remove = useCallback(async (id: string): Promise<void> => {
    const r = await fetch(`/api/clients/${id}`, { method: "DELETE" });
    if (!r.ok) return;
    setClients((prev) => prev.filter((c) => c.id !== id));
    window.dispatchEvent(new CustomEvent(EVENT));
  }, []);

  return { clients, hydrated, create, update, remove };
}

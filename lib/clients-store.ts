"use client";

import { useEffect, useState, useCallback } from "react";
import type { Client, ClientInput } from "./types";
import { mockClients } from "./mock-data";

const STORAGE_KEY = "invoice-app:clients";

function loadClients(): Client[] {
  if (typeof window === "undefined") return mockClients;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(mockClients));
    return mockClients;
  }
  try {
    const parsed = JSON.parse(raw) as Array<Client & {
      shortName?: string;
      fax?: string;
      email?: string;
      ndaSigned?: boolean;
      basicContractSigned?: boolean;
    }>;
    let changed = false;
    const migrated: Client[] = parsed.map((c) => {
      const next: Client & {
        shortName?: string;
        fax?: string;
        email?: string;
        ndaSigned?: boolean;
        basicContractSigned?: boolean;
      } = { ...c };
      if ((next.sendMethod as string) === "download") {
        next.sendMethod = "mail";
        changed = true;
      }
      // If legacy email exists and contacts is missing, seed contacts
      if (!next.contacts && next.email) {
        next.contacts = [{ name: "", email: next.email }];
        changed = true;
      }
      // Drop deprecated fields
      if (next.shortName !== undefined) {
        delete next.shortName;
        changed = true;
      }
      if (next.fax !== undefined) {
        delete next.fax;
        changed = true;
      }
      if (next.email !== undefined) {
        delete next.email;
        changed = true;
      }
      if (next.ndaSigned !== undefined) {
        delete next.ndaSigned;
        changed = true;
      }
      if (next.basicContractSigned !== undefined) {
        delete next.basicContractSigned;
        changed = true;
      }
      return next as Client;
    });
    if (changed) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    }
    return migrated;
  } catch {
    return mockClients;
  }
}

function saveClients(clients: Client[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
  window.dispatchEvent(new CustomEvent("clients-updated"));
}

function generateId(): string {
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setClients(loadClients());
    setHydrated(true);
    const onUpdate = () => setClients(loadClients());
    window.addEventListener("clients-updated", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("clients-updated", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, []);

  const create = useCallback((input: ClientInput): Client => {
    const now = new Date().toISOString();
    const next: Client = {
      ...input,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    const list = loadClients();
    saveClients([next, ...list]);
    return next;
  }, []);

  const update = useCallback((id: string, input: Partial<ClientInput>): Client | null => {
    const list = loadClients();
    const idx = list.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    const next: Client = {
      ...list[idx],
      ...input,
      updatedAt: new Date().toISOString(),
    };
    const newList = [...list];
    newList[idx] = next;
    saveClients(newList);
    return next;
  }, []);

  const remove = useCallback((id: string) => {
    const list = loadClients();
    saveClients(list.filter((c) => c.id !== id));
  }, []);

  const reset = useCallback(() => {
    saveClients(mockClients);
  }, []);

  return { clients, hydrated, create, update, remove, reset };
}

export function getClientById(id: string): Client | null {
  if (typeof window === "undefined") return null;
  const list = loadClients();
  return list.find((c) => c.id === id) ?? null;
}

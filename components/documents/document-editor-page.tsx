"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useProjects } from "@/lib/projects-store";
import { useClients } from "@/lib/clients-store";
import type { DocumentType } from "@/lib/types";
import { DocumentEditor } from "./document-editor";

export function DocumentEditorPage({
  params,
  type,
}: {
  params: Promise<{ id: string }>;
  type: DocumentType;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { projects, hydrated: pHydrated } = useProjects();
  const { clients, hydrated: cHydrated } = useClients();

  const project = projects.find((p) => p.id === id);
  const client = project ? clients.find((c) => c.id === project.clientId) : undefined;

  useEffect(() => {
    if (pHydrated && !project) {
      router.push("/projects");
    }
  }, [pHydrated, project, router]);

  if (!pHydrated || !cHydrated || !project) {
    return <div className="p-8 text-sm text-muted-foreground">読み込み中...</div>;
  }

  return <DocumentEditor project={project} client={client} type={type} />;
}

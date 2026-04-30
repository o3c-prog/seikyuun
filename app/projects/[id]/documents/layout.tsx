"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProjects } from "@/lib/projects-store";
import { PageHeader } from "@/components/layout/page-header";
import { DocumentTabs } from "@/components/documents/document-tabs";

export default function DocumentsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { projects, hydrated } = useProjects();

  const project = projects.find((p) => p.id === id);

  useEffect(() => {
    if (hydrated && !project) {
      router.push("/projects");
    }
  }, [hydrated, project, router]);

  if (!hydrated || !project) {
    return (
      <div className="p-8">
        <p className="text-sm text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="書類編集"
        crumbs={[
          { label: "案件管理", href: "/projects" },
          { label: "書類編集" },
        ]}
      />
      <DocumentTabs projectId={project.id} />
      {children}
    </>
  );
}

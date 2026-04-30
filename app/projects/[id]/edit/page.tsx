"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

import { ProjectForm } from "@/components/projects/project-form";
import { useProjects } from "@/lib/projects-store";
import type { Project } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";

export default function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { projects, hydrated } = useProjects();
  const [project, setProject] = useState<Project | null | undefined>(undefined);

  useEffect(() => {
    if (!hydrated) return;
    const found = projects.find((p) => p.id === id) ?? null;
    setProject(found);
    if (!found) {
      toast.error("案件が見つかりません");
      router.push("/projects");
    }
  }, [hydrated, projects, id, router]);

  if (!hydrated || project === undefined) {
    return (
      <div className="p-8">
        <p className="text-sm text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  if (!project) return null;

  return (
    <>
      <PageHeader
        title={project.name}
        titleSuffix={
          <Pencil
            aria-hidden
            className="size-4 text-muted-foreground/60"
          />
        }
        crumbs={[
          { label: "案件管理", href: "/projects" },
          { label: "案件情報の編集" },
        ]}
        description={`案件No. ${project.projectNumber}`}
        actions={
          <Link
            href={`/projects/${project.id}/documents/estimate`}
            className={buttonVariants({
              className:
                "h-9 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 px-10 text-sm font-semibold shadow-md shadow-violet-200 hover:from-violet-600 hover:to-indigo-600",
            })}
          >
            書類を編集
          </Link>
        }
      />
      <div className="p-8">
        <ProjectForm project={project} />
      </div>
    </>
  );
}

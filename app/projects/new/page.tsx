import { ProjectForm } from "@/components/projects/project-form";
import { PageHeader } from "@/components/layout/page-header";

export default function NewProjectPage() {
  return (
    <>
      <PageHeader
        title="案件登録"
        crumbs={[{ label: "案件管理", href: "/projects" }, { label: "案件登録" }]}
        description="新しい案件を登録します"
      />
      <div className="p-8">
        <ProjectForm />
      </div>
    </>
  );
}

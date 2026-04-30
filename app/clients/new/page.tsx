import { ClientForm } from "@/components/clients/client-form";
import { PageHeader } from "@/components/layout/page-header";

export default function NewClientPage() {
  return (
    <>
      <PageHeader
        title="顧客登録"
        crumbs={[{ label: "顧客管理", href: "/clients" }, { label: "顧客登録" }]}
        description="新しい顧客を登録します"
      />
      <div className="p-8">
        <ClientForm />
      </div>
    </>
  );
}

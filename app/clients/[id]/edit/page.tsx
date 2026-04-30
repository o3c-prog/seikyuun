"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ClientForm } from "@/components/clients/client-form";
import { useClients } from "@/lib/clients-store";
import type { Client } from "@/lib/types";
import { PageHeader } from "@/components/layout/page-header";

export default function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { clients, hydrated } = useClients();
  const [client, setClient] = useState<Client | null | undefined>(undefined);

  useEffect(() => {
    if (!hydrated) return;
    const found = clients.find((c) => c.id === id) ?? null;
    setClient(found);
    if (!found) {
      toast.error("顧客が見つかりません");
      router.push("/clients");
    }
  }, [hydrated, clients, id, router]);

  if (!hydrated || client === undefined) {
    return (
      <div className="p-8">
        <p className="text-sm text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  if (!client) return null;

  return (
    <>
      <PageHeader
        title="顧客編集"
        crumbs={[{ label: "顧客管理", href: "/clients" }, { label: "顧客編集" }]}
        description={client.name}
      />
      <div className="p-8">
        <ClientForm client={client} />
      </div>
    </>
  );
}

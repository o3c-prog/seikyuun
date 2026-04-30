"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Pencil,
  Trash2,
  FolderKanban,
  Inbox,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

import { useProjects } from "@/lib/projects-store";
import { useClients } from "@/lib/clients-store";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { SectionCard } from "@/components/layout/section-card";
import { OrderStatusBadge, ProgressBadge } from "@/components/projects/status-badges";

export default function ProjectsPage() {
  const { projects, hydrated, remove } = useProjects();
  const { clients } = useClients();
  const [nameKeyword, setNameKeyword] = useState("");
  const [clientKeyword, setClientKeyword] = useState("");
  const [clientId, setClientId] = useState<string>("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const clientById = useMemo(() => {
    const map = new Map(clients.map((c) => [c.id, c]));
    return map;
  }, [clients]);

  const activeClients = clients;

  const filtered = useMemo(() => {
    const nameK = nameKeyword.trim().toLowerCase();
    const clientK = clientKeyword.trim().toLowerCase();
    return projects.filter((p) => {
      // 顧客フィルタ（プルダウン選択優先）
      if (clientId) {
        if (p.clientId !== clientId) return false;
      } else if (clientK) {
        const c = clientById.get(p.clientId);
        const haystack = (c?.name ?? "").toLowerCase();
        if (!haystack.includes(clientK)) return false;
      }
      // 案件名フィルタ
      if (nameK && !p.name.toLowerCase().includes(nameK)) return false;
      return true;
    });
  }, [projects, nameKeyword, clientKeyword, clientId, clientById]);

  const handleDelete = () => {
    if (!pendingDeleteId) return;
    remove(pendingDeleteId);
    setPendingDeleteId(null);
    toast.success("削除しました");
  };

  const pendingDeleteProject = projects.find((p) => p.id === pendingDeleteId);

  return (
    <>
      <PageHeader
        title="案件一覧"
        description={
          hydrated
            ? `${filtered.length} 件 表示中（全 ${projects.length} 件）`
            : "読み込み中..."
        }
        actions={
          <Link
            href="/projects/new"
            className={buttonVariants({
              className:
                "h-9 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 px-10 text-sm font-semibold shadow-md shadow-violet-200 hover:from-violet-600 hover:to-indigo-600",
            })}
          >
            案件登録
          </Link>
        }
      />

      <div className="space-y-6 p-8">
        <SectionCard icon={Search} title="絞り込み">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                案件名
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={nameKeyword}
                  onChange={(e) => setNameKeyword(e.target.value)}
                  placeholder="案件名で検索..."
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                顧客
              </Label>
              <div className="flex items-stretch gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={clientKeyword}
                    onChange={(e) => {
                      setClientKeyword(e.target.value);
                      if (clientId) setClientId("");
                    }}
                    placeholder="顧客名で検索..."
                    className="pl-9"
                    disabled={!!clientId}
                  />
                </div>
                <select
                  value={clientId}
                  onChange={(e) => {
                    setClientId(e.target.value);
                    if (e.target.value) setClientKeyword("");
                  }}
                  className="h-8 min-w-[160px] rounded-lg border border-input bg-background px-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-soft"
                >
                  <option value="">顧客から選択...</option>
                  {activeClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {(clientId || clientKeyword) && (
                  <button
                    type="button"
                    onClick={() => {
                      setClientId("");
                      setClientKeyword("");
                    }}
                    className="rounded-lg border border-border bg-card px-2 text-xs text-muted-foreground hover:bg-muted"
                    title="クリア"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={FolderKanban} title="案件リスト" className="overflow-hidden">
          <div className="-mx-6 -my-6">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[80px] pl-6">No</TableHead>
                  <TableHead>案件名</TableHead>
                  <TableHead className="w-[200px]">顧客</TableHead>
                  <TableHead className="w-[130px]">受注</TableHead>
                  <TableHead className="w-[100px]">進捗</TableHead>
                  <TableHead className="w-[120px] text-right">見積額</TableHead>
                  <TableHead className="w-[120px] text-right">請求額</TableHead>
                  <TableHead className="w-[110px]">請求日</TableHead>
                  <TableHead className="w-[140px] pr-6 text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!hydrated ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                      読み込み中...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Inbox className="size-8 opacity-50" />
                        <span className="text-sm">該当する案件がありません</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((p) => {
                    const client = clientById.get(p.clientId);
                    return (
                      <TableRow key={p.id} className="group relative cursor-pointer">
                        <TableCell className="pl-6 font-mono text-xs text-muted-foreground">
                          <Link
                            href={`/projects/${p.id}/edit`}
                            aria-label={`${p.name} を開く`}
                            className="absolute inset-0 rounded focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
                          />
                          {p.projectNumber}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium group-hover:text-primary">
                            {p.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {client ? (
                            <span>{client.name}</span>
                          ) : (
                            <span className="text-muted-foreground">（未設定）</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <OrderStatusBadge status={p.orderStatus} />
                        </TableCell>
                        <TableCell>
                          <ProgressBadge progress={p.progress} />
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm tabular-nums">
                          {p.estimateAmount > 0
                            ? p.estimateAmount.toLocaleString("ja-JP")
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm tabular-nums">
                          {p.invoiceAmount > 0
                            ? p.invoiceAmount.toLocaleString("ja-JP")
                            : "-"}
                        </TableCell>
                        <TableCell className="text-sm tabular-nums">
                          {p.invoiceDate ?? "-"}
                        </TableCell>
                        <TableCell className="pr-6">
                          <div className="relative z-10 flex items-center justify-end gap-1">
                            <Link
                              href={`/projects/${p.id}/documents/estimate`}
                              className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                              title="書類"
                            >
                              <FileText className="size-3.5 text-primary" />
                            </Link>
                            <Link
                              href={`/projects/${p.id}/edit`}
                              className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                              title="編集"
                            >
                              <Pencil className="size-3.5" />
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="削除"
                              onClick={() => setPendingDeleteId(p.id)}
                            >
                              <Trash2 className="size-3.5 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </SectionCard>
      </div>

      <AlertDialog
        open={!!pendingDeleteId}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>案件を削除しますか?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteProject?.name} を削除します。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>削除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

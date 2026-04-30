"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Pencil,
  Trash2,
  Users,
  Inbox,
} from "lucide-react";
import { toast } from "sonner";

import { useClients } from "@/lib/clients-store";
import { SEND_METHOD_LABELS } from "@/lib/types";
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

export default function ClientsPage() {
  const { clients, hydrated, remove } = useClients();
  const [keyword, setKeyword] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    return clients.filter((c) => {
      if (!k) return true;
      return (
        c.name.toLowerCase().includes(k) ||
        (c.clientNumber ?? "").toLowerCase().includes(k)
      );
    });
  }, [clients, keyword]);

  const handleDelete = () => {
    if (!pendingDeleteId) return;
    remove(pendingDeleteId);
    setPendingDeleteId(null);
    toast.success("削除しました");
  };

  const pendingDeleteClient = clients.find((c) => c.id === pendingDeleteId);

  return (
    <>
      <PageHeader
        title="顧客一覧"
        description={
          hydrated
            ? `${filtered.length} 件 表示中（全 ${clients.length} 件）`
            : "読み込み中..."
        }
        actions={
          <Link
            href="/clients/new"
            className={buttonVariants({
              className:
                "h-9 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 px-10 text-sm font-semibold shadow-md shadow-violet-200 hover:from-violet-600 hover:to-indigo-600",
            })}
          >
            顧客登録
          </Link>
        }
      />

      <div className="space-y-6 p-8">
        <SectionCard icon={Search} title="絞り込み">
          <div className="max-w-md">
            <Label
              htmlFor="keyword"
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
            >
              キーワード
            </Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="keyword"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="顧客名・顧客番号..."
                className="pl-9"
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard
          icon={Users}
          title="顧客リスト"
          className="overflow-hidden"
        >
          <div className="-mx-6 -my-6">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6">顧客名</TableHead>
                  <TableHead>住所</TableHead>
                  <TableHead className="w-[140px]">電話番号</TableHead>
                  <TableHead className="w-[110px]">支払条件</TableHead>
                  <TableHead className="w-[140px] text-center">送付方法</TableHead>
                  <TableHead className="w-[100px] pr-6 text-right">
                    操作
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!hydrated ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-32 text-center text-muted-foreground"
                    >
                      読み込み中...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Inbox className="size-8 opacity-50" />
                        <span className="text-sm">該当する顧客がいません</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((c) => (
                    <TableRow
                      key={c.id}
                      className="group relative cursor-pointer"
                    >
                      <TableCell className="pl-6 font-medium">
                        <Link
                          href={`/clients/${c.id}/edit`}
                          aria-label={`${c.name} を開く`}
                          className="absolute inset-0 rounded focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
                        />
                        <span className="group-hover:text-primary">
                          {c.name}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {[
                          c.postalCode && `〒${c.postalCode}`,
                          c.prefecture,
                          c.city,
                          c.building,
                        ]
                          .filter(Boolean)
                          .join(" ") || "-"}
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {c.tel ?? "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {c.defaultPaymentTerms ?? "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs">
                          {SEND_METHOD_LABELS[c.sendMethod] ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell className="pr-6">
                        <div className="relative z-10 flex items-center justify-end gap-1">
                          <Link
                            href={`/clients/${c.id}/edit`}
                            className={buttonVariants({
                              variant: "ghost",
                              size: "icon-sm",
                            })}
                            title="編集"
                          >
                            <Pencil className="size-3.5" />
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="削除"
                            onClick={() => setPendingDeleteId(c.id)}
                          >
                            <Trash2 className="size-3.5 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
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
            <AlertDialogTitle>顧客を削除しますか?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteClient?.name}{" "}
              を削除します。この操作は取り消せません。
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

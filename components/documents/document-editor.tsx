"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowUp,
  Calendar,
  ChevronDown,
  Cloud,
  Copy,
  FileText,
  GitBranch,
  GripVertical,
  Heading2,
  Lightbulb,
  Minus,
  Plus,
  Sigma,
  Trash2,
} from "lucide-react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";

import {
  DOCUMENT_DATE_CONFIG,
  DOCUMENT_TITLE_PREFIX,
  DOCUMENT_TYPE_LABELS,
  TAX_RATES,
  type Document,
  type DocumentItem,
  type RowType,
  type DocumentType,
  type Project,
  type Client,
  type TaxRate,
} from "@/lib/types";
import {
  calculateAmount,
  calculateTotals,
  copyAndIssueDocument,
  copyItemsBetweenDocuments,
  makeNewItem,
  useDocument,
} from "@/lib/documents-store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDocumentTemplates } from "@/lib/document-templates-store";
import {
  useEstimateBranches,
  type EstimateBranch,
} from "@/lib/estimate-branches-store";
import { cn } from "@/lib/utils";

const yen = (n: number) => n.toLocaleString("ja-JP");

export function DocumentEditor({
  project,
  client,
  type,
}: {
  project: Project;
  client?: Client;
  type: DocumentType;
}) {
  const { document: doc, hydrated, save } = useDocument(project.id, type);
  const {
    branches,
    hydrated: branchesHydrated,
    create: createBranch,
    update: updateBranch,
    remove: removeBranch,
  } = useEstimateBranches(project.id);
  const [draft, setDraft] = useState<Document | null>(null);
  const [currentBranchId, setCurrentBranchId] = useState<string | null>(null);
  const dateConfig = DOCUMENT_DATE_CONFIG[type];
  const titleLabel = DOCUMENT_TITLE_PREFIX[type];

  const currentBranch = currentBranchId
    ? branches.find((b) => b.id === currentBranchId) ?? null
    : null;
  const isOnBranch = type === "estimate" && currentBranch !== null;

  // Load draft based on whether main or a branch is active
  useEffect(() => {
    if (currentBranch && doc) {
      // Editing a branch: present a Document-shaped draft using main's metadata
      setDraft({
        ...doc,
        items: currentBranch.items.map((it) => ({ ...it })),
        notes: currentBranch.notes ?? "",
        subject: currentBranch.subject ?? doc.subject,
        primaryDate: currentBranch.primaryDate ?? doc.primaryDate,
        secondaryDate: currentBranch.secondaryDate ?? doc.secondaryDate,
      });
    } else if (doc) {
      setDraft(doc);
    }
  }, [doc, currentBranch]);

  // Default secondaryDate when empty:
  // - estimate (有効期限) → primaryDate + 1 month (same day)
  // - invoice (支払期限) → end of next month after primaryDate
  // - others → primaryDate + 1 month
  useEffect(() => {
    if (!draft || !dateConfig.secondary) return;
    if (!draft.primaryDate || draft.secondaryDate) return;
    const d = new Date(draft.primaryDate);
    if (Number.isNaN(d.getTime())) return;
    const target =
      type === "invoice"
        ? new Date(d.getFullYear(), d.getMonth() + 2, 0) // last day of next month
        : new Date(d.getFullYear(), d.getMonth() + 1, d.getDate());
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, "0");
    const dd = String(target.getDate()).padStart(2, "0");
    setDraft((prev) =>
      prev ? { ...prev, secondaryDate: `${yyyy}-${mm}-${dd}` } : prev
    );
  }, [draft, dateConfig.secondary, type]);

  const totals = useMemo(
    () => (draft ? calculateTotals(draft.items) : null),
    [draft]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  if (!hydrated || !branchesHydrated || !draft || !totals) {
    return (
      <div className="p-8 text-sm text-muted-foreground">読み込み中...</div>
    );
  }

  const updateField = <K extends keyof Document>(key: K, value: Document[K]) => {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  };

  const updateItem = (id: string, patch: Partial<DocumentItem>) => {
    setDraft((d) => {
      if (!d) return d;
      const items = d.items.map((it) =>
        it.id === id ? { ...it, ...patch } : it
      );
      return { ...d, items };
    });
  };

  const addItem = () => {
    setDraft((d) => {
      if (!d) return d;
      const sortOrder =
        d.items.length === 0
          ? 0
          : Math.max(...d.items.map((i) => i.sortOrder)) + 1;
      return { ...d, items: [...d.items, makeNewItem(sortOrder)] };
    });
  };

  const insertItemAfter = (id: string) => {
    setDraft((d) => {
      if (!d) return d;
      const sorted = [...d.items].sort((a, b) => a.sortOrder - b.sortOrder);
      const idx = sorted.findIndex((it) => it.id === id);
      if (idx === -1) return d;
      const target = sorted[idx];
      const newItem = makeNewItem(target.sortOrder + 1);
      const reordered = sorted.flatMap((it, i) =>
        i === idx
          ? [it, newItem]
          : [it]
      );
      const renumbered = reordered.map((it, i) => ({ ...it, sortOrder: i }));
      return { ...d, items: renumbered };
    });
  };

  const removeItem = (id: string) => {
    setDraft((d) => {
      if (!d) return d;
      return { ...d, items: d.items.filter((it) => it.id !== id) };
    });
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setDraft((d) => {
      if (!d) return d;
      const ids = d.items.map((i) => i.id);
      const oldIdx = ids.indexOf(active.id as string);
      const newIdx = ids.indexOf(over.id as string);
      const reordered = arrayMove(d.items, oldIdx, newIdx).map((it, i) => ({
        ...it,
        sortOrder: i,
      }));
      return { ...d, items: reordered };
    });
  };

  const openPrintPreset = (preset: string) => {
    window.open(`/print/${project.id}/${preset}`, "_blank", "noopener,noreferrer");
  };

  const handleIssueAndPrintSelf = async () => {
    await save({ ...draft, status: "issued" });
    toast.success(`${DOCUMENT_TYPE_LABELS[type]}を発行しました`);
    openPrintPreset(type);
  };

  const handleIssueEstimateAndPo = async () => {
    await save({ ...draft, status: "issued" });
    const ok = await copyAndIssueDocument(project.id, type, "purchase-order");
    if (ok) {
      toast.success("見積書と発注書を発行しました");
    } else {
      toast.warning("見積書を発行しました（発注書の作成に失敗）");
    }
    openPrintPreset("estimate-po");
  };

  const handleIssueEstimatePoAndAck = async () => {
    await save({ ...draft, status: "issued" });
    const ok = await copyAndIssueDocument(project.id, type, "purchase-order");
    if (ok) {
      toast.success("見積書、発注書、発注請書を発行しました");
    } else {
      toast.warning("見積書を発行しました（発注書の作成に失敗）");
    }
    openPrintPreset("estimate-po-ack");
  };

  const handleIssueWithPreset = async (preset: string, message: string) => {
    await save({ ...draft, status: "issued" });
    toast.success(message);
    openPrintPreset(preset);
  };

  const issueCombinations = (() => {
    if (type === "estimate") {
      return [
        { label: "見積書 ＋ 発注書", onClick: handleIssueEstimateAndPo },
        {
          label: "見積書 ＋ 発注書 ＋ 発注請書",
          onClick: handleIssueEstimatePoAndAck,
        },
      ];
    }
    if (type === "purchase-order") {
      return [
        {
          label: "発注書 ＋ 発注請書",
          onClick: () =>
            handleIssueWithPreset(
              "purchase-order-ack",
              "発注書と発注請書を発行しました"
            ),
        },
      ];
    }
    if (type === "delivery") {
      return [
        {
          label: "納品書 ＋ 検収書",
          onClick: () =>
            handleIssueWithPreset(
              "delivery-ack",
              "納品書と検収書を発行しました"
            ),
        },
      ];
    }
    return [];
  })();

  const handleSave = async (status: "draft" | "issued" = draft.status) => {
    if (isOnBranch && currentBranchId) {
      updateBranch(currentBranchId, {
        items: draft.items,
        notes: draft.notes,
        subject: draft.subject,
        primaryDate: draft.primaryDate,
        secondaryDate: draft.secondaryDate,
      });
      toast.success(`ブランチ「${currentBranch?.name}」を保存しました`);
      return;
    }
    await save({ ...draft, status });
    toast.success(status === "issued" ? "発行しました" : "保存しました");
  };

  const handleSwitchBranch = (branchId: string | null) => {
    setCurrentBranchId(branchId);
  };

  const handleCreateBranch = (name: string) => {
    const created = createBranch(name);
    setCurrentBranchId(created.id);
    toast.success(`ブランチ「${name}」を作成しました`);
  };

  const handlePromoteToMain = async () => {
    if (!currentBranch) return;
    await save({
      ...draft,
      items: draft.items.map((it) => ({ ...it })),
    });
    toast.success(
      `ブランチ「${currentBranch.name}」の内容をメインに反映しました`
    );
    setCurrentBranchId(null);
  };

  const handleDeleteCurrentBranch = () => {
    if (!currentBranchId || !currentBranch) return;
    const name = currentBranch.name;
    setCurrentBranchId(null);
    removeBranch(currentBranchId);
    toast.success(`ブランチ「${name}」を削除しました`);
  };

  const handleSavePropagate = async () => {
    await save({ ...draft, status: draft.status });
    const others: DocumentType[] = (
      [
        "estimate",
        "purchase-order",
        "delivery",
        "invoice",
        "receipt",
        "cover-letter",
      ] as DocumentType[]
    ).filter((t) => t !== type);
    let okCount = 0;
    for (const t of others) {
      const ok = await copyItemsBetweenDocuments(project.id, type, project.id, t);
      if (ok) okCount += 1;
    }
    toast.success(`保存しました（他${okCount}件の書類にも明細を反映）`);
  };

  const handleCopyFromEstimate = async () => {
    await save({ ...draft });
    const ok = await copyItemsBetweenDocuments(
      project.id,
      "estimate",
      project.id,
      type
    );
    if (ok) {
      toast.success("見積書から明細・備考をコピーしました");
    } else {
      toast.error(
        "見積書に明細がありません。先に見積書タブで明細を保存してください。"
      );
    }
  };

  const sortedItems = [...draft.items].sort((a, b) => a.sortOrder - b.sortOrder);
  const hasMixedTax = TAX_RATES.some(
    (r) => r !== 10 && totals.byRate[r].subtotal > 0
  );

  return (
    <div className="px-8 py-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
        {/* Basic info card */}
        <BasicInfoCard
          draft={draft}
          project={project}
          client={client}
          dateConfig={dateConfig}
          docTypeLabel={titleLabel}
          onChange={updateField}
        />

        {/* Content card */}
        <section className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <header className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
                  <FileText className="size-4" />
                </span>
                <h2 className="text-base font-bold">{titleLabel}内容</h2>
              </div>
              {type !== "estimate" && (
                <button
                  type="button"
                  onClick={handleCopyFromEstimate}
                  className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
                >
                  <Copy className="size-4" />
                  見積からコピー
                </button>
              )}
            </header>

            {/* Template */}
            <div className="mb-3 flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
              <span className="w-28 shrink-0 text-xs font-semibold text-foreground">
                {titleLabel}テンプレート
              </span>
              <div className="flex flex-1 items-center gap-2">
                <TemplateField
                  docType={type}
                  currentItems={draft.items}
                  currentNotes={draft.notes}
                  onApply={(items) =>
                    setDraft((d) =>
                      d
                        ? { ...d, items: items.map((it) => ({ ...it })) }
                        : d
                    )
                  }
                />
              </div>
            </div>

            {/* Items table */}
            <div className="overflow-hidden rounded-xl border border-border/60">
              <div className="grid grid-cols-[64px_1fr_64px_64px_100px_100px_28px_28px_28px] items-center gap-2 border-b border-border/60 bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground">
                <span />
                <span>品目・サービス内容</span>
                <span className="text-right">数量</span>
                <span className="text-right">税率</span>
                <span className="text-right">単価</span>
                <span className="text-right">金額</span>
                <span />
                <span />
                <span />
              </div>

              {sortedItems.length === 0 ? (
                <div className="border-b border-border/60 px-4 py-10 text-center text-sm text-muted-foreground">
                  明細がありません。「行を追加」から開始してください。
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={onDragEnd}
                >
                  <SortableContext
                    items={sortedItems.map((i) => i.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {sortedItems.map((item, idx) => {
                      // Compute subtotal for "subtotal" row: sum of normal rows
                      // above this row, down to the previous subtotal row
                      let runningSubtotal = 0;
                      if (item.rowType === "subtotal") {
                        for (let i = idx - 1; i >= 0; i--) {
                          const it = sortedItems[i];
                          if (it.rowType === "subtotal") break;
                          if (it.rowType === "normal") {
                            runningSubtotal += calculateAmount(it);
                          }
                        }
                      }
                      return (
                        <SortableItemRow
                          key={item.id}
                          item={item}
                          subtotalAmount={runningSubtotal}
                          onChange={(patch) => updateItem(item.id, patch)}
                          onRemove={() => removeItem(item.id)}
                          onInsertAfter={() => insertItemAfter(item.id)}
                          unitPriceZeroPlaceholder={
                            type === "estimate" ? "000" : undefined
                          }
                        />
                      );
                    })}
                  </SortableContext>
                </DndContext>
              )}

              <button
                type="button"
                onClick={addItem}
                className="flex w-full items-center justify-center gap-1.5 border-t border-dashed border-border/60 bg-muted/20 py-3 text-sm font-medium text-primary hover:bg-primary-soft/40"
              >
                <Plus className="size-4" />
                行を追加
              </button>
            </div>

            {/* Totals */}
            <div className="mt-5 flex justify-end">
              <div className="w-72 rounded-xl bg-muted/40 p-4 text-sm">
                <div className="flex justify-between py-1 text-muted-foreground">
                  <span>小計</span>
                  <span className="font-medium text-foreground tabular-nums">
                    {yen(totals.subtotal)} 円
                  </span>
                </div>
                {hasMixedTax ? (
                  TAX_RATES.map((rate) => {
                    const v = totals.byRate[rate];
                    if (v.subtotal === 0) return null;
                    return (
                      <div
                        key={rate}
                        className="flex justify-between py-1 text-muted-foreground"
                      >
                        <span>消費税（{rate}%）</span>
                        <span className="font-medium text-foreground tabular-nums">
                          {yen(v.tax)} 円
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex justify-between py-1 text-muted-foreground">
                    <span>消費税（10%）</span>
                    <span className="font-medium text-foreground tabular-nums">
                      {yen(totals.tax)} 円
                    </span>
                  </div>
                )}
                <div className="mt-2 flex items-baseline justify-between border-t border-border pt-3">
                  <span className="text-sm font-semibold text-foreground">
                    合計（税込）
                  </span>
                  <span className="text-2xl font-bold text-primary tabular-nums">
                    {yen(totals.total)} 円
                  </span>
                </div>
              </div>
            </div>

            {/* Notes (within the same card, below totals) */}
            <div className="mt-6 border-t border-border/60 pt-5">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
                  <Lightbulb className="size-4" />
                </span>
                <h3 className="text-sm font-bold text-foreground">備考</h3>
              </div>
              <textarea
                value={draft.notes ?? ""}
                onChange={(e) => updateField("notes", e.target.value)}
                placeholder="お支払い条件、納期、その他条件などがあれば入力してください"
                rows={3}
                className="block w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-soft"
              />
            </div>
          </div>

          {/* Branch indicator */}
          {isOnBranch && currentBranch && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm">
              <GitBranch className="size-4 text-amber-700" />
              <span className="font-semibold text-amber-900">
                ブランチ「{currentBranch.name}」を編集中
              </span>
              <span className="text-xs text-amber-700">
                — 保存はこのブランチに対して行われます
              </span>
            </div>
          )}

          {/* Action bar */}
          <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
            <SaveSplitButton
              docTypeLabel={
                isOnBranch
                  ? `ブランチ「${currentBranch?.name}」`
                  : DOCUMENT_TYPE_LABELS[type]
              }
              onSaveSelf={() => handleSave("draft")}
              onSavePropagate={handleSavePropagate}
              hidePropagate={isOnBranch}
            />
            {type === "estimate" && (
              <BranchMenu
                branches={branches}
                currentBranchId={currentBranchId}
                onSwitch={handleSwitchBranch}
                onCreate={handleCreateBranch}
                onPromoteToMain={handlePromoteToMain}
                onDeleteCurrent={handleDeleteCurrentBranch}
              />
            )}
            {!isOnBranch && (
              <IssueSplitButton
                docTypeLabel={DOCUMENT_TYPE_LABELS[type]}
                onIssueSelf={handleIssueAndPrintSelf}
                combinations={issueCombinations}
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ========== Basic info card ========== */

function BasicInfoCard({
  draft,
  project,
  client,
  dateConfig,
  docTypeLabel,
  onChange,
}: {
  draft: Document;
  project: Project;
  client?: Client;
  dateConfig: { primary: { label: string; required?: boolean }; secondary?: { label: string } };
  docTypeLabel: string;
  onChange: <K extends keyof Document>(key: K, value: Document[K]) => void;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <header className="mb-5 flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
          <FileText className="size-4" />
        </span>
        <h2 className="text-base font-bold">基本情報</h2>
      </header>

      <div className="space-y-4">
        <Field label="顧客" required>
          <ReadOnlyValue value={client ? `${client.name}${client.honorific ? ` ${client.honorific}` : ""}` : "（顧客未設定）"} />
        </Field>

        <Field label="案件名" required>
          <TextInput
            value={draft.subject}
            placeholder={project.name}
            onChange={(v) => onChange("subject", v)}
          />
        </Field>

        <Field label={dateConfig.primary.label} required={dateConfig.primary.required}>
          <DateInput
            value={draft.primaryDate ?? ""}
            onChange={(v) => onChange("primaryDate", v)}
          />
        </Field>

        {dateConfig.secondary && (
          <Field label={dateConfig.secondary.label}>
            <DateInput
              value={draft.secondaryDate ?? ""}
              onChange={(v) => onChange("secondaryDate", v)}
            />
          </Field>
        )}

        <Field label={`${docTypeLabel.replace(/^御/, "")}番号`} required>
          <ReadOnlyValue value={draft.documentNumber} />
        </Field>
      </div>
    </section>
  );
}

function TemplateField({
  docType,
  currentItems,
  currentNotes,
  onApply,
}: {
  docType: DocumentType;
  currentItems: DocumentItem[];
  currentNotes?: string;
  onApply: (items: DocumentItem[]) => void;
}) {
  const { templates, create } = useDocumentTemplates(docType);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");

  const handleSelect = (id: string | null) => {
    if (!id) return;
    const tpl = templates.find((t) => t.id === id);
    if (!tpl) return;
    onApply(tpl.items);
    setSelectedId(id);
  };

  const openModal = () => {
    setName("");
    setError(null);
    setOpen(true);
  };

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("テンプレート名は必須です");
      return;
    }
    create({ name: trimmed, items: currentItems, notes: currentNotes });
    setOpen(false);
  };

  return (
    <div>
      <div className="flex items-stretch gap-2">
        <div className="flex-1">
          <Select value={selectedId} onValueChange={handleSelect}>
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder="テンプレートから選択..." />
            </SelectTrigger>
            <SelectContent>
              {templates.length === 0 ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  テンプレートがありません
                </div>
              ) : (
                templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        <button
          type="button"
          onClick={openModal}
          aria-label="現在の見積をテンプレートに追加"
          title="現在の見積をテンプレートに追加"
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-muted"
        >
          <Plus className="size-4" />
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>テンプレートに追加</DialogTitle>
            <DialogDescription>
              現在の明細をテンプレートとして保存します。次回からこの内容を呼び出せます。
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="mb-1.5 block text-xs font-semibold text-foreground">
              テンプレート名
              <span className="ml-0.5 text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (e.target.value.trim()) setError(null);
              }}
              placeholder="例: Web制作（標準パッケージ）"
              autoFocus
              className="block w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-soft"
            />
            {error && (
              <p className="mt-1.5 text-xs text-destructive">{error}</p>
            )}
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-9 items-center rounded-lg border border-border bg-card px-4 text-sm font-medium hover:bg-muted"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={submit}
              className="flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              保存
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BranchMenu({
  branches,
  currentBranchId,
  onSwitch,
  onCreate,
  onPromoteToMain,
  onDeleteCurrent,
}: {
  branches: EstimateBranch[];
  currentBranchId: string | null;
  onSwitch: (id: string | null) => void;
  onCreate: (name: string) => void;
  onPromoteToMain: () => void;
  onDeleteCurrent: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmPromote, setConfirmPromote] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const current = currentBranchId
    ? branches.find((b) => b.id === currentBranchId)
    : null;
  const buttonLabel = current ? `ブランチ: ${current.name}` : "メイン";

  const openCreate = () => {
    setName("");
    setError(null);
    setMenuOpen(false);
    setCreateOpen(true);
  };

  const submitCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("ブランチ名は必須です");
      return;
    }
    if (branches.some((b) => b.name === trimmed)) {
      setError("同じ名前のブランチが既に存在します");
      return;
    }
    onCreate(trimmed);
    setCreateOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        onBlur={() => setTimeout(() => setMenuOpen(false), 120)}
        className={cn(
          "flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-medium",
          current
            ? "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
            : "border-border bg-card text-foreground hover:bg-muted"
        )}
      >
        <GitBranch className="size-4" />
        {buttonLabel}
        <ChevronDown className="size-4" />
      </button>

      {menuOpen && (
        <div className="absolute right-0 bottom-full z-20 mb-2 w-72 overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
          <div className="border-b border-border bg-muted/40 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            編集対象
          </div>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setMenuOpen(false);
              onSwitch(null);
            }}
            className={cn(
              "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted",
              !current ? "font-semibold text-primary" : "text-foreground"
            )}
          >
            <span className="w-4">{!current ? "✓" : ""}</span>
            メイン
          </button>
          {branches.map((b) => (
            <button
              key={b.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setMenuOpen(false);
                onSwitch(b.id);
              }}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted",
                currentBranchId === b.id
                  ? "font-semibold text-primary"
                  : "text-foreground"
              )}
            >
              <span className="w-4">
                {currentBranchId === b.id ? "✓" : ""}
              </span>
              <span className="truncate">{b.name}</span>
            </button>
          ))}

          <div className="border-t border-border" />
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              openCreate();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-primary hover:bg-muted"
          >
            <Plus className="size-4" />
            新規ブランチを作成
          </button>

          {current && (
            <>
              <div className="border-t border-border" />
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setMenuOpen(false);
                  setConfirmPromote(true);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
              >
                <ArrowUp className="size-4" />
                このブランチをメインに反映
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setMenuOpen(false);
                  setConfirmDelete(true);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="size-4" />
                このブランチを削除
              </button>
            </>
          )}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>新規ブランチを作成</DialogTitle>
            <DialogDescription>
              空のブランチを作成して、別パターンの見積を編集できる状態に切替えます。
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="mb-1.5 block text-xs font-semibold text-foreground">
              ブランチ名
              <span className="ml-0.5 text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (e.target.value.trim()) setError(null);
              }}
              placeholder="例: プランA / 予算重視版 / 提案用"
              autoFocus
              className="block w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-soft"
            />
            {error && (
              <p className="mt-1.5 text-xs text-destructive">{error}</p>
            )}
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="flex h-9 items-center rounded-lg border border-border bg-card px-4 text-sm font-medium hover:bg-muted"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={submitCreate}
              className="flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              作成して切替え
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm promote */}
      <Dialog
        open={confirmPromote}
        onOpenChange={(o) => !o && setConfirmPromote(false)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>メインに反映</DialogTitle>
            <DialogDescription>
              現在のブランチ「{current?.name}」の内容を **メイン見積に反映** します。
              <br />
              既存のメイン見積は上書きされます。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setConfirmPromote(false)}
              className="flex h-9 items-center rounded-lg border border-border bg-card px-4 text-sm font-medium hover:bg-muted"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={() => {
                onPromoteToMain();
                setConfirmPromote(false);
              }}
              className="flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              メインに反映
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <Dialog
        open={confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(false)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>ブランチを削除</DialogTitle>
            <DialogDescription>
              ブランチ「{current?.name}」を削除します。この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="flex h-9 items-center rounded-lg border border-border bg-card px-4 text-sm font-medium hover:bg-muted"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={() => {
                onDeleteCurrent();
                setConfirmDelete(false);
              }}
              className="flex h-9 items-center rounded-lg bg-destructive px-4 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90"
            >
              削除
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      {children}
    </div>
  );
}

function TextInput({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="block w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-soft"
    />
  );
}

function ReadOnlyValue({ value }: { value: string }) {
  return (
    <div className="block w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground">
      {value}
    </div>
  );
}

function DateInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <Calendar className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full rounded-lg border border-border bg-card py-2 pr-3 pl-9 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-soft"
      />
    </div>
  );
}

/* ========== Item row ========== */

const ROW_GRID =
  "grid grid-cols-[64px_1fr_64px_64px_100px_100px_28px_28px_28px] items-center gap-2 px-3 py-2";

const ROW_TYPE_LABELS: Record<RowType, string> = {
  normal: "通常",
  heading: "見出し行",
  subtotal: "小計行",
};

function SaveSplitButton({
  docTypeLabel,
  onSaveSelf,
  onSavePropagate,
  hidePropagate,
}: {
  docTypeLabel: string;
  onSaveSelf: () => void;
  onSavePropagate: () => void;
  hidePropagate?: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (hidePropagate) {
    return (
      <button
        type="button"
        onClick={onSaveSelf}
        className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
      >
        <Cloud className="size-4" />
        保存
      </button>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-stretch overflow-hidden rounded-xl border border-border bg-card">
        <button
          type="button"
          onClick={onSaveSelf}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          <Cloud className="size-4" />
          保存
        </button>
        <span aria-hidden className="w-px bg-border" />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          aria-label="その他の保存オプション"
          className="flex items-center justify-center px-2 text-foreground hover:bg-muted"
        >
          <ChevronDown className="size-4" />
        </button>
      </div>
      {open && (
        <div className="absolute right-0 bottom-full z-20 mb-2 w-64 overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
          <div className="border-b border-border bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground">
            保存オプション
          </div>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onSaveSelf();
              setOpen(false);
            }}
            className="block w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
          >
            {docTypeLabel}単体で保存
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onSavePropagate();
              setOpen(false);
            }}
            className="block w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
          >
            他の書類にも反映
          </button>
        </div>
      )}
    </div>
  );
}

function IssueSplitButton({
  docTypeLabel,
  onIssueSelf,
  combinations,
}: {
  docTypeLabel: string;
  onIssueSelf: () => void;
  combinations: { label: string; onClick: () => void }[];
}) {
  const [open, setOpen] = useState(false);
  const hasCombos = combinations.length > 0;

  return (
    <div className="relative">
      <div className="flex items-stretch overflow-hidden rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 shadow-sm shadow-violet-200">
        <button
          type="button"
          onClick={onIssueSelf}
          className="px-5 py-2 text-sm font-semibold text-white hover:from-violet-600 hover:to-indigo-600"
        >
          {docTypeLabel}を発行
        </button>
        {hasCombos && (
          <>
            <span aria-hidden className="w-px bg-white/30" />
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              onBlur={() => setTimeout(() => setOpen(false), 120)}
              aria-label="その他の発行オプション"
              className="flex items-center justify-center px-2 text-white hover:bg-white/10"
            >
              <ChevronDown className="size-4" />
            </button>
          </>
        )}
      </div>
      {hasCombos && open && (
        <div className="absolute right-0 bottom-full z-20 mb-2 w-72 overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
          <div className="border-b border-border bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground">
            まとめて発行
          </div>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onIssueSelf();
              setOpen(false);
            }}
            className="block w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
          >
            {docTypeLabel}
          </button>
          {combinations.map((c) => (
            <button
              key={c.label}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                c.onClick();
                setOpen(false);
              }}
              className="block w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function toHalfWidthNumber(s: string): string {
  return s
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/．/g, ".")
    .replace(/[，､、]/g, "")
    .replace(/[^\d.\-]/g, "");
}

function NumericInput({
  value,
  onChange,
  allowDecimal = false,
  className,
  zeroPlaceholder,
}: {
  value: number;
  onChange: (n: number) => void;
  allowDecimal?: boolean;
  className?: string;
  zeroPlaceholder?: string;
}) {
  const display = (n: number) =>
    n === 0 && zeroPlaceholder ? zeroPlaceholder : String(n);
  const [text, setText] = useState<string>(display(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(display(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, focused, zeroPlaceholder]);

  return (
    <input
      type="text"
      inputMode={allowDecimal ? "decimal" : "numeric"}
      value={text}
      onFocus={(e) => {
        setFocused(true);
        if (value === 0 && zeroPlaceholder) {
          setText("");
          requestAnimationFrame(() => e.target.select());
        }
      }}
      onBlur={() => {
        setFocused(false);
        setText(display(value));
      }}
      onChange={(e) => {
        const normalized = toHalfWidthNumber(e.target.value);
        setText(normalized);
        const n = allowDecimal
          ? parseFloat(normalized)
          : parseInt(normalized, 10);
        if (!Number.isNaN(n)) onChange(n);
        else if (normalized === "" || normalized === "-") onChange(0);
      }}
      className={className}
    />
  );
}

function RowTypeIcon({ type }: { type: RowType }) {
  if (type === "heading") return <Heading2 className="size-4" />;
  if (type === "subtotal") return <Sigma className="size-4" />;
  return <Minus className="size-4" />;
}

function SortableItemRow({
  item,
  subtotalAmount,
  onChange,
  onRemove,
  onInsertAfter,
  unitPriceZeroPlaceholder,
}: {
  item: DocumentItem;
  subtotalAmount: number;
  onChange: (patch: Partial<DocumentItem>) => void;
  onRemove: () => void;
  onInsertAfter: () => void;
  unitPriceZeroPlaceholder?: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const dragHandle = (
    <button
      type="button"
      {...attributes}
      {...listeners}
      className="flex size-7 cursor-grab items-center justify-center rounded text-muted-foreground/50 hover:bg-muted hover:text-foreground active:cursor-grabbing"
      aria-label="並び替え"
    >
      <GripVertical className="size-4" />
    </button>
  );

  const insertBtn = (
    <button
      type="button"
      onClick={onInsertAfter}
      className="flex size-7 items-center justify-center rounded text-muted-foreground/60 hover:bg-primary-soft hover:text-primary"
      aria-label="この行の下に追加"
      title="この行の下に追加"
    >
      <Plus className="size-4" />
    </button>
  );

  const removeBtn = (
    <button
      type="button"
      onClick={onRemove}
      className="flex size-7 items-center justify-center rounded text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive"
      aria-label="行を削除"
      title="行を削除"
    >
      <Trash2 className="size-4" />
    </button>
  );

  const typeSelect = (
    <Select
      value={item.rowType}
      onValueChange={(v) => onChange({ rowType: (v ?? "normal") as RowType })}
    >
      <SelectTrigger
        size="sm"
        className="h-8 w-full justify-center border-border bg-transparent px-2 text-muted-foreground"
        aria-label={ROW_TYPE_LABELS[item.rowType]}
        title={ROW_TYPE_LABELS[item.rowType]}
      >
        <RowTypeIcon type={item.rowType} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="normal">
          <Minus className="size-4" />
          <span className="ml-2">通常</span>
        </SelectItem>
        <SelectItem value="heading">
          <Heading2 className="size-4" />
          <span className="ml-2">見出し行</span>
        </SelectItem>
        <SelectItem value="subtotal">
          <Sigma className="size-4" />
          <span className="ml-2">小計行</span>
        </SelectItem>
      </SelectContent>
    </Select>
  );

  const baseClass = cn(
    ROW_GRID,
    "border-b border-border/60 bg-card last:border-b-0",
    isDragging && "bg-primary-soft/30"
  );

  if (item.rowType === "heading") {
    return (
      <div
        ref={setNodeRef}
        style={{ transform: CSS.Transform.toString(transform), transition }}
        className={cn(baseClass, "bg-muted/30")}
      >
        {typeSelect}
        <input
          type="text"
          value={item.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="見出しを入力"
          className="col-span-5 block w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-bold text-foreground placeholder:font-normal placeholder:text-muted-foreground hover:border-border focus:border-primary focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary-soft"
        />
        {dragHandle}
        {insertBtn}
        {removeBtn}
      </div>
    );
  }

  if (item.rowType === "subtotal") {
    return (
      <div
        ref={setNodeRef}
        style={{ transform: CSS.Transform.toString(transform), transition }}
        className={cn(baseClass, "bg-muted/20")}
      >
        {typeSelect}
        <span className="text-sm font-semibold text-foreground">小計</span>
        <span /> <span /> <span />
        <span className="text-right text-sm font-semibold tabular-nums text-foreground">
          {yen(subtotalAmount)}
        </span>
        {dragHandle}
        {insertBtn}
        {removeBtn}
      </div>
    );
  }

  const amount = calculateAmount(item);
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={baseClass}
    >
      {typeSelect}
      <input
        type="text"
        value={item.name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder="品目・サービス内容"
        className="block w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-foreground placeholder:text-muted-foreground hover:border-border focus:border-primary focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary-soft"
      />
      <NumericInput
        allowDecimal
        value={item.quantity}
        onChange={(n) => onChange({ quantity: n })}
        className="block w-full rounded-md border border-transparent bg-transparent px-1.5 py-1 text-right text-sm tabular-nums text-foreground hover:border-border focus:border-primary focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary-soft"
      />
      <Select
        value={String(item.taxRate)}
        onValueChange={(v) => onChange({ taxRate: Number(v) as TaxRate })}
      >
        <SelectTrigger size="sm" className="h-8 w-full border-border bg-transparent px-2 text-xs text-muted-foreground">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="10">10%</SelectItem>
          <SelectItem value="8">8%</SelectItem>
          <SelectItem value="0">0%</SelectItem>
        </SelectContent>
      </Select>
      <NumericInput
        value={item.unitPrice}
        onChange={(n) => onChange({ unitPrice: n })}
        zeroPlaceholder={unitPriceZeroPlaceholder}
        className="block w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-right text-sm tabular-nums text-foreground hover:border-border focus:border-primary focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary-soft"
      />
      <div className="text-right text-sm font-semibold tabular-nums text-foreground">
        {yen(amount)}
      </div>
      {dragHandle}
      {insertBtn}
      {removeBtn}
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  ClipboardList,
  Calendar,
  Wallet,
  StickyNote,
  ArrowRight,
  FileText,
  AlertTriangle,
  Plus,
  X,
} from "lucide-react";

import {
  type Project,
  type ProjectInput,
  type Client,
  ORDER_STATUS_LABELS,
  PROGRESS_LABELS,
  INVOICE_TIMING_LABELS,
  PAYMENT_METHOD_LABELS,
  ROUNDING_LABELS,
  RECURRING_INTERVAL_LABELS,
  type OrderStatus,
  type Progress,
  type InvoiceTiming,
  type PaymentMethod,
  type Rounding,
  type RecurringInterval,
} from "@/lib/types";
import { useProjects } from "@/lib/projects-store";
import { useClients } from "@/lib/clients-store";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function endOfMonthFromOffset(offset: number): string {
  const d = new Date();
  // last day of (current month + offset)
  const target = new Date(d.getFullYear(), d.getMonth() + offset + 1, 0);
  const yyyy = target.getFullYear();
  const mm = String(target.getMonth() + 1).padStart(2, "0");
  const dd = String(target.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const formSchema = z.object({
  clientId: z.string().min(1, "顧客を選択してください"),
  name: z.string().min(1, "案件名は必須です"),
  orderStatus: z.enum(["estimating", "ordered", "lost"]),
  invoiceTiming: z.enum(["single", "recurring", "split"]),
  invoiceDate: z.string().optional(),
  splitInvoiceDates: z.array(z.string()).optional(),
  recurringInterval: z
    .enum(["weekly", "monthly", "bimonthly", "quarterly", "yearly"])
    .optional(),
  recurringNotify: z.boolean().optional(),
  recurringAutoRenew: z.boolean().optional(),
  deliveryDate: z.string().optional(),
  syncDeliveryDate: z.boolean().optional(),
  paymentTerms: z.string().optional(),
  paymentMethod: z.enum([
    "bank_transfer",
    "direct_debit",
    "credit_card",
    "cash",
    "cod",
    "convenience_store",
    "postal_transfer",
  ]),
  progress: z.enum(["not_started", "in_progress", "delivered", "accepted"]),
  rounding: z.enum(["round", "floor", "ceil"]),
  internalMemo: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const PAYMENT_TERMS_OPTIONS = [
  "翌月末払",
  "翌々月末払",
  "翌々10日払",
  "翌々15日払",
  "定期",
  "20日締 翌々10日払",
  "翌月25日払",
  "月末締めの95日払い",
  "各月分毎に請求、翌月末払",
  "当月末払い",
];

function projectToValues(p: Project): FormValues {
  return {
    clientId: p.clientId,
    name: p.name,
    orderStatus: p.orderStatus,
    invoiceTiming: p.invoiceTiming,
    invoiceDate: p.invoiceDate ?? "",
    splitInvoiceDates: p.splitInvoiceDates ?? [""],
    recurringInterval: p.recurringInterval ?? "monthly",
    recurringNotify: p.recurringNotify ?? true,
    recurringAutoRenew: p.recurringAutoRenew ?? true,
    deliveryDate: p.deliveryDate ?? "",
    syncDeliveryDate: p.syncDeliveryDate ?? false,
    paymentTerms: p.paymentTerms ?? "",
    paymentMethod: p.paymentMethod,
    progress: p.progress,
    rounding: p.rounding,
    internalMemo: p.internalMemo ?? "",
  };
}

function valuesToInput(v: FormValues): ProjectInput {
  const isRecurring = v.invoiceTiming === "recurring";
  const isSplit = v.invoiceTiming === "split";
  return {
    clientId: v.clientId,
    name: v.name,
    orderStatus: v.orderStatus,
    invoiceTiming: v.invoiceTiming,
    invoiceDate: !isSplit && !isRecurring ? v.invoiceDate || undefined : undefined,
    splitInvoiceDates: isSplit
      ? (v.splitInvoiceDates ?? []).filter((d): d is string => Boolean(d))
      : undefined,
    recurringInterval: isRecurring ? v.recurringInterval : undefined,
    recurringNotify: isRecurring ? v.recurringNotify ?? true : undefined,
    recurringAutoRenew: isRecurring ? v.recurringAutoRenew ?? true : undefined,
    deliveryDate: v.deliveryDate || undefined,
    syncDeliveryDate: v.syncDeliveryDate ?? false,
    paymentTerms: v.paymentTerms || undefined,
    paymentMethod: v.paymentMethod,
    progress: v.progress,
    rounding: v.rounding,
    internalMemo: v.internalMemo || undefined,
  };
}

export function ProjectForm({ project }: { project?: Project }) {
  const router = useRouter();
  const { create, update } = useProjects();
  const { clients } = useClients();

  const activeClients = clients.filter((c) => !c.isArchived);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: project
      ? projectToValues(project)
      : {
          clientId: "",
          name: "",
          orderStatus: "estimating",
          invoiceTiming: "single",
          invoiceDate: "",
          splitInvoiceDates: [""],
          recurringInterval: "monthly",
          recurringNotify: true,
          recurringAutoRenew: true,
          deliveryDate: "",
          syncDeliveryDate: false,
          paymentTerms: "翌月末払",
          paymentMethod: "bank_transfer",
          progress: "not_started",
          rounding: "floor",
        },
  });

  const invoiceDateValue = watch("invoiceDate");
  const invoiceTimingValue = watch("invoiceTiming");
  const splitDatesValue = watch("splitInvoiceDates") ?? [];

  const submit = (v: FormValues, then: "list" | "documents") => {
    const input = valuesToInput(v);
    let id: string;
    if (project) {
      update(project.id, input);
      id = project.id;
      toast.success("更新しました");
    } else {
      const created = create(input);
      id = created.id;
      toast.success("登録しました");
    }
    if (then === "documents") {
      router.push(`/projects/${id}/documents/estimate`);
    } else {
      router.push("/projects");
    }
  };

  const onSubmit = (v: FormValues) => submit(v, "list");
  const onSubmitToDocuments = (v: FormValues) => submit(v, "documents");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft">
        <FormSection icon={ClipboardList} title="基本情報">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="顧客" required error={errors.clientId?.message}>
              <Controller
                control={control}
                name="clientId"
                render={({ field }) =>
                  project ? (
                    <ClientLockedField
                      value={field.value}
                      activeClients={activeClients}
                      originalClientId={project.clientId}
                      onChange={field.onChange}
                    />
                  ) : (
                    <ClientSelectField
                      value={field.value}
                      activeClients={activeClients}
                      onChange={field.onChange}
                    />
                  )
                }
              />
            </Field>
            <Field label="案件名" required error={errors.name?.message} className="md:col-span-2">
              <Input
                {...register("name")}
                placeholder="例: コーポレートサイトリニューアル"
                className="h-10"
              />
            </Field>
          </div>
        </FormSection>

        <FormSection icon={ClipboardList} title="ステータス・進捗">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="受注ステータス">
              <Controller
                control={control}
                name="orderStatus"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    items={ORDER_STATUS_LABELS}
                  >
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((s) => (
                        <SelectItem key={s} value={s}>
                          {ORDER_STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="進捗状況">
              <Controller
                control={control}
                name="progress"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    items={PROGRESS_LABELS}
                  >
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(PROGRESS_LABELS) as Progress[]).map((s) => (
                        <SelectItem key={s} value={s}>
                          {PROGRESS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </div>
        </FormSection>

        <FormSection icon={Calendar} title="請求・納期">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="請求タイミング" className="md:col-span-2">
              <Controller
                control={control}
                name="invoiceTiming"
                render={({ field }) => (
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="flex h-10 items-center gap-6"
                  >
                    {(Object.keys(INVOICE_TIMING_LABELS) as InvoiceTiming[]).map((s) => (
                      <label key={s} className="flex items-center gap-2 text-sm">
                        <RadioGroupItem value={s} /> {INVOICE_TIMING_LABELS[s]}
                      </label>
                    ))}
                  </RadioGroup>
                )}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                FAQ：
                <a
                  href="#"
                  className="text-primary hover:underline"
                >
                  一括請求・定期請求・分割請求の使い分け
                </a>
              </p>
            </Field>
            {invoiceTimingValue === "single" && (
              <Field label="請求(予定)日">
                <DateInputWithQuick
                  registerProps={register("invoiceDate")}
                  onQuickSet={(d) =>
                    setValue("invoiceDate", d, { shouldDirty: true })
                  }
                  showDocLink={!!project}
                  docLinkHref={
                    project
                      ? `/projects/${project.id}/documents/estimate`
                      : undefined
                  }
                />
              </Field>
            )}

            {invoiceTimingValue === "split" && (
              <Field label="請求(予定)日" className="md:col-span-2">
                <div className="space-y-3">
                  {splitDatesValue.map((_, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <div className="flex-1">
                        <DateInputWithQuick
                          registerProps={register(`splitInvoiceDates.${idx}`)}
                          onQuickSet={(d) =>
                            setValue(`splitInvoiceDates.${idx}`, d, {
                              shouldDirty: true,
                            })
                          }
                          showDocLink={!!project}
                          docLinkHref={
                            project
                              ? `/projects/${project.id}/documents/estimate`
                              : undefined
                          }
                        />
                      </div>
                      {splitDatesValue.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const next = splitDatesValue.filter(
                              (_, i) => i !== idx
                            );
                            setValue("splitInvoiceDates", next, {
                              shouldDirty: true,
                            });
                          }}
                          className="mt-1 flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"
                          aria-label="削除"
                        >
                          <X className="size-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setValue(
                        "splitInvoiceDates",
                        [...splitDatesValue, ""],
                        { shouldDirty: true }
                      )
                    }
                    className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <Plus className="size-3.5" />
                    請求日追加
                  </button>
                </div>
              </Field>
            )}

            {invoiceTimingValue === "recurring" && (
              <div className="md:col-span-2">
                <div className="w-full max-w-sm rounded-xl border border-border/60 bg-muted/30 p-4">
                  <h3 className="mb-3 text-sm font-bold">定期請求の設定</h3>
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-3">
                      <Label className="w-28 shrink-0 text-sm text-muted-foreground">
                        請求間隔
                      </Label>
                      <Controller
                        control={control}
                        name="recurringInterval"
                        render={({ field }) => (
                          <Select
                            value={field.value ?? "monthly"}
                            onValueChange={(v) =>
                              field.onChange((v ?? "monthly") as RecurringInterval)
                            }
                            items={RECURRING_INTERVAL_LABELS}
                          >
                            <SelectTrigger className="h-9 w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(
                                Object.keys(
                                  RECURRING_INTERVAL_LABELS
                                ) as RecurringInterval[]
                              ).map((k) => (
                                <SelectItem key={k} value={k}>
                                  {RECURRING_INTERVAL_LABELS[k]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Label className="w-28 shrink-0 text-sm text-muted-foreground">
                        通知対象
                      </Label>
                      <Controller
                        control={control}
                        name="recurringNotify"
                        render={({ field }) => (
                          <Switch
                            checked={field.value ?? true}
                            onCheckedChange={(c) => field.onChange(c === true)}
                          />
                        )}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <Label className="w-28 shrink-0 text-sm text-muted-foreground">
                        自動契約更新
                      </Label>
                      <Controller
                        control={control}
                        name="recurringAutoRenew"
                        render={({ field }) => (
                          <Switch
                            checked={field.value ?? true}
                            onCheckedChange={(c) => field.onChange(c === true)}
                          />
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <Field label="納期">
              <div className="space-y-2">
                <Input type="date" {...register("deliveryDate")} className="h-10" />
                <div className="flex flex-wrap gap-1.5">
                  <QuickBtn
                    onClick={() =>
                      setValue("deliveryDate", endOfMonthFromOffset(0), {
                        shouldDirty: true,
                      })
                    }
                  >
                    今月末
                  </QuickBtn>
                  <QuickBtn
                    onClick={() =>
                      setValue("deliveryDate", endOfMonthFromOffset(1), {
                        shouldDirty: true,
                      })
                    }
                  >
                    来月末
                  </QuickBtn>
                  <QuickBtn
                    onClick={() =>
                      setValue("deliveryDate", endOfMonthFromOffset(2), {
                        shouldDirty: true,
                      })
                    }
                  >
                    再来月末
                  </QuickBtn>
                  <QuickBtn
                    disabled={!invoiceDateValue}
                    onClick={() =>
                      invoiceDateValue &&
                      setValue("deliveryDate", invoiceDateValue, {
                        shouldDirty: true,
                      })
                    }
                  >
                    請求日
                  </QuickBtn>
                </div>
                <Controller
                  control={control}
                  name="syncDeliveryDate"
                  render={({ field }) => (
                    <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                      <Checkbox
                        checked={field.value ?? false}
                        onCheckedChange={(c) => field.onChange(c === true)}
                      />
                      納期の日付を納品日にも反映
                    </label>
                  )}
                />
              </div>
            </Field>
          </div>
        </FormSection>

        <FormSection icon={Wallet} title="支払・端数処理">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="支払条件">
              <Controller
                control={control}
                name="paymentTerms"
                render={({ field }) => {
                  const items = Object.fromEntries(
                    PAYMENT_TERMS_OPTIONS.map((o) => [o, o])
                  );
                  items["__none__"] = "未選択";
                  return (
                    <Select
                      value={field.value ?? ""}
                      onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}
                      items={items}
                    >
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue placeholder="選択..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">未選択</SelectItem>
                        {PAYMENT_TERMS_OPTIONS.map((o) => (
                          <SelectItem key={o} value={o}>
                            {o}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  );
                }}
              />
            </Field>
            <Field label="支払方法">
              <Controller
                control={control}
                name="paymentMethod"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    items={PAYMENT_METHOD_LABELS}
                  >
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((s) => (
                        <SelectItem key={s} value={s}>
                          {PAYMENT_METHOD_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="端数処理" className="md:col-span-2">
              <Controller
                control={control}
                name="rounding"
                render={({ field }) => (
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="flex h-10 items-center gap-6"
                  >
                    {(Object.keys(ROUNDING_LABELS) as Rounding[]).map((s) => (
                      <label key={s} className="flex items-center gap-2 text-sm">
                        <RadioGroupItem value={s} /> {ROUNDING_LABELS[s]}
                      </label>
                    ))}
                  </RadioGroup>
                )}
              />
            </Field>
          </div>
        </FormSection>

        <FormSection icon={StickyNote} title="社内メモ">
          <Field label="メモ">
            <Textarea {...register("internalMemo")} rows={4} placeholder="メモを入力してください" />
          </Field>
        </FormSection>
      </div>

      <div className="flex flex-wrap items-center justify-start gap-2">
        <Button
          type="button"
          disabled={isSubmitting}
          onClick={handleSubmit(onSubmitToDocuments)}
          className="h-10 bg-gradient-to-r from-violet-500 to-indigo-500 px-5 text-sm font-semibold shadow-sm shadow-violet-200 hover:from-violet-600 hover:to-indigo-600"
        >
          {project ? "更新して書類へ" : "登録して書類へ"}
          <ArrowRight className="size-4" />
        </Button>
        <Button
          type="submit"
          variant="outline"
          disabled={isSubmitting}
          className="h-10 px-5 text-sm"
        >
          {project ? "更新" : "登録"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          className="h-10 px-5 text-sm"
        >
          キャンセル
        </Button>
      </div>
    </form>
  );
}

function ClientSelectField({
  value,
  activeClients,
  onChange,
}: {
  value: string;
  activeClients: Client[];
  onChange: (v: string) => void;
}) {
  const items = Object.fromEntries(activeClients.map((c) => [c.id, c.name]));
  return (
    <Select value={value} onValueChange={(v) => onChange(v ?? "")} items={items}>
      <SelectTrigger className="h-10 w-full">
        <SelectValue placeholder="顧客を選択..." />
      </SelectTrigger>
      <SelectContent>
        {activeClients.length === 0 ? (
          <div className="px-3 py-2 text-sm text-muted-foreground">
            顧客が未登録です
          </div>
        ) : (
          activeClients.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}

function ClientLockedField({
  value,
  activeClients,
  originalClientId,
  onChange,
}: {
  value: string;
  activeClients: Client[];
  originalClientId: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string>(value);
  const current = activeClients.find((c) => c.id === value);
  const isChanged = value !== originalClientId;

  const openDialog = () => {
    setPendingId(value);
    setOpen(true);
  };

  const confirm = () => {
    onChange(pendingId);
    setOpen(false);
  };

  return (
    <div>
      <div className="flex items-stretch gap-2">
        <div className="flex-1 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground">
          {current ? current.name : "（顧客が見つかりません）"}
        </div>
        <button
          type="button"
          onClick={openDialog}
          className="shrink-0 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-muted"
        >
          顧客を変更
        </button>
      </div>
      {isChanged && (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-amber-700">
          <AlertTriangle className="size-3.5" />
          未保存の変更があります（「更新」で確定）
        </p>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>顧客を変更</DialogTitle>
            <DialogDescription>
              この案件の紐付け先を別の顧客に変更します。
              <br />
              既に発行済の書類は影響を受けません（発行時点の顧客情報がスナップショット保存されています）。
              <br />
              これから作成する書類は新しい顧客の情報で発行されます。
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              新しい顧客
            </Label>
            <ClientSelectField
              value={pendingId}
              activeClients={activeClients}
              onChange={setPendingId}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              キャンセル
            </Button>
            <Button
              type="button"
              disabled={!pendingId || pendingId === value}
              onClick={confirm}
            >
              この顧客に変更
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FormSection({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-border/60 px-6 py-6 last:border-b-0 md:px-8">
      <header className="mb-5 flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
          <Icon className="size-4" />
        </span>
        <h2 className="text-base font-bold tracking-tight">{title}</h2>
      </header>
      {children}
    </section>
  );
}

function DateInputWithQuick({
  registerProps,
  onQuickSet,
  showDocLink,
  docLinkHref,
}: {
  registerProps: ReturnType<ReturnType<typeof useForm<FormValues>>["register"]>;
  onQuickSet: (date: string) => void;
  showDocLink?: boolean;
  docLinkHref?: string;
}) {
  return (
    <div className="space-y-2">
      <Input type="date" {...registerProps} className="h-10" />
      <div className="flex flex-wrap gap-1.5">
        <QuickBtn onClick={() => onQuickSet(endOfMonthFromOffset(0))}>
          今月末
        </QuickBtn>
        <QuickBtn onClick={() => onQuickSet(endOfMonthFromOffset(1))}>
          来月末
        </QuickBtn>
        <QuickBtn onClick={() => onQuickSet(endOfMonthFromOffset(2))}>
          再来月末
        </QuickBtn>
        {showDocLink && docLinkHref ? (
          <Link
            href={docLinkHref}
            className={buttonVariants({
              variant: "ghost",
              size: "sm",
              className: "h-7 px-2 text-xs text-primary",
            })}
          >
            書類編集
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function QuickBtn({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className="h-7 px-2 text-xs"
    >
      {children}
    </Button>
  );
}

function Field({
  label,
  required,
  error,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

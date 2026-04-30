"use client";

import { useRouter } from "next/navigation";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Building2,
  MapPin,
  Handshake,
  FileBadge,
  StickyNote,
  Plus,
  X,
} from "lucide-react";

import type { Client, ClientInput } from "@/lib/types";
import { useClients } from "@/lib/clients-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const formSchema = z.object({
  name: z.string().min(1, "顧客名は必須です"),
  honorific: z.string().min(1),
  postalCode: z.string().optional(),
  prefecture: z.string().optional(),
  city: z.string().optional(),
  building: z.string().optional(),
  tel: z.string().optional(),
  contacts: z
    .array(
      z.object({
        name: z.string().optional(),
        email: z
          .string()
          .email("メールアドレスの形式が不正です")
          .or(z.literal(""))
          .optional(),
      })
    )
    .optional(),
  defaultPaymentTerms: z.string().optional(),
  feeBearer: z.enum(["client", "self"]),
  sendMethod: z.enum(["mail", "post", "mail_and_post"]),
  clientNumber: z.string().optional(),
  corporateNumber: z.string().optional(),
  invoiceEligibility: z.enum(["unset", "eligible", "not_eligible"]),
  invoiceRegistrationNumber: z.string().optional(),
  notes: z.string().optional(),
  tags: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const PAYMENT_TERMS_OPTIONS = [
  "翌月末払",
  "翌々月末払",
  "月末締め翌月末払",
  "月末締め翌々月末払",
  "都度払い",
];

const PREFECTURES = [
  "北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県",
  "茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県",
  "新潟県","富山県","石川県","福井県","山梨県","長野県",
  "岐阜県","静岡県","愛知県","三重県",
  "滋賀県","京都府","大阪府","兵庫県","奈良県","和歌山県",
  "鳥取県","島根県","岡山県","広島県","山口県",
  "徳島県","香川県","愛媛県","高知県",
  "福岡県","佐賀県","長崎県","熊本県","大分県","宮崎県","鹿児島県","沖縄県",
];

function clientToValues(client: Client): FormValues {
  return {
    name: client.name,
    honorific: client.honorific || "御中",
    postalCode: client.postalCode ?? "",
    prefecture: client.prefecture ?? "",
    city: client.city ?? "",
    building: client.building ?? "",
    tel: client.tel ?? "",
    contacts:
      client.contacts && client.contacts.length > 0
        ? client.contacts.map((c) => ({ name: c.name ?? "", email: c.email ?? "" }))
        : [{ name: "", email: "" }],
    defaultPaymentTerms: client.defaultPaymentTerms ?? "",
    feeBearer: client.feeBearer,
    sendMethod: client.sendMethod,
    clientNumber: client.clientNumber ?? "",
    corporateNumber: client.corporateNumber ?? "",
    invoiceEligibility: client.invoiceEligibility,
    invoiceRegistrationNumber: client.invoiceRegistrationNumber ?? "",
    notes: client.notes ?? "",
    tags: (client.tags ?? []).join(","),
  };
}

function valuesToInput(v: FormValues): ClientInput {
  return {
    name: v.name,
    honorific: v.honorific,
    postalCode: v.postalCode || undefined,
    prefecture: v.prefecture || undefined,
    city: v.city || undefined,
    building: v.building || undefined,
    tel: v.tel || undefined,
    contacts: (v.contacts ?? [])
      .map((c) => ({ name: c.name?.trim() ?? "", email: c.email?.trim() ?? "" }))
      .filter((c) => c.name || c.email),
    defaultPaymentTerms: v.defaultPaymentTerms || undefined,
    feeBearer: v.feeBearer,
    sendMethod: v.sendMethod,
    clientNumber: v.clientNumber || undefined,
    corporateNumber: v.corporateNumber || undefined,
    invoiceEligibility: v.invoiceEligibility,
    invoiceRegistrationNumber: v.invoiceRegistrationNumber || undefined,
    notes: v.notes || undefined,
    tags: (v.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean),
  };
}

export function ClientForm({ client }: { client?: Client }) {
  const router = useRouter();
  const { create, update } = useClients();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: client
      ? clientToValues(client)
      : {
          name: "",
          honorific: "御中",
          contacts: [{ name: "", email: "" }],
          feeBearer: "client",
          sendMethod: "post",
          invoiceEligibility: "unset",
          tags: "",
        },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "contacts",
  });

  const onSubmit = (v: FormValues) => {
    const input = valuesToInput(v);
    if (client) {
      update(client.id, input);
      toast.success("更新しました");
    } else {
      create(input);
      toast.success("登録しました");
    }
    router.push("/clients");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft">
        <FormSection icon={Building2} title="基本情報">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="顧客名" required error={errors.name?.message}>
              <Input
                {...register("name")}
                placeholder="株式会社サンプル"
                className="h-10"
              />
            </Field>
            <Field label="敬称">
              <Controller
                control={control}
                name="honorific"
                render={({ field }) => (
                  <Select
                    value={field.value || "御中"}
                    onValueChange={(v) => field.onChange(v ?? "御中")}
                    items={{ 御中: "御中", 様: "様" }}
                  >
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="御中">御中</SelectItem>
                      <SelectItem value="様">様</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </div>
        </FormSection>

        <FormSection icon={MapPin} title="住所・連絡先">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="郵便番号">
              <Input
                {...register("postalCode")}
                placeholder="100-0001"
                className="h-10"
              />
            </Field>
            <Field label="都道府県">
              <Controller
                control={control}
                name="prefecture"
                render={({ field }) => {
                  const items: Record<string, string> = { __none__: "未選択" };
                  PREFECTURES.forEach((p) => (items[p] = p));
                  return (
                    <Select
                      value={field.value ?? ""}
                      onValueChange={(v) =>
                        field.onChange(v === "__none__" ? "" : v)
                      }
                      items={items}
                    >
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue placeholder="選択..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">未選択</SelectItem>
                        {PREFECTURES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  );
                }}
              />
            </Field>
            <Field label="市区町村・番地" className="md:col-span-2">
              <Input
                {...register("city")}
                placeholder="千代田区千代田1-1"
                className="h-10"
              />
            </Field>
            <Field label="建物名" className="md:col-span-2">
              <Input
                {...register("building")}
                placeholder="サンプルビル 5F"
                className="h-10"
              />
            </Field>
            <Field label="TEL" className="md:col-span-2">
              <Input
                {...register("tel")}
                placeholder="03-1234-5678"
                className="h-10"
              />
            </Field>
          </div>
        </FormSection>

        <FormSection icon={Building2} title="担当者・メールアドレス">
          <div className="space-y-3">
            {fields.map((f, i) => (
              <div key={f.id} className="grid grid-cols-[1fr_2fr_36px] gap-2">
                <Input
                  {...register(`contacts.${i}.name`)}
                  placeholder="担当者名"
                  className="h-10"
                />
                <Input
                  {...register(`contacts.${i}.email`)}
                  placeholder="example@example.com"
                  className="h-10"
                />
                <button
                  type="button"
                  onClick={() => remove(i)}
                  disabled={fields.length === 1}
                  aria-label="削除"
                  className="flex size-10 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive disabled:opacity-30"
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => append({ name: "", email: "" })}
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <Plus className="size-3.5" />
              担当者を追加
            </button>
            {errors.contacts && (
              <p className="mt-1 text-xs text-destructive">
                メールアドレスの形式を確認してください
              </p>
            )}
          </div>
        </FormSection>

        <FormSection icon={Handshake} title="取引設定">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="デフォルト支払条件">
              <Controller
                control={control}
                name="defaultPaymentTerms"
                render={({ field }) => {
                  const items: Record<string, string> = { __none__: "未選択" };
                  PAYMENT_TERMS_OPTIONS.forEach((o) => (items[o] = o));
                  return (
                    <Select
                      value={field.value ?? ""}
                      onValueChange={(v) =>
                        field.onChange(v === "__none__" ? "" : v)
                      }
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
            <Field label="書類送付方法">
              <Controller
                control={control}
                name="sendMethod"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    items={{
                      mail: "メール",
                      post: "郵送",
                      mail_and_post: "メール・郵送",
                    }}
                  >
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mail">メール</SelectItem>
                      <SelectItem value="post">郵送</SelectItem>
                      <SelectItem value="mail_and_post">メール・郵送</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="振込手数料負担" className="md:col-span-2">
              <Controller
                control={control}
                name="feeBearer"
                render={({ field }) => (
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="flex h-10 items-center gap-6"
                  >
                    <label className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value="client" /> 先方負担
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value="self" /> 当方負担
                    </label>
                  </RadioGroup>
                )}
              />
            </Field>
          </div>
        </FormSection>

        <FormSection icon={FileBadge} title="識別情報">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="顧客番号">
              <Input
                {...register("clientNumber")}
                placeholder="任意の管理番号"
                className="h-10"
              />
            </Field>
            <Field label="法人番号">
              <Input
                {...register("corporateNumber")}
                placeholder="13桁"
                className="h-10"
              />
            </Field>
            <Field label="適格請求書発行事業者" className="md:col-span-2">
              <Controller
                control={control}
                name="invoiceEligibility"
                render={({ field }) => (
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="flex h-10 flex-wrap items-center gap-6"
                  >
                    <label className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value="unset" /> 未設定
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value="eligible" /> 該当する
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value="not_eligible" /> 該当しない
                    </label>
                  </RadioGroup>
                )}
              />
            </Field>
            <Field label="登録番号" className="md:col-span-2">
              <Input
                {...register("invoiceRegistrationNumber")}
                placeholder="T1234567890123"
                className="h-10"
              />
            </Field>
          </div>
        </FormSection>

        <FormSection icon={StickyNote} title="その他">
          <div className="grid gap-5">
            <Field label="タグ（カンマ区切り）">
              <Input
                {...register("tags")}
                placeholder="メイン顧客, 重要"
                className="h-10"
              />
            </Field>
            <Field label="備考">
              <Textarea {...register("notes")} rows={4} />
            </Field>
          </div>
        </FormSection>
      </div>

      <div className="flex flex-wrap items-center justify-start gap-2">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-10 bg-gradient-to-r from-violet-500 to-indigo-500 px-5 text-sm font-semibold shadow-sm shadow-violet-200 hover:from-violet-600 hover:to-indigo-600"
        >
          {client ? "更新" : "登録"}
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
      <Label className="mb-1.5 block text-xs font-semibold text-foreground">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

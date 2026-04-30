"use client";

import { useMemo, useState } from "react";
import {
  Briefcase,
  Calendar,
  ChevronDown,
  ChevronRight,
  Cloud,
  Copy,
  Eye,
  FileText,
  Lightbulb,
  MoreVertical,
  Plus,
  Receipt,
  Users,
} from "lucide-react";

type RowType = "normal" | "heading" | "subtotal";
type Item = {
  id: string;
  rowType: RowType;
  title: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
};

const INITIAL_ITEMS: Item[] = [
  {
    id: "1",
    rowType: "normal",
    title: "要件定義",
    description: "ヒアリング、要件定義、サイトマップ作成",
    quantity: 1,
    unitPrice: 150_000,
    taxRate: 10,
  },
  {
    id: "2",
    rowType: "normal",
    title: "デザイン制作",
    description: "トップページ+下層ページデザイン（5P）",
    quantity: 1,
    unitPrice: 300_000,
    taxRate: 10,
  },
  {
    id: "3",
    rowType: "normal",
    title: "コーディング",
    description: "HTML/CSS/JS コーディング（レスポンシブ対応）",
    quantity: 1,
    unitPrice: 400_000,
    taxRate: 10,
  },
  {
    id: "4",
    rowType: "normal",
    title: "CMS実装",
    description: "WordPress 実装・基本設定",
    quantity: 1,
    unitPrice: 150_000,
    taxRate: 10,
  },
  {
    id: "5",
    rowType: "normal",
    title: "テスト・公開",
    description: "動作確認、テスト、公開対応",
    quantity: 1,
    unitPrice: 100_000,
    taxRate: 10,
  },
];

const yen = (n: number) => n.toLocaleString("ja-JP");

export default function DocumentEditorPreview() {
  const [items, setItems] = useState<Item[]>(INITIAL_ITEMS);

  const totals = useMemo(() => {
    const normalRows = items.filter((i) => i.rowType === "normal");
    const subtotal = normalRows.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    const tax = normalRows.reduce(
      (s, i) => s + Math.floor(i.quantity * i.unitPrice * (i.taxRate / 100)),
      0,
    );
    return { subtotal, tax, total: subtotal + tax };
  }, [items]);

  const addRow = () =>
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        rowType: "normal",
        title: "",
        quantity: 1,
        unitPrice: 0,
        taxRate: 10,
      },
    ]);

  const duplicateLast = () =>
    setItems((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      return [...prev, { ...last, id: crypto.randomUUID() }];
    });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-50 text-slate-900">
      <Decorations />
      <Sidebar />
      <div className="ml-60">
        <PageHeader />
        <main className="px-8 py-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
            <BasicInfoCard />
            <ContentCard
              items={items}
              subtotal={totals.subtotal}
              tax={totals.tax}
              total={totals.total}
              onAdd={addRow}
              onDuplicate={duplicateLast}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

/* ========== Decorations ========== */

function Decorations() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute -top-10 left-[35%] h-32 w-32 rounded-full bg-violet-100/60 blur-2xl" />
      <div className="absolute top-20 right-[20%] h-24 w-24 rounded-full bg-amber-100/50 blur-2xl" />
      <div className="absolute top-12 right-1/3 flex gap-2 opacity-40">
        <span className="h-2 w-2 rounded-full bg-violet-300" />
        <span className="h-3 w-3 rounded-full bg-emerald-300" />
        <span className="h-2 w-2 rounded-full bg-amber-300" />
      </div>
      <svg
        className="absolute bottom-0 left-0 h-40 w-40 opacity-60"
        viewBox="0 0 160 160"
        fill="none"
      >
        <path
          d="M30 150 C 30 100, 50 70, 90 60"
          stroke="#10b981"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <ellipse cx="60" cy="105" rx="14" ry="6" fill="#a7f3d0" transform="rotate(-30 60 105)" />
        <ellipse cx="80" cy="80" rx="14" ry="6" fill="#6ee7b7" transform="rotate(-50 80 80)" />
        <ellipse cx="95" cy="60" rx="12" ry="5" fill="#a7f3d0" transform="rotate(-70 95 60)" />
      </svg>
      <div className="absolute right-8 bottom-6 opacity-50">
        <Receipt className="h-12 w-12 text-violet-300" strokeWidth={1.4} />
      </div>
    </div>
  );
}

/* ========== Sidebar ========== */

function Sidebar() {
  const items = [
    { icon: Users, label: "顧客管理", active: false },
    { icon: Briefcase, label: "案件管理", active: false },
    { icon: FileText, label: "見積管理", active: true },
    { icon: FileText, label: "請求管理", active: false },
    { icon: FileText, label: "納品管理", active: false },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-10 w-60 border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 shadow-sm">
          <Cloud className="h-4 w-4 text-white" strokeWidth={2.5} />
        </div>
        <span className="text-sm font-bold tracking-tight">見積クラウド</span>
      </div>
      <nav className="px-3 py-2">
        {items.map((it) => (
          <button
            key={it.label}
            className={[
              "relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors",
              it.active
                ? "bg-emerald-50 text-emerald-900"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
            ].join(" ")}
          >
            {it.active && (
              <span className="absolute -left-3 h-6 w-1 rounded-r bg-teal-400" aria-hidden />
            )}
            <it.icon
              className={[
                "h-4 w-4 shrink-0",
                it.active ? "text-teal-600" : "text-slate-400",
              ].join(" ")}
            />
            {it.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

/* ========== Page header ========== */

function PageHeader() {
  return (
    <div className="flex items-center justify-between border-b border-slate-200/80 bg-white/60 px-8 py-5 backdrop-blur">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <span>見積管理</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-900">見積作成</span>
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">見積作成</h1>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            下書き
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          <Eye className="h-4 w-4" />
          プレビュー
        </button>
        <button className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          <Cloud className="h-4 w-4" />
          下書き保存
        </button>
        <button className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-violet-200 hover:from-violet-600 hover:to-indigo-600">
          見積書を発行
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ========== Basic info card ========== */

function BasicInfoCard() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mb-5 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
          <FileText className="h-4 w-4" />
        </span>
        <h2 className="text-base font-bold">基本情報</h2>
      </header>

      <div className="space-y-4">
        <Field label="顧客" required>
          <Select value="株式会社サンプル" />
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            〒150-0001 東京都渋谷区神宮前1-1-1
            <br />
            担当：鈴木 一郎 様
            <br />
            03-1234-5678 / suzuki@example.com
          </p>
        </Field>

        <Field label="案件">
          <Select value="Webサイトリニューアル案件" />
          <button className="mt-1.5 flex items-center gap-1 text-xs font-medium text-violet-600 hover:underline">
            <Plus className="h-3 w-3" />
            新規案件を作成
          </button>
        </Field>

        <Field label="見積番号" required>
          <Input value="QT-2025-00023" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="見積日" required>
            <DateInput value="2025/05/23" />
          </Field>
          <Field label="有効期限">
            <DateInput value="2025/06/22" />
          </Field>
        </div>

        <Field label="件名" required>
          <Input value="Webサイトリニューアルのご提案" />
        </Field>

        <Field label="見積書のメモ">
          <textarea
            placeholder="備考や注意事項があれば入力してください"
            className="block h-24 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
          />
        </Field>

        <Field label="テンプレート">
          <Select value="シンプル（左ロゴ・明細あり）" />
          <button className="mt-1.5 text-xs font-medium text-violet-600 hover:underline">
            テンプレートを変更
          </button>
        </Field>
      </div>
    </section>
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
      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function Input({ value }: { value: string }) {
  return (
    <input
      defaultValue={value}
      className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
    />
  );
}

function Select({ value }: { value: string }) {
  return (
    <div className="relative">
      <input
        defaultValue={value}
        className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pr-9 text-sm text-slate-900 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
      />
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

function DateInput({ value }: { value: string }) {
  return (
    <div className="relative">
      <Calendar className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        defaultValue={value}
        className="block w-full rounded-lg border border-slate-200 bg-white py-2 pr-3 pl-9 text-sm text-slate-900 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
      />
    </div>
  );
}

/* ========== Content card ========== */

function ContentCard({
  items,
  subtotal,
  tax,
  total,
  onAdd,
  onDuplicate,
}: {
  items: Item[];
  subtotal: number;
  tax: number;
  total: number;
  onAdd: () => void;
  onDuplicate: () => void;
}) {
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
              <FileText className="h-4 w-4" />
            </span>
            <h2 className="text-base font-bold">見積内容</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onAdd}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              行を追加
            </button>
            <button
              onClick={onDuplicate}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Copy className="h-4 w-4" />
              行を複製
            </button>
          </div>
        </header>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-slate-100">
          <div className="grid grid-cols-[60px_1fr_80px_140px_140px_44px] gap-3 border-b border-slate-100 bg-slate-50/60 px-4 py-2.5 text-xs font-semibold text-slate-500">
            <span className="text-center">No.</span>
            <span>品目・サービス内容</span>
            <span className="text-right">数量</span>
            <span className="text-right">単価</span>
            <span className="text-right">金額</span>
            <span />
          </div>

          {items.map((item, idx) => (
            <ItemRow key={item.id} item={item} index={idx} />
          ))}

          <button
            onClick={onAdd}
            className="flex w-full items-center justify-center gap-1.5 border-t border-dashed border-slate-200 bg-slate-50/30 py-3 text-sm font-medium text-violet-600 hover:bg-violet-50/40"
          >
            <Plus className="h-4 w-4" />
            行を追加
          </button>
        </div>

        {/* Totals */}
        <div className="mt-5 flex justify-end">
          <div className="w-72 rounded-xl bg-slate-50/60 p-4 text-sm">
            <div className="flex justify-between py-1 text-slate-600">
              <span>小計</span>
              <span className="font-medium text-slate-900 tabular-nums">
                {yen(subtotal)} 円
              </span>
            </div>
            <div className="flex justify-between py-1 text-slate-600">
              <span>消費税（10%）</span>
              <span className="font-medium text-slate-900 tabular-nums">
                {yen(tax)} 円
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between border-t border-slate-200 pt-3">
              <span className="text-sm font-semibold text-slate-900">合計（税込）</span>
              <span className="text-2xl font-bold text-violet-600 tabular-nums">
                {yen(total)} 円
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 備考 */}
      <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            <Lightbulb className="h-4 w-4" />
          </span>
          <div>
            <h3 className="mb-1 text-sm font-bold text-slate-900">備考</h3>
            <p className="text-sm leading-relaxed text-slate-700">
              お支払い条件：月末締め翌月末払い
              <br />
              本見積の有効期限内にご発注をお願いいたします。
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ItemRow({ item, index }: { item: Item; index: number }) {
  if (item.rowType === "heading") {
    return (
      <div className="grid grid-cols-[60px_1fr_80px_140px_140px_44px] items-center gap-3 border-b border-slate-100 bg-slate-50/40 px-4 py-3 last:border-b-0">
        <span />
        <span className="font-bold text-slate-900">{item.title}</span>
        <span /> <span /> <span />
        <RowMenu />
      </div>
    );
  }
  if (item.rowType === "subtotal") {
    return (
      <div className="grid grid-cols-[60px_1fr_80px_140px_140px_44px] items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0">
        <span />
        <span className="font-medium text-slate-700">小計</span>
        <span /> <span />
        <span className="text-right text-sm font-semibold tabular-nums">
          {yen(item.quantity * item.unitPrice)} 円
        </span>
        <RowMenu />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[60px_1fr_80px_140px_140px_44px] items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0">
      <div className="flex justify-center">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-400 text-xs font-bold text-white shadow-sm">
          {index + 1}
        </span>
      </div>
      <div>
        <p className="font-semibold text-slate-900">{item.title}</p>
        {item.description && (
          <p className="mt-0.5 text-xs text-slate-500">{item.description}</p>
        )}
      </div>
      <div className="text-right text-sm tabular-nums text-slate-700">
        {item.quantity}
      </div>
      <div className="text-right text-sm tabular-nums text-slate-700">
        {yen(item.unitPrice)}
      </div>
      <div className="text-right text-sm font-semibold tabular-nums text-slate-900">
        {yen(item.quantity * item.unitPrice)}
      </div>
      <RowMenu />
    </div>
  );
}

function RowMenu() {
  return (
    <button className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700">
      <MoreVertical className="h-4 w-4" />
    </button>
  );
}

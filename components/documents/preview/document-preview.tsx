"use client";

import {
  type Client,
  type Document,
  type DocumentItem,
  type Project,
} from "@/lib/types";
import { calculateAmount, calculateTotals } from "@/lib/documents-store";
import { DEFAULT_COMPANY_INFO, type CompanyInfo } from "@/lib/company-info";

export type DocumentTemplate =
  | "estimate"
  | "purchase-order"
  | "acknowledgment"
  | "delivery"
  | "acceptance"
  | "invoice"
  | "receipt";

const TEMPLATE_CONFIG: Record<
  DocumentTemplate,
  {
    title: string;
    /** 大きいタイトル（字間広め） */
    titleSpaced: string;
    /** あいさつ文 */
    greeting: string;
    /** 日付ラベル */
    dateLabel: string;
    /** 有効期限を表示するか */
    showExpiry: boolean;
    /** 支払期限を表示するか（請求書） */
    showPaymentDeadline: boolean;
    /** 振込先を表示するか（請求書） */
    showBankAccount: boolean;
    /** 印欄を表示するか */
    showStamp: boolean;
    /** 顧客が発信者になるか */
    customerIsIssuer: boolean;
  }
> = {
  estimate: {
    title: "御見積書",
    titleSpaced: "御 見 積 書",
    greeting: "下記のとおり、御見積もり申し上げます。",
    dateLabel: "見積日",
    showExpiry: true,
    showPaymentDeadline: false,
    showBankAccount: false,
    showStamp: false,
    customerIsIssuer: false,
  },
  "purchase-order": {
    title: "発注書",
    titleSpaced: "発  注  書",
    greeting: "下記のとおり発注致します。",
    dateLabel: "発注日",
    showExpiry: false,
    showPaymentDeadline: false,
    showBankAccount: false,
    showStamp: true,
    customerIsIssuer: true,
  },
  acknowledgment: {
    title: "発注請書",
    titleSpaced: "発  注  請  書",
    greeting: "下記のとおり御注文をお請け致しました。",
    dateLabel: "発行日",
    showExpiry: false,
    showPaymentDeadline: false,
    showBankAccount: false,
    showStamp: false,
    customerIsIssuer: false,
  },
  delivery: {
    title: "納品書",
    titleSpaced: "納  品  書",
    greeting: "下記のとおり、納品致します。",
    dateLabel: "納品日",
    showExpiry: false,
    showPaymentDeadline: false,
    showBankAccount: false,
    showStamp: false,
    customerIsIssuer: false,
  },
  acceptance: {
    title: "検収書",
    titleSpaced: "検  収  書",
    greeting: "下記に関し、検収致しました。",
    dateLabel: "検収日",
    showExpiry: false,
    showPaymentDeadline: false,
    showBankAccount: false,
    showStamp: true,
    customerIsIssuer: true,
  },
  invoice: {
    title: "御請求書",
    titleSpaced: "御 請 求 書",
    greeting: "下記のとおり、御請求申し上げます。",
    dateLabel: "請求日",
    showExpiry: false,
    showPaymentDeadline: true,
    showBankAccount: true,
    showStamp: true,
    customerIsIssuer: false,
  },
  receipt: {
    title: "領収書",
    titleSpaced: "領 収 書",
    greeting: "下記の通り、領収致しました。",
    dateLabel: "領収日",
    showExpiry: false,
    showPaymentDeadline: false,
    showBankAccount: false,
    showStamp: true,
    customerIsIssuer: false,
  },
};

const yen = (n: number) => n.toLocaleString("ja-JP");

function formatDateJp(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, "0")}月${String(d.getDate()).padStart(2, "0")}日`;
}

export function DocumentPreview({
  document,
  project,
  client,
  template = "estimate",
  company = DEFAULT_COMPANY_INFO,
}: {
  document: Document;
  project: Project;
  client?: Client;
  template?: DocumentTemplate;
  company?: CompanyInfo;
}) {
  const config = TEMPLATE_CONFIG[template];
  const totals = calculateTotals(document.items);
  const sortedItems = [...document.items].sort(
    (a, b) => a.sortOrder - b.sortOrder
  );

  // Compute running subtotals for "subtotal" rows
  const itemsWithSub: Array<DocumentItem & { displaySubtotal?: number }> = [];
  let running = 0;
  for (const item of sortedItems) {
    if (item.rowType === "subtotal") {
      itemsWithSub.push({ ...item, displaySubtotal: running });
      running = 0;
    } else {
      itemsWithSub.push(item);
      if (item.rowType === "normal") {
        running += calculateAmount(item);
      }
    }
  }

  // For purchase-order, customer is issuer (sends to us); we are recipient.
  // For estimate/acknowledgment, we are issuer; customer is recipient.
  const recipient = config.customerIsIssuer
    ? {
        name: company.name,
        honorific: "様",
        postalCode: company.postalCode,
        addressLines: company.address.split("\n"),
        tel: company.tel,
        fax: company.fax,
        contactPerson: company.contactPerson,
      }
    : {
        name: client?.name ?? "（顧客未設定）",
        honorific: client?.honorific || "御中",
        postalCode: client?.postalCode,
        addressLines: [
          [client?.prefecture, client?.city, client?.building]
            .filter(Boolean)
            .join(""),
        ],
        tel: client?.tel,
        fax: undefined as string | undefined,
        contactPerson: undefined as string | undefined,
      };

  const issuer = config.customerIsIssuer
    ? {
        name: client?.name ?? "（顧客未設定）",
        representative: undefined as string | undefined,
        postalCode: client?.postalCode,
        addressLines: [
          [client?.prefecture, client?.city, client?.building]
            .filter(Boolean)
            .join(""),
        ],
        tel: client?.tel,
        fax: undefined as string | undefined,
        contactPerson: undefined as string | undefined,
        registrationNumber: undefined as string | undefined,
      }
    : {
        name: company.name,
        representative: company.representative,
        postalCode: company.postalCode,
        addressLines: company.address.split("\n"),
        tel: company.tel,
        fax: company.fax,
        contactPerson: company.contactPerson,
        registrationNumber: company.registrationNumber,
      };

  return (
    <div className="pdf-page">
      <div className="text-center text-xl font-bold tracking-[0.25em]">
        {config.titleSpaced}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-6">
        {/* Left: recipient */}
        <div>
          <div className="text-base font-bold">
            {recipient.name} {recipient.honorific}
          </div>
          <div className="mt-0.5 text-[10px] leading-snug text-gray-900">
            {recipient.postalCode && <>〒{recipient.postalCode}</>}
            <br />
            {recipient.addressLines.filter(Boolean).map((line, i) => (
              <span key={i}>
                {line}
                <br />
              </span>
            ))}
            {recipient.contactPerson && <>担当：{recipient.contactPerson} 様</>}
          </div>

          <p className="mt-3 text-[11px]">{config.greeting}</p>

          <table className="mt-2 w-full text-[10px]">
            <tbody>
              <tr>
                <td className="w-16 bg-gray-300 px-1.5 py-1.5 align-top text-gray-900">件名</td>
                <td className="px-1.5 py-1.5 align-top">{document.subject || project.name}</td>
              </tr>
              {config.showPaymentDeadline ? (
                <tr>
                  <td className="bg-gray-300 px-1.5 py-1.5 align-top text-gray-900">支払期限</td>
                  <td className="px-1.5 py-1.5 align-top">
                    {document.secondaryDate ? formatDateJp(document.secondaryDate) : "—"}
                  </td>
                </tr>
              ) : (
                <>
                  <tr>
                    <td className="bg-gray-300 px-1.5 py-1.5 align-top text-gray-900">納期</td>
                    <td className="px-1.5 py-1.5 align-top">別途ご相談</td>
                  </tr>
                  <tr>
                    <td className="bg-gray-300 px-1.5 py-1.5 align-top text-gray-900">支払条件</td>
                    <td className="px-1.5 py-1.5 align-top">{project.paymentTerms ?? "—"}</td>
                  </tr>
                </>
              )}
              {config.showExpiry && document.secondaryDate && (
                <tr>
                  <td className="bg-gray-300 px-1.5 py-1.5 align-top text-gray-900">有効期限</td>
                  <td className="px-1.5 py-1.5 align-top">{formatDateJp(document.secondaryDate)}</td>
                </tr>
              )}
              {config.showBankAccount && company.bankAccount && (
                <tr>
                  <td className="bg-gray-300 px-1.5 py-1.5 align-top text-gray-900">振込先</td>
                  <td className="px-1.5 py-1.5 align-top whitespace-pre-line">{company.bankAccount}</td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="mt-2 flex items-stretch border-2 border-black">
            <div className="flex w-24 items-center justify-center bg-gray-900 px-2 py-1.5 text-[11px] font-semibold text-white">
              合計金額
            </div>
            <div className="flex flex-1 items-baseline justify-center gap-2 bg-white px-3 py-1.5">
              <span>
                <span className="text-xl font-bold tabular-nums">
                  {yen(template === "estimate" ? totals.subtotal : totals.total)}
                </span>
                <span className="ml-1 text-sm font-bold">円</span>
              </span>
              <span className="text-[10px]">
                （{template === "estimate" ? "税抜" : "税込"}）
              </span>
            </div>
          </div>
        </div>

        {/* Right: issuer */}
        <div className="text-[10px] leading-snug">
          <table className="mb-2 ml-auto w-48 text-[10px]">
            <tbody>
              <tr>
                <td className="w-16 bg-gray-300 px-1.5 py-1.5 text-gray-900">No</td>
                <td className="px-1.5 py-1.5">{document.documentNumber}</td>
              </tr>
              <tr>
                <td className="bg-gray-300 px-1.5 py-1.5 text-gray-900">{config.dateLabel}</td>
                <td className="px-1.5 py-1.5">
                  {document.primaryDate
                    ? formatDateJp(document.primaryDate)
                    : "別途ご相談"}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="relative ml-auto mt-3 w-48 text-left leading-[1.7]">
            <div className="text-sm font-bold">{issuer.name}</div>
            {issuer.representative && (
              <div className="mt-0.5 text-[11px]">{issuer.representative}</div>
            )}
            <div className="mt-2 space-y-0.5 text-gray-900">
              {issuer.postalCode && <div>〒{issuer.postalCode}</div>}
              {issuer.addressLines.filter(Boolean).map((line, i) => (
                <div key={i}>{line}</div>
              ))}
              {issuer.tel && <div>TEL：{issuer.tel}</div>}
              {issuer.fax && <div>FAX：{issuer.fax}</div>}
              {issuer.contactPerson && <div>担当：{issuer.contactPerson}</div>}
              {issuer.registrationNumber && (
                <div>登録番号：{issuer.registrationNumber}</div>
              )}
            </div>
            {config.showStamp && template === "invoice" && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/stamp.png"
                alt="印"
                className="pointer-events-none absolute right-16 top-2 size-16 select-none"
              />
            )}
            {config.showStamp && template !== "invoice" && (
              <div className="mt-2 flex size-10 items-center justify-center rounded border border-gray-400 text-[10px] text-gray-500">
                印
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Items table */}
      <table className="mt-3 w-full border-collapse text-[11px]">
        <thead>
          <tr className="border-y border-gray-300 bg-gray-300">
            <th className="px-1.5 py-1 text-center font-semibold">摘要</th>
            <th className="w-12 px-1.5 py-1 text-center font-semibold">数量</th>
            <th className="w-20 px-1.5 py-1 text-center font-semibold">単価</th>
            <th className="w-24 px-1.5 py-1 text-center font-semibold">金額</th>
          </tr>
        </thead>
        <tbody>
          {itemsWithSub.map((item) => {
            if (item.rowType === "heading") {
              return (
                <tr key={item.id} className="border-b border-gray-100 bg-gray-100">
                  <td colSpan={4} className="px-1.5 py-1.5 font-semibold">
                    {item.name}
                  </td>
                </tr>
              );
            }
            if (item.rowType === "subtotal") {
              return (
                <tr key={item.id} className="border-t border-gray-300">
                  <td colSpan={3} className="px-1.5 py-1.5 text-right font-semibold">
                    小計
                  </td>
                  <td className="px-1.5 py-1.5 text-right font-semibold tabular-nums">
                    {yen(item.displaySubtotal ?? 0)}
                  </td>
                </tr>
              );
            }
            const amount = calculateAmount(item);
            return (
              <tr key={item.id} className="border-b border-gray-100">
                <td className="px-1.5 py-1.5">{item.name}</td>
                <td className="px-1.5 py-1.5 text-right tabular-nums">
                  {item.quantity}
                </td>
                <td className="px-1.5 py-1.5 text-right tabular-nums">
                  {yen(item.unitPrice)}
                </td>
                <td className="px-1.5 py-1.5 text-right tabular-nums">
                  {yen(amount)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Totals */}
      <table className="mt-2 ml-auto w-60 border-collapse text-[11px]">
        <tbody>
          <tr>
            <td className="w-20 border border-gray-300 bg-gray-100 px-2 py-1 text-center">
              小計
            </td>
            <td className="border border-gray-300 px-2 py-1 text-right tabular-nums">
              {yen(totals.subtotal)}
            </td>
          </tr>
          <tr>
            <td className="border border-gray-300 bg-gray-100 px-2 py-1 text-center">
              消費税
            </td>
            <td className="border border-gray-300 px-2 py-1 text-right tabular-nums">
              {yen(totals.tax)}
            </td>
          </tr>
          <tr>
            <td className="border border-gray-300 bg-gray-300 px-2 py-1 text-center font-semibold">
              合計
            </td>
            <td className="border border-gray-300 px-2 py-1 text-right font-semibold tabular-nums">
              {yen(totals.total)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Notes */}
      <div className="mt-3">
        <div className="border-b border-gray-300 pb-0.5 text-[11px] font-semibold">
          備考
        </div>
        {document.notes && document.notes.trim() && (
          <div className="mt-1 whitespace-pre-wrap text-[10px] leading-snug text-gray-900">
            {document.notes}
          </div>
        )}
      </div>
    </div>
  );
}

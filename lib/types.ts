export type SendMethod = "mail" | "post" | "mail_and_post";

export const SEND_METHOD_LABELS: Record<SendMethod, string> = {
  mail: "メール",
  post: "郵送",
  mail_and_post: "メール・郵送",
};

export type FeeBearer = "client" | "self";

export type InvoiceEligibility = "unset" | "eligible" | "not_eligible";

export type ClientContact = {
  name: string;
  email: string;
};

export type Client = {
  id: string;
  name: string;
  honorific: string;
  postalCode?: string;
  prefecture?: string;
  city?: string;
  building?: string;
  tel?: string;
  contacts?: ClientContact[];
  defaultPaymentTerms?: string;
  feeBearer: FeeBearer;
  sendMethod: SendMethod;
  bankAccountId?: string;
  clientNumber?: string;
  corporateNumber?: string;
  invoiceEligibility: InvoiceEligibility;
  invoiceRegistrationNumber?: string;
  notes?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type ClientInput = Omit<Client, "id" | "createdAt" | "updatedAt">;

export type OrderStatus = "estimating" | "ordered" | "lost";

export type InvoiceTiming = "single" | "recurring" | "split";

export type RecurringInterval = "weekly" | "monthly" | "bimonthly" | "quarterly" | "yearly";

export const RECURRING_INTERVAL_LABELS: Record<RecurringInterval, string> = {
  weekly: "毎週",
  monthly: "毎月",
  bimonthly: "隔月",
  quarterly: "四半期ごと",
  yearly: "毎年",
};

export type Progress = "not_started" | "in_progress" | "delivered" | "accepted";

export type PaymentMethod =
  | "bank_transfer"
  | "direct_debit"
  | "credit_card"
  | "cash"
  | "cod"
  | "convenience_store"
  | "postal_transfer";

export type Rounding = "round" | "floor" | "ceil";

export type Project = {
  id: string;
  projectNumber: string;
  clientId: string;
  name: string;
  orderStatus: OrderStatus;
  invoiceTiming: InvoiceTiming;
  invoiceDate?: string;
  splitInvoiceDates?: string[];
  recurringInterval?: RecurringInterval;
  recurringNotify?: boolean;
  recurringAutoRenew?: boolean;
  deliveryDate?: string;
  syncDeliveryDate?: boolean;
  paymentTerms?: string;
  paymentMethod: PaymentMethod;
  progress: Progress;
  rounding: Rounding;
  managementNumber?: string;
  internalMemo?: string;
  estimateAmount: number;
  invoiceAmount: number;
  createdAt: string;
  updatedAt: string;
};

export type ProjectInput = Omit<
  Project,
  "id" | "projectNumber" | "createdAt" | "updatedAt" | "estimateAmount" | "invoiceAmount"
> & {
  estimateAmount?: number;
  invoiceAmount?: number;
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  estimating: "見積中",
  ordered: "受注",
  lost: "失注",
};

export const PROGRESS_LABELS: Record<Progress, string> = {
  not_started: "未着手",
  in_progress: "着手中",
  delivered: "納品済",
  accepted: "検収済",
};

export const INVOICE_TIMING_LABELS: Record<InvoiceTiming, string> = {
  single: "一括請求",
  recurring: "定期請求",
  split: "分割請求",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  bank_transfer: "銀行振込",
  direct_debit: "口座振替",
  credit_card: "クレジットカード",
  cash: "現金支払",
  cod: "代金引換",
  convenience_store: "コンビニ支払",
  postal_transfer: "郵便振替",
};

export const ROUNDING_LABELS: Record<Rounding, string> = {
  round: "四捨五入",
  floor: "切り捨て",
  ceil: "切り上げ",
};

export type DocumentType =
  | "estimate"
  | "purchase-order"
  | "delivery"
  | "invoice"
  | "receipt"
  | "cover-letter";

export type DocumentStatus = "draft" | "issued";

export type TaxRate = 10 | 8 | 0;

export type RowType = "normal" | "heading" | "subtotal";

export type DocumentItem = {
  id: string;
  rowType: RowType;
  name: string;
  quantity: number;
  unitPrice: number;
  taxRate: TaxRate;
  notes?: string;
  sortOrder: number;
};

export type Document = {
  id: string;
  projectId: string;
  type: DocumentType;
  documentNumber: string;
  subject: string;
  primaryDate?: string;
  secondaryDate?: string;
  notes?: string;
  status: DocumentStatus;
  items: DocumentItem[];
  createdAt: string;
  updatedAt: string;
};

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  "estimate": "見積書",
  "purchase-order": "発注書・発注請書",
  "delivery": "納品書・検収書",
  "invoice": "請求書",
  "receipt": "領収書",
  "cover-letter": "送付状",
};

export const DOCUMENT_TITLE_PREFIX: Record<DocumentType, string> = {
  "estimate": "御見積書",
  "purchase-order": "発注書",
  "delivery": "納品書",
  "invoice": "御請求書",
  "receipt": "領収書",
  "cover-letter": "送付状",
};

export type DocumentDateConfig = {
  primary: { label: string; required?: boolean };
  secondary?: { label: string };
};

export const DOCUMENT_DATE_CONFIG: Record<DocumentType, DocumentDateConfig> = {
  "estimate": {
    primary: { label: "見積日", required: true },
    secondary: { label: "有効期限" },
  },
  "purchase-order": {
    primary: { label: "発注日", required: true },
    secondary: { label: "納期" },
  },
  "delivery": {
    primary: { label: "納品日", required: true },
  },
  "invoice": {
    primary: { label: "請求日", required: true },
    secondary: { label: "支払期日" },
  },
  "receipt": {
    primary: { label: "受領日", required: true },
  },
  "cover-letter": {
    primary: { label: "発送日", required: true },
  },
};

export const TAX_RATES: TaxRate[] = [10, 8, 0];

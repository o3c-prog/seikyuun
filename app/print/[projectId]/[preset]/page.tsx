"use client";

import { use, useEffect, useState } from "react";
import { useProjects } from "@/lib/projects-store";
import { useClients } from "@/lib/clients-store";
import { useDocument } from "@/lib/documents-store";
import type { DocumentType } from "@/lib/types";
import {
  DocumentPreview,
  type DocumentTemplate,
} from "@/components/documents/preview/document-preview";

type PresetEntry = {
  template: DocumentTemplate;
  dataType: DocumentType;
};

const TEMPLATE_TITLES: Record<DocumentTemplate, string> = {
  estimate: "御見積書",
  "purchase-order": "発注書",
  acknowledgment: "発注請書",
  delivery: "納品書",
  acceptance: "検収書",
  invoice: "御請求書",
  receipt: "領収書",
};

function formatYYYYMMDD(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

function sanitizeFilename(s: string): string {
  // Remove characters that are invalid in filenames across platforms
  return s.replace(/[\\/:*?"<>|]/g, "").trim();
}

const PRESETS: Record<string, PresetEntry[]> = {
  // Estimate variants
  estimate: [{ template: "estimate", dataType: "estimate" }],
  "estimate-po": [
    { template: "estimate", dataType: "estimate" },
    { template: "purchase-order", dataType: "purchase-order" },
  ],
  "estimate-po-ack": [
    { template: "estimate", dataType: "estimate" },
    { template: "purchase-order", dataType: "purchase-order" },
    { template: "acknowledgment", dataType: "purchase-order" },
  ],
  // Purchase order
  "purchase-order": [
    { template: "purchase-order", dataType: "purchase-order" },
  ],
  "purchase-order-ack": [
    { template: "purchase-order", dataType: "purchase-order" },
    { template: "acknowledgment", dataType: "purchase-order" },
  ],
  // Delivery
  delivery: [{ template: "delivery", dataType: "delivery" }],
  "delivery-ack": [
    { template: "delivery", dataType: "delivery" },
    { template: "acceptance", dataType: "delivery" },
  ],
  // Invoice / Receipt / Cover letter
  invoice: [{ template: "invoice", dataType: "invoice" }],
  receipt: [{ template: "receipt", dataType: "receipt" }],
  "cover-letter": [{ template: "estimate", dataType: "cover-letter" }],
};

export default function PrintPage({
  params,
}: {
  params: Promise<{ projectId: string; preset: string }>;
}) {
  const { projectId, preset } = use(params);
  const entries = PRESETS[preset] ?? null;

  const { projects, hydrated: pH } = useProjects();
  const { clients, hydrated: cH } = useClients();
  const project = projects.find((p) => p.id === projectId);
  const client = project
    ? clients.find((c) => c.id === project.clientId)
    : undefined;

  // Pre-load all unique document types we might need
  const { document: estimateDoc, hydrated: eH } = useDocument(
    projectId,
    "estimate"
  );
  const { document: poDoc, hydrated: poH } = useDocument(
    projectId,
    "purchase-order"
  );
  const { document: deliveryDoc, hydrated: dH } = useDocument(
    projectId,
    "delivery"
  );
  const { document: invoiceDoc, hydrated: iH } = useDocument(
    projectId,
    "invoice"
  );

  const docByType = (t: DocumentType) => {
    if (t === "estimate") return estimateDoc;
    if (t === "purchase-order") return poDoc;
    if (t === "delivery") return deliveryDoc;
    if (t === "invoice") return invoiceDoc;
    return estimateDoc;
  };

  const allHydrated = pH && cH && eH && poH && dH && iH;

  // Set document.title so the browser print dialog suggests the right filename
  useEffect(() => {
    if (!allHydrated || !project || !entries) return;
    const titles = entries
      .map((e) => TEMPLATE_TITLES[e.template])
      .filter(Boolean)
      .join("_");
    const clientPart = client
      ? `${client.name}${client.honorific || "様"}`
      : "";
    const firstDoc = entries[0] ? docByType(entries[0].dataType) : null;
    const subjectPart = firstDoc?.subject || project.name;
    const datePart = formatYYYYMMDD(firstDoc?.primaryDate);
    const filename = [titles, clientPart, subjectPart, datePart]
      .filter(Boolean)
      .map(sanitizeFilename)
      .join("_");
    const previousTitle = window.document.title;
    window.document.title = filename;
    return () => {
      window.document.title = previousTitle;
    };
  }, [allHydrated, project, client, entries, docByType]);

  // Auto-trigger print after content is ready
  const [printed, setPrinted] = useState(false);
  useEffect(() => {
    if (!allHydrated || !project || printed) return;
    const t = setTimeout(() => {
      window.print();
      setPrinted(true);
    }, 400);
    return () => clearTimeout(t);
  }, [allHydrated, project, printed]);

  if (!entries) {
    return (
      <div className="p-8 text-sm text-gray-500">
        無効なプリセット: {preset}
      </div>
    );
  }

  if (!allHydrated) {
    return <div className="p-8 text-sm text-gray-500">読み込み中...</div>;
  }

  if (!project) {
    return (
      <div className="p-8 text-sm text-gray-500">案件が見つかりません</div>
    );
  }

  return (
    <div className="pdf-screen-wrap min-h-screen bg-gray-100 py-6">
      <div className="pdf-print-controls fixed right-4 top-4 z-50 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-violet-700"
        >
          PDFとして保存／印刷
        </button>
      </div>
      {entries.map((entry, idx) => {
        const document = docByType(entry.dataType);
        if (!document) return null;
        return (
          <DocumentPreview
            key={`${entry.template}-${idx}`}
            document={document}
            project={project}
            client={client}
            template={entry.template}
          />
        );
      })}
    </div>
  );
}

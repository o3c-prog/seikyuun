import { DocumentEditorPage } from "@/components/documents/document-editor-page";

export default function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <DocumentEditorPage params={params} type="invoice" />;
}

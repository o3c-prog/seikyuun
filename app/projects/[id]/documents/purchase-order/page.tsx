import { DocumentEditorPage } from "@/components/documents/document-editor-page";

export default function PurchaseOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <DocumentEditorPage params={params} type="purchase-order" />;
}

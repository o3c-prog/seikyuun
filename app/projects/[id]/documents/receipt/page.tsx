import { DocumentEditorPage } from "@/components/documents/document-editor-page";

export default function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <DocumentEditorPage params={params} type="receipt" />;
}

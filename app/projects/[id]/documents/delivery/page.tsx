import { DocumentEditorPage } from "@/components/documents/document-editor-page";

export default function DeliveryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <DocumentEditorPage params={params} type="delivery" />;
}

import { DocumentEditorPage } from "@/components/documents/document-editor-page";

export default function CoverLetterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <DocumentEditorPage params={params} type="cover-letter" />;
}

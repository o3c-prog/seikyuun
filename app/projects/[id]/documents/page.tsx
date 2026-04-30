import { redirect } from "next/navigation";

export default async function DocumentsIndex({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/projects/${id}/documents/estimate`);
}

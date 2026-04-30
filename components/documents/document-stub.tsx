import { FileText, Hammer } from "lucide-react";
import { SectionCard } from "@/components/layout/section-card";

export function DocumentStub({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="p-8">
      <SectionCard icon={FileText} title={title} description={description}>
        <div className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary-soft-foreground">
            <Hammer className="size-6" />
          </span>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">準備中</p>
            <p className="text-xs">
              この書類のエディタは未実装です。明細グループ・税率別内訳・PDF生成は次のフェーズで対応します。
            </p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

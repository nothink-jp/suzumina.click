import AdminList from "@/components/AdminList";
import type { WorkListResult } from "@suzumina.click/shared-types/src/work";

interface WorkListProps {
  data: WorkListResult["works"];
  totalCount: number;
  currentPage: number;
}

// Server Component版のWorkList（統一コンポーネント使用）
export default function WorkList({
  data,
  totalCount,
  currentPage,
}: WorkListProps) {
  return (
    <AdminList
      items={data}
      totalCount={totalCount}
      currentPage={currentPage}
      title="DLsite作品一覧"
      type="work"
      emptyMessage="作品が見つかりませんでした"
    />
  );
}

"use client";

import type { CreatorPageInfo } from "@suzumina.click/shared-types";
import CreatorsList from "@/app/creators/components/creators-list";
import { ListPageShell } from "./list-page-shell";

interface CreatorsPageClientProps {
	initialData: {
		creators: CreatorPageInfo[];
		totalCount: number;
	};
}

export function CreatorsPageClient({ initialData }: CreatorsPageClientProps) {
	return (
		<ListPageShell
			title="クリエイター一覧"
			description="音声作品を手がけるクリエイターの一覧。声優、イラストレーター、シナリオライターなど、役割別に検索・並び替えができます"
		>
			<CreatorsList initialData={initialData} />
		</ListPageShell>
	);
}

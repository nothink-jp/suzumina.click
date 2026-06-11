"use client";

import type { CirclePlainObject } from "@suzumina.click/shared-types";
import CirclesList from "@/app/circles/components/circles-list";
import { ListPageShell } from "./list-page-shell";

interface CirclesPageClientProps {
	initialData: {
		circles: CirclePlainObject[];
		totalCount: number;
	};
}

export function CirclesPageClient({ initialData }: CirclesPageClientProps) {
	return (
		<ListPageShell
			title="サークル一覧"
			description="DLsiteで活動するサークルの一覧。作品数やサークル名で検索・並び替えができます"
		>
			<CirclesList initialData={initialData} />
		</ListPageShell>
	);
}

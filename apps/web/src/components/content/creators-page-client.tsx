"use client";

import type { CreatorPageInfo } from "@suzumina.click/shared-types";
import {
	ListPageContent,
	ListPageHeader,
	ListPageLayout,
} from "@suzumina.click/ui/components/custom";
import { Suspense } from "react";
import CreatorsList from "@/app/creators/components/CreatorsList";

interface CreatorsPageClientProps {
	initialData: {
		creators: CreatorPageInfo[];
		totalCount: number;
	};
}

export function CreatorsPageClient({ initialData }: CreatorsPageClientProps) {
	return (
		<ListPageLayout>
			<ListPageHeader
				title="クリエイター一覧"
				description="音声作品を手がけるクリエイターの一覧。声優、イラストレーター、シナリオライターなど、役割別に検索・並び替えができます"
			/>

			<ListPageContent>
				<Suspense
					fallback={
						<div className="text-center py-12">
							<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
							<p className="mt-2 text-muted-foreground">読み込み中...</p>
						</div>
					}
				>
					<CreatorsList initialData={initialData} />
				</Suspense>
			</ListPageContent>
		</ListPageLayout>
	);
}

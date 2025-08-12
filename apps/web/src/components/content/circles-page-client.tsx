"use client";

import type { CirclePlainObject } from "@suzumina.click/shared-types";
import {
	ListPageContent,
	ListPageHeader,
	ListPageLayout,
} from "@suzumina.click/ui/components/custom";
import { Suspense } from "react";
import CirclesList from "@/app/circles/components/CirclesList";

interface CirclesPageClientProps {
	initialData: {
		circles: CirclePlainObject[];
		totalCount: number;
	};
}

export function CirclesPageClient({ initialData }: CirclesPageClientProps) {
	return (
		<ListPageLayout>
			<ListPageHeader
				title="サークル一覧"
				description="DLsiteで活動するサークルの一覧。作品数やサークル名で検索・並び替えができます"
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
					<CirclesList initialData={initialData} />
				</Suspense>
			</ListPageContent>
		</ListPageLayout>
	);
}

"use client";

import type { CirclePlainObject, WorkListResultPlain } from "@suzumina.click/shared-types";
import {
	ListPageContent,
	ListPageHeader,
	ListPageLayout,
} from "@suzumina.click/ui/components/custom/list-page-layout";
import { Suspense } from "react";
import CircleWorksList from "./CircleWorksList";

interface CirclePageClientProps {
	circle: CirclePlainObject;
	initialData: WorkListResultPlain;
}

export function CirclePageClient({ circle, initialData }: CirclePageClientProps) {
	return (
		<ListPageLayout>
			<ListPageHeader
				title={circle.name}
				description={`${circle.nameEn ? `${circle.nameEn} - ` : ""}作品数: ${circle.workCount}件`}
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
					<CircleWorksList circleId={circle.circleId} initialData={initialData} />
				</Suspense>
			</ListPageContent>
		</ListPageLayout>
	);
}

"use client";

import type { CreatorPageInfo, WorkPlainObject } from "@suzumina.click/shared-types";
import { getCreatorTypeLabel } from "@suzumina.click/shared-types";
import {
	ListPageContent,
	ListPageHeader,
	ListPageLayout,
} from "@suzumina.click/ui/components/custom";
import CreatorWorksList from "./CreatorWorksList";

interface CreatorPageClientProps {
	creator: CreatorPageInfo;
	initialData: WorkPlainObject[];
	initialTotalCount: number;
	initialFilteredCount?: number;
}

export function CreatorPageClient({
	creator,
	initialData,
	initialTotalCount,
	initialFilteredCount,
}: CreatorPageClientProps) {
	const typeLabel = getCreatorTypeLabel(creator.types);

	return (
		<ListPageLayout>
			<ListPageHeader
				title={creator.name}
				description={`${typeLabel} - 参加作品数: ${creator.workCount}件`}
			/>

			<ListPageContent>
				<CreatorWorksList
					creatorId={creator.id}
					initialData={{
						works: initialData,
						totalCount: initialTotalCount,
						filteredCount: initialFilteredCount,
						hasMore: initialData.length < initialTotalCount,
					}}
				/>
			</ListPageContent>
		</ListPageLayout>
	);
}

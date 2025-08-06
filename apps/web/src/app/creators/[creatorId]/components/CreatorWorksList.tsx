"use client";

import type { WorkListResultPlain, WorkPlainObject } from "@suzumina.click/shared-types";
import { ConfigurableList } from "@suzumina.click/ui/components/custom/list";
import { useCallback, useMemo } from "react";
import { ListWrapper } from "@/components/list/ListWrapper";
import { WorkListItem } from "@/components/work/WorkListItem";
import {
	DEFAULT_ITEMS_PER_PAGE_OPTIONS,
	DEFAULT_LIST_PROPS,
	GRID_COLUMNS_4,
	WORK_SORT_OPTIONS,
} from "@/constants/list-options";
import { createBasicToParams } from "@/utils/list-adapters";
import { getCreatorWorksList } from "../actions";

interface CreatorWorksListProps {
	creatorId: string;
	initialData?: WorkListResultPlain;
}

export default function CreatorWorksList({ creatorId, initialData }: CreatorWorksListProps) {
	// 初期データを変換
	const transformedInitialData = useMemo(() => {
		if (!initialData) return null;
		return {
			items: initialData.works,
			total:
				initialData.hasMore !== undefined
					? (initialData.filteredCount ?? initialData.totalCount ?? 0)
					: initialData.totalCount || 0,
			page: 1,
			itemsPerPage: DEFAULT_ITEMS_PER_PAGE_OPTIONS[0], // デフォルトのページサイズ
		};
	}, [initialData]);

	// データアダプター
	const dataAdapter = useMemo(
		() => ({
			toParams: createBasicToParams("newest", () => ({ creatorId })),
			fromResult: (result: unknown) => result as { items: WorkPlainObject[]; total: number },
		}),
		[creatorId],
	);

	// フェッチ関数
	const fetchFn = useCallback(async (params: unknown) => {
		const typedParams = params as Parameters<typeof getCreatorWorksList>[0];
		const result = await getCreatorWorksList(typedParams);
		return {
			items: result.works,
			total: result.filteredCount ?? result.totalCount ?? 0,
		};
	}, []);

	return (
		<ListWrapper>
			<ConfigurableList<WorkPlainObject>
				items={transformedInitialData?.items || []}
				initialTotal={transformedInitialData?.total || 0}
				renderItem={(work) => <WorkListItem work={work} />}
				fetchFn={fetchFn}
				dataAdapter={dataAdapter}
				{...DEFAULT_LIST_PROPS}
				layout="grid"
				gridColumns={GRID_COLUMNS_4}
				sorts={WORK_SORT_OPTIONS}
				itemsPerPageOptions={DEFAULT_ITEMS_PER_PAGE_OPTIONS}
				emptyMessage="作品が見つかりませんでした"
			/>
		</ListWrapper>
	);
}

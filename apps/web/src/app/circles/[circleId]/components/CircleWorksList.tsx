"use client";

import type { WorkListResultPlain, WorkPlainObject } from "@suzumina.click/shared-types";
import {
	ConfigurableList,
	type StandardListParams,
} from "@suzumina.click/ui/components/custom/list";
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
import { fetchCircleWorksForConfigurableList } from "../actions";

interface CircleWorksListProps {
	circleId: string;
	initialData?: WorkListResultPlain;
}

export default function CircleWorksList({ circleId, initialData }: CircleWorksListProps) {
	// 初期データを変換
	const transformedInitialData = useMemo(() => {
		if (!initialData) return null;
		return {
			items: initialData.works,
			total: initialData.totalCount || 0,
			page: 1,
			itemsPerPage: initialData.works.length,
		};
	}, [initialData]);

	// データアダプター
	const dataAdapter = useMemo(
		() => ({
			toParams: createBasicToParams("newest", () => ({ circleId })),
			fromResult: (result: unknown) => result as { items: WorkPlainObject[]; total: number },
		}),
		[circleId],
	);

	// フェッチ関数
	const fetchFn = useCallback(async (params: unknown) => {
		const typedParams = params as Parameters<typeof fetchCircleWorksForConfigurableList>[0];
		const result = await fetchCircleWorksForConfigurableList(typedParams);
		return {
			items: result.works,
			total: result.totalCount || 0,
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
				searchPlaceholder="作品タイトルで検索..."
				layout="grid"
				gridColumns={GRID_COLUMNS_4}
				sorts={WORK_SORT_OPTIONS}
				itemsPerPageOptions={DEFAULT_ITEMS_PER_PAGE_OPTIONS}
				emptyMessage="作品が見つかりませんでした"
			/>
		</ListWrapper>
	);
}

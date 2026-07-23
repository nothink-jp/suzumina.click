"use client";

import type { WorkListResultPlain, WorkPlainObject } from "@suzumina.click/shared-types";
import { ConfigurableList, EmptyState } from "@suzumina.click/ui/components/custom";
import { SearchX } from "lucide-react";
import { useCallback, useMemo } from "react";
import { ListWrapper } from "@/components/list/list-wrapper";
import { WorkListItem } from "@/components/work/work-list-item";
import {
	DEFAULT_ITEMS_PER_PAGE_OPTIONS,
	DEFAULT_LIST_PROPS,
	GRID_COLUMNS_4,
	WORK_SORT_OPTIONS,
} from "@/constants/list-options";
import { createBasicToParams } from "@/utils/list-adapters";

/** circle / creator の作品取得 action が返す形（owner 共通） */
export interface OwnerWorksResult {
	works: WorkPlainObject[];
	totalCount?: number;
	filteredCount?: number;
}

export interface OwnerWorksListParams {
	page?: number;
	limit?: number;
	sort?: string;
	search?: string;
}

interface WorksListForOwnerProps {
	initialData?: WorkListResultPlain;
	/** owner の作品取得関数（owner id は呼び出し側で束縛して渡す） */
	fetchWorks: (params: OwnerWorksListParams) => Promise<OwnerWorksResult>;
}

/**
 * circle / creator の作品一覧（ConfigurableList ラッパー）。
 *
 * CircleWorksList / CreatorWorksList の双子コンポーネントを統合した共通実体（SPR-191）。
 * 差分は「どの owner の作品を取るか」だけなので fetchWorks のみ受け取る。
 */
export function WorksListForOwner({ initialData, fetchWorks }: WorksListForOwnerProps) {
	const initialItems = initialData?.works ?? [];
	// 検索適用時は filteredCount を優先（フィルタ後の件数）
	const initialTotal = initialData ? (initialData.filteredCount ?? initialData.totalCount ?? 0) : 0;

	const dataAdapter = useMemo(
		() => ({
			toParams: createBasicToParams("newest"),
			fromResult: (result: unknown) => result as { items: WorkPlainObject[]; total: number },
		}),
		[],
	);

	const fetchFn = useCallback(
		async (params: unknown) => {
			const result = await fetchWorks(params as OwnerWorksListParams);
			return {
				items: result.works,
				total: result.filteredCount ?? result.totalCount ?? 0,
			};
		},
		[fetchWorks],
	);

	return (
		<ListWrapper>
			<ConfigurableList<WorkPlainObject>
				items={initialItems}
				initialTotal={initialTotal}
				renderItem={(work) => <WorkListItem work={work} />}
				listHeading="作品一覧"
				fetchFn={fetchFn}
				dataAdapter={dataAdapter}
				{...DEFAULT_LIST_PROPS}
				layout="grid"
				gridColumns={GRID_COLUMNS_4}
				sorts={WORK_SORT_OPTIONS}
				itemsPerPageOptions={DEFAULT_ITEMS_PER_PAGE_OPTIONS}
				emptyMessage="作品が見つかりませんでした"
				emptyState={
					<EmptyState icon={<SearchX className="h-6 w-6" />} title="作品が見つかりませんでした" />
				}
			/>
		</ListWrapper>
	);
}

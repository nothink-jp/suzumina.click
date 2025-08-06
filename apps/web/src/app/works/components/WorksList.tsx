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
	SEARCH_PLACEHOLDER,
	WORK_SORT_OPTIONS_WITH_RATING,
} from "@/constants/list-options";
import { WORK_CATEGORY_OPTIONS, WORK_LANGUAGE_OPTIONS } from "@/constants/work-options";
import { useAgeVerification } from "@/contexts/age-verification-context";
import { getWorks } from "../actions";

interface WorksListProps {
	initialData?: WorkListResultPlain;
}

export default function WorksList({ initialData }: WorksListProps) {
	const { showR18Content } = useAgeVerification();

	// 初期データを準備
	const initialItems = initialData?.works || [];
	const initialTotal = initialData?.totalCount || 0;

	// データアダプター
	const dataAdapter = useMemo(
		() => ({
			toParams: (params: StandardListParams) => {
				return {
					page: params.page,
					limit: params.itemsPerPage,
					sort: params.sort || "newest",
					search: params.search,
					category: params.filters.category as string | undefined,
					language: params.filters.language as string | undefined,
					showR18: params.filters.showR18 as boolean | undefined,
				};
			},
			fromResult: (result: unknown) => result as { items: WorkPlainObject[]; total: number },
		}),
		[],
	);

	// フェッチ関数
	const fetchFn = useCallback(async (params: unknown) => {
		const typedParams = params as Parameters<typeof getWorks>[0];
		const result = await getWorks(typedParams);
		return {
			items: result.works,
			total: result.totalCount || 0,
		};
	}, []);

	return (
		<ListWrapper>
			<ConfigurableList<WorkPlainObject>
				items={initialItems}
				initialTotal={initialTotal}
				renderItem={(work) => <WorkListItem work={work} />}
				fetchFn={fetchFn}
				dataAdapter={dataAdapter}
				{...DEFAULT_LIST_PROPS}
				searchPlaceholder={SEARCH_PLACEHOLDER}
				layout="grid"
				gridColumns={GRID_COLUMNS_4}
				sorts={WORK_SORT_OPTIONS_WITH_RATING}
				filters={{
					category: {
						type: "select",
						label: "カテゴリ",
						placeholder: "すべてのカテゴリ",
						options: WORK_CATEGORY_OPTIONS,
						showAll: true,
						emptyValue: "all",
					},
					language: {
						type: "select",
						label: "言語",
						placeholder: "すべての言語",
						options: WORK_LANGUAGE_OPTIONS,
						showAll: true,
						emptyValue: "all",
					},
					...(showR18Content
						? {
								showR18: {
									type: "boolean",
									label: "R18作品表示",
									defaultValue: showR18Content, // 年齢確認状態に基づいてデフォルト値を設定
								},
							}
						: {}),
				}}
				itemsPerPageOptions={DEFAULT_ITEMS_PER_PAGE_OPTIONS}
				emptyMessage="作品が見つかりませんでした"
			/>
		</ListWrapper>
	);
}

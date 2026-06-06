"use client";

import type { WorkListResultPlain, WorkPlainObject } from "@suzumina.click/shared-types";
import { ConfigurableList, type StandardListParams } from "@suzumina.click/ui/components/custom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ListWrapper } from "@/components/list/list-wrapper";
import { WorkListItem } from "@/components/work/work-list-item";
import {
	DEFAULT_ITEMS_PER_PAGE_OPTIONS,
	DEFAULT_LIST_PROPS,
	GRID_COLUMNS_4,
	WORK_SORT_OPTIONS_WITH_RATING,
} from "@/constants/list-options";
import { WORK_CATEGORY_OPTIONS, WORK_LANGUAGE_OPTIONS } from "@/constants/work-options";
import { useAgeVerification } from "@/contexts/age-verification-context";
import { getPopularGenres, getWorks } from "../actions";

interface WorksListProps {
	initialData?: WorkListResultPlain;
}

export default function WorksList({ initialData }: WorksListProps) {
	const { showR18Content } = useAgeVerification();
	const [availableGenres, setAvailableGenres] = useState<Array<{ value: string; label: string }>>(
		[],
	);

	// 人気ジャンルを取得
	useEffect(() => {
		const fetchGenres = async () => {
			try {
				const genres = await getPopularGenres(20); // 上位20ジャンルを取得
				const formattedGenres = genres.map((g) => ({
					value: g.genre,
					label: `${g.genre} (${g.count}作品)`,
				}));
				setAvailableGenres(formattedGenres);
			} catch {
				// ジャンルの取得に失敗してもUIは動作可能
			}
		};
		fetchGenres();
	}, []);

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
					genres: params.filters.genres as string[] | undefined,
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
				// 先頭 2 件のみ priority。PR #439 で <6 を試したが /works の DLsite
				// 画像 (~250x250) は decode コストが高く、6 並列で TBT +210ms regression
				// (SPR-9 / 2026-05-28 PSI 3 サンプル中央値で確認) したため縮小。
				renderItem={(work, index) => <WorkListItem work={work} priority={index < 2} />}
				listHeading="作品一覧"
				fetchFn={fetchFn}
				dataAdapter={dataAdapter}
				{...DEFAULT_LIST_PROPS}
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
					genres: {
						type: "tags",
						label: "ジャンル",
						placeholder: "ジャンルを選択",
						options: availableGenres,
					},
					...(showR18Content
						? {
								showR18: {
									type: "boolean",
									label: "R18作品表示",
									defaultValue: showR18Content,
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

"use client";

import type { WorkListResultPlain, WorkPlainObject } from "@suzumina.click/shared-types";
import { ConfigurableList, type StandardListParams } from "@suzumina.click/ui/components/custom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import * as logger from "@/lib/logger";
import { getPopularGenres, getWorks } from "../actions";
import type { ParsedWorksSearchParams } from "../lib/parse-search-params";

interface WorksListProps {
	initialData?: WorkListResultPlain;
	initialParams: ParsedWorksSearchParams;
}

export default function WorksList({ initialData, initialParams }: WorksListProps) {
	const { showR18Content, isLoading: isAgeVerificationLoading } = useAgeVerification();
	const [availableGenres, setAvailableGenres] = useState<Array<{ value: string; label: string }>>(
		[],
	);
	// SSR は年齢確認状態を読めず fail-closed（showR18:false）で initialData を返す
	// （page.tsx 参照。CDNエッジで全訪問者に共有キャッシュされるため安全側に倒す設計）。
	// verified adult 確定後、ConfigurableList の内部再フェッチ機構（マウント後の URL 変化でのみ
	// 発火し、マウント時の initialItems は無条件に信頼する）を経由せず、ここで直接1回だけ
	// showR18:true で取り直し（page.tsx と同じ initialParams を使用）、結果が来たら key を
	// 変えて ConfigurableList を再マウントする。
	const [correctedData, setCorrectedData] = useState<WorkListResultPlain | null>(null);
	const hasCorrectedRef = useRef(false);

	useEffect(() => {
		if (isAgeVerificationLoading) return; // localStorage解決前は待つ
		if (hasCorrectedRef.current) return;
		if (!showR18Content) return; // 未確認/未成年はSSRのfail-closed結果のままでよい
		// URLに showR18 の明示指定がある場合は SSR が既にその値を正しく反映済みのため補正しない
		// （例: ?showR18=false は「成人だがR18非表示を選択」であり、無条件に true 補正すると
		// フィルタUIの表示（URL由来でOFF）と実際の一覧（R18込み）が矛盾する）
		if (initialParams.showR18 !== undefined) return;
		hasCorrectedRef.current = true;
		getWorks({ ...initialParams, showR18: true })
			.then(setCorrectedData)
			.catch((err: unknown) => {
				logger.error("works: R18補正フェッチに失敗", err);
				hasCorrectedRef.current = false; // 依存値が変化すれば再試行できるようにする
			});
	}, [isAgeVerificationLoading, showR18Content, initialParams]);

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
		void fetchGenres();
	}, []);

	// 初期データを準備（補正済みデータがあればそちらを使用）
	const effectiveData = correctedData ?? initialData;
	const initialItems = effectiveData?.works || [];
	const initialTotal = effectiveData?.totalCount || 0;

	// データアダプター
	// 未確認/未成年時はフィルタUI自体を出さない（filters下部参照）ため、
	// params.filters.showR18 は常に undefined。その場合は showR18Content
	// （未確認時 false）にフォールバックし、SSR同様 fail-closed を維持する。
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
					showR18: (params.filters.showR18 as boolean | undefined) ?? showR18Content,
					genres: params.filters.genres as string[] | undefined,
				};
			},
			fromResult: (result: unknown) => result as { items: WorkPlainObject[]; total: number },
		}),
		[showR18Content],
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
			{!showR18Content && (
				<p className="mb-4 text-xs text-muted-foreground">
					R18作品は非表示です。18歳以上の方は設定ページから表示に切り替えられます。
				</p>
			)}
			<ConfigurableList<WorkPlainObject>
				// 補正フェッチ完了時に再マウントし、ConfigurableList に新しい initialItems を
				// 信頼させる（内部の再フェッチ判定はマウント後のURL変化にしか反応しないため）。
				key={correctedData ? "corrected" : "initial"}
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

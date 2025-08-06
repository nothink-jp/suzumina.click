"use client";

import type { WorkListResultPlain, WorkPlainObject } from "@suzumina.click/shared-types";
import {
	ConfigurableList,
	type StandardListParams,
} from "@suzumina.click/ui/components/custom/list";
import { useCallback, useMemo } from "react";
import { ListWrapper } from "@/components/list/ListWrapper";
import { useAgeVerification } from "@/contexts/age-verification-context";
import { getWorks } from "../actions";
import WorkCard from "./WorkCard";

interface WorksListProps {
	initialData?: WorkListResultPlain;
}

// 作品表示用のコンポーネント
function WorkItem({ work }: { work: WorkPlainObject }) {
	return <WorkCard work={work} />;
}

// カテゴリと言語のオプション
const CATEGORY_OPTIONS = [
	{ value: "SOU", label: "ボイス・ASMR" },
	{ value: "ADV", label: "アドベンチャー" },
	{ value: "RPG", label: "ロールプレイング" },
	{ value: "MOV", label: "動画" },
	{ value: "MNG", label: "マンガ" },
	{ value: "GAM", label: "ゲーム" },
	{ value: "CG", label: "CG・イラスト" },
	{ value: "TOL", label: "ツール・アクセサリ" },
	{ value: "ET3", label: "その他・3D" },
	{ value: "SLN", label: "シミュレーション" },
	{ value: "ACN", label: "アクション" },
	{ value: "PZL", label: "パズル" },
	{ value: "QIZ", label: "クイズ" },
	{ value: "TBL", label: "テーブル" },
	{ value: "DGT", label: "デジタルノベル" },
	{ value: "etc", label: "その他" },
];

const LANGUAGE_OPTIONS = [
	{ value: "ja", label: "日本語" },
	{ value: "en", label: "英語" },
	{ value: "zh-cn", label: "簡体中文" },
	{ value: "zh-tw", label: "繁體中文" },
	{ value: "ko", label: "한국어" },
	{ value: "es", label: "Español" },
	{ value: "not-required", label: "言語不要" },
	{ value: "dlsite-official", label: "DLsite公式" },
	{ value: "other", label: "その他言語" },
];

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
				renderItem={(work) => <WorkItem work={work} />}
				fetchFn={fetchFn}
				dataAdapter={dataAdapter}
				searchable
				searchPlaceholder="作品タイトルで検索..."
				urlSync
				layout="grid"
				gridColumns={{
					default: 1,
					sm: 2,
					lg: 3,
					xl: 4,
				}}
				sorts={[
					{ value: "newest", label: "新しい順" },
					{ value: "oldest", label: "古い順" },
					{ value: "popular", label: "人気順" },
					{ value: "price_low", label: "価格が安い順" },
					{ value: "price_high", label: "価格が高い順" },
					{ value: "rating", label: "評価が高い順" },
				]}
				defaultSort="newest"
				filters={{
					category: {
						type: "select",
						label: "カテゴリ",
						placeholder: "すべてのカテゴリ",
						options: CATEGORY_OPTIONS,
						showAll: true,
						emptyValue: "all",
					},
					language: {
						type: "select",
						label: "言語",
						placeholder: "すべての言語",
						options: LANGUAGE_OPTIONS,
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
				itemsPerPageOptions={[12, 24, 48]}
				emptyMessage="作品が見つかりませんでした"
			/>
		</ListWrapper>
	);
}

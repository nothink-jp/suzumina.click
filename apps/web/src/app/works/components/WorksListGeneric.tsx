"use client";

import type { WorkListResultPlain, WorkPlainObject } from "@suzumina.click/shared-types";
import {
	ConfigurableList,
	type StandardListParams,
} from "@suzumina.click/ui/components/custom/list";
import { useCallback, useMemo } from "react";
import { useAgeVerification } from "@/contexts/age-verification-context";
import { getWorks } from "../actions";
import WorkCard from "./WorkCard";

interface WorksListGenericProps {
	searchParams: Record<string, string | string[] | undefined>;
	initialData?: WorkListResultPlain;
	excludeR18?: boolean;
}

// 作品表示用のコンポーネント
function WorkItem({ work }: { work: WorkPlainObject }) {
	return <WorkCard work={work} />;
}

export default function WorksListGeneric({
	searchParams,
	initialData,
	excludeR18,
}: WorksListGenericProps) {
	const { showR18Content } = useAgeVerification();

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
			toParams: (params: StandardListParams) => {
				// 配列の場合は最初の値を使用
				const getValue = (key: string): string | undefined => {
					const value = searchParams[key];
					return Array.isArray(value) ? value[0] : value;
				};

				// showR18フィルターの値を取得（boolean型フィルター）
				const showR18Value = params.filters.showR18 as boolean | undefined;

				return {
					page: params.page,
					limit: params.itemsPerPage,
					sort: params.sort || "newest",
					search: params.search,
					category: getValue("category"),
					language: getValue("language"),
					// showR18がtrueならexcludeR18はfalse、showR18がfalseまたは未定義ならexcludeR18はtrue
					excludeR18:
						excludeR18 !== undefined
							? excludeR18
							: showR18Value !== undefined
								? !showR18Value
								: !showR18Content,
				};
			},
			fromResult: (result: unknown) => result as { items: WorkPlainObject[]; total: number },
		}),
		[searchParams, excludeR18, showR18Content],
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
		<div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-suzuka-100 p-6">
			<ConfigurableList<WorkPlainObject>
				items={transformedInitialData?.items || []}
				initialTotal={transformedInitialData?.total || 0}
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
						options: [
							{ value: "ACN", label: "ボイス・ASMR" },
							{ value: "ADV", label: "アドベンチャー" },
							{ value: "RPG", label: "ロールプレイング" },
							{ value: "MOV", label: "動画" },
						],
						showAll: true,
						emptyValue: "all",
					},
					language: {
						type: "select",
						label: "言語",
						placeholder: "すべての言語",
						options: [
							{ value: "JPN", label: "日本語" },
							{ value: "ENG", label: "英語" },
							{ value: "ZHO", label: "簡体中文" },
							{ value: "ZHT", label: "繁體中文" },
							{ value: "KOR", label: "한국어" },
							{ value: "SPA", label: "Español" },
							{ value: "NRE", label: "言語不要" },
							{ value: "DLS", label: "DLsite公式" },
							{ value: "OTH", label: "その他言語" },
						],
						showAll: true,
						emptyValue: "all",
					},
					...(showR18Content
						? {
								showR18: {
									type: "boolean",
									label: "R18作品表示",
								},
							}
						: {}),
				}}
				itemsPerPageOptions={[12, 24, 48]}
				emptyMessage="作品が見つかりませんでした"
			/>
		</div>
	);
}

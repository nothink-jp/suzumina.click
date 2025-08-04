"use client";

import type { WorkListResultPlain, WorkPlainObject } from "@suzumina.click/shared-types";
import {
	ConfigurableList,
	type StandardListParams,
} from "@suzumina.click/ui/components/custom/list";
import { Label } from "@suzumina.click/ui/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@suzumina.click/ui/components/ui/select";
import { Switch } from "@suzumina.click/ui/components/ui/switch";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
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

const CATEGORY_OPTIONS = [
	{ value: "all", label: "すべてのカテゴリ" },
	{ value: "voice", label: "音声・ASMR" },
	{ value: "adult", label: "成人向け" },
	{ value: "general", label: "全年齢" },
];

const LANGUAGE_OPTIONS = [
	{ value: "all", label: "すべての言語" },
	{ value: "japanese", label: "日本語" },
	{ value: "english", label: "英語" },
	{ value: "chinese", label: "中国語" },
	{ value: "korean", label: "韓国語" },
];

// カスタムフィルターコンポーネント
function WorksCustomFilters({ showR18Content }: { showR18Content: boolean }) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [category, setCategory] = useState(searchParams.get("category") || "all");
	const [language, setLanguage] = useState(searchParams.get("language") || "all");
	const [excludeR18, setExcludeR18] = useState(
		searchParams.get("excludeR18") === "true" || !showR18Content,
	);

	// URLパラメータを更新
	const updateUrl = useCallback(
		(newCategory: string, newLanguage: string, newExcludeR18: boolean) => {
			const params = new URLSearchParams(searchParams.toString());

			// カテゴリ
			if (newCategory && newCategory !== "all") {
				params.set("category", newCategory);
			} else {
				params.delete("category");
			}

			// 言語
			if (newLanguage && newLanguage !== "all") {
				params.set("language", newLanguage);
			} else {
				params.delete("language");
			}

			// R18フィルター
			if (newExcludeR18) {
				params.set("excludeR18", "true");
			} else {
				params.delete("excludeR18");
			}

			// ページを1にリセット
			params.set("page", "1");

			router.push(`/works?${params.toString()}`);
		},
		[searchParams, router],
	);

	// R18トグルの処理
	const handleR18Toggle = () => {
		if (!excludeR18 && !showR18Content) {
			// R18表示をONにしようとしている場合、年齢確認が必要
			// 年齢確認されていない場合はトグルを無効化
			return;
		}
		const newValue = !excludeR18;
		setExcludeR18(newValue);
		updateUrl(category, language, newValue);
	};

	// パラメータが変更されたらURLを更新
	useEffect(() => {
		if (
			category !== (searchParams.get("category") || "all") ||
			language !== (searchParams.get("language") || "all")
		) {
			updateUrl(category, language, excludeR18);
		}
	}, [category, language, excludeR18, updateUrl, searchParams]);

	return (
		<div className="flex gap-2 items-center">
			{/* カテゴリフィルター */}
			<Select value={category} onValueChange={(value) => setCategory(value)}>
				<SelectTrigger className="w-[180px]">
					<SelectValue placeholder="すべてのカテゴリ" />
				</SelectTrigger>
				<SelectContent>
					{CATEGORY_OPTIONS.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			{/* 言語フィルター */}
			<Select value={language} onValueChange={(value) => setLanguage(value)}>
				<SelectTrigger className="w-[150px]">
					<SelectValue placeholder="すべての言語" />
				</SelectTrigger>
				<SelectContent>
					{LANGUAGE_OPTIONS.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			{/* R18フィルター */}
			<div className="flex items-center gap-2">
				<Label htmlFor="r18-toggle" className="text-sm whitespace-nowrap cursor-pointer">
					R18作品表示
				</Label>
				<Switch
					id="r18-toggle"
					checked={!excludeR18}
					onCheckedChange={handleR18Toggle}
					disabled={!showR18Content && excludeR18}
				/>
			</div>
		</div>
	);
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

				return {
					page: params.page,
					limit: params.itemsPerPage,
					sort: params.sort || "newest",
					search: params.search,
					category: getValue("category"),
					language: getValue("language"),
					excludeR18: excludeR18 !== undefined ? excludeR18 : !showR18Content,
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
		<div>
			{/* カスタムフィルター */}
			<div className="mb-4">
				<WorksCustomFilters showR18Content={showR18Content} />
			</div>

			{/* 作品リスト */}
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
				itemsPerPageOptions={[12, 24, 48]}
				emptyMessage="作品が見つかりませんでした"
			/>
		</div>
	);
}

"use client";

import type { WorkListResultPlain, WorkPlainObject } from "@suzumina.click/shared-types";
import {
	ConfigurableList,
	type StandardListParams,
} from "@suzumina.click/ui/components/custom/list";
import { Input } from "@suzumina.click/ui/components/ui/input";
import { Label } from "@suzumina.click/ui/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@suzumina.click/ui/components/ui/select";
import { Switch } from "@suzumina.click/ui/components/ui/switch";
import { Search } from "lucide-react";
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

// カテゴリと言語のオプション
const CATEGORY_OPTIONS = [
	{ value: "ACN", label: "ボイス・ASMR" },
	{ value: "ADV", label: "アドベンチャー" },
	{ value: "RPG", label: "ロールプレイング" },
	{ value: "MOV", label: "動画" },
];

const LANGUAGE_OPTIONS = [
	{ value: "JPN", label: "日本語" },
	{ value: "ENG", label: "英語" },
	{ value: "ZHO", label: "簡体中文" },
	{ value: "ZHT", label: "繁體中文" },
	{ value: "KOR", label: "한국어" },
	{ value: "SPA", label: "Español" },
	{ value: "NRE", label: "言語不要" },
	{ value: "DLS", label: "DLsite公式" },
	{ value: "OTH", label: "その他言語" },
];

export default function WorksListGeneric({
	searchParams,
	initialData,
	excludeR18,
}: WorksListGenericProps) {
	const { showR18Content } = useAgeVerification();
	const router = useRouter();
	const clientSearchParams = useSearchParams();

	// フィルターの状態管理
	const [searchValue, setSearchValue] = useState(
		(searchParams.search as string) || clientSearchParams.get("search") || "",
	);
	const [category, setCategory] = useState(
		(searchParams.category as string) || clientSearchParams.get("category") || "all",
	);
	const [language, setLanguage] = useState(
		(searchParams.language as string) || clientSearchParams.get("language") || "all",
	);
	const [localExcludeR18, setLocalExcludeR18] = useState(
		excludeR18 !== undefined
			? excludeR18
			: clientSearchParams.get("excludeR18") === "true" || !showR18Content,
	);

	// URLパラメータを更新する関数
	const updateUrl = useCallback(
		(updates: Record<string, string | undefined>) => {
			const params = new URLSearchParams(clientSearchParams.toString());

			Object.entries(updates).forEach(([key, value]) => {
				if (value && value !== "all") {
					params.set(key, value);
				} else {
					params.delete(key);
				}
			});

			params.set("page", "1");
			router.push(`/works?${params.toString()}`);
		},
		[clientSearchParams, router],
	);

	// 検索のデバウンス処理
	useEffect(() => {
		const timer = setTimeout(() => {
			const params = new URLSearchParams(clientSearchParams.toString());
			if (searchValue) {
				params.set("search", searchValue);
			} else {
				params.delete("search");
			}
			params.set("page", "1");

			// URLが実際に変更される場合のみ更新
			const newUrl = `?${params.toString()}`;
			if (window.location.search !== newUrl) {
				router.push(`/works${newUrl}`);
			}
		}, 300);
		return () => clearTimeout(timer);
	}, [searchValue, clientSearchParams, router]);

	// カテゴリ変更
	const handleCategoryChange = useCallback(
		(value: string) => {
			setCategory(value);
			updateUrl({ category: value !== "all" ? value : undefined });
		},
		[updateUrl],
	);

	// 言語変更
	const handleLanguageChange = useCallback(
		(value: string) => {
			setLanguage(value);
			updateUrl({ language: value !== "all" ? value : undefined });
		},
		[updateUrl],
	);

	// R18トグルの処理
	const handleR18Toggle = useCallback(() => {
		if (!localExcludeR18 && !showR18Content) {
			return;
		}
		const newValue = !localExcludeR18;
		setLocalExcludeR18(newValue);
		updateUrl({ excludeR18: newValue ? "true" : undefined });
	}, [localExcludeR18, showR18Content, updateUrl]);

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
				return {
					page: params.page,
					limit: params.itemsPerPage,
					sort: params.sort || "newest",
					search: searchValue,
					category: category !== "all" ? category : undefined,
					language: language !== "all" ? language : undefined,
					excludeR18: localExcludeR18,
				};
			},
			fromResult: (result: unknown) => result as { items: WorkPlainObject[]; total: number },
		}),
		[searchValue, category, language, localExcludeR18],
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
			{/* カスタムヘッダー：検索とフィルターを横並び */}
			<div className="mb-6">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-3">
					{/* 検索ボックス */}
					<div className="relative flex-1 lg:max-w-md">
						<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							type="search"
							placeholder="作品タイトルで検索..."
							value={searchValue}
							onChange={(e) => setSearchValue(e.target.value)}
							className="pl-10"
						/>
					</div>

					{/* フィルター */}
					<div className="flex flex-shrink-0 flex-wrap items-center gap-2">
						{/* カテゴリフィルター */}
						<Select value={category} onValueChange={handleCategoryChange}>
							<SelectTrigger className="w-[180px]">
								<SelectValue placeholder="すべてのカテゴリ" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">すべてのカテゴリ</SelectItem>
								{CATEGORY_OPTIONS.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						{/* 言語フィルター */}
						<Select value={language} onValueChange={handleLanguageChange}>
							<SelectTrigger className="w-[150px]">
								<SelectValue placeholder="すべての言語" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">すべての言語</SelectItem>
								{LANGUAGE_OPTIONS.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						{/* R18フィルター */}
						{showR18Content && (
							<div className="flex items-center gap-2">
								<Label htmlFor="r18-toggle" className="text-sm whitespace-nowrap cursor-pointer">
									R18作品表示
								</Label>
								<Switch
									id="r18-toggle"
									checked={!localExcludeR18}
									onCheckedChange={handleR18Toggle}
									disabled={!showR18Content && localExcludeR18}
								/>
							</div>
						)}
					</div>
				</div>
			</div>

			<ConfigurableList<WorkPlainObject>
				items={transformedInitialData?.items || []}
				initialTotal={transformedInitialData?.total || 0}
				renderItem={(work) => <WorkItem work={work} />}
				fetchFn={fetchFn}
				dataAdapter={dataAdapter}
				searchable={false}
				urlSync={false}
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

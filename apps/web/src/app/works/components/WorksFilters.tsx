"use client";

import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Button } from "@suzumina.click/ui/components/ui/button";
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
import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface WorksFiltersProps {
	showR18Content: boolean;
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

export default function WorksFilters({ showR18Content }: WorksFiltersProps) {
	const router = useRouter();
	const searchParams = useSearchParams();

	// 現在のパラメータから初期値を設定
	const [searchText, setSearchText] = useState(searchParams.get("search") || "");
	const [category, setCategory] = useState(searchParams.get("category") || "all");
	const [language, setLanguage] = useState(searchParams.get("language") || "all");
	const [excludeR18, setExcludeR18] = useState(
		searchParams.get("excludeR18") === "true" || !showR18Content,
	);

	// URLパラメータを更新
	const updateUrl = useCallback(() => {
		const params = new URLSearchParams(searchParams.toString());

		// 検索テキスト
		if (searchText) {
			params.set("search", searchText);
		} else {
			params.delete("search");
		}

		// カテゴリ
		if (category && category !== "all") {
			params.set("category", category);
		} else {
			params.delete("category");
		}

		// 言語
		if (language && language !== "all") {
			params.set("language", language);
		} else {
			params.delete("language");
		}

		// R18フィルター
		if (excludeR18) {
			params.set("excludeR18", "true");
		} else {
			params.delete("excludeR18");
		}

		// ページを1にリセット
		params.set("page", "1");

		router.push(`/works?${params.toString()}`);
	}, [searchText, category, language, excludeR18, searchParams, router]);

	// 検索実行
	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		updateUrl();
	};

	// R18トグルの処理
	const handleR18Toggle = () => {
		if (!excludeR18 && !showR18Content) {
			// R18表示をONにしようとしている場合、年齢確認が必要
			// 年齢確認されていない場合はトグルを無効化
			return;
		}
		setExcludeR18(!excludeR18);
	};

	// パラメータが変更されたらURLを更新（検索以外）
	useEffect(() => {
		if (
			category !== (searchParams.get("category") || "all") ||
			language !== (searchParams.get("language") || "all") ||
			excludeR18 !== (searchParams.get("excludeR18") === "true")
		) {
			updateUrl();
		}
	}, [category, language, excludeR18, updateUrl, searchParams]);

	return (
		<div className="space-y-4 mb-6">
			{/* 検索フォーム */}
			<form onSubmit={handleSearch} className="flex gap-2">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						type="text"
						placeholder="作品タイトルで検索..."
						value={searchText}
						onChange={(e) => setSearchText(e.target.value)}
						className="pl-10"
					/>
					{searchText && (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
							onClick={() => {
								setSearchText("");
								const params = new URLSearchParams(searchParams.toString());
								params.delete("search");
								params.set("page", "1");
								router.push(`/works?${params.toString()}`);
							}}
						>
							<X className="h-4 w-4" />
						</Button>
					)}
				</div>
				<Button type="submit">検索</Button>
			</form>

			{/* フィルターオプション */}
			<div className="flex flex-wrap gap-4 items-center">
				{/* カテゴリフィルター */}
				<div className="flex items-center gap-2">
					<Label htmlFor="category-filter" className="text-sm whitespace-nowrap">
						カテゴリ:
					</Label>
					<Select value={category} onValueChange={setCategory}>
						<SelectTrigger id="category-filter" className="w-[180px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{CATEGORY_OPTIONS.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{/* 言語フィルター */}
				<div className="flex items-center gap-2">
					<Label htmlFor="language-filter" className="text-sm whitespace-nowrap">
						言語:
					</Label>
					<Select value={language} onValueChange={setLanguage}>
						<SelectTrigger id="language-filter" className="w-[150px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{LANGUAGE_OPTIONS.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

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

			{/* アクティブフィルター表示 */}
			{(searchText || category !== "all" || language !== "all" || excludeR18) && (
				<div className="flex flex-wrap gap-2 items-center">
					<span className="text-sm text-muted-foreground">フィルター:</span>
					{searchText && (
						<Badge variant="secondary" className="gap-1">
							検索: {searchText}
							<Button
								variant="ghost"
								size="sm"
								className="h-4 w-4 p-0 hover:bg-transparent"
								onClick={() => {
									setSearchText("");
									const params = new URLSearchParams(searchParams.toString());
									params.delete("search");
									params.set("page", "1");
									router.push(`/works?${params.toString()}`);
								}}
							>
								<X className="h-3 w-3" />
							</Button>
						</Badge>
					)}
					{category !== "all" && (
						<Badge variant="secondary" className="gap-1">
							{CATEGORY_OPTIONS.find((opt) => opt.value === category)?.label}
							<Button
								variant="ghost"
								size="sm"
								className="h-4 w-4 p-0 hover:bg-transparent"
								onClick={() => setCategory("all")}
							>
								<X className="h-3 w-3" />
							</Button>
						</Badge>
					)}
					{language !== "all" && (
						<Badge variant="secondary" className="gap-1">
							{LANGUAGE_OPTIONS.find((opt) => opt.value === language)?.label}
							<Button
								variant="ghost"
								size="sm"
								className="h-4 w-4 p-0 hover:bg-transparent"
								onClick={() => setLanguage("all")}
							>
								<X className="h-3 w-3" />
							</Button>
						</Badge>
					)}
					{excludeR18 && (
						<Badge variant="secondary" className="gap-1">
							全年齢のみ
							<Button
								variant="ghost"
								size="sm"
								className="h-4 w-4 p-0 hover:bg-transparent"
								onClick={() => setExcludeR18(false)}
								disabled={!showR18Content}
							>
								<X className="h-3 w-3" />
							</Button>
						</Badge>
					)}
				</div>
			)}
		</div>
	);
}

"use client";

import type { AudioReferenceCategory } from "@suzumina.click/shared-types";
import { Badge } from "@suzumina.click/ui/components/badge";
import { Button } from "@suzumina.click/ui/components/button";
import { Card, CardContent } from "@suzumina.click/ui/components/card";
import { Input } from "@suzumina.click/ui/components/input";
import { Label } from "@suzumina.click/ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@suzumina.click/ui/components/select";
import { Filter, Search, SortAsc, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const CATEGORIES: { value: AudioReferenceCategory; label: string }[] = [
	{ value: "voice", label: "ボイス" },
	{ value: "bgm", label: "BGM・音楽" },
	{ value: "se", label: "効果音" },
	{ value: "talk", label: "トーク・会話" },
	{ value: "singing", label: "歌唱" },
	{ value: "other", label: "その他" },
];

const SORT_OPTIONS = [
	{ value: "newest", label: "新着順" },
	{ value: "oldest", label: "古い順" },
	{ value: "popular", label: "人気順" },
	{ value: "mostPlayed", label: "再生数順" },
	{ value: "mostLiked", label: "いいね数順" },
];

const POPULAR_TAGS = [
	"挨拶",
	"感謝",
	"お礼",
	"応援",
	"励まし",
	"慰め",
	"優しさ",
	"朝",
	"夜",
	"おやすみ",
	"お疲れ様",
	"がんばって",
	"大丈夫",
	"かわいい",
	"おもしろい",
	"癒し",
	"元気",
	"笑い",
	"驚き",
];

export function AudioButtonSearch() {
	const router = useRouter();
	const searchParams = useSearchParams();

	// 現在の検索パラメータから初期値を設定
	const [searchText, setSearchText] = useState(searchParams.get("q") || "");
	const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "");
	const [selectedTags, setSelectedTags] = useState<string[]>(
		searchParams.get("tags")?.split(",").filter(Boolean) || [],
	);
	const [sortBy, setSortBy] = useState(searchParams.get("sort") || "newest");
	const [showAdvanced, setShowAdvanced] = useState(false);

	// タグの追加/削除
	const toggleTag = (tag: string) => {
		setSelectedTags((prev) =>
			prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
		);
	};

	// 検索実行
	const handleSearch = () => {
		const params = new URLSearchParams();

		if (searchText.trim()) {
			params.set("q", searchText.trim());
		}

		if (selectedCategory) {
			params.set("category", selectedCategory);
		}

		if (selectedTags.length > 0) {
			params.set("tags", selectedTags.join(","));
		}

		if (sortBy !== "newest") {
			params.set("sort", sortBy);
		}

		// URLを更新して検索を実行
		const queryString = params.toString();
		router.push(queryString ? `/buttons?${queryString}` : "/buttons");
	};

	// 検索条件をクリア
	const handleClear = () => {
		setSearchText("");
		setSelectedCategory("");
		setSelectedTags([]);
		setSortBy("newest");
		router.push("/buttons");
	};

	// フィルター適用中かどうか
	const hasActiveFilters =
		searchText || selectedCategory || selectedTags.length > 0 || sortBy !== "newest";

	return (
		<Card>
			<CardContent className="p-6 space-y-4">
				{/* 基本検索 */}
				<div className="flex gap-3">
					<div className="flex-1 relative">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
						<Input
							placeholder="音声ボタンを検索..."
							value={searchText}
							onChange={(e) => setSearchText(e.target.value)}
							onKeyPress={(e) => e.key === "Enter" && handleSearch()}
							className="pl-10"
						/>
					</div>

					<Button onClick={handleSearch}>
						<Search className="h-4 w-4 mr-2" />
						検索
					</Button>

					<Button
						variant="outline"
						onClick={() => setShowAdvanced(!showAdvanced)}
						className={showAdvanced ? "bg-gray-100" : ""}
					>
						<Filter className="h-4 w-4 mr-2" />
						詳細検索
					</Button>

					{hasActiveFilters && (
						<Button variant="outline" onClick={handleClear}>
							<X className="h-4 w-4 mr-2" />
							クリア
						</Button>
					)}
				</div>

				{/* 詳細検索オプション */}
				{showAdvanced && (
					<div className="space-y-4 pt-4 border-t">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{/* カテゴリ選択 */}
							<div>
								<Label htmlFor="category">カテゴリ</Label>
								<Select value={selectedCategory} onValueChange={setSelectedCategory}>
									<SelectTrigger>
										<SelectValue placeholder="すべてのカテゴリ" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="">すべてのカテゴリ</SelectItem>
										{CATEGORIES.map((category) => (
											<SelectItem key={category.value} value={category.value}>
												{category.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							{/* 並び順選択 */}
							<div>
								<Label htmlFor="sort">
									<SortAsc className="h-4 w-4 mr-1 inline" />
									並び順
								</Label>
								<Select value={sortBy} onValueChange={setSortBy}>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{SORT_OPTIONS.map((option) => (
											<SelectItem key={option.value} value={option.value}>
												{option.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						{/* タグ選択 */}
						<div>
							<Label>タグ</Label>
							<div className="space-y-2 mt-2">
								{/* 選択済みタグ */}
								{selectedTags.length > 0 && (
									<div>
										<p className="text-sm text-gray-600 mb-1">選択中:</p>
										<div className="flex flex-wrap gap-1">
											{selectedTags.map((tag) => (
												<Badge
													key={tag}
													variant="default"
													className="cursor-pointer"
													onClick={() => toggleTag(tag)}
												>
													{tag}
													<X className="h-3 w-3 ml-1" />
												</Badge>
											))}
										</div>
									</div>
								)}

								{/* 人気タグ */}
								<div>
									<p className="text-sm text-gray-600 mb-1">人気のタグ:</p>
									<div className="flex flex-wrap gap-1">
										{POPULAR_TAGS.filter((tag) => !selectedTags.includes(tag))
											.slice(0, 12)
											.map((tag) => (
												<Badge
													key={tag}
													variant="outline"
													className="cursor-pointer hover:bg-gray-100"
													onClick={() => toggleTag(tag)}
												>
													{tag}
												</Badge>
											))}
									</div>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* アクティブなフィルター表示 */}
				{hasActiveFilters && (
					<div className="pt-4 border-t">
						<p className="text-sm text-gray-600 mb-2">現在の検索条件:</p>
						<div className="flex flex-wrap gap-2">
							{searchText && <Badge variant="secondary">検索: {searchText}</Badge>}
							{selectedCategory && (
								<Badge variant="secondary">
									カテゴリ: {CATEGORIES.find((c) => c.value === selectedCategory)?.label}
								</Badge>
							)}
							{selectedTags.map((tag) => (
								<Badge key={tag} variant="secondary">
									タグ: {tag}
								</Badge>
							))}
							{sortBy !== "newest" && (
								<Badge variant="secondary">
									並び順: {SORT_OPTIONS.find((s) => s.value === sortBy)?.label}
								</Badge>
							)}
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

"use client";

import { Button } from "@suzumina.click/ui/components/ui/button";
import { Input } from "@suzumina.click/ui/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@suzumina.click/ui/components/ui/toggle-group";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { memo, useCallback, useState } from "react";

/**
 * トップページの検索フォーム。
 * SPR-103 の方針どおり横断検索は行わず、選んだ対象の一覧ページ（/buttons・/videos・/works）の
 * フリーワード検索（?q=）へ遷移させる「入口」に徹する。
 */
type SearchTarget = "buttons" | "videos" | "works";

const SEARCH_TARGETS: { value: SearchTarget; label: string }[] = [
	{ value: "buttons", label: "音声ボタン" },
	{ value: "videos", label: "動画" },
	{ value: "works", label: "作品" },
];

const HomeSearch = memo(function HomeSearch() {
	const router = useRouter();
	const [target, setTarget] = useState<SearchTarget>("buttons");
	const [query, setQuery] = useState("");

	const targetLabel = SEARCH_TARGETS.find((t) => t.value === target)?.label ?? "";

	const handleSearch = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault();
			const trimmed = query.trim();
			if (!trimmed) {
				return;
			}
			router.push(`/${target}?q=${encodeURIComponent(trimmed)}`);
		},
		[query, target, router],
	);

	return (
		<div className="max-w-md mx-auto space-y-3">
			<ToggleGroup
				type="single"
				value={target}
				// 単一選択を強制（同じ項目の再クリックで空にしない）
				onValueChange={(value) => {
					if (value) {
						setTarget(value as SearchTarget);
					}
				}}
				aria-label="検索対象"
				className="grid w-full grid-cols-3"
			>
				{SEARCH_TARGETS.map((t) => (
					// grid セル幅いっぱいに伸ばし 3 等分の segmented control にする（新 toggle-group は item を content 幅にするため）
					<ToggleGroupItem key={t.value} value={t.value} className="w-full">
						{t.label}
					</ToggleGroupItem>
				))}
			</ToggleGroup>
			<form
				onSubmit={handleSearch}
				className="flex flex-col sm:flex-row gap-4 justify-center items-center"
			>
				<div className="relative flex-1 w-full">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
					<Input
						placeholder={`${targetLabel}を検索...`}
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						aria-label={`${targetLabel}を検索`}
						className="pl-10 py-3"
						// FID改善: passive listener適用
						style={{ touchAction: "manipulation" }}
					/>
				</div>
				<Button
					type="submit"
					size="lg"
					className="w-full sm:w-auto min-h-[44px]"
					// FID改善: タッチターゲットサイズ最適化
					style={{ touchAction: "manipulation" }}
				>
					検索
				</Button>
			</form>
		</div>
	);
});

export default HomeSearch;

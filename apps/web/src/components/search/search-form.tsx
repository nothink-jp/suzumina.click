"use client";

import { Button } from "@suzumina.click/ui/components/ui/button";
import { Input } from "@suzumina.click/ui/components/ui/input";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { memo, useCallback, useState } from "react";

// Client Component として分離してFID最適化、メモ化で再レンダリングを最適化
const SearchForm = memo(function SearchForm() {
	const router = useRouter();
	const [searchQuery, setSearchQuery] = useState("");

	// パフォーマンス向上: メモ化でフォーム送信処理を最適化
	const handleSearch = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault();
			if (searchQuery.trim()) {
				router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
			}
		},
		[searchQuery, router],
	);

	return (
		<form
			onSubmit={handleSearch}
			className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-md mx-auto"
		>
			<div className="relative flex-1 w-full">
				<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
				<Input
					placeholder="ボタンや作品を検索..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
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
	);
});

export default SearchForm;

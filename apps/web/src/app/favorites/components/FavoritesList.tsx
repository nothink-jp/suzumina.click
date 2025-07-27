"use client";

import type { AudioButtonPlainObject } from "@suzumina.click/shared-types";
import { ListDisplayControls } from "@suzumina.click/ui/components/custom/list-display-controls";
import { ListPageEmptyState } from "@suzumina.click/ui/components/custom/list-page-layout";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Heart, Music } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AudioButtonWithPlayCount } from "@/components/audio/audio-button-with-play-count";

interface FavoritesListProps {
	audioButtons: AudioButtonPlainObject[];
	totalCount: number;
	currentSort: string;
}

export default function FavoritesList({
	audioButtons,
	totalCount,
	currentSort,
}: FavoritesListProps) {
	const router = useRouter();

	const handleSortChange = (value: string) => {
		router.push(`/favorites?sort=${value}`);
	};

	if (audioButtons.length === 0) {
		return (
			<ListPageEmptyState
				icon={<Heart className="mx-auto h-12 w-12" />}
				title="お気に入りがまだありません"
				description="音声ボタンをお気に入りに追加すると、ここに表示されます"
				action={
					<Button asChild>
						<Link href="/buttons">
							<Music className="h-4 w-4 mr-2" />
							音声ボタン一覧へ
						</Link>
					</Button>
				}
			/>
		);
	}

	return (
		<div>
			<ListDisplayControls
				title="お気に入り一覧"
				totalCount={totalCount}
				currentPage={1}
				totalPages={1}
				sortValue={currentSort}
				onSortChange={handleSortChange}
				sortOptions={[
					{ value: "newest", label: "新しい順" },
					{ value: "oldest", label: "古い順" },
				]}
			/>

			<div className="flex flex-wrap gap-3 items-start">
				{audioButtons.map((audioButton) => (
					<AudioButtonWithPlayCount
						key={audioButton.id}
						audioButton={audioButton}
						showFavorite={true}
						maxTitleLength={50}
						className="shadow-sm hover:shadow-md transition-all duration-200"
						initialIsFavorited={true}
					/>
				))}
			</div>
		</div>
	);
}

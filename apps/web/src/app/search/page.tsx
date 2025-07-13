import { Suspense } from "react";
import SearchPageContent from "./search-page-content";

// Generate stable skeleton keys to avoid array index warning
const SKELETON_KEYS = {
	tags: Array.from({ length: 6 }, () => `tag-skeleton-${Math.random().toString(36).substr(2, 9)}`),
	tabs: Array.from({ length: 4 }, () => `tab-skeleton-${Math.random().toString(36).substr(2, 9)}`),
	sections: Array.from(
		{ length: 3 },
		() => `section-skeleton-${Math.random().toString(36).substr(2, 9)}`,
	),
	cards: Array.from({ length: 3 }, () =>
		Array.from({ length: 3 }, () => `card-skeleton-${Math.random().toString(36).substr(2, 9)}`),
	),
};

export default function SearchPage() {
	return (
		<div className="container mx-auto px-4 py-8 max-w-6xl">
			<Suspense fallback={<SearchPageSkeleton />}>
				<SearchPageContent />
			</Suspense>
		</div>
	);
}

function SearchPageSkeleton() {
	return (
		<div className="space-y-8">
			{/* ヘッダー */}
			<div className="space-y-4">
				<div className="h-8 bg-muted rounded-lg w-48 animate-pulse" />
				<div className="h-4 bg-muted rounded w-64 animate-pulse" />
			</div>

			{/* 検索フォーム */}
			<div className="bg-suzuka-50 p-6 rounded-lg space-y-4">
				<div className="h-12 bg-muted rounded-lg animate-pulse" />
				<div className="flex flex-wrap gap-2">
					{SKELETON_KEYS.tags.map((key) => (
						<div key={key} className="h-6 bg-muted rounded-full w-16 animate-pulse" />
					))}
				</div>
			</div>

			{/* タブ */}
			<div className="flex gap-2">
				{SKELETON_KEYS.tabs.map((key) => (
					<div key={key} className="h-10 bg-muted rounded-lg w-24 animate-pulse" />
				))}
			</div>

			{/* 結果 */}
			<div className="space-y-6">
				{SKELETON_KEYS.sections.map((sectionKey, i) => (
					<div key={sectionKey} className="space-y-4">
						<div className="h-6 bg-muted rounded w-32 animate-pulse" />
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{SKELETON_KEYS.cards[i]?.map((cardKey) => (
								<div key={cardKey} className="h-32 bg-muted rounded-lg animate-pulse" />
							)) ||
								Array.from({ length: 3 }, (_, j) => {
									const fallbackKey = `fallback-card-${i}-${j}-${Math.random().toString(36).substr(2, 9)}`;
									return (
										<div key={fallbackKey} className="h-32 bg-muted rounded-lg animate-pulse" />
									);
								})}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

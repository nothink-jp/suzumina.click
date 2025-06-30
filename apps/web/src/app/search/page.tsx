import { Suspense } from "react";
import SearchPageContent from "./SearchPageContent";

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
					{Array.from({ length: 6 }).map((_, i) => (
						<div key={i} className="h-6 bg-muted rounded-full w-16 animate-pulse" />
					))}
				</div>
			</div>

			{/* タブ */}
			<div className="flex gap-2">
				{Array.from({ length: 4 }).map((_, i) => (
					<div key={i} className="h-10 bg-muted rounded-lg w-24 animate-pulse" />
				))}
			</div>

			{/* 結果 */}
			<div className="space-y-6">
				{Array.from({ length: 3 }).map((_, i) => (
					<div key={i} className="space-y-4">
						<div className="h-6 bg-muted rounded w-32 animate-pulse" />
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{Array.from({ length: 3 }).map((_, j) => (
								<div key={j} className="h-32 bg-muted rounded-lg animate-pulse" />
							))}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

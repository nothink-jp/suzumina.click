"use client";

import { LoadingSkeleton } from "@suzumina.click/ui/components/custom/loading-skeleton";
import { Suspense } from "react";
import SearchForm from "@/components/search/search-form";

/**
 * ホームページ用の検索フォーム
 * HomePageをServer Component化するためにClient Componentとして分離
 */
export function HomeSearchForm() {
	return (
		<Suspense fallback={<LoadingSkeleton variant="form" />}>
			<SearchForm />
		</Suspense>
	);
}

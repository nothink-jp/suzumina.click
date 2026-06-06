"use client";

import type { WorkListResultPlain } from "@suzumina.click/shared-types";
import {
	ListPageContent,
	ListPageHeader,
	ListPageLayout,
} from "@suzumina.click/ui/components/custom";
import { Suspense } from "react";
import WorksList from "@/app/works/components/works-list";
import { useAgeVerification } from "@/contexts/age-verification-context";

interface WorksPageClientProps {
	initialData: WorkListResultPlain;
}

export function WorksPageClient({ initialData }: WorksPageClientProps) {
	// isLoading で early return しない: AgeVerificationOverlay 側が
	// fixed inset-0 + body scroll lock で未確認ユーザーを覆う設計のため、
	// ここでさらに gate するとコンテンツ render が遅れるだけで意味がない。
	const { showR18Content } = useAgeVerification();

	return (
		<ListPageLayout>
			<ListPageHeader
				title="作品一覧"
				description={
					showR18Content
						? "涼花みなせさんの音声作品情報を参照・表示。DLsite公式サイトであなたにぴったりの作品を見つけよう"
						: "🛡️ 全年齢対象 - 年齢制限のない作品をお楽しみください。涼花みなせさんの全年齢対象作品を表示しています"
				}
			/>

			<ListPageContent>
				<Suspense
					fallback={
						<div className="text-center py-12">
							<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
							<p className="mt-2 text-muted-foreground">読み込み中...</p>
						</div>
					}
				>
					<WorksList initialData={initialData} />
				</Suspense>
			</ListPageContent>
		</ListPageLayout>
	);
}

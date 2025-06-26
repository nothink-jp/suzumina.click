import {
	ListPageContent,
	ListPageHeader,
	ListPageLayout,
} from "@suzumina.click/ui/components/custom/list-page-layout";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import AudioButtonsList from "./components/AudioButtonsList";

interface SearchParams {
	q?: string;
	category?: string;
	tags?: string;
	sort?: string;
	page?: string;
	sourceVideoId?: string;
}

interface AudioButtonsPageProps {
	searchParams: Promise<SearchParams>;
}

export default async function AudioButtonsPage({ searchParams }: AudioButtonsPageProps) {
	const resolvedSearchParams = await searchParams;

	return (
		<ListPageLayout>
			<ListPageHeader
				title="音声ボタン一覧"
				description="涼花みなせさんの音声ボタンを検索・再生できます"
			>
				<Button asChild>
					<Link href="/buttons/create">
						<Plus className="h-4 w-4 mr-2" />
						音声ボタンを作成
					</Link>
				</Button>
			</ListPageHeader>

			<ListPageContent>
				<Suspense
					fallback={
						<div className="text-center py-12">
							<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
							<p className="mt-2 text-muted-foreground">読み込み中...</p>
						</div>
					}
				>
					<AudioButtonsList searchParams={resolvedSearchParams} />
				</Suspense>
			</ListPageContent>
		</ListPageLayout>
	);
}

// メタデータ設定
export const metadata = {
	title: "音声ボタン一覧 | suzumina.click",
	description: "涼花みなせさんの音声ボタン一覧。お気に入りの音声ボタンを検索・再生できます。",
};

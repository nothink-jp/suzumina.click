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
		<div className="min-h-screen bg-gradient-to-br from-suzuka-50 via-background to-minase-50">
			{/* Header */}
			<header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-suzuka-100">
				<div className="max-w-7xl mx-auto px-4 py-6">
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-4xl font-bold bg-gradient-to-r from-suzuka-600 to-minase-600 bg-clip-text text-transparent mb-2">
								音声ボタン一覧
							</h1>
							<p className="text-muted-foreground">
								涼花みなせさんの音声ボタンを検索・再生できます
							</p>
						</div>
						<Button asChild className="bg-suzuka-500 hover:bg-suzuka-600 text-white">
							<Link href="/buttons/create">
								<Plus className="h-4 w-4 mr-2" />
								音声ボタンを作成
							</Link>
						</Button>
					</div>
				</div>
			</header>

			{/* Content */}
			<main className="max-w-7xl mx-auto px-4 py-8">
				<Suspense
					fallback={
						<div className="text-center py-12">
							<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-suzuka-500" />
							<p className="mt-2 text-muted-foreground">読み込み中...</p>
						</div>
					}
				>
					<AudioButtonsList searchParams={resolvedSearchParams} />
				</Suspense>
			</main>
		</div>
	);
}

// メタデータ設定
export const metadata = {
	title: "音声ボタン一覧 | suzumina.click",
	description: "涼花みなせさんの音声ボタン一覧。お気に入りの音声ボタンを検索・再生できます。",
};

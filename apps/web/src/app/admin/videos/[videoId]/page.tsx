import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getVideoById } from "../actions";
import VideoDetail from "../components/VideoDetail";

interface VideoDetailPageProps {
	params: Promise<{ videoId: string }>;
}

export default async function VideoDetailPage({ params }: VideoDetailPageProps) {
	const resolvedParams = await params;
	const { videoId } = resolvedParams;

	// Server Actionで動画データ取得
	const video = await getVideoById(videoId);

	// 動画が見つからない場合は404
	if (!video) {
		notFound();
	}

	return (
		<div className="container mx-auto px-4 py-8">
			<header className="mb-8">
				{/* パンくずナビゲーション */}
				<nav className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
					<Link href="/admin/videos" className="hover:text-blue-600 transition-colors">
						動画一覧
					</Link>
					<span>›</span>
					<span className="text-gray-900">{video.videoId}</span>
				</nav>

				{/* ページタイトル */}
				<div className="flex items-center justify-between">
					<h1 className="text-3xl font-bold text-gray-900">動画詳細</h1>
					<Link
						href="/admin/videos"
						className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
					>
						<svg
							className="mr-2 -ml-1 w-4 h-4"
							fill="currentColor"
							viewBox="0 0 20 20"
							role="img"
							aria-label="Back arrow"
						>
							<path
								fillRule="evenodd"
								d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
								clipRule="evenodd"
							/>
						</svg>
						一覧に戻る
					</Link>
				</div>
			</header>

			<main>
				<Suspense
					fallback={
						<div className="text-center py-12">
							<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
							<p className="mt-2 text-gray-600">動画詳細を読み込み中...</p>
						</div>
					}
				>
					<VideoDetail video={video} />
				</Suspense>
			</main>
		</div>
	);
}

// メタデータ生成
export async function generateMetadata({ params }: VideoDetailPageProps) {
	const resolvedParams = await params;
	const { videoId } = resolvedParams;

	const video = await getVideoById(videoId);

	if (!video) {
		return {
			title: "動画が見つかりません | suzumina.click",
		};
	}

	return {
		title: `${video.title} (${video.videoId}) | suzumina.click`,
		description: video.description || `${video.channelTitle}の動画「${video.title}」の詳細情報`,
	};
}

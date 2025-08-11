import { notFound } from "next/navigation";
import { getAudioButtonCount, getAudioButtonsList } from "@/app/buttons/actions";
import { getVideoById } from "../actions";
import { RelatedAudioButtonsServer } from "./components/RelatedAudioButtonsServer";
import VideoDetail from "./components/VideoDetail";

interface VideoDetailPageProps {
	params: Promise<{
		videoId: string;
	}>;
}

export default async function VideoDetailPage({ params }: VideoDetailPageProps) {
	const resolvedParams = await params;
	const { videoId } = resolvedParams;

	// 並列でデータ取得（Server Component最適化）
	const [video, audioButtonsResult, audioButtonCount] = await Promise.all([
		getVideoById(videoId),
		getAudioButtonsList({
			sourceVideoId: videoId,
			limit: 6,
			sortBy: "newest",
		}),
		getAudioButtonCount(videoId),
	]);

	if (!video) {
		notFound();
	}

	// 音声ボタンデータの準備
	const audioButtons = audioButtonsResult.success ? audioButtonsResult.data.audioButtons : [];

	return (
		<div className="min-h-screen suzuka-gradient-subtle">
			<main className="container mx-auto px-4 py-8">
				<VideoDetail
					video={video}
					initialTotalAudioCount={audioButtonCount}
					relatedAudioButtonsSlot={
						<RelatedAudioButtonsServer
							audioButtons={audioButtons}
							totalCount={audioButtonCount}
							videoId={videoId}
							video={video}
						/>
					}
				/>
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
			title: "動画が見つかりません | すずみなくりっく！",
		};
	}

	return {
		title: `${video.title} | すずみなくりっく！`,
		description: video.description || `涼花みなせさんの動画「${video.title}」の詳細ページです。`,
	};
}

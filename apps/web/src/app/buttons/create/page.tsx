import { parseDurationToSeconds } from "@suzumina.click/shared-types";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getVideoById } from "@/app/videos/actions";
import { AudioButtonCreator } from "@/components/audio/audio-button-creator";
import ProtectedRoute from "@/components/system/protected-route";

interface CreateAudioButtonPageProps {
	searchParams: Promise<{
		video_id?: string;
		start_time?: string;
	}>;
}

export default async function CreateAudioButtonPage({ searchParams }: CreateAudioButtonPageProps) {
	const resolvedSearchParams = await searchParams;

	// URLパラメータから初期値を取得
	const videoId = resolvedSearchParams.video_id;
	const startTime = resolvedSearchParams.start_time
		? Number.parseInt(resolvedSearchParams.start_time, 10)
		: 0;

	// video_idが指定されていない場合のエラーハンドリング
	if (!videoId) {
		return (
			<div className="container mx-auto px-4 py-8 max-w-4xl">
				<div className="mb-6">
					<Button variant="ghost" size="sm" asChild>
						<Link href="/buttons" className="flex items-center gap-2">
							<ArrowLeft className="h-4 w-4" />
							音声ボタン一覧に戻る
						</Link>
					</Button>
				</div>

				<div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
					<AlertCircle className="h-12 w-12 text-muted-foreground" />
					<h1 className="text-2xl font-bold text-foreground">動画IDが指定されていません</h1>
					<p className="text-muted-foreground max-w-md">
						音声ボタンを作成するには、元となるYouTube動画を指定する必要があります。
					</p>
					<div className="flex gap-3">
						<Button asChild>
							<Link href="/videos">動画一覧から選ぶ</Link>
						</Button>
						<Button variant="outline" asChild>
							<Link href="/buttons">音声ボタン一覧</Link>
						</Button>
					</div>
				</div>
			</div>
		);
	}

	// 動画情報を取得
	const videoResult = await getVideoById(videoId);

	if (!videoResult) {
		notFound();
	}

	// 動画の長さを取得（秒数に変換）
	const videoDurationSeconds = parseDurationToSeconds(videoResult.duration);
	// フォールバック: 取得失敗時は10分
	const videoDuration = videoDurationSeconds > 0 ? videoDurationSeconds : 600;

	return (
		<ProtectedRoute requireRole="member">
			<AudioButtonCreator
				videoId={videoId}
				videoTitle={videoResult.title}
				videoDuration={videoDuration}
				initialStartTime={startTime}
			/>
		</ProtectedRoute>
	);
}

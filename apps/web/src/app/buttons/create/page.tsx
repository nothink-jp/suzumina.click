import {
	canCreateAudioButton,
	getAudioButtonCreationErrorMessage,
	parseDurationToSeconds,
} from "@suzumina.click/shared-types";
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

	// 音声ボタン作成可能チェック（配信アーカイブかどうか）
	if (!canCreateAudioButton(videoResult)) {
		const errorMessage =
			getAudioButtonCreationErrorMessage(videoResult) || "この動画では音声ボタンを作成できません";

		return (
			<div className="container mx-auto px-4 py-8 max-w-4xl">
				<div className="mb-6">
					<Button variant="ghost" size="sm" asChild>
						<Link href="/videos" className="flex items-center gap-2">
							<ArrowLeft className="h-4 w-4" />
							動画一覧に戻る
						</Link>
					</Button>
				</div>

				<div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
					<AlertCircle className="h-12 w-12 text-muted-foreground" />
					<h1 className="text-2xl font-bold text-foreground">音声ボタンを作成できません</h1>
					<p className="text-muted-foreground max-w-md">{errorMessage}</p>
					<p className="text-sm text-muted-foreground">動画タイトル: {videoResult.title}</p>
					<div className="flex gap-3">
						<Button asChild>
							<Link href="/videos">配信アーカイブを選ぶ</Link>
						</Button>
						<Button variant="outline" asChild>
							<a
								href={`https://youtube.com/watch?v=${videoId}`}
								target="_blank"
								rel="noopener noreferrer"
							>
								YouTubeで見る
							</a>
						</Button>
					</div>
				</div>
			</div>
		);
	}

	// 埋め込み制限チェック
	if (videoResult.status?.embeddable === false) {
		return (
			<div className="container mx-auto px-4 py-8 max-w-4xl">
				<div className="mb-6">
					<Button variant="ghost" size="sm" asChild>
						<Link href="/videos" className="flex items-center gap-2">
							<ArrowLeft className="h-4 w-4" />
							動画一覧に戻る
						</Link>
					</Button>
				</div>

				<div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
					<AlertCircle className="h-12 w-12 text-destructive" />
					<h1 className="text-2xl font-bold text-foreground">
						この動画は埋め込みが制限されています
					</h1>
					<p className="text-muted-foreground max-w-md">
						動画の所有者によって埋め込みが無効にされているため、音声ボタンを作成できません。
					</p>
					<p className="text-sm text-muted-foreground">動画タイトル: {videoResult.title}</p>
					<div className="flex gap-3">
						<Button asChild>
							<Link href="/videos">他の動画を選ぶ</Link>
						</Button>
						<Button variant="outline" asChild>
							<a
								href={`https://youtube.com/watch?v=${videoId}`}
								target="_blank"
								rel="noopener noreferrer"
							>
								YouTubeで見る
							</a>
						</Button>
					</div>
				</div>
			</div>
		);
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

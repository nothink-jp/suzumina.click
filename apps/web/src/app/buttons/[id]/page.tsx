import { Card, CardContent, CardHeader, CardTitle } from "@suzumina.click/ui/components/ui/card";
import { Eye } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getAudioButtonById } from "@/app/buttons/actions";
import {
	AudioButtonDetailHeader,
	AudioButtonDetailMainContent,
	AudioButtonDetailSidebar,
	RelatedAudioButtons,
} from "@/components/audio-button-detail";

interface AudioButtonDetailPageProps {
	params: Promise<{
		id: string;
	}>;
}

// 動的metadata生成
export async function generateMetadata({ params }: AudioButtonDetailPageProps): Promise<Metadata> {
	const resolvedParams = await params;

	let result: Awaited<ReturnType<typeof getAudioButtonById>>;
	try {
		result = await getAudioButtonById(resolvedParams.id);
	} catch (_error) {
		return {
			title: "音声ボタンが見つかりません",
			description: "指定された音声ボタンは存在しないか、削除された可能性があります。",
		};
	}

	if (!result.success) {
		return {
			title: "音声ボタンが見つかりません",
			description: "指定された音声ボタンは存在しないか、削除された可能性があります。",
		};
	}

	const audioButton = result.data;
	const duration = (audioButton.endTime || audioButton.startTime) - audioButton.startTime;
	const description =
		audioButton.description ||
		`涼花みなせさんの音声ボタン「${audioButton.buttonText}」。${duration.toFixed(1)}秒の音声をお楽しみください。${audioButton.creatorName}さんが作成しました。`;

	return {
		title: `${audioButton.buttonText}`,
		description: description,
		keywords: [
			"涼花みなせ",
			"音声ボタン",
			audioButton.buttonText,
			...(audioButton.tags || []),
			"YouTube",
			"音声切り抜き",
		],
		openGraph: {
			title: `${audioButton.buttonText} | すずみなくりっく！`,
			description: description,
			type: "article",
			url: `https://suzumina.click/buttons/${audioButton.id}`,
			images: [
				{
					url: `https://img.youtube.com/vi/${audioButton.videoId}/maxresdefault.jpg`,
					width: 1280,
					height: 720,
					alt: `${audioButton.buttonText} - 涼花みなせ音声ボタン`,
				},
			],
			publishedTime: audioButton.createdAt,
			authors: [audioButton.creatorName],
		},
		twitter: {
			card: "summary_large_image",
			title: `${audioButton.buttonText} | すずみなくりっく！`,
			description: description,
			images: [`https://img.youtube.com/vi/${audioButton.videoId}/maxresdefault.jpg`],
		},
		alternates: {
			canonical: `/buttons/${audioButton.id}`,
		},
	};
}

export default async function AudioButtonDetailPage({ params }: AudioButtonDetailPageProps) {
	const resolvedParams = await params;

	let result: Awaited<ReturnType<typeof getAudioButtonById>>;
	try {
		result = await getAudioButtonById(resolvedParams.id);
	} catch (_error) {
		notFound();
	}

	if (!result.success) {
		notFound();
	}

	const audioButton = result.data;

	// per-user 状態（お気に入り/高低評価/編集権限）はここで取得しない。
	// 純公開 shell として session を読まず、各 client island が自分の状態を解決する（SPR-223）。
	// これにより詳細ページを共有キャッシュ可（public）へ戻せる（SPR-222/226 の per-user SSR 漏洩を解消）。

	return (
		<div className="min-h-screen">
			{/* パンくずナビゲーション */}
			<AudioButtonDetailHeader title={audioButton.buttonText} />

			<div className="container mx-auto px-4 pb-8 max-w-7xl">
				{/* メインコンテンツ: グリッドレイアウト */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
					{/* 左側: 音声ボタン詳細 */}
					<AudioButtonDetailMainContent audioButton={audioButton} />

					{/* 右側: 動画カード + ユーザーカード */}
					<AudioButtonDetailSidebar
						videoId={audioButton.videoId}
						videoTitle={audioButton.videoTitle}
						createdBy={audioButton.creatorId}
						createdByName={audioButton.creatorName}
					/>
				</div>

				{/* 関連音声ボタン */}
				<Suspense
					fallback={
						<Card className="bg-card/80 backdrop-blur-sm shadow-lg border-0">
							<CardHeader>
								<CardTitle className="text-lg">関連音声ボタン</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="flex items-center justify-center py-8">
									<Eye className="h-8 w-8 animate-pulse text-muted-foreground" />
								</div>
							</CardContent>
						</Card>
					}
				>
					<RelatedAudioButtons
						currentId={audioButton.id}
						videoId={audioButton.videoId}
						tags={audioButton.tags || []}
					/>
				</Suspense>
			</div>
		</div>
	);
}

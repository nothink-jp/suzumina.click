import { Card, CardContent, CardHeader, CardTitle } from "@suzumina.click/ui/components/ui/card";
import { Eye } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getFavoritesStatusAction } from "@/actions/favorites";
import { getAudioButtonById } from "@/app/buttons/actions";
import { auth } from "@/auth";
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
		`涼花みなせさんの音声ボタン「${audioButton.title}」。${duration.toFixed(1)}秒の音声をお楽しみください。${audioButton.createdByName}さんが作成しました。`;

	return {
		title: `${audioButton.title}`,
		description: description,
		keywords: [
			"涼花みなせ",
			"音声ボタン",
			audioButton.title,
			...(audioButton.tags || []),
			"YouTube",
			"音声切り抜き",
		],
		openGraph: {
			title: `${audioButton.title} | すずみなくりっく！`,
			description: description,
			type: "article",
			url: `https://suzumina.click/buttons/${audioButton.id}`,
			images: [
				{
					url: `https://img.youtube.com/vi/${audioButton.sourceVideoId}/maxresdefault.jpg`,
					width: 1280,
					height: 720,
					alt: `${audioButton.title} - 涼花みなせ音声ボタン`,
				},
			],
			publishedTime: audioButton.createdAt,
			authors: [audioButton.createdByName],
		},
		twitter: {
			card: "summary_large_image",
			title: `${audioButton.title} | すずみなくりっく！`,
			description: description,
			images: [`https://img.youtube.com/vi/${audioButton.sourceVideoId}/maxresdefault.jpg`],
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

	// ユーザーのセッションを取得
	const session = await auth();
	const isAuthenticated = !!session?.user;

	// お気に入り状態を取得（認証済みの場合のみ）
	let isFavorited = false;
	let isLiked = false;
	let isDisliked = false;

	if (isAuthenticated && session?.user?.discordId) {
		try {
			const favoritesStatusMap = await getFavoritesStatusAction([audioButton.id]);
			isFavorited = favoritesStatusMap.get(audioButton.id) || false;
		} catch (_error) {
			// お気に入り状態の取得に失敗した場合はfalse
			isFavorited = false;
		}

		// 高評価・低評価状態を取得
		try {
			const { getLikeDislikeStatusAction } = await import("@/actions/dislikes");
			const likeDislikeStatusMap = await getLikeDislikeStatusAction([audioButton.id]);
			const status = likeDislikeStatusMap.get(audioButton.id) || {
				isLiked: false,
				isDisliked: false,
			};
			isLiked = status.isLiked;
			isDisliked = status.isDisliked;
		} catch (_error) {
			// 高評価・低評価状態の取得に失敗した場合はfalse
			isLiked = false;
			isDisliked = false;
		}
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-suzuka-50 via-background to-minase-50">
			{/* パンくずナビゲーション */}
			<AudioButtonDetailHeader title={audioButton.title} />

			<div className="container mx-auto px-4 pb-8 max-w-7xl">
				{/* メインコンテンツ: グリッドレイアウト */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
					{/* 左側: 音声ボタン詳細 */}
					<AudioButtonDetailMainContent
						audioButton={audioButton}
						session={session}
						isAuthenticated={isAuthenticated}
						isFavorited={isFavorited}
						isLiked={isLiked}
						isDisliked={isDisliked}
					/>

					{/* 右側: 動画カード + ユーザーカード */}
					<AudioButtonDetailSidebar
						videoId={audioButton.sourceVideoId}
						videoTitle={audioButton.sourceVideoTitle}
						createdBy={audioButton.createdBy}
						createdByName={audioButton.createdByName}
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
						videoId={audioButton.sourceVideoId}
						tags={audioButton.tags || []}
					/>
				</Suspense>
			</div>
		</div>
	);
}

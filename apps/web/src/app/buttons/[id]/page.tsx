import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getAudioButtonById } from "@/app/buttons/actions";
import { AudioButtonHero } from "@/components/audio-button-detail/audio-button-hero";
import { AudioButtonHeroHeader } from "@/components/audio-button-detail/audio-button-hero-header";
import { CreatorCard } from "@/components/audio-button-detail/creator-card";
import { DetailTagCard } from "@/components/audio-button-detail/detail-tag-card";
import { ListCtaCard } from "@/components/audio-button-detail/list-cta-card";
import { RelatedAudioButtons } from "@/components/audio-button-detail/related-audio-buttons";
import { SourceVideoCard } from "@/components/audio-button-detail/source-video-card";

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
			robots: { index: false, follow: false },
		};
	}

	if (!result.success) {
		return {
			title: "音声ボタンが見つかりません",
			description: "指定された音声ボタンは存在しないか、削除された可能性があります。",
			robots: { index: false, follow: false },
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
		// og:image / twitter:image は手書きしない。同ディレクトリの opengraph-image.tsx
		// （動的生成・SPR-249）から両タグとも自動出力される
		openGraph: {
			title: `${audioButton.buttonText} | すずみなくりっく！`,
			description: description,
			type: "article",
			url: `https://suzumina.click/buttons/${audioButton.id}`,
			publishedTime: audioButton.createdAt,
			authors: [audioButton.creatorName],
		},
		twitter: {
			card: "summary_large_image",
			title: `${audioButton.buttonText} | すずみなくりっく！`,
			description: description,
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

	// per-user 状態（お気に入り/高低評価/作成者判定）はここで取得しない。
	// 純公開 shell として session を読まず、各 client island が自分の状態を解決する（SPR-223）。
	// これにより詳細ページを共有キャッシュ可（public）のまま保つ（SPR-222/226 の per-user SSR 漏洩対策）。

	return (
		<div className="min-h-screen">
			{/* ヒーロー: 押すことが主役（SPR-255） */}
			<section className="suzuka-gradient-radial relative px-4 pt-5 pb-8 text-center sm:px-6 sm:pt-11 sm:pb-[52px]">
				<div className="relative mx-auto max-w-[1240px]">
					<AudioButtonHeroHeader
						audioButtonId={audioButton.id}
						buttonText={audioButton.buttonText}
						createdBy={audioButton.creatorId}
					/>
					<div className="h-[18px] sm:h-[26px]" />
					<AudioButtonHero audioButton={audioButton} />
				</div>
			</section>

			{/* 本文: モバイルは 関連 → 元動画 → タグ → 作成者 → 一覧誘導 の順に積む。
			    lg 以上は main + 右レール（360px）の2カラム（wrapper を contents 化して order で制御） */}
			<div className="mx-auto flex max-w-[1240px] flex-col gap-[18px] px-4 pt-6 pb-12 sm:px-8 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-8 lg:pt-9 lg:pb-14">
				<div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-7">
					<div className="order-1 min-w-0 lg:order-none">
						<Suspense fallback={null}>
							<RelatedAudioButtons
								currentId={audioButton.id}
								videoId={audioButton.videoId}
								tags={audioButton.tags || []}
							/>
						</Suspense>
					</div>
					<div className="order-5 lg:order-none">
						<Suspense fallback={null}>
							<ListCtaCard />
						</Suspense>
					</div>
				</div>

				<aside className="contents lg:flex lg:flex-col lg:gap-[18px]">
					<div className="order-2 lg:order-none">
						<Suspense fallback={null}>
							<SourceVideoCard
								videoId={audioButton.videoId}
								videoTitle={audioButton.videoTitle}
								startTime={audioButton.startTime}
								endTime={audioButton.endTime || audioButton.startTime}
							/>
						</Suspense>
					</div>
					<div className="order-3 lg:order-none">
						<DetailTagCard tags={audioButton.tags || []} />
					</div>
					<div className="order-4 lg:order-none">
						<Suspense fallback={null}>
							<CreatorCard
								createdBy={audioButton.creatorId}
								createdByName={audioButton.creatorName}
							/>
						</Suspense>
					</div>
				</aside>
			</div>
		</div>
	);
}

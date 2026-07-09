import type { AudioButton } from "@suzumina.click/shared-types";
import { YoutubeIcon } from "@suzumina.click/ui/components/custom/youtube-icon";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@suzumina.click/ui/components/ui/card";
import { Flame, Tag } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { getAudioButtonsList } from "@/app/buttons/actions";
import { AudioButtonWithPlayCount } from "@/components/audio/audio-button-with-play-count";

/**
 * 詳細ページの関連音声ボタン群（SPR-250 で再生ハブ化）。
 * X共有・検索から着地した訪問者が「1ボタン聴いて終わり」にならないよう、
 * 同じ動画 → 同じタグ → （両方無ければ）人気、の順で必ず次に押せるボタンを出す。
 * 同一動画クエリは既存の videoId+createdAt 複合インデックスを使う（sortBy を変えると新規インデックスが要る点に注意）。
 * タグ・人気は in-memory フィルタ / 単一 orderBy のため複合インデックス不要。
 */

interface RelatedAudioButtonsProps {
	currentId: string;
	videoId: string;
	tags: string[];
}

const SECTION_LIMIT = 12;

/** 取得失敗はセクション空扱いにしてページ表示を継続する */
async function fetchButtons(
	query: Parameters<typeof getAudioButtonsList>[0],
): Promise<AudioButton[]> {
	const result = await getAudioButtonsList(query).catch(() => null);
	return result?.success ? result.data.audioButtons : [];
}

function RelatedSection({
	icon,
	title,
	buttons,
	moreHref,
	moreLabel,
}: {
	icon: ReactNode;
	title: string;
	buttons: AudioButton[];
	moreHref: string;
	moreLabel: string;
}) {
	return (
		<Card className="bg-card/80 backdrop-blur-sm shadow-lg border-0">
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-lg">
					{icon}
					{title}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="flex flex-wrap gap-3 items-start">
					{buttons.map((audioButton) => (
						<AudioButtonWithPlayCount
							key={audioButton.id}
							audioButton={audioButton}
							showFavorite={true}
							maxTitleLength={50}
							className="shadow-sm hover:shadow-md transition-all duration-200"
						/>
					))}
				</div>
				<div className="mt-6 text-center">
					<Button
						variant="outline"
						size="sm"
						asChild
						className="border-border text-primary hover:bg-accent"
					>
						<Link href={moreHref}>{moreLabel}</Link>
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

export async function RelatedAudioButtons({ currentId, videoId, tags }: RelatedAudioButtonsProps) {
	// +1 は現在のボタン自身が結果に含まれる分の余裕
	const [sameVideoAll, sameTagsAll] = await Promise.all([
		fetchButtons({
			videoId,
			limit: SECTION_LIMIT + 1,
			sortBy: "newest",
			onlyPublic: true,
		}),
		tags.length > 0
			? fetchButtons({
					tags,
					limit: SECTION_LIMIT + 1,
					sortBy: "mostPlayed",
					onlyPublic: true,
				})
			: Promise.resolve([]),
	]);

	const sameVideo = sameVideoAll.filter((b) => b.id !== currentId).slice(0, SECTION_LIMIT);
	const shownIds = new Set([currentId, ...sameVideo.map((b) => b.id)]);
	const sameTags = sameTagsAll.filter((b) => !shownIds.has(b.id)).slice(0, SECTION_LIMIT);

	// 両セクションとも空なら人気ボタンで受ける（外部流入の行き止まり防止）
	let popular: AudioButton[] = [];
	if (sameVideo.length === 0 && sameTags.length === 0) {
		const popularAll = await fetchButtons({
			limit: SECTION_LIMIT + 1,
			sortBy: "mostPlayed",
			onlyPublic: true,
		});
		popular = popularAll.filter((b) => b.id !== currentId).slice(0, SECTION_LIMIT);
	}

	if (sameVideo.length === 0 && sameTags.length === 0 && popular.length === 0) {
		return null;
	}

	return (
		<div className="space-y-8">
			{sameVideo.length > 0 && (
				<RelatedSection
					icon={<YoutubeIcon className="h-5 w-5 text-primary" />}
					title="同じ動画の音声ボタン"
					buttons={sameVideo}
					moreHref={`/buttons?videoId=${encodeURIComponent(videoId)}`}
					moreLabel="この動画のボタンをもっと見る"
				/>
			)}
			{sameTags.length > 0 && (
				<RelatedSection
					icon={<Tag className="h-5 w-5 text-primary" />}
					title="同じタグの音声ボタン"
					buttons={sameTags}
					moreHref={`/buttons?tags=${encodeURIComponent(tags.join("|"))}`}
					moreLabel="同じタグのボタンをもっと見る"
				/>
			)}
			{popular.length > 0 && (
				<RelatedSection
					icon={<Flame className="h-5 w-5 text-primary" />}
					title="人気の音声ボタン"
					buttons={popular}
					moreHref="/buttons"
					moreLabel="音声ボタン一覧を見る"
				/>
			)}
		</div>
	);
}

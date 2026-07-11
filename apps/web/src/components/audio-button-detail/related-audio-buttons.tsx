import type { AudioButton } from "@suzumina.click/shared-types";
import Link from "next/link";
import { getAudioButtonsList } from "@/app/buttons/actions";
import { AudioButtonWithPlayCount } from "@/components/audio/audio-button-with-play-count";

/**
 * 詳細ページの関連音声ボタン群（SPR-250 で再生ハブ化・SPR-255 でヒーロー構成のデザインに刷新）。
 * X共有・検索から着地した訪問者が「1ボタン聴いて終わり」にならないよう、
 * この動画 → 同じタグ → （両方無ければ）人気、の順で必ず次に押せるボタンを出す。
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
	title,
	buttons,
	moreHref,
	moreLabel,
}: {
	title: string;
	buttons: AudioButton[];
	moreHref: string;
	moreLabel: string;
}) {
	return (
		<section>
			<div className="mb-3.5 flex items-baseline gap-2.5">
				<h2 className="text-[19px] font-extrabold">{title}</h2>
				<span className="text-[13px] font-bold text-suzuka-600">{buttons.length}個</span>
			</div>
			<div className="flex flex-wrap items-start gap-3">
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
			<div className="mt-3.5">
				<Link href={moreHref} className="text-[13px] font-bold text-primary hover:text-suzuka-700">
					{moreLabel} →
				</Link>
			</div>
		</section>
	);
}

export async function RelatedAudioButtons({ currentId, videoId, tags }: RelatedAudioButtonsProps) {
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
					// 同一動画セクションとの重複排除で減る分の余裕。タグ経路は in-memory フィルタ
					// （全件取得→スライス）のため limit を増やしても Firestore reads は増えない
					limit: SECTION_LIMIT * 2,
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
		<div className="flex flex-col gap-7">
			{sameVideo.length > 0 && (
				<RelatedSection
					title="この動画のボタン"
					buttons={sameVideo}
					moreHref={`/buttons?videoId=${encodeURIComponent(videoId)}`}
					moreLabel="この動画のボタンをもっと見る"
				/>
			)}
			{sameTags.length > 0 && (
				<RelatedSection
					title="同じタグのボタン"
					buttons={sameTags}
					moreHref={`/buttons?tags=${encodeURIComponent(tags.join("|"))}`}
					moreLabel="同じタグのボタンをもっと見る"
				/>
			)}
			{popular.length > 0 && (
				<RelatedSection
					title="人気のボタン"
					buttons={popular}
					moreHref="/buttons"
					moreLabel="音声ボタン一覧を見る"
				/>
			)}
		</div>
	);
}

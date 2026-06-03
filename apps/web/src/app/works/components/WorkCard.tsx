import type { WorkPlainObject } from "@suzumina.click/shared-types";
import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Calendar, ExternalLink, Tag, Users } from "lucide-react";
import Link from "next/link";
import React from "react";
import ThumbnailImage from "@/components/ui/thumbnail-image";
import { normalizeJstDateString } from "@/utils/date-format";

interface WorkCardProps {
	work: WorkPlainObject;
	variant?: "default" | "compact";
	priority?: boolean; // LCP画像最適化用
}

// 発売日フォーマット関数（"YYYY/MM/DD" 表示）。
//
// 正本: DLsite の発売日（work.releaseDate）は JST の壁時計。表示も JST の暦日のみ。
// パースは TZ に依存してはならない。`new Date("2023-05-06 16:00:00")` のように TZ 指定の
// 無い文字列を `new Date()` に渡すと実行環境の TZ で解釈され、SSR(本番=UTC)とクライアント(JST)で
// 暦日がズレて hydration mismatch (React #418) を起こす（SPR-135）。
//
// 入力解釈は date-format.ts の `normalizeJstDateString` に集約（TZ-less は JST、Z/オフセット付きは
// 絶対時刻として尊重）。日付のみの曖昧さの無い表記（年月日・スラッシュ）は文字列から直接取り出す。
const pad2 = (value: string | undefined) => (value ?? "").padStart(2, "0");

export const formatDate = (dateString: string) => {
	// "YYYY年M月D日"（日付のみ・曖昧さ無し）
	const jp = dateString.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
	if (jp) {
		return `${jp[1]}/${pad2(jp[2])}/${pad2(jp[3])}`;
	}
	// "YYYY/M/D..."（日付のみ・曖昧さ無し）
	const slash = dateString.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/);
	if (slash) {
		return `${slash[1]}/${pad2(slash[2])}/${pad2(slash[3])}`;
	}
	// ISO / 日時文字列。Z・オフセットの有無は date-format.ts と同一規則で解決し、
	// JST の暦日に整形する（TZ 非依存・決定論的）。
	const date = new Date(normalizeJstDateString(dateString));
	if (!Number.isNaN(date.getTime())) {
		return date.toLocaleDateString("ja-JP", {
			timeZone: "Asia/Tokyo",
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
		});
	}
	// パースできない場合は元の文字列を返す
	return dateString;
};

// 声優情報の表示コンポーネントを抽出
interface VoiceActor {
	id?: string;
	name: string;
}

const VoiceActorsDisplay = ({ voiceActors }: { voiceActors: VoiceActor[] }) => {
	if (voiceActors.length === 0) return null;

	return (
		<div className="flex items-center gap-1 mb-2 text-xs">
			<Users className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
			<span className="text-muted-foreground">CV:</span>
			<span className="text-foreground font-medium line-clamp-1">
				{voiceActors.slice(0, 2).map((va, index) => (
					<React.Fragment key={va.id || va.name}>
						{index > 0 && ", "}
						<Link
							href={`/creators/${encodeURIComponent(va.id || va.name)}`}
							className="hover:underline"
						>
							{va.name}
						</Link>
					</React.Fragment>
				))}
				{voiceActors.length > 2 && " 他"}
			</span>
		</div>
	);
};

// 発売日表示の取得
const getDisplayDate = (work: WorkPlainObject) => {
	const releaseDate = work.releaseDate;
	return releaseDate ? formatDate(releaseDate) : "不明";
};

// 価格表示コンポーネント
const PriceDisplay = ({
	currentPrice,
	originalPrice,
	isOnSale,
	discount,
}: {
	currentPrice: number;
	originalPrice: number;
	isOnSale: boolean;
	discount?: number;
}) => {
	if (isOnSale && originalPrice) {
		return (
			<div className="flex items-center gap-2">
				<span className="text-lg font-bold text-destructive">
					¥{currentPrice.toLocaleString("ja-JP")}
				</span>
				<span className="text-sm text-muted-foreground line-through">
					¥{originalPrice.toLocaleString("ja-JP")}
				</span>
				<Badge className="bg-destructive/10 text-destructive text-xs">{discount}% OFF</Badge>
			</div>
		);
	}
	return (
		<span className="text-lg font-bold text-foreground">
			¥{currentPrice.toLocaleString("ja-JP")}
		</span>
	);
};

export default function WorkCard({ work, variant = "default", priority = false }: WorkCardProps) {
	const isCompact = variant === "compact";

	// 価格表示の計算
	const currentPrice = work.price?.current ?? 0;
	const originalPrice = work.price?.original ?? 0;
	// セール判定は「実割引（current < original）」を正本とする。
	// discount フィールドはセール終了後も古い値が残りうるため判定に使わない（軸3: 正本の整合性）。
	const isOnSale = work.price?.isDiscounted ?? false;

	// ランキング情報は現在利用できません
	const latestRank = undefined;

	// 発売日
	const displayDate = getDisplayDate(work);

	return (
		<article
			className="hover:shadow-lg transition-shadow border bg-card text-card-foreground rounded-lg shadow-sm h-full flex flex-col"
			aria-labelledby={`work-title-${work.id}`}
		>
			<div className="flex flex-col h-full">
				<div className="relative">
					<div className="aspect-[4/3] overflow-hidden rounded-t-lg">
						<Link
							href={`/works/${work.id}`}
							className="block w-full h-full group"
							aria-label={`${work.title}の詳細を見る`}
						>
							<ThumbnailImage
								src={work.highResImageUrl || work.thumbnailUrl || "/placeholder.svg"}
								fallbackSrc={work.thumbnailUrl || "/placeholder.svg"}
								alt={`${work.title}のサムネイル画像`}
								className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
								priority={priority}
								width={384}
								height={288}
								sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
								quality={priority ? 90 : 80}
								loading={priority ? "eager" : "lazy"}
							/>
						</Link>
					</div>
					{/* セール中バッジ */}
					{isOnSale && (
						<div className="absolute top-2 left-2">
							<Badge className="bg-destructive text-white" aria-label="セール中の商品">
								セール中
							</Badge>
						</div>
					)}
					{/* ランキングバッジ */}
					{latestRank && (
						<div className="absolute top-2 right-2">
							<Badge className="bg-background text-white" aria-label={`ランキング${latestRank}位`}>
								#{latestRank}位
							</Badge>
						</div>
					)}
				</div>
				<div className="p-4 flex flex-col flex-1">
					<Link
						href={`/works/${work.id}`}
						className="block group"
						aria-label={`${work.title}の詳細を見る`}
					>
						<h3
							id={`work-title-${work.id}`}
							className={`font-semibold mb-1 line-clamp-2 group-hover:text-foreground/80 transition-colors text-foreground ${
								isCompact ? "text-base" : "text-sm"
							}`}
						>
							{work.title}
						</h3>
					</Link>
					{work.circleId ? (
						<Link
							href={`/circles/${work.circleId}`}
							className="text-sm text-muted-foreground hover:text-primary transition-colors mb-2 block"
						>
							{work.circle}
						</Link>
					) : (
						<p className="text-sm text-muted-foreground mb-2">{work.circle}</p>
					)}

					{/* ジャンル表示 */}
					<ul className="flex flex-wrap gap-1 mb-2" aria-label="作品ジャンル">
						{Array.isArray(work.genres) &&
							work.genres.slice(0, 3).map((genre: string) => (
								<li key={genre}>
									<Badge
										variant="outline"
										className="text-xs border border-primary/20 text-primary bg-primary/5 flex items-center gap-1"
									>
										<Tag className="h-3 w-3" aria-hidden="true" />
										{genre}
									</Badge>
								</li>
							))}
					</ul>

					{/* 声優情報 */}
					<VoiceActorsDisplay voiceActors={work.creators?.voiceActors || []} />

					{/* 発売日 */}
					<div className="flex items-center text-sm mb-2">
						<Calendar className="h-4 w-4 text-muted-foreground mr-1" aria-hidden="true" />
						<time dateTime={work.releaseDate} title={`発売日: ${displayDate}`}>
							<span className="text-foreground">{displayDate}</span>
						</time>
					</div>

					{/* 価格表示 */}
					{!isCompact && (
						<div className="mb-3">
							<div className="flex items-center justify-between">
								<div>
									<PriceDisplay
										currentPrice={currentPrice}
										originalPrice={originalPrice}
										isOnSale={isOnSale}
										discount={work.price?.discount}
									/>
								</div>
							</div>
						</div>
					)}

					{/* アクションボタン */}
					<fieldset className="flex gap-2 mt-auto" aria-label="作品アクション">
						<Button
							size="sm"
							variant="outline"
							className="flex-1 border text-muted-foreground hover:bg-accent min-h-[44px] text-sm"
							asChild
						>
							<Link href={`/works/${work.id}`} aria-describedby={`work-title-${work.id}`}>
								詳細{isCompact ? "を見る" : ""}
							</Link>
						</Button>
						<Button
							size="sm"
							className="bg-destructive hover:bg-destructive/90 text-white min-h-[44px] min-w-[44px] px-3"
							asChild
						>
							<a
								href={work.workUrl}
								target="_blank"
								rel="noopener noreferrer"
								aria-label={`${work.title}をDLsiteで購入`}
							>
								<ExternalLink className="h-4 w-4" aria-hidden="true" />
							</a>
						</Button>
					</fieldset>
				</div>
			</div>
		</article>
	);
}

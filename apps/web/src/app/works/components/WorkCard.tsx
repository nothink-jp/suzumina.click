import type { FrontendDLsiteWorkData } from "@suzumina.click/shared-types/src/work";
import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Calendar, ExternalLink, Tag, Users } from "lucide-react";
import Link from "next/link";
import ThumbnailImage from "@/components/ui/thumbnail-image";

interface WorkCardProps {
	work: FrontendDLsiteWorkData;
	variant?: "default" | "compact";
	priority?: boolean; // LCP画像最適化用
}

export default function WorkCard({ work, variant = "default", priority = false }: WorkCardProps) {
	const isCompact = variant === "compact";

	// 価格表示の計算
	const currentPrice = work.price.current;
	const originalPrice = work.price.original;
	const isOnSale = work.price.discount && work.price.discount > 0;

	// 日付フォーマット
	const formatDate = (dateString: string) => {
		try {
			// 日本語形式の日付（例: "2024年04月27日"）をパース
			const japaneseMatch = dateString.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
			if (japaneseMatch) {
				const [, year, month, day] = japaneseMatch;
				const date = new Date(Number(year), Number(month) - 1, Number(day));
				return date.toLocaleDateString("ja-JP", {
					timeZone: "Asia/Tokyo",
					year: "numeric",
					month: "2-digit",
					day: "2-digit",
				});
			}

			// ISO形式やその他の形式を試す
			const date = new Date(dateString);
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
		} catch {
			return dateString;
		}
	};

	// ランキング情報は現在利用できません
	const latestRank = undefined;

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
								sizes="(max-width: 400px) 100vw, (max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
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
				<div className="p-3 sm:p-4 flex flex-col flex-1">
					<Link
						href={`/works/${work.id}`}
						className="block group"
						aria-label={`${work.title}の詳細を見る`}
					>
						<h4
							id={`work-title-${work.id}`}
							className={`font-semibold mb-1 line-clamp-2 group-hover:text-foreground/80 transition-colors text-foreground ${
								isCompact ? "text-sm sm:text-base" : "text-xs sm:text-sm"
							}`}
						>
							{work.title}
						</h4>
					</Link>
					<p className="text-xs sm:text-sm text-muted-foreground mb-2">{work.circle}</p>

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

					{/* 声優情報（ID付き対応） */}
					{(() => {
						// Individual Info API準拠のクリエイター情報を優先使用
						const voiceActors = work.creaters?.voice_by || [];
						const legacyVoiceActors = work.voiceActors || [];

						// ID付き情報がある場合はそれを使用、なければレガシー情報
						const displayVoiceActors =
							voiceActors.length > 0 ? voiceActors.map((actor) => actor.name) : legacyVoiceActors;

						if (displayVoiceActors.length === 0) return null;

						return (
							<div className="flex items-center gap-1 mb-2 text-xs">
								<Users className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
								<span className="text-muted-foreground">CV:</span>
								<span className="text-foreground font-medium line-clamp-1">
									{displayVoiceActors.slice(0, 2).join(", ")}
									{displayVoiceActors.length > 2 && " 他"}
								</span>
							</div>
						);
					})()}

					{/* 発売日 */}
					<div className="flex items-center text-xs sm:text-sm mb-2">
						<Calendar className="h-4 w-4 text-muted-foreground mr-1" aria-hidden="true" />
						{(() => {
							// 統合された releaseDate を優先、次に registDate を使用
							const releaseDate = work.releaseDate;
							const displayDate = releaseDate ? formatDate(releaseDate) : "不明";

							return (
								<time dateTime={releaseDate} title={`発売日: ${displayDate}`}>
									<span className="text-foreground">{displayDate}</span>
								</time>
							);
						})()}
					</div>

					{/* 価格表示 */}
					{!isCompact && (
						<div className="mb-3">
							<div className="flex items-center justify-between">
								<div>
									{isOnSale && originalPrice ? (
										<div className="flex items-center gap-2">
											<span className="text-base sm:text-lg font-bold text-destructive">
												¥{currentPrice.toLocaleString()}
											</span>
											<span className="text-xs sm:text-sm text-muted-foreground line-through">
												¥{originalPrice.toLocaleString()}
											</span>
											<Badge className="bg-destructive/10 text-destructive text-xs">
												{work.price.discount}% OFF
											</Badge>
										</div>
									) : (
										<span className="text-base sm:text-lg font-bold text-foreground">
											¥{currentPrice.toLocaleString()}
										</span>
									)}
								</div>
							</div>
						</div>
					)}

					{/* アクションボタン */}
					<fieldset className="flex gap-1 sm:gap-2 mt-auto" aria-label="作品アクション">
						<Button
							size="sm"
							variant="outline"
							className="flex-1 border text-muted-foreground hover:bg-accent min-h-[40px] sm:min-h-[44px] text-xs sm:text-sm"
							asChild
						>
							<Link href={`/works/${work.id}`} aria-describedby={`work-title-${work.id}`}>
								詳細{isCompact ? "を見る" : ""}
							</Link>
						</Button>
						<Button
							size="sm"
							className="bg-destructive hover:bg-destructive/90 text-white min-h-[40px] sm:min-h-[44px] min-w-[40px] sm:min-w-[44px] px-2 sm:px-3"
							asChild
						>
							<a
								href={work.workUrl}
								target="_blank"
								rel="noopener noreferrer"
								aria-label={`${work.title}をDLsiteで購入`}
							>
								<ExternalLink className="h-3 w-3 sm:h-4 sm:w-4" aria-hidden="true" />
							</a>
						</Button>
					</fieldset>
				</div>
			</div>
		</article>
	);
}

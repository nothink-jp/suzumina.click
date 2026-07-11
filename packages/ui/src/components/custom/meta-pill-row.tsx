import { cn } from "@suzumina.click/ui/lib/utils";
import { Clock, Heart, Play } from "lucide-react";

/**
 * メタピル行（ボタン画面刷新の共通部品・SPR-254）。
 * 再生回数（通常/再生中）・尺・作成日・作成者をピル型で横並び表示する。
 * hooks を持たない純表示部品のため Server Component からも利用可。
 * デザイン正本: Claude Design「メタピル行.dc.html」
 */

interface MetaPillRowProps {
	/** 累計再生回数（再生中は「N 回目の再生中…」の N） */
	playCount: number;
	/** 表示用の尺文字列（例: "3.4秒"） */
	durationText: string;
	/** 作成日の表示文字列（例: "2026/06/26"）。空なら非表示 */
	dateText?: string;
	/** 作成者名。空なら非表示 */
	creatorName?: string;
	/** お気に入り数。0 より大きいときのみ ♥ を添える */
	favoriteCount?: number;
	isPlaying?: boolean;
	className?: string;
}

const BASE_PILL =
	"inline-flex items-center rounded-full border border-border bg-card px-3.5 py-[7px] text-[13px] font-semibold text-muted-foreground";

export function MetaPillRow({
	playCount,
	durationText,
	dateText,
	creatorName,
	favoriteCount = 0,
	isPlaying = false,
	className,
}: MetaPillRowProps) {
	return (
		<div className={cn("flex flex-wrap items-center justify-center gap-2.5", className)}>
			{isPlaying ? (
				<span className="inline-flex items-center gap-[7px] rounded-full bg-heart/10 px-4 py-[7px] text-sm font-extrabold text-heart">
					<Play className="h-3.5 w-3.5 fill-current" />
					{playCount} 回目の再生中…
				</span>
			) : (
				<span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-[7px] text-sm font-bold text-foreground">
					<span>
						これまでに <strong className="font-extrabold text-suzuka-700">{playCount}</strong>{" "}
						回押されました
					</span>
					{favoriteCount > 0 && (
						<span className="inline-flex items-center gap-1 border-l border-border pl-2 text-[12.5px] font-extrabold text-heart">
							<Heart className="h-[11px] w-[11px] fill-current" />
							{favoriteCount}
						</span>
					)}
				</span>
			)}

			<span className={cn(BASE_PILL, "gap-1.5")}>
				<Clock className="h-[13px] w-[13px]" />
				{durationText}
			</span>

			{dateText && <span className={BASE_PILL}>{dateText} 作成</span>}

			{creatorName && <span className={BASE_PILL}>by {creatorName}</span>}
		</div>
	);
}

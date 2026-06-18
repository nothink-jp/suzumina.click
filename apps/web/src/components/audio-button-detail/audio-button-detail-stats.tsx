import { Heart, Play, ThumbsUp } from "lucide-react";

interface AudioButtonDetailStatsProps {
	playCount: number;
	favoriteCount: number;
	likeCount: number;
}

export function AudioButtonDetailStats({
	playCount,
	favoriteCount,
	likeCount,
}: AudioButtonDetailStatsProps) {
	return (
		<div className="grid grid-cols-3 gap-4 mb-6">
			<div className="text-center p-3 bg-muted rounded-lg border border-border">
				<div className="flex items-center justify-center mb-1">
					<Play className="h-4 w-4 text-primary" />
				</div>
				<div className="text-lg font-bold text-foreground">{playCount.toLocaleString("ja-JP")}</div>
				<div className="text-xs text-muted-foreground">再生回数</div>
			</div>
			<div className="text-center p-3 bg-rose-50 rounded-lg border border-rose-100">
				<div className="flex items-center justify-center mb-1">
					<Heart className="h-4 w-4 text-rose-600" />
				</div>
				<div className="text-lg font-bold text-rose-700">
					{favoriteCount.toLocaleString("ja-JP")}
				</div>
				<div className="text-xs text-rose-600">お気に入り</div>
			</div>
			<div className="text-center p-3 bg-amber-50 rounded-lg border border-amber-100">
				<div className="flex items-center justify-center mb-1">
					<ThumbsUp className="h-4 w-4 text-amber-600" />
				</div>
				<div className="text-lg font-bold text-amber-700">{likeCount.toLocaleString("ja-JP")}</div>
				<div className="text-xs text-amber-600">高評価</div>
			</div>
		</div>
	);
}

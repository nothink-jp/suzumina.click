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
			<div className="text-center p-3 bg-heart/10 rounded-lg border border-heart/20">
				<div className="flex items-center justify-center mb-1">
					<Heart className="h-4 w-4 text-heart" />
				</div>
				<div className="text-lg font-bold text-heart">{favoriteCount.toLocaleString("ja-JP")}</div>
				<div className="text-xs text-heart">お気に入り</div>
			</div>
			<div className="text-center p-3 bg-warning/10 rounded-lg border border-warning/30">
				<div className="flex items-center justify-center mb-1">
					<ThumbsUp className="h-4 w-4 text-warning" />
				</div>
				<div className="text-lg font-bold text-warning">{likeCount.toLocaleString("ja-JP")}</div>
				<div className="text-xs text-warning">高評価</div>
			</div>
		</div>
	);
}

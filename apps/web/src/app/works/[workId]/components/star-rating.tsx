import { Star } from "lucide-react";

/**
 * 星1つあたりの塗り幅クラスを返す。
 *
 * Tailwind は動的なクラス名生成（`w-${n}` 等）をスキャンできないため、静的な文字列で返す。
 *
 * @param rating 0.5 刻みに丸めた評価値（0-5）
 * @param star 左から数えた星の位置（1-5）
 */
function starFillWidth(rating: number, star: number): string {
	const fill = Math.min(Math.max(rating - (star - 1), 0), 1);
	if (fill >= 1) return "w-full";
	if (fill >= 0.5) return "w-1/2";
	return "w-0";
}

/**
 * 作品評価の星表示。
 *
 * 評価値の正本は `WorkPlainObject.rating.stars`（0-5 スケール。`work-schemas.ts` の zod で担保）。
 * 表示は 0.5 刻みに丸め、半端な値は半分だけ塗った星で表す。
 */
export function StarRating({ rating }: { rating: number }) {
	const value = Math.min(Math.max(rating, 0), 5);
	// 塗り分けだけ 0.5 刻みに丸める（4.3 → 4.5 / 4.1 → 4.0）。読み上げは丸めない実値を使う
	const rounded = Math.round(value * 2) / 2;

	return (
		<div className="flex items-center" role="img" aria-label={`5段階評価で${value.toFixed(1)}`}>
			{[1, 2, 3, 4, 5].map((star) => (
				<div key={star} className="relative h-5 w-5">
					<Star className="h-5 w-5 text-muted-foreground" />
					<div
						className={`absolute inset-y-0 left-0 overflow-hidden ${starFillWidth(rounded, star)}`}
					>
						<Star className="h-5 w-5 text-foreground fill-current" />
					</div>
				</div>
			))}
		</div>
	);
}

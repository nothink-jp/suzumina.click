import { checkAgeRating, getAgeRatingDisplayName } from "@suzumina.click/shared-types";
import { Badge } from "@suzumina.click/ui/components/ui/badge";

interface AgeRatingBadgeProps {
	ageRating: string;
	/** "base"=主表示（大）, "sm"=詳細タブ（小）。従来の2実装の差はサイズだけ */
	size?: "base" | "sm";
}

/**
 * 年齢レーティングバッジ（R18=赤 / 全年齢=緑 / その他=グレー）。
 *
 * work-detail.tsx の主表示と詳細タブで二重実装されていたものを統合（SPR-194）。
 * 差はサイズclassのみ。
 */
export function AgeRatingBadge({ ageRating, size = "base" }: AgeRatingBadgeProps) {
	const check = checkAgeRating(ageRating);
	const sizeClass = size === "base" ? "text-base px-4 py-2" : "text-sm px-3 py-1";
	const label = getAgeRatingDisplayName(ageRating);

	if (check.isR18) {
		return (
			<Badge variant="destructive" className={`bg-red-600 text-white font-bold ${sizeClass}`}>
				{label}
			</Badge>
		);
	}
	if (check.isAllAges) {
		return (
			<Badge
				variant="outline"
				className={`border-green-500 text-green-700 bg-green-50 font-medium ${sizeClass}`}
			>
				{label}
			</Badge>
		);
	}
	return (
		<Badge variant="secondary" className={`text-gray-700 bg-gray-100 font-medium ${sizeClass}`}>
			{label}
		</Badge>
	);
}

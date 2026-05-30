import type { CreatorType } from "../../entities/circle-creator";

export const CREATOR_TYPE_LABELS: Record<CreatorType, string> = {
	voice: "声優",
	illustration: "イラスト",
	scenario: "シナリオ",
	music: "音楽",
	other: "その他",
} as const;

export function getCreatorTypeLabel(types: string[]): string {
	if (types.length === 0) {
		return "";
	}
	if (types.length === 1) {
		const label = CREATOR_TYPE_LABELS[types[0] as CreatorType];
		return label ?? types[0];
	}
	return types
		.map((type) => {
			const label = CREATOR_TYPE_LABELS[type as CreatorType];
			return label ?? type;
		})
		.join(" / ");
}

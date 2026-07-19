/**
 * 音声ボタンの公式用途タグ語彙の正本（SPR-260 で確定・9カテゴリ）。
 * 出典系（ゲーム名等）や持ちネタ等の自由タグとは別レイヤーで、tags 配列に併存させる。
 * 運用ルール: 用途タグは1ボタンにつき1つ（UI 側で入れ替えを誘導する）。
 */
export const AUDIO_BUTTON_USAGE_TAGS = [
	"あいさつ",
	"返事・リアクション",
	"笑い",
	"擬音・音ネタ",
	"うた",
	"ツッコミ・煽り",
	"応援・褒め",
	"あまあま",
	"名言・迷言",
] as const;

export type AudioButtonUsageTag = (typeof AUDIO_BUTTON_USAGE_TAGS)[number];

/** タグが公式用途語彙かどうか */
export function isAudioButtonUsageTag(tag: string): tag is AudioButtonUsageTag {
	return (AUDIO_BUTTON_USAGE_TAGS as readonly string[]).includes(tag);
}

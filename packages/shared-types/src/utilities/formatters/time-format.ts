/**
 * 時間フォーマット系ユーティリティ。
 *
 * 旧 `utils/` から移設（SPR-198）。`utils/` は生存2関数のみの併存ディレクトリだったため
 * `utilities/formatters/` に統合し、命名から配置を予測できる構造に揃えた。
 */

/**
 * 秒数を mm:ss / hh:mm:ss（小数第1位まで）にフォーマットする。
 * @param seconds 秒数
 * @returns フォーマット済み時間文字列
 */
export function formatTimestamp(seconds: number): string {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = Math.floor(seconds % 60);
	const tenths = Math.floor((seconds % 1) * 10);

	if (hours > 0) {
		return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${tenths}`;
	}
	return `${minutes}:${secs.toString().padStart(2, "0")}.${tenths}`;
}

/**
 * ISO 8601 duration を秒数にパースする。
 * @param duration ISO 8601 duration 文字列（例: "PT1H23M45S"）
 * @returns 秒数
 */
export function parseDurationToSeconds(duration?: string): number {
	if (!duration) return 0;

	const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
	if (!match) return 0;

	const hours = Number.parseInt(match[1] || "0", 10);
	const minutes = Number.parseInt(match[2] || "0", 10);
	const seconds = Number.parseInt(match[3] || "0", 10);

	return hours * 3600 + minutes * 60 + seconds;
}

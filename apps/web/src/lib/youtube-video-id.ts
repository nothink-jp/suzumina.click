/**
 * YouTube の URL / 動画ID 入力から動画ID（11文字）を取り出す。
 * /watch のマーキング対象指定と /videos の「URL・ID を直接ひらく」（導線再設計 段3）が共用する。
 */
const VIDEO_ID_PATTERN = /(?:v=|youtu\.be\/|\/live\/|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/;

export function parseVideoIdInput(value: string): string | null {
	const trimmed = value.trim();
	const match = trimmed.match(VIDEO_ID_PATTERN);
	if (match?.[1]) {
		return match[1];
	}
	return /^[A-Za-z0-9_-]{11}$/.test(trimmed) ? trimmed : null;
}

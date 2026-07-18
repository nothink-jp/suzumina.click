/**
 * 秒数を整数秒の h:mm:ss / mm:ss 表記にする（下書き一覧・仕上げキューの表示用）。
 * shared-types の formatTimestamp は小数第1位付き（"14:26.0"）のため用途が異なる。
 */
export function formatSeconds(total: number): string {
	const s = Math.floor(total % 60);
	const m = Math.floor((total / 60) % 60);
	const h = Math.floor(total / 3600);
	const mm = String(m).padStart(2, "0");
	const ss = String(s).padStart(2, "0");
	return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

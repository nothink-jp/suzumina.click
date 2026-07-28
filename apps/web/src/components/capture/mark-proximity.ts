import type { AudioButtonDraft } from "@suzumina.click/shared-types";

/**
 * 「同じ箇所を二度マークした」とみなす距離（秒）。
 * 配信中は巻き戻せないので起こらなかったが、動画視聴中はシークで同じ場面を繰り返し見るため起こる。
 */
export const DUPLICATE_MARK_THRESHOLD_SECONDS = 10;

/**
 * 同一動画の既存下書きのうち、指定の再生位置に最も近いものを返す（閾値内に無ければ null）。
 *
 * 判定は生信号 playerTime 同士で行う（推奨開始秒はプリロールぶん一律にずれるだけで、
 * 近さの判定結果は変わらない。生信号を正本にする方針に合わせる）。
 * 壁時計のみモード（playerTime=null）の下書きは位置を持たないため対象外。
 */
export function findNearbyDraft(
	drafts: AudioButtonDraft[],
	videoId: string,
	playerTime: number,
	thresholdSeconds: number = DUPLICATE_MARK_THRESHOLD_SECONDS,
): AudioButtonDraft | null {
	let nearest: AudioButtonDraft | null = null;
	let nearestDistance = Number.POSITIVE_INFINITY;

	for (const draft of drafts) {
		if (draft.videoId !== videoId || draft.playerTime == null) {
			continue;
		}
		const distance = Math.abs(draft.playerTime - playerTime);
		if (distance <= thresholdSeconds && distance < nearestDistance) {
			nearest = draft;
			nearestDistance = distance;
		}
	}

	return nearest;
}

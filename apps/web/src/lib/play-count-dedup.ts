import "server-only";
import { createHmac } from "node:crypto";
import { Timestamp } from "@google-cloud/firestore";
import { getFirestore } from "@/lib/firestore";

/**
 * 再生数（`audioButtons.stats.playCount`）の重複計上を抑止する台帳（SPR-334）
 *
 * `incrementPlayCount` は匿名でも呼べる Server Action のため、client 側のデデュープ（usePlayCount）だけでは
 * Action を直接ループされると「よく再生」順を水増しできる。サーバー側で「同じクライアント × 同じボタンは
 * 窓の間 1 回だけ」を保証する。
 *
 * - ドキュメント ID = HMAC(クライアント IP, ボタン ID)。生の IP は保存しない
 * - `expiresAt`（Timestamp）は TTL ポリシーの対象（terraform `firestore_database.tf`）。TTL 削除は即時ではないため、
 *   窓の判定は TTL に頼らず `expiresAt` と現在時刻の比較で行う
 * - IP 単位なので IP を回されると防げない（抑止であって認可ではない）。同一 NAT 配下の別人は 1 回にまとまる＝過少計上側に倒す
 */
export const PLAY_COUNT_DEDUP_COLLECTION = "playCountDedup";

/** 同じクライアント × 同じボタンを 1 回とみなす窓 */
export const PLAY_COUNT_DEDUP_WINDOW_MS = 60 * 1000;

/**
 * 抑止キーの HMAC 鍵。IPv4 は総当たりできるため素のハッシュにしない。
 * 専用 secret は持たず BETTER_AUTH_SECRET を流用する（ローテートすると窓が一度リセットされるだけで実害なし）
 */
function getDedupKeySecret(): string {
	return process.env.BETTER_AUTH_SECRET || "local-play-count-dedup";
}

/** クライアント IP とボタン ID から抑止ドキュメント ID を作る（純粋関数） */
export function buildPlayCountDedupId(
	clientIp: string,
	audioButtonId: string,
	secret: string,
): string {
	return createHmac("sha256", secret).update(`${clientIp}\n${audioButtonId}`).digest("hex");
}

/**
 * - `claimed`: 今回の再生を計上してよい（抑止ドキュメントを書き込み済み）
 * - `duplicate`: 窓内の重複。計上しない
 * - `not_found`: ボタンが無い / 非公開。計上しない
 */
export type PlayCountClaim = "claimed" | "duplicate" | "not_found";

/**
 * 再生 1 回分の計上権を取る。**副作用あり**: `claimed` のときだけ抑止ドキュメントを書き込む。
 * カウンタ自体は更新しない（呼び出し側が `updateCounter` で行う＝カウンタ更新の正本を一本に保つ）。
 * Firestore エラーは throw する。
 */
export async function claimPlayCount(
	audioButtonId: string,
	clientIp: string,
	now: Date = new Date(),
): Promise<PlayCountClaim> {
	const firestore = getFirestore();
	const buttonRef = firestore.collection("audioButtons").doc(audioButtonId);
	const dedupRef = firestore
		.collection(PLAY_COUNT_DEDUP_COLLECTION)
		.doc(buildPlayCountDedupId(clientIp, audioButtonId, getDedupKeySecret()));

	return firestore.runTransaction(async (transaction) => {
		const [buttonDoc, dedupDoc] = await transaction.getAll(buttonRef, dedupRef);

		if (!buttonDoc?.exists || buttonDoc.data()?.isPublic !== true) {
			return "not_found";
		}

		const expiresAt = dedupDoc?.exists ? dedupDoc.data()?.expiresAt : undefined;
		if (expiresAt instanceof Timestamp && expiresAt.toMillis() > now.getTime()) {
			return "duplicate";
		}

		transaction.set(dedupRef, {
			expiresAt: Timestamp.fromMillis(now.getTime() + PLAY_COUNT_DEDUP_WINDOW_MS),
		});
		return "claimed";
	});
}

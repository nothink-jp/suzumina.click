/**
 * オーナー（内部）トラフィックのタグ付け（SPR-149 / SPR-137 議論ログ#6）。
 *
 * 目的: GA4 で「常連の継続利用」を見るとき、オーナー自身のアクセスを分離できるようにする。
 * 6月の PV 急増がオーナーの作成作業由来かファン由来か分離できなかった反省による。
 *
 * 方式: gtag('set') で traffic_type=internal を付与する。以降にそのページで送られる
 * 全イベント（config 経由の page_view 含む）に適用され、GA4 側はセグメント/データフィルタで
 * 除外できる。イベント自体は送る（オーナーの作成行動は成功指標の主データ）。
 *
 * セッション解決は非同期のため、初回 page_view に間に合わない取りこぼしがある。
 * localStorage に印を永続し、再訪時はセッション解決を待たずマウント直後に適用して塞ぐ
 * （オーナーの最初の1訪問の page_view のみタグ漏れが残るが許容）。
 */

const STORAGE_KEY = "suzumina-internal-traffic";

/**
 * オーナーの Discord ID（audioButtons.creatorId として公開済みの値のため秘匿情報ではない）。
 * 単一オーナー前提の意図的なハードコード。複数管理者化・オーナー交代が起きたら
 * env / ロール判定への昇格を検討する（現状その予定はない）。
 */
export const OWNER_DISCORD_ID = "570920263135264778";

function setGtagInternalTraffic(): void {
	if (typeof window === "undefined" || !window.gtag) return;
	window.gtag("set", { traffic_type: "internal" });
}

/** localStorage の印に基づき、セッション解決を待たずにタグを適用する（マウント直後に呼ぶ） */
export function applyStoredInternalTrafficFlag(): void {
	try {
		if (localStorage.getItem(STORAGE_KEY) === "1") {
			setGtagInternalTraffic();
		}
	} catch {
		// localStorage 不可の環境では諦める（タグ漏れは許容）
	}
}

/**
 * セッション解決後に呼ぶ。オーナーなら印を永続してタグ適用。
 * 別ユーザーのログインを検出したときだけ印を外す（未ログインでは保持＝オーナーのブラウザとみなす）。
 * 解除は印のみで、適用済みページの gtag 状態はリロードまで残る（許容）。
 */
export function syncInternalTrafficFromSession(discordId: string | undefined): void {
	try {
		if (discordId === OWNER_DISCORD_ID) {
			localStorage.setItem(STORAGE_KEY, "1");
			setGtagInternalTraffic();
		} else if (discordId) {
			localStorage.removeItem(STORAGE_KEY);
		}
	} catch {
		// noop
	}
}

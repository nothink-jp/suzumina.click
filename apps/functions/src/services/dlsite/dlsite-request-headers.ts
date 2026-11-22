/**
 * DLsite へのリクエストに付けるヘッダ（正本。この2つだけ。足すときは下の実測を先に読む）
 *
 * 取得元を正直に名乗り、JSON を求める形で呼ぶ。ブラウザを装うヘッダや User-Agent のローテーションは
 * 使わない（SPR-360 で撤去した。検出を避ける目的の偽装はしない、という方針）。
 *
 * Individual Info API（`product.json`）での実測:
 * 2026-11-16 から、DLsite（Cloudflare）は「ブラウザのページ遷移を装った形」と「Accept が既定のままで
 * UA が node か独自のもの」を、東京拠点で 1 つのバケツにまとめてブロックし続けていた（404 + Retry-After。
 * ほかの送信元のアクセスでバケツが埋まるので、こちらの送信量に関係なく続く）。IP・地域は関係が無かった。
 * この 2 つの組み合わせは、ブロックの最中も 13 回続けて通った（2026-11-17・東京の Cloud Run ジョブで実測）。
 * `Accept` を外すとブロックされる（同じ実測）。判定の規則そのものは分かっていない＝SPR-423。
 *
 * 作品 ID の収集（検索の AJAX）では、同じ 2 つで 200 + JSON が返ることを確かめた
 * （2026-11-22・東京以外の拠点から 2 回）。
 */
export const DLSITE_REQUEST_HEADERS: Readonly<Record<string, string>> = {
	"User-Agent": "suzumina.click-fetcher/1.0 (+https://suzumina.click)",
	Accept: "application/json",
};

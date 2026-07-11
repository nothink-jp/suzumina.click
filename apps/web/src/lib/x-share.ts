/**
 * X 共有 intent URL の組み立て正本（SPR-248）。
 * Player Card は承認制で使えないため、共有はカード（OGP）+ Web Intent で行う（SPR-17 の結論）。
 * URL は共有先で意味を持つよう本番の canonical URL に固定する（generateMetadata の og:url と同じ方針）。
 * 表示側は ActionPillRow（詳細/モーダル）と AudioButton ポップオーバー（一覧）が担う。
 */
export function buildXShareUrl(audioButtonId: string, buttonText: string): string {
	const params = new URLSearchParams({
		text: `「${buttonText}」`,
		// utm は X 共有経由の流入を GA4 / サーバーログで判別するため（canonical は utm なしのまま）
		url: `https://suzumina.click/buttons/${audioButtonId}?utm_source=x&utm_medium=social`,
		hashtags: "涼花みなせ",
	});
	return `https://x.com/intent/post?${params.toString()}`;
}

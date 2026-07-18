/**
 * OG 画像（ImageResponse / satori）向けのテキスト整形ヘルパ。
 * app/buttons/[id]/opengraph-image.tsx（SPR-249）・app/works/[workId]/opengraph-image.tsx（SPR-268）等で共用する。
 */

/** 末尾を省略記号にして max 文字に収める */
export function truncateWithEllipsis(text: string, max: number): string {
	return text.length > max ? `${text.slice(0, max)}…` : text;
}

/**
 * テキストの概算描画幅（px）。半角 ≈ 0.6em / 全角 ≈ 1.0em の粗い見積もり。
 * satori(Yoga) は auto 幅 flex の入れ子内でテキスト折り返し幅を解決できないため、
 * 「1行に収まらない場合だけ明示幅を与えて折り返す」判定に使う（正確な字幅計測は不要）
 */
export function estimateTextWidth(text: string, fontSize: number): number {
	let em = 0;
	for (const ch of text) {
		em += (ch.codePointAt(0) ?? 0) <= 0x024f ? 0.6 : 1.0;
	}
	return Math.round(em * fontSize);
}

/** フォントに無い絵文字（tofu 化する）・異体字セレクタ・ZWJ を除去し、連続空白を1つに畳む */
export function stripUnsupportedGlyphs(text: string): string {
	return text
		.replace(/\p{Extended_Pictographic}|\u{FE0F}|\u{200D}/gu, "")
		.replace(/\s+/g, " ")
		.trim();
}

/** 絵文字除去 + 空白畳み込み + 省略の一括整形（動画タイトル・作品タイトル等の表示用） */
export function formatDisplayTitle(text: string, max: number): string {
	return truncateWithEllipsis(stripUnsupportedGlyphs(text), max);
}

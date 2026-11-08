/**
 * トップページのセクション計測の語彙（section_view / section_click）。
 *
 * セクション名の正本はここ。app/page.tsx の並び順（hero → audio_buttons → videos → works → community）と
 * 一致させる。名前を変えると GA4 上で別セクションとして数えられ、過去分と繋がらなくなるので改名しない。
 */
export const HOME_SECTION = {
	hero: "hero",
	audioButtons: "audio_buttons",
	videos: "videos",
	works: "works",
	community: "community",
} as const;

export type HomeSection = (typeof HOME_SECTION)[keyof typeof HOME_SECTION];

/**
 * ID とみなすパスセグメント。数字だけ / RJ 番号 / 数字を含む 6 文字以上の英数字（Firestore ID・YouTube ID）。
 * 「数字を含む」を条件にしているのは、`settings` や `favorites` のような英字だけの固定パスを ID と誤認しないため。
 * 数字を含まない YouTube ID はそのまま残るが、カーディナリティへの影響は小さいので許容する。
 */
const ID_SEGMENT = /^(?:\d+|RJ\d+|(?=[A-Za-z_-]*\d)[A-Za-z0-9_-]{6,})$/;

/**
 * クリックされたリンクの行き先を、GA4 で集計できる粒度へ丸める。
 *
 * - サイト内: クエリ・ハッシュを落とし、ID セグメントを `:id` に置き換えたパス（例: `/works/:id`）
 * - 外部: `www.` を除いたホスト名（例: `dlsite.com`）。先頭が `/` かどうかでサイト内と区別できる
 * - http(s) 以外（`mailto:` など）や解釈できない href: null（送らない）
 *
 * @param href アンカーの href 属性（相対パス可）
 * @param origin 現在のページの origin。同一 origin かどうかでサイト内／外部を分ける
 */
export function toLinkDestination(href: string, origin: string): string | null {
	let url: URL;
	try {
		url = new URL(href, origin);
	} catch {
		return null;
	}
	if (url.protocol !== "http:" && url.protocol !== "https:") return null;
	if (url.origin !== origin) return url.hostname.replace(/^www\./, "");

	const segments = url.pathname
		.split("/")
		.filter(Boolean)
		.map((segment) => (ID_SEGMENT.test(segment) ? ":id" : segment));
	return `/${segments.join("/")}`;
}

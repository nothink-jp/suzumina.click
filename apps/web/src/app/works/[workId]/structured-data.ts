import type { WorkPlainObject } from "@suzumina.click/shared-types";

/**
 * works 詳細の JSON-LD（schema.org Product）を組み立てる（SPR-302 第2弾）。
 *
 * SPR-302 の診断では、順位6〜8位に対して CTR が 1.5〜3.0%（期待値 3〜10%）と低く、
 * それが降格の引き金になっていた。構造化データは価格・評価をリッチリザルトの
 * 対象にする＝**順位を上げずに CTR を上げられる**数少ない手段なので、
 * 順位回復（コンテンツ改善）とは別軸の打ち手として入れる。
 *
 * 出力は Product 単体（ItemList や BreadcrumbList は別途）。値が無い項目は
 * **キーごと出さない**（`undefined` を JSON.stringify が落とす）。空文字や 0 を
 * 入れると Google 側で「無効な値」として警告になるため。
 *
 * 表示文言と同じくロジックを純関数に置くのは、テスト対象を JSX でなくデータにするため。
 */
export interface WorkStructuredData {
	"@context": "https://schema.org";
	"@type": "Product";
	name: string;
	url: string;
	productID: string;
	description?: string;
	image?: string;
	brand?: { "@type": "Brand"; name: string };
	genre?: string[];
	contentRating?: string;
	releaseDate?: string;
	offers?: {
		"@type": "Offer";
		price: number;
		priceCurrency: string;
		availability: "https://schema.org/InStock";
		url: string;
	};
	aggregateRating?: {
		"@type": "AggregateRating";
		ratingValue: number;
		ratingCount: number;
		bestRating: 5;
		worstRating: 1;
	};
	contributor?: { "@type": "Person"; name: string }[];
}

/** 評価は件数がある場合のみ出す（0件で ratingCount:0 を出すと無効な構造化データになる） */
function buildAggregateRating(work: WorkPlainObject): WorkStructuredData["aggregateRating"] {
	const rating = work.rating;
	if (!rating?.hasRatings || rating.count <= 0) return undefined;

	return {
		"@type": "AggregateRating",
		ratingValue: rating.stars,
		ratingCount: rating.count,
		bestRating: 5,
		worstRating: 1,
	};
}

/** 制作陣は role ごとに分かれているが、Product では contributor に平坦化する */
function buildContributors(work: WorkPlainObject): WorkStructuredData["contributor"] {
	const names = [
		...work.creators.voiceActors,
		...work.creators.scenario,
		...work.creators.illustration,
		...work.creators.music,
	]
		.map((creator) => creator.name)
		.filter((name) => name.length > 0);

	const unique = [...new Set(names)];
	return unique.length > 0 ? unique.map((name) => ({ "@type": "Person", name })) : undefined;
}

/**
 * JSON-LD を `<script>` の中身として安全に埋められる文字列にする。
 *
 * title / description は DLsite 由来の**外部データ**で、`</script>` を含んでいれば
 * そのまま script 要素から脱出できてしまう（XSS）。`<` を Unicode エスケープすれば
 * JSON としての意味は変わらないまま脱出を塞げる。
 */
export function serializeStructuredData(data: WorkStructuredData): string {
	return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function buildWorkStructuredData(
	work: WorkPlainObject,
	pageUrl: string,
): WorkStructuredData {
	return {
		"@context": "https://schema.org",
		"@type": "Product",
		name: work.title,
		url: pageUrl,
		productID: work.productId,
		description: work.description || undefined,
		image: work.highResImageUrl || work.thumbnailUrl || undefined,
		brand: work.circle ? { "@type": "Brand", name: work.circle } : undefined,
		genre: work.genres.length > 0 ? work.genres : undefined,
		contentRating: work.ageRating || undefined,
		releaseDate: work.releaseDateISO || undefined,
		offers: work.price.isFree
			? undefined
			: {
					"@type": "Offer",
					price: work.price.current,
					priceCurrency: work.price.currency,
					availability: "https://schema.org/InStock",
					url: work.workUrl,
				},
		aggregateRating: buildAggregateRating(work),
		contributor: buildContributors(work),
	};
}

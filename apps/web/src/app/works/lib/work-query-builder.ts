import { NON_R18_AGE_RATINGS } from "@suzumina.click/shared-types";

/**
 * 非 R18 の作品だけを引くクエリを構築する（SPR-321）。
 *
 * 匿名・年齢未確認のアクセス（`showR18 ?? false`）は全体 2,191 件のうち 37 件しか表示しない。
 * 従来は全件取得して in-memory で落としていたため **1 リクエスト 2,191 read = 増幅率 59 倍**だった。
 *
 * **`orderBy` を付けない**のが要点。呼び出し側（`getWorksWithComplexFiltering`）は取得後に
 * `sortWorks` で並べ直しており Firestore 側の並びを使っていないので、外しても機能は変わらない。
 * 一方 `in` + `orderBy` は複合インデックスを要求する（`ageRating` を含むインデックスは存在しない）。
 * `orderBy` を外すことで**インデックス追加なしに**成立する。本番の実クエリで検証済み。
 */
export function buildNonR18WorksQuery(
	firestore: FirebaseFirestore.Firestore,
	params: { category?: string },
): FirebaseFirestore.Query {
	let query: FirebaseFirestore.Query = firestore
		.collection("works")
		.where("ageRating", "in", [...NON_R18_AGE_RATINGS]);

	if (params.category && params.category !== "all") {
		query = query.where("category", "==", params.category);
	}

	return query;
}

/**
 * Firestoreクエリを構築する
 */
export function buildWorksQuery(
	firestore: FirebaseFirestore.Firestore,
	params: {
		category?: string;
		sort?: string;
	},
): FirebaseFirestore.Query {
	let query: FirebaseFirestore.Query = firestore.collection("works");

	// カテゴリーフィルタ
	if (params.category && params.category !== "all") {
		query = query.where("category", "==", params.category);
	}

	// ソート処理
	switch (params.sort) {
		case "oldest":
			query = query.orderBy("releaseDateISO", "asc");
			break;
		case "price_low":
			query = query.orderBy("price.current", "asc");
			break;
		case "price_high":
			query = query.orderBy("price.current", "desc");
			break;
		case "rating":
			query = query.orderBy("rating.stars", "desc");
			break;
		case "popular":
			query = query.orderBy("rating.count", "desc");
			break;
		default: // "newest"
			query = query.orderBy("releaseDateISO", "desc");
	}

	return query;
}

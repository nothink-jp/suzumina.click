/**
 * Firestoreクエリを構築する
 */
export function buildWorksQuery(
	firestore: FirebaseFirestore.Firestore,
	params: {
		category?: string;
		showR18?: boolean;
		ageRating?: string[];
		sort?: string;
	},
): FirebaseFirestore.Query {
	let query: FirebaseFirestore.Query = firestore.collection("works");

	// カテゴリーフィルタ
	if (params.category && params.category !== "all") {
		query = query.where("category", "==", params.category);
	}

	// 特定の年齢制限フィルタ（単一の場合のみ）
	if (params.ageRating && params.ageRating.length === 1) {
		query = query.where("ageRating", "==", params.ageRating[0]);
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

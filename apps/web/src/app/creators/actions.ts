"use server";

import type {
	CreatorDocument,
	CreatorPageInfo,
	CreatorWorkRelation,
} from "@suzumina.click/shared-types";
import { getFirestore } from "@/lib/firestore";

/**
 * クリエイター一覧を取得（ConfigurableList用）
 * @param params パラメータ
 * @returns クリエイター一覧と総件数
 */
export async function getCreators(params: {
	page?: number;
	limit?: number;
	sort?: string;
	search?: string;
	role?: string;
}): Promise<{ creators: CreatorPageInfo[]; totalCount: number }> {
	const { page = 1, limit = 12, sort = "name", search, role } = params;

	try {
		const firestore = getFirestore();

		// 全クリエイターを取得
		const creatorsSnapshot = await firestore.collection("creators").get();

		// CreatorPageInfoに変換
		const allCreators: CreatorPageInfo[] = [];

		for (const doc of creatorsSnapshot.docs) {
			const creatorData = doc.data() as CreatorDocument;

			// worksサブコレクションから作品数と役割を取得
			const worksSnapshot = await doc.ref.collection("works").get();

			const allTypes = new Set<string>();
			worksSnapshot.docs.forEach((workDoc) => {
				const workRelation = workDoc.data() as CreatorWorkRelation;
				workRelation.roles?.forEach((r) => allTypes.add(r));
			});

			// primaryRoleが設定されていて、typesに含まれていない場合は追加
			if (creatorData.primaryRole && !allTypes.has(creatorData.primaryRole)) {
				allTypes.add(creatorData.primaryRole);
			}

			const creatorInfo: CreatorPageInfo = {
				id: creatorData.creatorId,
				name: creatorData.name,
				types: Array.from(allTypes),
				workCount: worksSnapshot.size,
			};

			allCreators.push(creatorInfo);
		}

		// 役割でフィルタリング
		let filteredCreators = allCreators;
		if (role && role !== "all") {
			filteredCreators = allCreators.filter((creator) => creator.types.includes(role));
		}

		// 検索フィルタリング
		if (search) {
			const searchLower = search.toLowerCase();
			filteredCreators = filteredCreators.filter((creator) => {
				return creator.name.toLowerCase().includes(searchLower);
			});
		}

		// ソート処理
		filteredCreators.sort((a, b) => {
			switch (sort) {
				case "name":
					// 名前順（昇順）
					return a.name.localeCompare(b.name, "ja");
				case "nameDesc":
					// 名前順（降順）
					return b.name.localeCompare(a.name, "ja");
				case "workCount":
					// 作品数順（多い順）
					if (b.workCount !== a.workCount) {
						return b.workCount - a.workCount;
					}
					// 作品数が同じ場合は名前順
					return a.name.localeCompare(b.name, "ja");
				case "workCountAsc":
					// 作品数順（少ない順）
					if (a.workCount !== b.workCount) {
						return a.workCount - b.workCount;
					}
					// 作品数が同じ場合は名前順
					return a.name.localeCompare(b.name, "ja");
				default:
					return a.name.localeCompare(b.name, "ja");
			}
		});

		// ページネーション適用
		const startIndex = (page - 1) * limit;
		const endIndex = startIndex + limit;
		const paginatedCreators = filteredCreators.slice(startIndex, endIndex);

		return {
			creators: paginatedCreators,
			totalCount: filteredCreators.length,
		};
	} catch (_error) {
		// エラー発生時は空配列を返す
		return { creators: [], totalCount: 0 };
	}
}

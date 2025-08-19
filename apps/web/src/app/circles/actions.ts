"use server";

import type { CircleDocument, CirclePlainObject } from "@suzumina.click/shared-types";
import { getFirestore } from "@/lib/firestore";

/**
 * サークル一覧を取得（ConfigurableList用）
 * @param params パラメータ
 * @returns サークル一覧と総件数
 */
export async function getCircles(params: {
	page?: number;
	limit?: number;
	sort?: string;
	search?: string;
}): Promise<{ circles: CirclePlainObject[]; totalCount: number }> {
	const { page = 1, limit = 12, sort = "name", search } = params;

	try {
		const firestore = getFirestore();

		// 全サークルを取得
		const circlesSnapshot = await firestore.collection("circles").get();

		// CirclePlainObjectに変換
		const allCircles: CirclePlainObject[] = [];
		for (const doc of circlesSnapshot.docs) {
			const data = doc.data() as CircleDocument;
			// CircleDocumentをCirclePlainObjectに変換
			const plainObject: CirclePlainObject = {
				circleId: doc.id,
				name: data.name,
				nameEn: data.nameEn,
				workCount: data.workIds?.length || 0,
				createdAt: data.createdAt?.toDate?.().toISOString() || null,
				updatedAt: data.updatedAt?.toDate?.().toISOString() || null,
			};
			if (plainObject) {
				allCircles.push(plainObject);
			}
		}

		// 検索フィルタリング
		let filteredCircles = allCircles;
		if (search) {
			const searchLower = search.toLowerCase();
			filteredCircles = allCircles.filter((circle) => {
				const searchableText = [circle.name, circle.nameEn].filter(Boolean).join(" ").toLowerCase();
				return searchableText.includes(searchLower);
			});
		}

		// ソート処理
		filteredCircles.sort((a, b) => {
			switch (sort) {
				case "name":
					// 名前順（昇順）
					return a.name.localeCompare(b.name, "ja");
				case "nameDesc":
					// 名前順（降順）
					return b.name.localeCompare(a.name, "ja");
				case "workCount":
					// 作品数順（多い順）
					return b.workCount - a.workCount;
				case "workCountAsc":
					// 作品数順（少ない順）
					return a.workCount - b.workCount;
				default:
					return a.name.localeCompare(b.name, "ja");
			}
		});

		// ページネーション適用
		const startIndex = (page - 1) * limit;
		const endIndex = startIndex + limit;
		const paginatedCircles = filteredCircles.slice(startIndex, endIndex);

		return {
			circles: paginatedCircles,
			totalCount: filteredCircles.length,
		};
	} catch (_error) {
		// エラー発生時は空配列を返す
		return { circles: [], totalCount: 0 };
	}
}

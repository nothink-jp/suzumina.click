"use server";

import { getFirestore } from "@/lib/firestore";
import type {
  FirestoreDLsiteWorkData,
  FrontendDLsiteWorkData,
  WorkListResult,
} from "@suzumina.click/shared-types/src/work";
import { convertToFrontendWork } from "@suzumina.click/shared-types/src/work";

/**
 * DLsite作品データをページネーション付きで取得するServer Action（ユーザー向け）
 * @param params - ページネーション用パラメータ
 * @returns 作品リスト結果
 */
export async function getWorks({
  page = 1,
  limit = 12,
}: {
  page?: number;
  limit?: number;
} = {}): Promise<WorkListResult> {
  try {
    console.log(`作品データ取得開始: page=${page}, limit=${limit}`);

    const firestore = getFirestore();

    // まず全てのデータを取得して、クライアント側で並び替え
    // (DLsiteのIDフォーマットに対応するため)
    const allSnapshot = await firestore.collection("dlsiteWorks").get();

    console.log(`全作品データ取得: ${allSnapshot.size}件`);

    // 全データを配列に変換
    const allWorks = allSnapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    })) as FirestoreDLsiteWorkData[];

    // DLsite ID順でソート (文字列長が長い方が新しいフォーマット)
    allWorks.sort((a, b) => {
      const aId = a.productId;
      const bId = b.productId;

      // 文字列長で比較 (長い方が新しい)
      if (aId.length !== bId.length) {
        return bId.length - aId.length;
      }

      // 同じ長さの場合は辞書順降順
      return bId.localeCompare(aId);
    });

    // ページネーション適用
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedWorks = allWorks.slice(startIndex, endIndex);

    console.log(`ページネーション後: ${paginatedWorks.length}件`);

    // 総数は全取得データから算出
    const totalCount = allWorks.length;

    console.log(`総作品数: ${totalCount}`);

    // FirestoreデータをFrontend用に変換
    const works: FrontendDLsiteWorkData[] = [];

    for (const data of paginatedWorks) {
      try {
        // データにIDが設定されていない場合、ドキュメントIDを使用
        if (!data.id) {
          data.id = data.productId; // productIdをフォールバック
        }

        // フロントエンド形式に変換
        const frontendData = convertToFrontendWork(data);
        works.push(frontendData);
      } catch (error) {
        console.error(`作品データ変換エラー (${data.productId}):`, error);
        // エラーがあっても他のデータの処理は続行
      }
    }

    const hasMore = page * limit < totalCount;

    const result: WorkListResult = {
      works,
      hasMore,
      lastWork: works[works.length - 1],
      totalCount,
    };

    console.log(
      `作品データ取得完了: ${works.length}件返却, hasMore=${hasMore}`,
    );

    return result;
  } catch (error) {
    console.error("作品データ取得エラー:", error);

    // エラー時は空の結果を返す
    return {
      works: [],
      hasMore: false,
      totalCount: 0,
    };
  }
}

/**
 * 特定の作品IDで作品データを取得するServer Action
 * @param workId - 作品ID
 * @returns 作品データまたはnull
 */
export async function getWorkById(
  workId: string,
): Promise<FrontendDLsiteWorkData | null> {
  try {
    console.log(`作品詳細データ取得開始: workId=${workId}`);

    const firestore = getFirestore();
    const doc = await firestore.collection("dlsiteWorks").doc(workId).get();

    if (!doc.exists) {
      console.log(`作品が見つかりません: workId=${workId}`);
      return null;
    }

    const data = doc.data() as FirestoreDLsiteWorkData;

    // データにIDが設定されていない場合、ドキュメントIDを使用
    if (!data.id) {
      data.id = doc.id;
    }

    // フロントエンド形式に変換
    const frontendData = convertToFrontendWork(data);

    console.log(`作品詳細データ取得完了: ${frontendData.title}`);

    return frontendData;
  } catch (error) {
    console.error(`作品詳細データ取得エラー (${workId}):`, error);
    return null;
  }
}

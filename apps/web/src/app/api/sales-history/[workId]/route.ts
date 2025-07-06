import type { RankingInfo, SalesHistory } from "@suzumina.click/shared-types";
import { type NextRequest, NextResponse } from "next/server";
import { getFirestore } from "@/lib/firestore";

/**
 * 指定された作品の販売履歴とランキング履歴を取得
 */
export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ workId: string }> },
): Promise<NextResponse> {
	try {
		const { workId } = await params;

		if (!workId) {
			return NextResponse.json({ error: "Work ID is required" }, { status: 400 });
		}

		const db = getFirestore();

		// 販売履歴を取得
		const salesSnapshotsRef = db.collection("salesHistory").doc(workId).collection("snapshots");
		const salesSnapshot = await salesSnapshotsRef.orderBy("date", "desc").limit(100).get();

		const salesHistory: SalesHistory[] = [];
		salesSnapshot.forEach((docSnapshot) => {
			const data = docSnapshot.data() as SalesHistory;
			salesHistory.push(data);
		});

		// ランキング履歴を取得
		const rankingsRef = db.collection("salesHistory").doc(workId).collection("rankings");
		const rankingsSnapshot = await rankingsRef.orderBy("recordedAt", "desc").limit(50).get();

		const rankingHistory: RankingInfo[] = [];
		rankingsSnapshot.forEach((docSnapshot) => {
			const data = docSnapshot.data();
			// recordedAtフィールドを除去してRankingInfo型に変換
			const { recordedAt: _recordedAt, ...rankingData } = data;
			rankingHistory.push(rankingData as RankingInfo);
		});

		return NextResponse.json({
			workId,
			salesHistory,
			rankingHistory,
			salesCount: salesHistory.length,
			rankingCount: rankingHistory.length,
		});
	} catch (_error) {
		// Note: Error logged for debugging purposes
		return NextResponse.json({ error: "Failed to fetch sales history" }, { status: 500 });
	}
}

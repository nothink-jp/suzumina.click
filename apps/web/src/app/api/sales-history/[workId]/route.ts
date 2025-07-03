import type { RankingInfo, SalesHistory } from "@suzumina.click/shared-types";
import { getApps, initializeApp } from "firebase/app";
import { collection, getDocs, getFirestore, limit, orderBy, query } from "firebase/firestore";
import { type NextRequest, NextResponse } from "next/server";

// Firebase設定（環境変数から取得）
const firebaseConfig = {
	projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

// Firebase初期化
if (!getApps().length) {
	initializeApp(firebaseConfig);
}

/**
 * 指定された作品の販売履歴とランキング履歴を取得
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: { workId: string } },
): Promise<NextResponse> {
	try {
		const { workId } = params;

		if (!workId) {
			return NextResponse.json({ error: "Work ID is required" }, { status: 400 });
		}

		const db = getFirestore();

		// 販売履歴を取得
		const salesSnapshotsRef = collection(db, "salesHistory", workId, "snapshots");
		const salesQuery = query(salesSnapshotsRef, orderBy("date", "desc"), limit(100));
		const salesSnapshot = await getDocs(salesQuery);

		const salesHistory: SalesHistory[] = [];
		salesSnapshot.forEach((docSnapshot) => {
			const data = docSnapshot.data() as SalesHistory;
			salesHistory.push(data);
		});

		// ランキング履歴を取得
		const rankingsRef = collection(db, "salesHistory", workId, "rankings");
		const rankingsQuery = query(rankingsRef, orderBy("recordedAt", "desc"), limit(50));
		const rankingsSnapshot = await getDocs(rankingsQuery);

		const rankingHistory: RankingInfo[] = [];
		rankingsSnapshot.forEach((docSnapshot) => {
			const data = docSnapshot.data();
			// recordedAtフィールドを除去してRankingInfo型に変換
			const { recordedAt, ...rankingData } = data;
			rankingHistory.push(rankingData as RankingInfo);
		});

		return NextResponse.json({
			workId,
			salesHistory,
			rankingHistory,
			salesCount: salesHistory.length,
			rankingCount: rankingHistory.length,
		});
	} catch (error) {
		console.error("Sales history fetch error:", error);
		return NextResponse.json({ error: "Failed to fetch sales history" }, { status: 500 });
	}
}

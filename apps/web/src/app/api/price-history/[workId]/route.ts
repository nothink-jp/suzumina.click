import type { PriceHistory } from "@suzumina.click/shared-types";
import { getApps, initializeApp } from "firebase/app";
import { collection, doc, getDocs, getFirestore, limit, orderBy, query } from "firebase/firestore";
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
 * 指定された作品の価格履歴を取得
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
		const snapshotsRef = collection(db, "priceHistory", workId, "snapshots");
		const q = query(snapshotsRef, orderBy("date", "desc"), limit(100));
		const snapshot = await getDocs(q);

		const priceHistory: PriceHistory[] = [];
		snapshot.forEach((docSnapshot) => {
			const data = docSnapshot.data() as PriceHistory;
			priceHistory.push(data);
		});

		return NextResponse.json({
			workId,
			priceHistory,
			count: priceHistory.length,
		});
	} catch (error) {
		console.error("Price history fetch error:", error);
		return NextResponse.json({ error: "Failed to fetch price history" }, { status: 500 });
	}
}

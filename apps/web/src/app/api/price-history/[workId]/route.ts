import type { PriceHistory } from "@suzumina.click/shared-types";
import { type NextRequest, NextResponse } from "next/server";
import { getFirestore } from "@/lib/firestore";

/**
 * 指定された作品の価格履歴を取得
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
		const snapshotsRef = db.collection("priceHistory").doc(workId).collection("snapshots");
		const snapshot = await snapshotsRef.orderBy("date", "desc").limit(100).get();

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
	} catch (_error) {
		// Note: Error logged for debugging purposes
		return NextResponse.json({ error: "Failed to fetch price history" }, { status: 500 });
	}
}

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getFirestore } from "@/lib/firestore";

// リクエストパラメータのバリデーション
const ParamsSchema = z.object({
	workId: z.string().min(1),
});

const QuerySchema = z.object({
	type: z.enum(["price", "ranking"]).default("price"),
	period: z.enum(["7d", "30d", "90d", "1y", "all"]).default("30d"),
	region: z.enum(["JP", "US", "EU", "CN", "TW", "KR"]).default("JP"),
});

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ workId: string }> },
) {
	try {
		// パラメータのバリデーション
		const { workId } = ParamsSchema.parse(await params);
		const { searchParams } = new URL(request.url);
		const { type, period, region } = QuerySchema.parse({
			type: searchParams.get("type") || "price",
			period: searchParams.get("period") || "30d",
			region: searchParams.get("region") || "JP",
		});

		// 期間計算
		const now = new Date();
		const startDate = calculateStartDate(now, period);
		const endDate = now.toISOString().split("T")[0];

		// Fetching timeseries data

		// 日次集計データを取得
		const firestore = getFirestore();
		const aggregatesCollection = firestore.collection("dlsite_timeseries_daily");
		const snapshot = await aggregatesCollection
			.where("workId", "==", workId)
			.where("date", ">=", startDate)
			.where("date", "<=", endDate)
			.orderBy("date")
			.get();

		if (snapshot.empty) {
			return NextResponse.json({
				workId,
				type,
				period,
				region,
				data: [],
				message: "時系列データが見つかりません",
			});
		}

		// データ処理
		const timeSeriesData = snapshot.docs
			.map((doc) => {
				const data = doc.data();

				switch (type) {
					case "price":
						return {
							date: data.date,
							value: data.lowestPrices?.[region] || 0,
							originalValue: null, // 日次集計には元価格情報がないため
							discount: data.maxDiscountRate || 0,
							isOnSale: (data.maxDiscountRate || 0) > 0,
						};

					case "ranking":
						return {
							date: data.date,
							daily: data.bestRankDay || null,
							weekly: data.bestRankWeek || null,
							monthly: data.bestRankMonth || null,
						};

					default:
						return null;
				}
			})
			.filter(Boolean);

		return NextResponse.json({
			workId,
			type,
			period,
			region,
			data: timeSeriesData,
			metadata: {
				dataPoints: timeSeriesData.length,
				startDate,
				endDate,
				lastUpdated:
					snapshot.docs[snapshot.docs.length - 1]?.data()?.createdAt?.toDate?.()?.toISOString() ||
					null,
			},
		});
	} catch (error) {
		// 時系列データ取得エラー
		console.error("時系列データ取得エラー:", error);

		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: "無効なパラメータです", details: error.errors },
				{ status: 400 },
			);
		}

		return NextResponse.json(
			{
				error: "時系列データの取得に失敗しました",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}

/**
 * 期間文字列から開始日を計算
 */
function calculateStartDate(now: Date, period: string): string {
	const date = new Date(now);

	switch (period) {
		case "7d":
			date.setDate(date.getDate() - 7);
			break;
		case "30d":
			date.setDate(date.getDate() - 30);
			break;
		case "90d":
			date.setDate(date.getDate() - 90);
			break;
		case "1y":
			date.setFullYear(date.getFullYear() - 1);
			break;
		case "all":
			// 2年前から（十分に古い日付）
			date.setFullYear(date.getFullYear() - 2);
			break;
		default:
			date.setDate(date.getDate() - 30);
	}

	return date.toISOString().split("T")[0] || "";
}

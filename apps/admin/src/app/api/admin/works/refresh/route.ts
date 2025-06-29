import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST() {
	try {
		// 管理者権限確認
		const session = await auth();
		if (!session?.user?.isAdmin) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Cloud Functions の DLsite データ収集をトリガー
		const functionsUrl = process.env.CLOUD_FUNCTIONS_BASE_URL;
		if (!functionsUrl) {
			return NextResponse.json({ error: "Cloud Functions URL not configured" }, { status: 500 });
		}

		const response = await fetch(`${functionsUrl}/fetchDLsiteWorks`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
		});

		if (!response.ok) {
			throw new Error(`Cloud Functions error: ${response.status}`);
		}

		const result = await response.json();

		return NextResponse.json({
			success: true,
			message: "DLsite作品データの更新を開始しました",
			data: result,
		});
	} catch (error) {
		return NextResponse.json(
			{
				success: false,
				error: "作品データの更新に失敗しました",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}

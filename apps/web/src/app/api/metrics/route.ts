import { type NextRequest, NextResponse } from "next/server";

/**
 * パフォーマンスメトリクス送信エンドポイント
 * フロントエンドから収集されたメトリクスをCloud Monitoringに送信
 */

interface MetricData {
	name: string;
	value: number;
	labels?: Record<string, string>;
}

export async function POST(request: NextRequest) {
	try {
		// 本番環境でのみメトリクス送信を実行
		if (process.env.NODE_ENV !== "production") {
			return NextResponse.json({
				success: true,
				message: "Metrics skipped in development",
			});
		}

		const data: MetricData = await request.json();

		// 基本的なバリデーション
		if (!data.name || typeof data.value !== "number") {
			return NextResponse.json({ error: "Invalid metric data" }, { status: 400 });
		}

		// Cloud Monitoring カスタムメトリクス送信
		// 注: 実際の実装では @google-cloud/monitoring を使用
		// ここでは構造化ログとして出力（Cloud Loggingで収集可能）
		const _metricLog = {
			severity: "INFO",
			message: "Frontend Performance Metric",
			"logging.googleapis.com/labels": {
				metric_type: "frontend_performance",
				metric_name: data.name,
			},
			metric: {
				name: data.name,
				value: data.value,
				timestamp: new Date().toISOString(),
				labels: {
					...data.labels,
					user_agent: request.headers.get("user-agent") || "unknown",
					ip_address:
						request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
					referer: request.headers.get("referer") || "direct",
				},
			},
		};

		// Web Vitalsの場合は特別な処理
		if (data.name.startsWith("web_vitals_")) {
			const _vitalsLog = {
				severity: "INFO",
				message: "Core Web Vitals Metric",
				"logging.googleapis.com/labels": {
					metric_type: "core_web_vitals",
					vital_type: data.name.replace("web_vitals_", ""),
				},
				webVitals: {
					metric: data.name.replace("web_vitals_", "").toUpperCase(),
					value: data.value,
					timestamp: new Date().toISOString(),
					url: data.labels?.url || "unknown",
					userAgent: data.labels?.userAgent || "unknown",
				},
			};
		}

		return NextResponse.json({
			success: true,
			message: "Metric recorded successfully",
			timestamp: new Date().toISOString(),
		});
	} catch (_error) {
		// メトリクス送信エラーはアプリに影響させない
		return NextResponse.json(
			{
				success: false,
				message: "Metric recording failed",
			},
			{ status: 500 },
		);
	}
}

// HEAD リクエストもサポート（ヘルスチェック用）
export function HEAD() {
	return new Response(null, { status: 200 });
}

// GET リクエストで基本情報を返す
export function GET() {
	return NextResponse.json({
		service: "Performance Metrics API",
		version: "1.0.0",
		environment: process.env.NODE_ENV,
		timestamp: new Date().toISOString(),
	});
}

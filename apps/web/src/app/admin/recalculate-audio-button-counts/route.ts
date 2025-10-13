import { NextResponse } from "next/server";
import { recalculateAllVideosAudioButtonCount } from "@/app/buttons/lib/audio-button-stats";
import { auth } from "@/auth";
import * as logger from "@/lib/logger";

/**
 * POST /admin/recalculate-audio-button-counts
 *
 * 全動画のaudioButtonCountを再計算して更新
 * 管理者権限が必要（現在は認証ユーザーなら誰でも実行可能）
 */
export async function POST() {
	try {
		// 認証チェック
		const session = await auth();
		if (!session?.user) {
			return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
		}

		logger.info("audioButtonCount再計算開始", {
			userId: session.user.discordId,
			userName: session.user.displayName || session.user.username,
		});

		// 再計算実行
		const result = await recalculateAllVideosAudioButtonCount();

		if (result.success) {
			logger.info("audioButtonCount再計算完了");
			return NextResponse.json({
				success: true,
				message: "音声ボタン数の再計算が完了しました",
			});
		}
		logger.error("audioButtonCount再計算失敗", { error: result.error });
		return NextResponse.json(
			{
				success: false,
				error: result.error || "再計算に失敗しました",
			},
			{ status: 500 },
		);
	} catch (error) {
		logger.error("audioButtonCount再計算エラー", { error });
		return NextResponse.json(
			{
				success: false,
				error: "サーバーエラーが発生しました",
			},
			{ status: 500 },
		);
	}
}

/**
 * GET /admin/recalculate-audio-button-counts
 *
 * 再計算用のシンプルなUIを表示
 */
export async function GET() {
	const session = await auth();
	if (!session?.user) {
		return new Response("認証が必要です", { status: 401 });
	}

	const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>音声ボタン数再計算</title>
	<style>
		body {
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
			max-width: 600px;
			margin: 50px auto;
			padding: 20px;
			background: #f5f5f5;
		}
		.container {
			background: white;
			border-radius: 8px;
			padding: 30px;
			box-shadow: 0 2px 10px rgba(0,0,0,0.1);
		}
		h1 {
			color: #333;
			border-bottom: 2px solid #e0e0e0;
			padding-bottom: 10px;
		}
		.warning {
			background: #fff3cd;
			border: 1px solid #ffc107;
			color: #856404;
			padding: 15px;
			border-radius: 4px;
			margin: 20px 0;
		}
		button {
			background: #007bff;
			color: white;
			border: none;
			padding: 12px 24px;
			font-size: 16px;
			border-radius: 4px;
			cursor: pointer;
			transition: background 0.3s;
		}
		button:hover {
			background: #0056b3;
		}
		button:disabled {
			background: #6c757d;
			cursor: not-allowed;
		}
		#result {
			margin-top: 20px;
			padding: 15px;
			border-radius: 4px;
			display: none;
		}
		.success {
			background: #d4edda;
			border: 1px solid #c3e6cb;
			color: #155724;
		}
		.error {
			background: #f8d7da;
			border: 1px solid #f5c6cb;
			color: #721c24;
		}
	</style>
</head>
<body>
	<div class="container">
		<h1>🔊 音声ボタン数再計算</h1>
		
		<div class="warning">
			⚠️ <strong>注意:</strong> この処理は全動画の音声ボタン数を再計算します。
			処理には時間がかかる場合があります。
		</div>
		
		<p>現在の問題: YouTube動画更新時にaudioButtonCountが0にリセットされていました。</p>
		<p>この処理を実行すると、正しいボタン数が復元されます。</p>
		
		<button id="recalcButton" onclick="recalculate()">
			再計算を実行
		</button>
		
		<div id="result"></div>
	</div>
	
	<script>
		async function recalculate() {
			const button = document.getElementById('recalcButton');
			const result = document.getElementById('result');
			
			button.disabled = true;
			button.textContent = '処理中...';
			result.style.display = 'none';
			
			try {
				const response = await fetch('/admin/recalculate-audio-button-counts', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
				});
				
				const data = await response.json();
				
				result.style.display = 'block';
				if (data.success) {
					result.className = 'success';
					result.innerHTML = '✅ ' + (data.message || '再計算が完了しました');
				} else {
					result.className = 'error';
					result.innerHTML = '❌ エラー: ' + (data.error || '不明なエラー');
				}
			} catch (error) {
				result.style.display = 'block';
				result.className = 'error';
				result.innerHTML = '❌ ネットワークエラー: ' + error.message;
			} finally {
				button.disabled = false;
				button.textContent = '再計算を実行';
			}
		}
	</script>
</body>
</html>
	`;

	return new Response(html, {
		headers: {
			"Content-Type": "text/html; charset=utf-8",
		},
	});
}

import { type NextRequest, NextResponse } from "next/server";

/**
 * DLsite画像プロキシAPI
 * DLsiteの画像を適切なRefererヘッダー付きで取得し、
 * Next.jsのImage Optimizationが利用できる形でプロキシします。
 */
export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const imageUrl = searchParams.get("url");

		if (!imageUrl) {
			return NextResponse.json({ error: "Image URL is required" }, { status: 400 });
		}

		// DLsite画像のみを許可
		if (!imageUrl.includes("img.dlsite.jp")) {
			return NextResponse.json({ error: "Only DLsite images are allowed" }, { status: 403 });
		}

		// DLsite画像を適切なヘッダー付きで取得
		const response = await fetch(imageUrl, {
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
				Referer: "https://www.dlsite.com/",
				Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
				"Accept-Language": "ja-JP,ja;q=0.9,en;q=0.8",
				"Cache-Control": "no-cache",
				"Sec-Fetch-Dest": "image",
				"Sec-Fetch-Mode": "no-cors",
				"Sec-Fetch-Site": "cross-site",
			},
		});

		if (!response.ok) {
			console.warn(`Failed to fetch DLsite image: ${imageUrl} - Status: ${response.status}`);

			// 403エラーの場合は特別なメッセージ
			if (response.status === 403) {
				console.warn(
					`DLsite image access forbidden: ${imageUrl}. This may be due to referrer restrictions.`,
				);
				return NextResponse.json(
					{ error: "Image access forbidden", status: 403, hint: "Referrer restriction" },
					{ status: 403 },
				);
			}

			return NextResponse.json(
				{ error: "Failed to fetch image", status: response.status },
				{ status: response.status },
			);
		}

		const imageBuffer = await response.arrayBuffer();
		const contentType = response.headers.get("content-type") || "image/jpeg";

		// レスポンスヘッダーを設定
		const headers = new Headers();
		headers.set("Content-Type", contentType);
		headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800"); // 1日キャッシュ、1週間stale
		headers.set("Content-Length", imageBuffer.byteLength.toString());

		// CORSヘッダー（必要に応じて）
		headers.set("Access-Control-Allow-Origin", "*");

		return new NextResponse(imageBuffer, {
			status: 200,
			headers,
		});
	} catch (error) {
		console.error("Error in image proxy:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}

// HEADリクエストもサポート（画像存在チェック用）
export async function HEAD(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const imageUrl = searchParams.get("url");

		if (!imageUrl || !imageUrl.includes("img.dlsite.jp")) {
			return new NextResponse(null, { status: 400 });
		}

		const response = await fetch(imageUrl, {
			method: "HEAD",
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
				Referer: "https://www.dlsite.com/",
			},
		});

		return new NextResponse(null, {
			status: response.status,
			headers: {
				"Content-Type": response.headers.get("content-type") || "image/jpeg",
				"Cache-Control": "public, max-age=3600", // 1時間キャッシュ
			},
		});
	} catch (error) {
		console.error("Error in image proxy HEAD:", error);
		return new NextResponse(null, { status: 500 });
	}
}

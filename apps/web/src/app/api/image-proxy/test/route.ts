import { type NextRequest, NextResponse } from "next/server";

/**
 * 画像プロキシテスト用API
 * DLsite画像のアクセス可能性をテストします
 */
export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const testUrl = searchParams.get("url");

		if (!testUrl) {
			return NextResponse.json({ error: "Test URL is required" }, { status: 400 });
		}

		if (!testUrl.includes("img.dlsite.jp")) {
			return NextResponse.json(
				{ error: "Only DLsite URLs are supported for testing" },
				{ status: 400 },
			);
		}

		// HEADリクエストでアクセス可能性をテスト
		const response = await fetch(testUrl, {
			method: "HEAD",
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
				Referer: "https://www.dlsite.com/",
				Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
				"Accept-Language": "ja-JP,ja;q=0.9,en;q=0.8",
				"Cache-Control": "no-cache",
			},
		});

		const result = {
			url: testUrl,
			status: response.status,
			statusText: response.statusText,
			accessible: response.ok,
			contentType: response.headers.get("content-type"),
			contentLength: response.headers.get("content-length"),
			lastModified: response.headers.get("last-modified"),
			etag: response.headers.get("etag"),
			cacheControl: response.headers.get("cache-control"),
			timestamp: new Date().toISOString(),
		};

		if (!response.ok) {
			console.warn(`DLsite image test failed: ${testUrl} - Status: ${response.status}`);
		}

		return NextResponse.json(result, { status: 200 });
	} catch (error) {
		console.error("Error in image proxy test:", error);
		return NextResponse.json(
			{
				error: "Test request failed",
				message: error instanceof Error ? error.message : "Unknown error",
				timestamp: new Date().toISOString(),
			},
			{ status: 500 },
		);
	}
}

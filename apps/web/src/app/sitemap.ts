import type { Firestore } from "@google-cloud/firestore";
import type { MetadataRoute } from "next";
import { unstable_cache } from "next/cache";
import { connection } from "next/server";
import { getFirestore } from "@/lib/firestore";
import { warn as logWarn } from "@/lib/logger";

// build 時の Firestore アクセスを避け、リクエスト時に Cloud Run の SA credentials で生成する (SPR-60)
// Firestore 取得部分は unstable_cache でキャッシュし、毎リクエストでクエリが走らないようにする
// cacheComponents 有効下では route segment config `dynamic` が使えないため、
// `await connection()` でリクエストスコープに入り build-time prerender を回避する
//
// SPR-218: works+videos+buttons の全件スキャンが Firestore QUERY reads の一因（reads の96%がQUERY）。
// sitemap に時間単位の鮮度は不要（クローラの再取得は低頻度・新規コンテンツは数時間〜1日内で十分）なため、
// TTL を 1h→24h に延長して全件 read 頻度を 24分の1 に抑える。
const SITEMAP_REVALIDATE_SECONDS = 86400;

function lastModifiedOf(data: { updatedAt?: unknown; createdAt?: unknown }): Date {
	return new Date(
		(data.updatedAt as string | undefined) || (data.createdAt as string | undefined) || Date.now(),
	);
}

// 動画ページ一覧。videos コレクションには isPublic フィールドが無く、可視性は status.privacyStatus で判定する。
// 一覧ページ (apps/web/src/app/videos/actions.ts) と同じく、status 未設定も公開扱いする。
async function getVideoPages(
	firestore: Firestore,
	baseUrl: string,
): Promise<MetadataRoute.Sitemap> {
	try {
		const snapshot = await firestore.collection("videos").limit(50000).get();
		return snapshot.docs
			.filter((doc) => {
				const privacyStatus = doc.data().status?.privacyStatus;
				return !doc.data().status || privacyStatus === "public";
			})
			.map((doc) => ({
				url: `${baseUrl}/videos/${doc.id}`,
				lastModified: lastModifiedOf(doc.data()),
				changeFrequency: "weekly" as const,
				priority: 0.7,
			}));
	} catch (error) {
		logWarn("Failed to fetch videos for sitemap:", { error });
		return [];
	}
}

// 作品ページ一覧。works コレクションには公開/非公開の概念が無く、全件が公開対象。
async function getWorkPages(firestore: Firestore, baseUrl: string): Promise<MetadataRoute.Sitemap> {
	try {
		const snapshot = await firestore.collection("works").limit(50000).get();
		return snapshot.docs.map((doc) => ({
			url: `${baseUrl}/works/${doc.id}`,
			lastModified: lastModifiedOf(doc.data()),
			changeFrequency: "monthly" as const,
			priority: 0.6,
		}));
	} catch (error) {
		logWarn("Failed to fetch works for sitemap:", { error });
		return [];
	}
}

// 音声ボタンページ一覧。公開ボタン（isPublic=true）のみ対象。
async function getAudioButtonPages(
	firestore: Firestore,
	baseUrl: string,
): Promise<MetadataRoute.Sitemap> {
	try {
		const snapshot = await firestore
			.collection("audioButtons")
			.where("isPublic", "==", true)
			.limit(50000)
			.get();
		return snapshot.docs.map((doc) => ({
			url: `${baseUrl}/buttons/${doc.id}`,
			lastModified: lastModifiedOf(doc.data()),
			changeFrequency: "monthly" as const,
			priority: 0.5,
		}));
	} catch (error) {
		logWarn("Failed to fetch audio buttons for sitemap:", { error });
		return [];
	}
}

// クリエイターページ一覧。creators コレクションには公開/非公開の概念が無く、全件が公開対象。
async function getCreatorPages(
	firestore: Firestore,
	baseUrl: string,
): Promise<MetadataRoute.Sitemap> {
	try {
		const snapshot = await firestore.collection("creators").limit(50000).get();
		return snapshot.docs.map((doc) => ({
			url: `${baseUrl}/creators/${doc.id}`,
			lastModified: lastModifiedOf(doc.data()),
			changeFrequency: "weekly" as const,
			priority: 0.5,
		}));
	} catch (error) {
		logWarn("Failed to fetch creators for sitemap:", { error });
		return [];
	}
}

// サークルページ一覧。circles コレクションには公開/非公開の概念が無く、全件が公開対象。
async function getCirclePages(
	firestore: Firestore,
	baseUrl: string,
): Promise<MetadataRoute.Sitemap> {
	try {
		const snapshot = await firestore.collection("circles").limit(50000).get();
		return snapshot.docs.map((doc) => ({
			url: `${baseUrl}/circles/${doc.id}`,
			lastModified: lastModifiedOf(doc.data()),
			changeFrequency: "weekly" as const,
			priority: 0.5,
		}));
	} catch (error) {
		logWarn("Failed to fetch circles for sitemap:", { error });
		return [];
	}
}

const getDynamicSitemapPages = unstable_cache(
	async (baseUrl: string): Promise<MetadataRoute.Sitemap> => {
		const firestore = getFirestore();
		const [videoPages, workPages, audioButtonPages, creatorPages, circlePages] = await Promise.all([
			getVideoPages(firestore, baseUrl),
			getWorkPages(firestore, baseUrl),
			getAudioButtonPages(firestore, baseUrl),
			getCreatorPages(firestore, baseUrl),
			getCirclePages(firestore, baseUrl),
		]);
		return [...videoPages, ...workPages, ...audioButtonPages, ...creatorPages, ...circlePages];
	},
	["sitemap-dynamic-pages"],
	{ revalidate: SITEMAP_REVALIDATE_SECONDS, tags: ["sitemap"] },
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	await connection();
	const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://suzumina.click";

	// 静的ページ（公開ページのみ。要認証ページや action ページは robots.txt 側で disallow する）
	const now = new Date();
	const staticPages: MetadataRoute.Sitemap = [
		{ url: baseUrl, lastModified: now, changeFrequency: "daily", priority: 1 },
		{ url: `${baseUrl}/buttons`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
		{ url: `${baseUrl}/videos`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
		{ url: `${baseUrl}/works`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
		{ url: `${baseUrl}/circles`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
		{ url: `${baseUrl}/creators`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
		{ url: `${baseUrl}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
		{ url: `${baseUrl}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
		{ url: `${baseUrl}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
		{ url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
	];

	try {
		const dynamicPages = await getDynamicSitemapPages(baseUrl);
		return [...staticPages, ...dynamicPages];
	} catch (error) {
		// Firestoreが利用できない場合は静的ページのみ返す
		logWarn("Failed to fetch dynamic content for sitemap:", { error });
		return staticPages;
	}
}

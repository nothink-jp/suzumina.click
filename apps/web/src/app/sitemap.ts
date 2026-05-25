import type { MetadataRoute } from "next";
import { unstable_cache } from "next/cache";
import { getFirestore } from "@/lib/firestore";
import { warn as logWarn } from "@/lib/logger";

// build 時の Firestore アクセスを避け、リクエスト時に Cloud Run の SA credentials で生成する (SPR-60)
// Firestore 取得部分は unstable_cache で 1 時間キャッシュし、毎リクエストでクエリが走らないようにする
export const dynamic = "force-dynamic";

const SITEMAP_REVALIDATE_SECONDS = 3600;

const getDynamicSitemapPages = unstable_cache(
	async (baseUrl: string): Promise<MetadataRoute.Sitemap> => {
		const firestore = getFirestore();
		const dynamicPages: MetadataRoute.Sitemap = [];

		// 動画ページを追加
		// videos コレクションには isPublic フィールドが無く、可視性は status.privacyStatus で判定する。
		// 一覧ページ (apps/web/src/app/videos/actions.ts) と同じく、status 未設定も公開扱いする。
		try {
			const videosSnapshot = await firestore.collection("videos").limit(50000).get();

			for (const doc of videosSnapshot.docs) {
				const video = doc.data();
				const privacyStatus = video.status?.privacyStatus;
				if (video.status && privacyStatus !== "public") continue;
				dynamicPages.push({
					url: `${baseUrl}/videos/${doc.id}`,
					lastModified: new Date(video.updatedAt || video.createdAt || Date.now()),
					changeFrequency: "weekly",
					priority: 0.7,
				});
			}
		} catch (error) {
			logWarn("Failed to fetch videos for sitemap:", { error });
		}

		// 作品ページを追加
		// works コレクションには公開/非公開の概念が無く、全件が公開対象。
		try {
			const worksSnapshot = await firestore.collection("works").limit(50000).get();

			for (const doc of worksSnapshot.docs) {
				const work = doc.data();
				dynamicPages.push({
					url: `${baseUrl}/works/${doc.id}`,
					lastModified: new Date(work.updatedAt || work.createdAt || Date.now()),
					changeFrequency: "monthly",
					priority: 0.6,
				});
			}
		} catch (error) {
			logWarn("Failed to fetch works for sitemap:", { error });
		}

		// 音声ボタンページを追加
		try {
			const audioButtonsSnapshot = await firestore
				.collection("audioButtons")
				.where("isPublic", "==", true)
				.limit(50000)
				.get();

			for (const doc of audioButtonsSnapshot.docs) {
				const audioButton = doc.data();
				dynamicPages.push({
					url: `${baseUrl}/buttons/${doc.id}`,
					lastModified: new Date(audioButton.updatedAt || audioButton.createdAt || Date.now()),
					changeFrequency: "monthly",
					priority: 0.5,
				});
			}
		} catch (error) {
			logWarn("Failed to fetch audio buttons for sitemap:", { error });
		}

		return dynamicPages;
	},
	["sitemap-dynamic-pages"],
	{ revalidate: SITEMAP_REVALIDATE_SECONDS, tags: ["sitemap"] },
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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
		{ url: `${baseUrl}/search`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
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

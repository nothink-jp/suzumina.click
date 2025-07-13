import type { MetadataRoute } from "next";
import { getFirestore } from "@/lib/firestore";
import { warn as logWarn } from "@/lib/logger";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://suzumina.click";

	// 静的ページ
	const staticPages: MetadataRoute.Sitemap = [
		{
			url: baseUrl,
			lastModified: new Date(),
			changeFrequency: "daily",
			priority: 1,
		},
		{
			url: `${baseUrl}/buttons`,
			lastModified: new Date(),
			changeFrequency: "daily",
			priority: 0.9,
		},
		{
			url: `${baseUrl}/buttons/create`,
			lastModified: new Date(),
			changeFrequency: "monthly",
			priority: 0.7,
		},
		{
			url: `${baseUrl}/videos`,
			lastModified: new Date(),
			changeFrequency: "daily",
			priority: 0.9,
		},
		{
			url: `${baseUrl}/works`,
			lastModified: new Date(),
			changeFrequency: "weekly",
			priority: 0.8,
		},
		{
			url: `${baseUrl}/auth/signin`,
			lastModified: new Date(),
			changeFrequency: "yearly",
			priority: 0.3,
		},
	];

	try {
		const firestore = getFirestore();
		const dynamicPages: MetadataRoute.Sitemap = [];

		// 動画ページを追加
		try {
			const videosSnapshot = await firestore
				.collection("videos")
				.where("isPublic", "==", true)
				.limit(1000)
				.get();

			for (const doc of videosSnapshot.docs) {
				const video = doc.data();
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
		try {
			const worksSnapshot = await firestore
				.collection("dlsiteWorks")
				.where("isPublic", "==", true)
				.limit(1000)
				.get();

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
				.limit(1000)
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

		return [...staticPages, ...dynamicPages];
	} catch (error) {
		// Firestoreが利用できない場合は静的ページのみ返す
		logWarn("Failed to fetch dynamic content for sitemap:", { error });
		return staticPages;
	}
}

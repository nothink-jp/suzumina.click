import type { DocumentData, Firestore, Query, WhereFilterOp } from "@google-cloud/firestore";
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

// works/videos/audioButtons は string ISO、creators/circles は Firestore Timestamp と
// 型が混在している（CLAUDE.md §1）。Timestamp は toDate() を経由しないと Invalid Date になるため、
// videos/actions.ts の convertTimestamp と同じパターンで両対応する。
function toDateValue(value: unknown): Date | string | undefined {
	if (value && typeof value === "object" && "toDate" in value) {
		return (value as { toDate(): Date }).toDate();
	}
	return value as Date | string | undefined;
}

function lastModifiedOf(data: { updatedAt?: unknown; createdAt?: unknown }): Date {
	return new Date(toDateValue(data.updatedAt) || toDateValue(data.createdAt) || Date.now());
}

type CollectionPageConfig = {
	collection: string;
	/** ログメッセージ用の表示名（例: audioButtons → "audio buttons"）。省略時は collection をそのまま使う。 */
	label?: string;
	urlPrefix: string;
	changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
	priority: number;
	/** isPublic 等での事前フィルタが必要なコレクションのみ指定（例: audioButtons） */
	where?: [field: string, op: WhereFilterOp, value: unknown];
	/** レコード単位の可視性判定（例: videos の status.privacyStatus） */
	isVisible?: (data: DocumentData) => boolean;
};

// コレクション全件を sitemap エントリへ変換する共通ロジック。
// コレクションごとの差分（コレクション名・URLプレフィックス・優先度・可視性判定）のみを
// 呼び出し側で指定する。取得失敗はログを残しつつ空配列にフォールバックし、他コレクションへ波及させない。
async function getCollectionPages(
	firestore: Firestore,
	baseUrl: string,
	config: CollectionPageConfig,
): Promise<MetadataRoute.Sitemap> {
	try {
		let query: Query = firestore.collection(config.collection);
		if (config.where) {
			query = query.where(...config.where);
		}
		const snapshot = await query.limit(50000).get();
		return snapshot.docs
			.filter((doc) => !config.isVisible || config.isVisible(doc.data()))
			.map((doc) => ({
				url: `${baseUrl}${config.urlPrefix}/${doc.id}`,
				lastModified: lastModifiedOf(doc.data()),
				changeFrequency: config.changeFrequency,
				priority: config.priority,
			}));
	} catch (error) {
		logWarn(`Failed to fetch ${config.label ?? config.collection} for sitemap:`, { error });
		return [];
	}
}

// コレクションごとの設定一覧。
// - videos: isPublic フィールドが無く、可視性は status.privacyStatus で判定する。
//   一覧ページ (apps/web/src/app/videos/actions.ts) と同じく、status 未設定も公開扱いする。
// - works/creators/circles: 公開/非公開の概念が無く、全件が公開対象。
// - audioButtons: 公開ボタン（isPublic=true）のみ対象。
const COLLECTION_PAGE_CONFIGS: CollectionPageConfig[] = [
	{
		collection: "videos",
		urlPrefix: "/videos",
		changeFrequency: "weekly",
		priority: 0.7,
		isVisible: (data) => {
			const privacyStatus = data.status?.privacyStatus;
			return !data.status || privacyStatus === "public";
		},
	},
	{ collection: "works", urlPrefix: "/works", changeFrequency: "monthly", priority: 0.6 },
	{
		collection: "audioButtons",
		label: "audio buttons",
		urlPrefix: "/buttons",
		changeFrequency: "monthly",
		priority: 0.5,
		where: ["isPublic", "==", true],
	},
	{ collection: "creators", urlPrefix: "/creators", changeFrequency: "weekly", priority: 0.5 },
	{ collection: "circles", urlPrefix: "/circles", changeFrequency: "weekly", priority: 0.5 },
];

const getDynamicSitemapPages = unstable_cache(
	async (baseUrl: string): Promise<MetadataRoute.Sitemap> => {
		const firestore = getFirestore();
		const pagesByCollection = await Promise.all(
			COLLECTION_PAGE_CONFIGS.map((config) => getCollectionPages(firestore, baseUrl, config)),
		);
		return pagesByCollection.flat();
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

/**
 * Work Firestore Transformer（旧 work-firestore-final.ts。"final" が何を約束するか不明だったため改名）
 *
 * WorkDocument（Firestore）→ WorkPlainObject の読み取り変換。Document に存在するフィールドのみを写す。
 * 書き込み（Plain→Document）は持たない（収集パイプライン / Server Action が直接構築する）。
 */

import { detectWorkLanguage, getSupportedLanguages } from "../entities/work/language-detection";
import type { WorkDocument } from "../entities/work/work-document-schema";
import type { WorkPlainObject } from "../plain-objects/work-plain";

/**
 * Get display name for work category
 */
function getCategoryDisplay(category: string): string {
	const categoryMap: Record<string, string> = {
		SOU: "ボイス・ASMR",
		MNG: "マンガ",
		GAM: "ゲーム",
		ICG: "CG・イラスト",
		MOV: "動画",
		RPG: "RPG",
		ADV: "アドベンチャー",
		ACN: "アクション",
		SLN: "シミュレーション",
		PZL: "パズル",
		QIZ: "クイズ",
		TBL: "テーブル",
		DGT: "デジタル",
		CG: "CG",
		TOL: "ツール",
		ET3: "その他",
		etc: "その他",
	};
	return categoryMap[category] || category;
}

/**
 * genre / customGenre フィールドを文字列配列に正規化する。
 *
 * Firestore 上では `string` と `{ name }` オブジェクトが混在しうる（旧データ）ため、両形を吸収する。
 * 以前は fromFirestore 内の genres / customGenres × 2箇所で同じ map が4重複し、各所で
 * `(g as any).name` の noExplicitAny biome-ignore を発生させていた（重複を1関数に集約）。
 */
function normalizeGenres(raw: readonly unknown[] | undefined): string[] {
	if (!raw) return [];
	return raw
		.map((g): string => {
			if (typeof g === "string") return g;
			if (g && typeof g === "object" && "name" in g) {
				const name = (g as { name?: unknown }).name;
				return typeof name === "string" ? name : "";
			}
			return "";
		})
		.filter(Boolean);
}

/**
 * Transforms Firestore document to WorkPlainObject
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Necessary for complete data transformation
export function fromFirestore(doc: WorkDocument): WorkPlainObject {
	// Validate required fields
	if (!doc.productId || !doc.title || !doc.circle) {
		throw new Error(
			`Invalid work document: missing required fields (productId: ${doc.productId}, title: ${doc.title}, circle: ${doc.circle})`,
		);
	}

	// Create minimal plain object with required fields
	const plainObject: WorkPlainObject = {
		// Basic identification
		id: doc.id || doc.productId,
		productId: doc.productId,
		baseProductId: doc.baseProductId,

		// Basic work information
		title: doc.title || "",
		titleMasked: doc.titleMasked,
		titleKana: doc.titleKana,
		altName: doc.altName,
		circle: doc.circle || "",
		circleId: doc.circleId,
		circleEn: doc.circleEn,
		description: doc.description || "",
		category: doc.category,
		originalCategoryText: doc.originalCategoryText,
		workUrl: doc.workUrl || "",
		thumbnailUrl: doc.thumbnailUrl || "",
		highResImageUrl: doc.highResImageUrl,

		// Price (required)
		price: {
			current: doc.price?.current || 0,
			original: doc.price?.original || doc.price?.current || 0,
			currency: doc.price?.currency || "JPY",
			discount: doc.price?.discount,
			point: doc.price?.point,
			isFree: (doc.price?.current || 0) === 0,
			isDiscounted: (doc.price?.current || 0) < (doc.price?.original || doc.price?.current || 0),
			formattedPrice: `¥${(doc.price?.current || 0).toLocaleString()}`,
		},

		// Rating (optional)
		rating: doc.rating
			? {
					stars: doc.rating.stars || 0,
					count: doc.rating.count || 0,
					average: doc.rating.stars || 0,
					reviewCount: doc.rating.reviewCount,
					distribution: undefined,
					hasRatings: (doc.rating.count || 0) > 0,
					isHighlyRated: (doc.rating.stars || 0) >= 4.0 && (doc.rating.count || 0) >= 10,
					reliability:
						(doc.rating.count || 0) >= 100
							? "high"
							: (doc.rating.count || 0) >= 50
								? "medium"
								: (doc.rating.count || 0) >= 10
									? "low"
									: "insufficient",
					formattedRating:
						(doc.rating.count || 0) > 0
							? `${(doc.rating.stars || 0).toFixed(1)} (${doc.rating.count})`
							: "評価なし",
				}
			: undefined,

		// Creators (required)
		creators: {
			voiceActors:
				doc.creators?.voice_by?.map((c) => ({
					id: c.id || `voice-${c.name}`,
					name: c.name,
				})) || [],
			scenario:
				doc.creators?.scenario_by?.map((c) => ({
					id: c.id || `scenario-${c.name}`,
					name: c.name,
				})) || [],
			illustration:
				doc.creators?.illust_by?.map((c) => ({
					id: c.id || `illust-${c.name}`,
					name: c.name,
				})) || [],
			music:
				doc.creators?.music_by?.map((c) => ({
					id: c.id || `music-${c.name}`,
					name: c.name,
				})) || [],
			others:
				doc.creators?.others_by?.map((c) => ({
					id: c.id || `other-${c.name}`,
					name: c.name,
				})) || [],
			voiceActorNames: doc.creators?.voice_by?.map((c) => c.name) || [],
			scenarioNames: doc.creators?.scenario_by?.map((c) => c.name) || [],
			illustrationNames: doc.creators?.illust_by?.map((c) => c.name) || [],
			musicNames: doc.creators?.music_by?.map((c) => c.name) || [],
			otherNames: doc.creators?.others_by?.map((c) => c.name) || [],
		},

		// Series (optional)
		series:
			doc.seriesId || doc.seriesName
				? {
						id: doc.seriesId || (doc.seriesName ? `series-${doc.seriesName}` : ""),
						name: doc.seriesName || "",
						workCount: undefined,
					}
				: undefined,

		// Sales status (required)
		salesStatus: {
			isOnSale: doc.salesStatus?.isSale ?? true,
			isDiscounted:
				doc.salesStatus?.isDiscount ??
				(doc.price?.current || 0) < (doc.price?.original || doc.price?.current || 0),
			isFree: doc.salesStatus?.isFree ?? (doc.price?.current || 0) === 0,
			isSoldOut: false, // Not available in current schema
			isReserveWork: false, // Not available in current schema
			dlsiteplaySupported: false, // Not available in current schema
		},

		// Extended metadata
		ageRating: doc.ageRating,
		ageCategory: doc.ageCategory,
		ageCategoryString: doc.ageCategoryString,
		workType: doc.workType,
		workTypeString: doc.workTypeString,
		workFormat: doc.workFormat,
		fileFormat: doc.fileFormat,
		fileType: doc.fileType,
		fileTypeString: doc.fileTypeString,
		fileSize: doc.fileSize,
		genres: normalizeGenres(doc.genres),
		customGenres: normalizeGenres(doc.customGenres),
		sampleImages:
			doc.sampleImages?.map((img) => {
				if (typeof img === "string") {
					return { thumbnailUrl: img };
				}
				return {
					// biome-ignore lint/suspicious/noExplicitAny: Image can have different structures
					thumbnailUrl: (img as any).thumb || (img as any).thumbnailUrl || "",
					// biome-ignore lint/suspicious/noExplicitAny: Image can have different structures
					width: (img as any).width,
					// biome-ignore lint/suspicious/noExplicitAny: Image can have different structures
					height: (img as any).height,
				};
			}) || [],

		// Date information
		registDate: doc.registDate,
		updateDate: doc.updateDate,
		releaseDate: doc.releaseDate,
		releaseDateISO: doc.releaseDateISO,
		releaseDateDisplay: doc.releaseDateDisplay,
		createdAt: doc.createdAt || doc.registDate || new Date().toISOString(),
		updatedAt: doc.updatedAt || doc.updateDate || new Date().toISOString(),
		lastFetchedAt: doc.lastFetchedAt || new Date().toISOString(),

		// Translation and Language (optional)
		translationInfo: doc.translationInfo
			? {
					isTranslationAgree: doc.translationInfo.isTranslationAgree || false,
					isOriginal: doc.translationInfo.isOriginal || false,
					originalWorkno: doc.translationInfo.originalWorkno,
					lang: doc.translationInfo.lang,
				}
			: undefined,
		languageDownloads: doc.languageDownloads?.map((ld) => ({
			workno: ld.workno,
			label: ld.label,
			lang: ld.lang,
			dlCount: ld.dlCount,
		})),

		// Computed properties (required)
		_computed: {
			// Display-related
			displayTitle: doc.titleMasked || doc.title || "",
			displayCircle: doc.circle || "",
			displayCategory: getCategoryDisplay(doc.category),
			displayAgeRating: doc.ageRating || "全年齢",
			displayReleaseDate: doc.releaseDateDisplay || doc.releaseDate || "",
			relativeUrl: `/works/${doc.productId}`,

			// Business logic
			isAdultContent: doc.ageRating?.includes("18") || doc.ageCategory === 3 || false,
			isVoiceWork: doc.category === "SOU" || doc.workType === "SOU" || false,
			isGameWork:
				["GAM", "RPG", "ACN", "SLN", "ADV", "PZL", "QIZ", "TBL", "DGT"].includes(doc.category) ||
				false,
			isMangaWork: ["MNG", "ICG"].includes(doc.category) || false,
			hasDiscount: (doc.price?.current || 0) < (doc.price?.original || doc.price?.current || 0),
			isNewRelease: (() => {
				if (!doc.releaseDate && !doc.releaseDateISO && !doc.registDate) return false;
				const dateStr = doc.releaseDateISO || doc.releaseDate || doc.registDate || "";
				try {
					const releaseDate = new Date(dateStr);
					const thirtyDaysAgo = new Date();
					thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
					return releaseDate >= thirtyDaysAgo;
				} catch {
					return false;
				}
			})(),
			isPopular: (doc.rating?.count || 0) > 100,

			// Language-related（正本は entities/work/language-detection の detectWorkLanguage）
			primaryLanguage: detectWorkLanguage(doc) ?? "ja",
			availableLanguages: getSupportedLanguages(doc),

			// Search and filtering
			searchableText: [doc.title, doc.circle, doc.description].filter(Boolean).join(" "),
			tags: [...normalizeGenres(doc.genres), ...normalizeGenres(doc.customGenres)],
		},
	};

	return plainObject;
}

/**
 * Work Firestore transformers namespace
 *
 * 読み取り（Document→Plain）の正本は fromFirestore。書き込み（Plain→Document）は
 * 各 Server Action / 収集パイプラインがドキュメントを直接構築するため、本 transformer は
 * 持たない（旧 toFirestore は `as any as WorkDocument` 付きの呼び出しゼロの死蔵だったため削除）。
 */
export const workTransformers = {
	fromFirestore,
};

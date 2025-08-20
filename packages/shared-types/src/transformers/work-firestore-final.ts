/**
 * Final Work Firestore Transformer
 *
 * Minimal implementation that only maps fields that exist in both WorkDocument and WorkPlainObject.
 */

import type { WorkLanguage } from "../entities/work";
import type { WorkDocument } from "../entities/work/work-document-schema";
import type { WorkPlainObject } from "../plain-objects/work-plain";

/**
 * Map language code to WorkLanguage type
 */
function mapLanguageCode(lang: string | undefined): WorkLanguage | null {
	if (!lang) return null;
	const code = lang.toLowerCase();

	// ISO 639-3 to ISO 639-1 mapping
	if (code === "jpn" || code === "ja" || code === "jp") return "ja";
	if (code === "eng" || code === "en") return "en";
	if (code === "zho" || code === "zh" || code === "chi" || code === "chn") return "zh-cn";
	if (code === "zht" || code === "zh-tw" || code === "tw") return "zh-tw";
	if (code === "kor" || code === "ko" || code === "kr") return "ko";
	if (code === "spa" || code === "es") return "es";
	if (code === "tha" || code === "th") return "th";
	if (code === "deu" || code === "de") return "de";
	if (code === "fra" || code === "fr") return "fr";
	if (code === "ita" || code === "it") return "it";
	if (code === "por" || code === "pt") return "pt";
	if (code === "rus" || code === "ru") return "ru";
	if (code === "vie" || code === "vi" || code === "vn") return "vi";
	if (code === "ind" || code === "id") return "id";

	return null;
}

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
		genres:
			doc.genres
				?.map((g) => {
					if (typeof g === "string") return g;
					// biome-ignore lint/suspicious/noExplicitAny: Genre can be string or object with name
					if (g && typeof g === "object" && "name" in g) return (g as any).name;
					return "";
				})
				.filter(Boolean) || [],
		customGenres:
			doc.customGenres
				?.map((g) => {
					if (typeof g === "string") return g;
					// biome-ignore lint/suspicious/noExplicitAny: Genre can be string or object with name
					if (g && typeof g === "object" && "name" in g) return (g as any).name;
					return "";
				})
				.filter(Boolean) || [],
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

			// Language-related
			primaryLanguage: (() => {
				// First priority: detect from title for translations
				if (doc.title) {
					if (doc.title.includes("【繁体中文版】") || doc.title.includes("【繁體中文版】")) {
						return "zh-tw";
					}
					if (doc.title.includes("【简体中文版】") || doc.title.includes("【簡体中文版】")) {
						return "zh-cn";
					}
					if (doc.title.includes("【英語版】") || doc.title.includes("【English】")) {
						return "en";
					}
					if (doc.title.includes("【韓国語版】") || doc.title.includes("【한국어】")) {
						return "ko";
					}
				}

				// Second priority: check translation info
				const mapped = mapLanguageCode(doc.translationInfo?.lang);
				if (mapped) return mapped;

				// Third priority: check language downloads
				if (doc.languageDownloads && doc.languageDownloads.length > 0) {
					// Usually the first one is the primary language
					const firstDownload = doc.languageDownloads[0];
					if (firstDownload) {
						const firstLang = mapLanguageCode(firstDownload.lang);
						if (firstLang) return firstLang;
					}
				}

				// Default to Japanese
				return "ja";
			})() as WorkLanguage,
			availableLanguages: (() => {
				const languages = new Set<WorkLanguage>();

				// Detect from title first for translations
				if (doc.title) {
					if (doc.title.includes("【繁体中文版】") || doc.title.includes("【繁體中文版】")) {
						languages.add("zh-tw");
					}
					if (doc.title.includes("【简体中文版】") || doc.title.includes("【簡体中文版】")) {
						languages.add("zh-cn");
					}
					if (doc.title.includes("【英語版】") || doc.title.includes("【English】")) {
						languages.add("en");
					}
					if (doc.title.includes("【韓国語版】") || doc.title.includes("【한국어】")) {
						languages.add("ko");
					}
				}

				// Always include Japanese as it's usually available
				languages.add("ja");

				// Add translation language if exists
				const translationLang = mapLanguageCode(doc.translationInfo?.lang);
				if (translationLang) {
					languages.add(translationLang);
				}

				// Add languages from language downloads
				if (doc.languageDownloads && doc.languageDownloads.length > 0) {
					for (const ld of doc.languageDownloads) {
						const mapped = mapLanguageCode(ld.lang);
						if (mapped) {
							languages.add(mapped);
						}
					}
				}

				return Array.from(languages);
			})() as WorkLanguage[],

			// Search and filtering
			searchableText: [doc.title, doc.circle, doc.description].filter(Boolean).join(" "),
			tags: [
				...(doc.genres
					?.map((g) => {
						if (typeof g === "string") return g;
						// biome-ignore lint/suspicious/noExplicitAny: Genre can be string or object with name
						if (g && typeof g === "object" && "name" in g) return (g as any).name;
						return "";
					})
					.filter(Boolean) || []),
				...(doc.customGenres
					?.map((g) => {
						if (typeof g === "string") return g;
						// biome-ignore lint/suspicious/noExplicitAny: Genre can be string or object with name
						if (g && typeof g === "object" && "name" in g) return (g as any).name;
						return "";
					})
					.filter(Boolean) || []),
			],
		},
	};

	return plainObject;
}

/**
 * Transforms WorkPlainObject to Firestore document format
 */
export function toFirestore(work: WorkPlainObject): WorkDocument {
	// Remove computed properties for storage
	const { _computed } = work;

	// Return simplified mapping (as any to bypass strict typing)
	return {
		id: work.productId,
		productId: work.productId,
		title: work.title,
		circle: work.circle,
		description: work.description,
		category: work.category,
		workUrl: work.workUrl,
		thumbnailUrl: work.thumbnailUrl,
		price: {
			current: work.price.current,
			original: work.price.original,
			currency: work.price.currency,
			point: work.price.point,
		},
		rating: work.rating
			? {
					stars: work.rating.stars,
					count: work.rating.count,
					reviewCount: work.rating.reviewCount,
				}
			: undefined,
		genres: work.genres,
		customGenres: work.customGenres,
		creators: {
			voice_by: work.creators.voiceActors.map((c) => ({ id: c.id, name: c.name })),
			scenario_by: work.creators.scenario.map((c) => ({ id: c.id, name: c.name })),
			illust_by: work.creators.illustration.map((c) => ({ id: c.id, name: c.name })),
			music_by: work.creators.music.map((c) => ({ id: c.id, name: c.name })),
			others_by: work.creators.others.map((c) => ({ id: c.id, name: c.name })),
			created_by: [],
		},
		sampleImages: work.sampleImages.map((img) => ({
			thumb: img.thumbnailUrl,
			width: img.width,
			height: img.height,
		})),
		translationInfo: work.translationInfo,
		languageDownloads: work.languageDownloads,
		createdAt: work.createdAt,
		updatedAt: work.updatedAt,
		lastFetchedAt: work.lastFetchedAt,
		// biome-ignore lint/suspicious/noExplicitAny: Type coercion needed for partial mapping
	} as any as WorkDocument;
}

/**
 * Work Firestore transformers namespace
 */
export const workTransformers = {
	fromFirestore,
	toFirestore,
};

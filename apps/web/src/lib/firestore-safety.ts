/**
 * Firestore安全性チェックユーティリティ
 * 予期しない値の書き込みを防ぐ
 */

/**
 * 有効なURLパターンの定義
 */
const VALID_URL_PATTERNS = {
	// YouTube関連
	youtube: [
		/^https:\/\/(?:www\.)?youtube\.com\//,
		/^https:\/\/youtu\.be\//,
		/^https:\/\/img\.youtube\.com\/vi\/[a-zA-Z0-9_-]{11}\//,
		/^https:\/\/i\.ytimg\.com\//,
	],
	// DLsite関連
	dlsite: [
		/^https:\/\/(?:www\.)?dlsite\.com\//,
		/^https:\/\/img\.dlsite\.jp\//,
		/^https:\/\/dlsite\.jp\//,
	],
	// 一般的な画像CDN
	cdn: [
		/^https:\/\/[a-zA-Z0-9-]+\.cloudfront\.net\//,
		/^https:\/\/[a-zA-Z0-9-]+\.storage\.googleapis\.com\//,
		/^https:\/\/firebasestorage\.googleapis\.com\//,
	],
};

/**
 * 無効な値のパターン
 */
const INVALID_VALUE_PATTERNS = {
	// ローカルファイルパス
	localPaths: [
		/^[A-Z]:\\/i, // Windows paths
		/[A-Z]:\\/i, // Windows paths anywhere in string
		/\/(?:Users|home|var|tmp|etc)\//i, // Unix paths
		/^\.{1,2}\//i, // Relative paths
		/^~\//i, // Home directory
		/^file:\/\//i, // File protocol
	],
	// 開発環境のURL
	devUrls: [
		/^https?:\/\/localhost/i,
		/^https?:\/\/127\.0\.0\.1/i,
		/^https?:\/\/0\.0\.0\.0/i,
		/^https?:\/\/192\.168\./i,
		/^https?:\/\/10\./i,
		/^https?:\/\/172\.(?:1[6-9]|2\d|3[01])\./i,
		/^https?:\/\/[^/]+\.local/i,
	],
	// 無効な画像ファイル名
	invalidImages: [
		/^[^/]+\.(jpg|jpeg|png|gif|webp)$/i, // ファイル名のみ（パスなし）
		/^data:image\//i, // Data URLs（大量データ回避）
		/\.(tmp|temp|cache|bak)$/i, // 一時ファイル
	],
};

/**
 * 環境チェック
 */
export function isProductionEnvironment(): boolean {
	return process.env.NODE_ENV === "production";
}

/**
 * プロジェクトIDチェック
 */
export function isProductionProject(): boolean {
	const projectId = process.env.GOOGLE_CLOUD_PROJECT || "";
	// 本番プロジェクトIDのパターン
	return projectId === "suzumina-click" || projectId === "suzumina-click-firebase";
}

/**
 * URLの妥当性をチェック
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: URL validation requires comprehensive checks
export function validateUrl(
	url: string,
	fieldName: string,
	allowedPatterns?: RegExp[],
): { valid: boolean; errors: string[] } {
	const errors: string[] = [];

	// 空文字列は許可（オプショナルフィールドの場合）
	if (!url) {
		return { valid: true, errors: [] };
	}

	// 基本的なURL形式チェック
	if (!url.startsWith("http://") && !url.startsWith("https://")) {
		// まずファイルパスパターンをチェック
		for (const pattern of INVALID_VALUE_PATTERNS.localPaths) {
			if (pattern.test(url)) {
				errors.push(`${fieldName}: Local file path detected - ${url}`);
				return { valid: false, errors };
			}
		}
		// ファイルパスでない場合は通常のURLエラー
		errors.push(`${fieldName}: Invalid URL format - must start with http:// or https://`);
		return { valid: false, errors };
	}

	// ローカルファイルパスのチェック
	for (const pattern of INVALID_VALUE_PATTERNS.localPaths) {
		if (pattern.test(url)) {
			errors.push(`${fieldName}: Local file path detected - ${url}`);
		}
	}

	// 開発環境URLのチェック
	for (const pattern of INVALID_VALUE_PATTERNS.devUrls) {
		if (pattern.test(url)) {
			errors.push(`${fieldName}: Development URL detected - ${url}`);
		}
	}

	// 画像URLの場合の追加チェック
	if (fieldName.toLowerCase().includes("thumbnail") || fieldName.toLowerCase().includes("image")) {
		for (const pattern of INVALID_VALUE_PATTERNS.invalidImages) {
			if (pattern.test(url)) {
				errors.push(`${fieldName}: Invalid image URL format - ${url}`);
			}
		}
	}

	// 許可されたパターンのチェック（指定された場合）
	if (allowedPatterns && allowedPatterns.length > 0) {
		const matchesAllowed = allowedPatterns.some((pattern) => pattern.test(url));
		if (!matchesAllowed) {
			errors.push(`${fieldName}: URL does not match allowed patterns - ${url}`);
		}
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}

/**
 * 文字列フィールドの妥当性をチェック
 */
export function validateStringField(
	value: string,
	fieldName: string,
	options?: {
		maxLength?: number;
		minLength?: number;
		pattern?: RegExp;
		disallowedPatterns?: RegExp[];
	},
): { valid: boolean; errors: string[] } {
	const errors: string[] = [];

	// 長さチェック
	if (options?.minLength && value.length < options.minLength) {
		errors.push(`${fieldName}: Too short (min: ${options.minLength})`);
	}
	if (options?.maxLength && value.length > options.maxLength) {
		errors.push(`${fieldName}: Too long (max: ${options.maxLength})`);
	}

	// パターンマッチング
	if (options?.pattern && !options.pattern.test(value)) {
		errors.push(`${fieldName}: Invalid format`);
	}

	// 禁止パターン
	if (options?.disallowedPatterns) {
		for (const pattern of options.disallowedPatterns) {
			if (pattern.test(value)) {
				errors.push(`${fieldName}: Contains disallowed pattern`);
			}
		}
	}

	// ファイルパスのような値のチェック
	for (const pattern of INVALID_VALUE_PATTERNS.localPaths) {
		if (pattern.test(value)) {
			errors.push(`${fieldName}: Contains file path - ${value}`);
		}
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}

/**
 * Firestoreドキュメントのデータ検証
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Collection-specific validation requires detailed checks
export function validateFirestoreData(
	collection: string,
	data: Record<string, unknown>,
): { valid: boolean; errors: string[]; warnings: string[] } {
	const errors: string[] = [];
	const warnings: string[] = [];

	// コレクション別の検証ルール
	switch (collection) {
		case "videos": {
			// thumbnailUrlの検証
			if (data.thumbnailUrl && typeof data.thumbnailUrl === "string") {
				const urlValidation = validateUrl(data.thumbnailUrl, "thumbnailUrl", [
					...VALID_URL_PATTERNS.youtube,
					...VALID_URL_PATTERNS.cdn,
				]);
				errors.push(...urlValidation.errors);
			}

			// videoIdの検証
			if (data.videoId && typeof data.videoId === "string") {
				const idValidation = validateStringField(data.videoId, "videoId", {
					minLength: 11,
					maxLength: 11,
					pattern: /^[a-zA-Z0-9_-]{11}$/,
				});
				errors.push(...idValidation.errors);
			}

			// titleの検証
			if (data.title && typeof data.title === "string") {
				const titleValidation = validateStringField(data.title, "title", {
					maxLength: 500,
					disallowedPatterns: INVALID_VALUE_PATTERNS.localPaths,
				});
				errors.push(...titleValidation.errors);
			}
			break;
		}

		case "dlsiteWorks": {
			// thumbnailUrlの検証
			if (data.thumbnailUrl && typeof data.thumbnailUrl === "string") {
				const urlValidation = validateUrl(data.thumbnailUrl, "thumbnailUrl", [
					...VALID_URL_PATTERNS.dlsite,
					...VALID_URL_PATTERNS.cdn,
				]);
				errors.push(...urlValidation.errors);
			}

			// workUrlの検証
			if (data.workUrl && typeof data.workUrl === "string") {
				const urlValidation = validateUrl(data.workUrl, "workUrl", VALID_URL_PATTERNS.dlsite);
				errors.push(...urlValidation.errors);
			}
			break;
		}

		case "audioButtons": {
			// 音声ボタン固有の検証
			if (data.videoId && typeof data.videoId === "string") {
				const idValidation = validateStringField(data.videoId, "videoId", {
					minLength: 11,
					maxLength: 11,
					pattern: /^[a-zA-Z0-9_-]{11}$/,
				});
				errors.push(...idValidation.errors);
			}
			break;
		}
	}

	// 共通フィールドの検証
	// IDフィールド
	if (data.id && typeof data.id === "string") {
		const idValidation = validateStringField(data.id, "id", {
			maxLength: 128,
			disallowedPatterns: INVALID_VALUE_PATTERNS.localPaths,
		});
		if (!idValidation.valid) {
			warnings.push(...idValidation.errors);
		}
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings,
	};
}

/**
 * Firestore書き込み前の安全性チェック
 */
export function validateFirestoreWrite(
	collection: string,
	documentId: string,
	data: Record<string, unknown>,
): { allowed: boolean; warnings: string[]; errors: string[] } {
	// データ検証
	const dataValidation = validateFirestoreData(collection, data);

	const warnings = [...dataValidation.warnings];
	const errors = [...dataValidation.errors];

	// 本番環境での追加チェック
	if (isProductionProject()) {
		// 開発環境URL/ファイルパスが含まれていないかチェック
		if (
			dataValidation.errors.some(
				(e) => e.includes("Development URL") || e.includes("Local file path"),
			)
		) {
			if (isProductionEnvironment()) {
				errors.push("Development data detected in production environment");
			} else {
				warnings.push("Development data being written to production project");
			}
		}
	}

	// ドキュメントIDの検証
	if (documentId) {
		const idValidation = validateStringField(documentId, "documentId", {
			maxLength: 128,
			disallowedPatterns: INVALID_VALUE_PATTERNS.localPaths,
		});
		if (!idValidation.valid) {
			errors.push(...idValidation.errors);
		}
	}

	return {
		allowed: errors.length === 0,
		warnings,
		errors,
	};
}

/**
 * Firestoreから読み込んだデータの検証
 */
export function validateFirestoreRead(
	collection: string,
	documentId: string,
	data: Record<string, unknown>,
): { hasIssues: boolean; issues: string[] } {
	const validation = validateFirestoreData(collection, data);
	const issues: string[] = [];

	if (validation.errors.length > 0) {
		issues.push(`Document ${collection}/${documentId} has validation errors:`);
		issues.push(...validation.errors);
	}

	if (validation.warnings.length > 0) {
		issues.push(`Document ${collection}/${documentId} has warnings:`);
		issues.push(...validation.warnings);
	}

	return {
		hasIssues: issues.length > 0,
		issues,
	};
}

/**
 * バッチ検証スクリプト用のヘルパー
 */
export async function scanCollectionForInvalidData(
	// biome-ignore lint/suspicious/noExplicitAny: Firestore type from external library
	firestore: any,
	collectionName: string,
	options?: {
		limit?: number;
		logInvalid?: boolean;
		fix?: boolean;
	},
): Promise<{
	total: number;
	invalid: Array<{
		id: string;
		errors: string[];
		warnings: string[];
	}>;
}> {
	const collection = firestore.collection(collectionName);
	const query = options?.limit ? collection.limit(options.limit) : collection;
	const snapshot = await query.get();

	const invalidDocs: Array<{
		id: string;
		errors: string[];
		warnings: string[];
	}> = [];

	// biome-ignore lint/suspicious/noExplicitAny: Firestore DocumentSnapshot type
	snapshot.forEach((doc: any) => {
		const data = doc.data();
		const validation = validateFirestoreData(collectionName, data);

		if (validation.errors.length > 0 || validation.warnings.length > 0) {
			const invalidDoc = {
				id: doc.id,
				errors: validation.errors,
				warnings: validation.warnings,
			};

			invalidDocs.push(invalidDoc);

			if (options?.logInvalid) {
				// Logging is intentional for validation scripts
				// biome-ignore lint/suspicious/noConsole: Validation script needs console output
				console.log(`\nInvalid document: ${collectionName}/${doc.id}`);
				if (validation.errors.length > 0) {
					// biome-ignore lint/suspicious/noConsole: Validation script needs console output
					console.log("Errors:", validation.errors);
				}
				if (validation.warnings.length > 0) {
					// biome-ignore lint/suspicious/noConsole: Validation script needs console output
					console.log("Warnings:", validation.warnings);
				}
			}
		}
	});

	return {
		total: snapshot.size,
		invalid: invalidDocs,
	};
}

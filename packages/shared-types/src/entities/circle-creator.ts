import { z } from "zod";

/**
 * サークル情報のZodスキーマ定義
 * DLsiteのサークル（制作グループ）情報を表現
 */
export const CircleDataSchema = z.object({
	/** サークルID - DLsiteのmaker_id/circle_id（例: "RG23954"） */
	circleId: z.string().regex(/^RG\d+$/),
	/** サークル名（日本語） */
	name: z.string().min(1),
	/** サークル名（英語） */
	nameEn: z.string().optional(),
	/** 関連作品数（統計情報） */
	workCount: z.number().int().nonnegative().default(0),
	/** 最終更新日時 */
	lastUpdated: z.any(), // Firestore Timestamp
	/** 初回登録日時 */
	createdAt: z.any(), // Firestore Timestamp
});

/**
 * クリエイタータイプの定義
 * DLsiteの作品におけるクリエイターの役割
 */
export const CreatorTypeSchema = z.enum([
	"voice", // 声優
	"illustration", // イラスト
	"scenario", // シナリオ
	"music", // 音楽
	"other", // その他
]);

/**
 * クリエイター・作品マッピング情報のZodスキーマ定義
 * クリエイターと作品の関連情報を効率的にクエリするための非正規化データ
 */
export const CreatorWorkMappingSchema = z.object({
	/** クリエイターID - Individual Info APIのcreater.id */
	creatorId: z.string().min(1),
	/** 作品ID - DLsiteのproduct_id */
	workId: z.string().regex(/^RJ\d+$/),
	/** クリエイター名 */
	creatorName: z.string().min(1),
	/** クリエイターの役割（複数可） */
	types: z.array(CreatorTypeSchema).min(1),
	/** 所属サークルID */
	circleId: z.string(),
	/** 作成日時 */
	createdAt: z.any(), // Firestore Timestamp
});

/**
 * クリエイター情報（フロントエンド表示用）
 * クリエイターページで使用する集約情報
 */
export const CreatorPageInfoSchema = z.object({
	/** クリエイターID */
	id: z.string().min(1),
	/** クリエイター名 */
	name: z.string().min(1),
	/** 役割リスト */
	types: z.array(z.string()),
	/** 参加作品数 */
	workCount: z.number().int().nonnegative(),
});

// 型エクスポート
export type CircleData = z.infer<typeof CircleDataSchema>;
export type CreatorType = z.infer<typeof CreatorTypeSchema>;
export type CreatorWorkMapping = z.infer<typeof CreatorWorkMappingSchema>;
export type CreatorPageInfo = z.infer<typeof CreatorPageInfoSchema>;

// 日本語ラベルマッピング
export const CREATOR_TYPE_LABELS: Record<CreatorType, string> = {
	voice: "声優",
	illustration: "イラスト",
	scenario: "シナリオ",
	music: "音楽",
	other: "その他",
} as const;

/**
 * クリエイタータイプのラベルを取得
 * @param types クリエイタータイプの配列
 * @returns 日本語ラベルの文字列（複数の場合は " / " で結合）
 */
export function getCreatorTypeLabel(types: string[]): string {
	if (types.length === 0) {
		return "";
	}
	if (types.length === 1) {
		const label = CREATOR_TYPE_LABELS[types[0] as CreatorType];
		return label ?? types[0];
	}
	return types
		.map((type) => {
			const label = CREATOR_TYPE_LABELS[type as CreatorType];
			return label ?? type;
		})
		.join(" / ");
}

// 検証用ユーティリティ
/**
 * サークルIDの形式を検証
 * @param circleId 検証対象のサークルID
 * @returns 有効なサークルIDかどうか
 */
export function isValidCircleId(circleId: string): boolean {
	return /^RG\d+$/.test(circleId);
}

/**
 * クリエイターIDの形式を検証
 * @param creatorId 検証対象のクリエイターID
 * @returns 有効なクリエイターIDかどうか
 */
export function isValidCreatorId(creatorId: string): boolean {
	return creatorId.length > 0;
}

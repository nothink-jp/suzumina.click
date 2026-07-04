import { z } from "zod";

// Firestore ドキュメントの正本はここではない:
// circles → ../types/firestore/circle.ts `CircleDocument`
// creators / creators/{id}/works → ../types/firestore/creator.ts `CreatorDocument` / `CreatorWorkRelation`
// （旧 CircleDataSchema / CreatorWorkMappingSchema は実データと乖離した死に型だったため撤去。SPR-240）

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
export type CreatorType = z.infer<typeof CreatorTypeSchema>;
export type CreatorPageInfo = z.infer<typeof CreatorPageInfoSchema>;

// Pure helpers have been moved out to keep client bundles Zod-free:
// (CREATOR_TYPE_LABELS, getCreatorTypeLabel) → ../utilities/creator/type-label,
// (isValidCircleId, isValidCreatorId) → ../utilities/validators/dlsite-ids.

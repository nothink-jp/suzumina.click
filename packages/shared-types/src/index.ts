/**
 * @suzumina.click/shared-types
 * 涼花みなせウェブサイト用の共有型定義パッケージ
 */

// === Type Aliases ===
// Export type aliases for cleaner naming conventions
export * from "./aliases";
// === API Schemas ===
export * from "./api-schemas/dlsite-raw";
// === Configuration ===
export * from "./config";
// 音声ボタン関連の型とスキーマのエクスポート
export * from "./entities/audio-button";
// === Entities ===
// Base entity infrastructure
export * from "./entities/base/entity";
// サークル・クリエイター関連の型とスキーマのエクスポート
export * from "./entities/circle-creator";
// お問い合わせ関連の型とスキーマのエクスポート
export * from "./entities/contact";
// お気に入り関連の型とスキーマのエクスポート
export * from "./entities/favorite";
// ユーザー認証関連の型とスキーマのエクスポート
export * from "./entities/user";
// ユーザー評価関連の型とスキーマのエクスポート
export * from "./entities/user-evaluation";
// 動画関連の型とスキーマのエクスポート
export * from "./entities/video";
// DLsite作品関連の型とスキーマのエクスポート
export * from "./entities/work";
// Work Entity
export * from "./entities/work-entity";
// 作品評価関連の型とスキーマのエクスポート
export * from "./entities/work-evaluation";
// === Migration Utilities ===
export * from "./migrations";
// === Plain Objects ===
export * from "./plain-objects/audio-button-plain";
export * from "./plain-objects/circle-plain";
export * from "./plain-objects/video-plain";
export * from "./plain-objects/work-plain";
// === Firestore Types ===
// FirestoreServerWorkData has been removed - use WorkDocument from entities/work instead
// FirestoreServerAudioButtonData is available from entities/audio-button
export type { FirestoreServerAudioButtonData } from "./types/firestore/audio-button";
export type { CircleDocument } from "./types/firestore/circle";
export { isCircleDocument } from "./types/firestore/circle";
export type { CollectionMetadata } from "./types/firestore/collection-metadata";
export { isCollectionMetadata } from "./types/firestore/collection-metadata";
export type { CreatorDocument, CreatorWorkRelation } from "./types/firestore/creator";
export {
	isCreatorDocument,
	isCreatorWorkRelation,
	isValidCreatorDocumentId,
} from "./types/firestore/creator";
export type {
	FirestoreServerVideoData,
	FirestoreVideoData,
	LiveBroadcastContent,
	VideoType,
} from "./types/firestore/video";
// === Utilities ===
// 年齢制限・レーティング関連の型とユーティリティのエクスポート
export * from "./utilities/age-rating";
// Circle変換ユーティリティのエクスポート
export * from "./utilities/circle-conversions";
// 共通ユーティリティと型のエクスポート
export * from "./utilities/common";
// Firestore関連のユーティリティ
export * from "./utilities/firestore-utils";
// 価格履歴関連の型とスキーマのエクスポート
export * from "./utilities/price-history";
// 検索フィルター関連の型とスキーマのエクスポート
export * from "./utilities/search-filters";
// Work変換ユーティリティのエクスポート
export * from "./utilities/work-conversions";
// ユーティリティ関数
export * from "./utils";
// === Value Objects ===
// Export base Value Object utilities and interfaces
export * from "./value-objects";
export * from "./value-objects/work/circle";
// === Value Objects ===
export * from "./value-objects/work/creator-type";
export * from "./value-objects/work/date-range";
// DateFormatterをvalue-objectsから再エクスポート（互換性のため）
export { DateFormatter } from "./value-objects/work/date-range";
export * from "./value-objects/work/price";
export * from "./value-objects/work/rating";
export { WorkCreators as WorkCreatorsValueObject } from "./value-objects/work/work-creators";
// Work-specific value objects
export * from "./value-objects/work/work-id";
export * from "./value-objects/work/work-price";
export * from "./value-objects/work/work-rating";
export * from "./value-objects/work/work-title";

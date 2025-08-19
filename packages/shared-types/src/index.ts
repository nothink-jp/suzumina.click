/**
 * @suzumina.click/shared-types
 * 涼花みなせウェブサイト用の共有型定義パッケージ
 */

// === Actions ===
export * from "./actions/work-actions";
// === API Schemas ===
export * from "./api-schemas/dlsite-raw";
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
// 作品評価関連の型とスキーマのエクスポート
export * from "./entities/work-evaluation";
// === Models ===
export {
	type CircleData,
	type CreatorData,
	type CreatorInfo as CreatorInfoFunctional,
	type CreatorsData,
	type CreatorType,
	isWorkData,
	type PriceData,
	type RatingData,
	type WorkData,
} from "./models/work-data";
// === Plain Objects ===
export * from "./plain-objects/audio-button-plain";
export * from "./plain-objects/circle-plain";
export * from "./plain-objects/video-plain";
export * from "./plain-objects/work-plain";
// === Transformers ===
export * from "./transformers/firestore-transformer";
export {
	batchFromPlainObject,
	batchToPlainObject,
	fromWorkPlainObject,
	isWorkPlainObject,
	toWorkPlainObject,
} from "./transformers/legacy-transformer";
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

/**
 * @suzumina.click/shared-types
 * 涼花みなせウェブサイト用の共有型定義パッケージ
 */

// === API Schemas ===
export * from "./api-schemas/dlsite-raw";
// === Core utilities ===
export {
	type BusinessRuleError,
	businessRuleError,
	combineValidationErrors,
	type DatabaseError,
	type DomainError,
	databaseError,
	Err,
	err,
	errAsync,
	isDomainError,
	isValidationError,
	type NetworkError,
	type NotFoundError,
	networkError,
	notFoundError,
	Ok,
	ok,
	okAsync,
	Result,
	ResultAsync,
	type UnauthorizedError,
	unauthorizedError,
	type ValidationError as ResultValidationError,
	validationError,
} from "./core/result";
// === Entities ===
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
// DLsite作品関連の型とスキーマのエクスポート
export * from "./entities/work";
// 作品評価関連の型とスキーマのエクスポート
export * from "./entities/work-evaluation";
export {
	canCreateAudioButton,
	canCreateButton,
	formatDuration,
	getAgeInDays,
	getAllTags as getVideoAllTags,
	getAudioButtonCount,
	getAudioButtonCreationErrorMessage,
	getDisplayTitle,
	getFormattedViewCount,
	getThumbnailUrl,
	getYouTubeUrl,
	hasAudioButtons,
	isArchived,
	isLive as isVideoLive,
	isOlderThan,
	isPossiblyLive,
	isPremiere,
	isUpcoming,
	videoOperations,
} from "./operations/video";
// === Plain Objects ===
export * from "./plain-objects/circle-plain";
export * from "./plain-objects/video-plain";
export * from "./plain-objects/work-plain";
// Transformers（Firestore Document ↔ PlainObject の正本）。
// Document→Plain（読み取り）の入口は各ドメインの transformer の fromFirestore に統一:
//   Work        → workTransformers.fromFirestore
//   Video       → videoTransformers.fromFirestore（videoFromFirestore 別名）
//   AudioButton → audioButtonTransformers.fromFirestore
// 旧 utilities/work-conversions.ts（convertToWorkPlainObject 等）は呼び出しゼロの死蔵だったため削除（SPR-197）。
export { audioButtonTransformers } from "./transformers/audio-button";
export {
	convertToFrontendVideo,
	fromFirestore as videoFromFirestore,
	toFirestore as videoToFirestore,
	videoTransformers,
} from "./transformers/video-firestore";
export { workTransformers } from "./transformers/work-firestore";
// === Firestore Types ===
// FirestoreServerWorkData has been removed - use WorkDocument from entities/work instead
// FirestoreServerAudioButtonData is available from entities/audio-button
// AudioButton types (unified structure)
export type {
	AudioButton,
	AudioButtonDocument,
	AudioButtonPlainObject, // AudioButton の別名（コンポーネントとの衝突回避用・SPR-198）
	AudioButtonQuery,
	CreateAudioButtonInput,
	FirestoreServerAudioButtonData, // Deprecated alias
	UpdateAudioButtonInput,
} from "./types/audio-button";
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
// === Video Types ===
export type {
	AudioButtonInfo,
	LiveStreamingDetails,
	PrivacyStatus,
	UploadStatus,
} from "./types/video-types";
// === Utilities ===
// 年齢制限・レーティング関連の型とユーティリティのエクスポート
export * from "./utilities/age-rating";
// Circle変換ユーティリティのエクスポート
export * from "./utilities/circle-conversions";
// 共通ユーティリティと型のエクスポート
export * from "./utilities/common";
// Creator type labels (extracted from entities/circle-creator)
export * from "./utilities/creator/type-label";
// Discord avatar URL builder (extracted from entities/user)
export * from "./utilities/discord/avatar";
// Discord guild membership check (extracted from entities/user)
export * from "./utilities/discord/guild-membership";
// Evaluation aggregation calc (extracted from entities/user-evaluation)
export * from "./utilities/evaluation/aggregator";
// Evaluation characteristic axes constant (extracted from entities/user-evaluation)
export * from "./utilities/evaluation/characteristic-axes";
// Firestore関連のユーティリティ
export * from "./utilities/firestore-utils";
// 日付フォーマット最適化（旧 value-objects DateFormatter から移設）
export * from "./utilities/formatters/date-optimizer";
// Relative time / member-since formatters (extracted from entities/user)
export * from "./utilities/formatters/relative-time";
export { formatTimestamp, parseDurationToSeconds } from "./utilities/formatters/time-format";
// 価格履歴関連の型とスキーマのエクスポート
export * from "./utilities/price-history";
// User display name resolution (extracted from entities/user)
export * from "./utilities/user/display-name";
// DLsite ID validators (extracted from entities/circle-creator)
export * from "./utilities/validators/dlsite-ids";

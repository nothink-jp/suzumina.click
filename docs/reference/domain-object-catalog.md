# Domain Object Catalog

This catalog provides detailed specifications for all domain objects in the suzumina.click system.

## Related Documentation

- [Entity Implementation Guide](entity-implementation-guide.md) - How to implement entities
- [ADR-001: DDD Implementation Guidelines](../decisions/architecture/ADR-001-ddd-implementation-guidelines.md) - When to use entities
- [ADR-005: Entity Implementation Lessons](../decisions/architecture/ADR-005-entity-implementation-lessons.md) - Learning from experience
- [ADR-002: TypeScript Type Safety Enhancement](../decisions/architecture/ADR-002-typescript-type-safety-enhancement.md) - Type safety patterns

## Entities

> **2026-06 更新（SPR-174 監査で再確認）**: かつて `packages/shared-types/src/entities/` に存在した
> Entity クラス（`Work` / `Video` / `AudioButton` が `BaseEntity<T>` を継承し `EntityValidatable<T>` を
> 実装し、private constructor + Result ベースの `fromFirestoreData()` ファクトリ + `toPlainObject()` を持つ設計）は、
> 関数型アーキテクチャへの移行で **全て廃止済み**。2026-06-12 の SPR-174 監査で `class Work` /
> `class Video` / `class AudioButton` / `extends BaseEntity` が shared-types に **1 件も存在しない**ことを確認した。
> データ表現は **PlainObject 型 + Zod スキーマ + `transformers/` の変換関数**に一本化されている
> （ファクトリ・private constructor・`BaseEntity` 継承はもう無い）。

各ドメインの「正本」は次のとおり。Firestore ドキュメント形 ↔ RSC 境界を越える PlainObject 形を
`packages/shared-types/src/transformers/` の純関数が相互変換する。

### Work

- **PlainObject（RSC 境界を越えるデータ表現の正本）**: `packages/shared-types/src/plain-objects/work-plain.ts` の `WorkPlainObject`
- **Firestore ドキュメント / Zod スキーマ（永続データの正本）**: `packages/shared-types/src/entities/work/work-document-schema.ts` の
  `WorkDocument`（`z.infer<typeof WorkDocumentSchema>`。旧称 `OptimizedFirestoreDLsiteWorkData`）

### Video

- **PlainObject（RSC 境界を越えるデータ表現の正本）**: `packages/shared-types/src/plain-objects/video-plain.ts` の `VideoPlainObject`
- **Firestore ドキュメント（永続データの正本）**: `packages/shared-types/src/types/firestore/video.ts` の `FirestoreServerVideoData`

### AudioButton

- **正本**: `packages/shared-types/src/types/audio-button.ts`
  - `AudioButtonDocument`: Firestore ドキュメント形（永続データのみ）
  - `AudioButton`: `AudioButtonDocument` に `id` と `_computed`（`AudioButtonComputedProperties`）を加えた表示用モデル
  - `AudioButtonPlainObject`: `AudioButton` のエイリアス（RSC 境界を越えるデータ表現の正本）

## Value Objects

> **2026-06 (SPR-181) 更新**: かつて `packages/shared-types/src/value-objects/` に存在した
> クラス VO 一式（WorkId / WorkTitle / WorkPrice / WorkRating / WorkCreators / Circle /
> DateRange / Price / Rating、video 系 Channel / VideoContent / VideoMetadata /
> VideoStatistics、base/*）は **全て削除済み**。apps/web・apps/functions・packages/ui からの
> import がゼロの死蔵層だったため。実運用のデータ表現と変換は以下に一本化されている。

**現在の正本（Work / Video のデータ表現）**

- **PlainObject**: `packages/shared-types/src/plain-objects/`（`work-plain.ts` / `circle-plain.ts` ほか）
  — RSC 境界を越える正本のデータ形。
- **Transformers**: `packages/shared-types/src/transformers/`（Firestore ⇔ PlainObject 変換）。
- **Operations**: `packages/shared-types/src/operations/`（PlainObject に対する表示・集計などの純関数）。
- **検証・整形ユーティリティ**: `packages/shared-types/src/utilities/`
  （例: 日付正規化は `utilities/formatters/date-optimizer.ts` の `optimizeDateFormats`、
  ID 検証は `utilities/validators/dlsite-ids.ts`）。

新たにクラス VO を再導入する場合は CLAUDE.md の「Entity化のゲート」を先に通すこと
（ビジネスルール5個以上 / 明確な状態遷移 / 複雑な不変条件のいずれか）。

## Type System Enhancements

### Branded Types

**Location**: `packages/shared-types/src/core/branded-types.ts`（`Brand<K, T>` ヘルパーと `createBrandFactory`）/
`packages/shared-types/src/core/ids.ts`（各ドメイン ID の具体型と検証付きファクトリ）

```typescript
// Nominal typing for domain IDs（具体型・ファクトリは core/ids.ts）
type WorkId = Brand<string, 'WorkId'>
type CircleId = Brand<string, 'CircleId'>
type VideoId = Brand<string, 'VideoId'>
type ChannelId = Brand<string, 'ChannelId'>
type UserId = Brand<string, 'UserId'>
type AudioButtonId = Brand<string, 'AudioButtonId'>
```

### Result Pattern

**Location**: `packages/shared-types/src/core/result.ts`

```typescript
// Functional error handling
type Result<T, E> = Ok<T> | Err<E>

// Domain-specific error types
type ValidationError = { field: string; message: string }
type NotFoundError = { entity: string; message: string }
type DatabaseError = { entity: string; message: string }
```

## Conversion Utilities

> **2026-06 更新（SPR-174 監査で再確認）**: 旧 `utilities/work-conversions.ts`
> （`convertToWorkPlainObject` / `convertToWorkPlainObjects` / `normalizeToWorkPlainObject` など Result を返す関数群）は
> 呼び出しゼロの死蔵層だったため **削除済み**。Firestore ⇔ PlainObject 変換の正本は `transformers/` の純関数に一本化されている。

**正本**: `packages/shared-types/src/transformers/`（公開 API は barrel が再エクスポートする名前空間オブジェクト）

```typescript
// barrel（@suzumina.click/shared-types）からの公開入口。Document→Plain（読み取り）の入口に統一:
workTransformers.fromFirestore(doc: WorkDocument): WorkPlainObject              // transformers/work-firestore.ts
videoTransformers.fromFirestore(doc: FirestoreServerVideoData): VideoPlainObject // transformers/video-firestore.ts（別名 videoFromFirestore）
audioButtonTransformers.fromFirestore(data): AudioButton | null                 // transformers/audio-button.ts

// 逆変換（Plain→Document）は各 transformer の toFirestore（video / audio-button が提供）
```

## Business Rules

### Work Business Rules

1. **Work ID Format**: Must match `/^RJ\d{6,8}$/`
2. **Price**: Must be non-negative, discount cannot exceed original price
3. **Rating**: Stars 0-5, count >= 0, average 0-5
4. **Creators**: Each creator must have ID and name
5. **Title**: Cannot be empty, max 500 characters

### Video Business Rules

1. **Video ID**: Must be 11 characters YouTube ID
2. **Channel ID**: Must start with "UC" and be 24 characters
3. **Audio Button Creation**: Only allowed for archived streams > 15 minutes
4. **Live Detection**: Based on liveBroadcastContent and liveStreamingDetails

### Validation Rules

> **2026-06 更新（SPR-174 監査で再確認）**: かつての「ファクトリは Result を返す / private constructor /
> 生成時バリデーション」はクラス Entity・VO 前提の規約であり、それらの廃止に伴い無効。
> 現在の検証は Zod スキーマ（`entities/work/work-document-schema.ts` の `WorkDocumentSchema` など）で行う。

1. **読み取り境界の検証は Zod スキーマで行う**（`schema.safeParse(...)` で不正データを早期に弾く）
2. **データは不変として扱う**（PlainObject を直接書き換えず、`transformers/` で変換する）
3. **変換は純関数**（`transformers/` の `fromFirestore` / `toFirestore` は副作用を持たない）

## Migration Notes

### From Legacy to Functional（クラス Entity の廃止）

> **2026-06 更新（SPR-174 監査で再確認）**: クラス Entity（`Work.fromFirestoreData()` のような
> Result ベースのファクトリ）は廃止済み。復元は `transformers/` の純関数 + Zod スキーマで行う。

```typescript
// 旧（クラス Entity 時代・現在は存在しない）
// const result = Work.fromFirestoreData(data);
// if (result.isErr()) { ... }
// const work = result.value;

// 現在（関数型）: 読み取り境界で Zod 検証 → transformer で PlainObject 化（barrel から import）
import { WorkDocumentSchema, workTransformers } from "@suzumina.click/shared-types";

const parsed = WorkDocumentSchema.safeParse(raw); // 読み取り境界の漏斗（default を実効化）
const data = parsed.success ? parsed.data : (raw as WorkDocument); // 実装の正本は work-converters.ts の parseWorkDocument
const work = workTransformers.fromFirestore(data); // WorkPlainObject
```

### Value Object Creation

> **2026-06 (SPR-181) 更新**: クラス VO（`WorkTitle.create()` / `WorkPrice.create()` など Result
> パターンのファクトリ）は**削除済み**。Work / Video のデータは PlainObject + Zod スキーマ +
> `transformers/` の変換関数で扱う（上記「Value Objects」節を参照）。

---

**Last Updated**: 2026-06-13
**Version**: 0.6.0
**Note**: SPR-174 監査で、クラス Entity 廃止後の実態に未同期だった記述を是正。
Entities 節（`class Work/Video/AudioButton extends BaseEntity` の例）・Conversion Utilities 節（削除済み `utilities/work-conversions.ts`）・
Migration Notes / Validation Rules（クラス Entity の Result ファクトリ前提）を、PlainObject + Zod スキーマ + `transformers/` の正本に揃えた。
（SPR-181 で `value-objects/` のクラス VO 一式は既に削除済み。）
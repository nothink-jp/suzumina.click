# ドメインモデル / ドメインオブジェクト カタログ

**目的**: suzumina.click の各ドメイン概念が「どこに正本（source of truth）を持つか」を一意に示すポインタ。

> **この doc の約束（SPR-205）**: フィールド名・型 shape・スキーマ定義の**正本は
> `packages/shared-types` のコード**であり、ここには**転記しない**。この doc はリンク先を指すだけに留める
> （フィールドを列挙すると型のリネームで必ず drift するため）。型の実体・全フィールドはリンク先を直接読むこと。

> **アーキテクチャ前提**: データ表現は **PlainObject 型 + Zod スキーマ + `transformers/` の純関数**に
> 一本化されている。クラス Entity / クラス値オブジェクトは廃止済み（経緯は
> [ADR-006](../decisions/architecture/ADR-006-functional-architecture-migration.md) / SPR-181）。
> 本文中の「値オブジェクト」は PlainObject のネストしたプロパティ群を指す概念表記であり、クラスを意味しない。

## エンティティの正本

各概念の PlainObject（RSC 境界を越えるデータ表現の正本）と Firestore / Zod（永続データの正本）の在処。
**型の中身・全フィールドはリンク先が正本**。

| 概念 | 目的 | PlainObject の正本 | Firestore / Zod の正本 |
|---|---|---|---|
| Work | DLsite 作品 | [work-plain.ts](../../packages/shared-types/src/plain-objects/work-plain.ts) `WorkPlainObject` | [work-document-schema.ts](../../packages/shared-types/src/entities/work/work-document-schema.ts) `WorkDocument` |
| Video | YouTube 動画メタデータ | [video-plain.ts](../../packages/shared-types/src/plain-objects/video-plain.ts) `VideoPlainObject` | [firestore/video.ts](../../packages/shared-types/src/types/firestore/video.ts) `FirestoreServerVideoData` |
| AudioButton | 音声ボタン（動画の特定区間を参照） | [audio-button.ts](../../packages/shared-types/src/types/audio-button.ts) `AudioButtonPlainObject`（= `AudioButton`） | [audio-button.ts](../../packages/shared-types/src/types/audio-button.ts) `AudioButtonDocument` |
| User | Discord 認証ユーザー | — | [user.ts](../../packages/shared-types/src/entities/user.ts) |
| WorkEvaluation | 作品評価（top10 / star / ng は排他） | — | [work-evaluation.ts](../../packages/shared-types/src/entities/work-evaluation.ts) |
| UserWorkEvaluation | 作品への個人評価（総合 1–5 星 + 特性軸 + レビュー） | — | [user-evaluation.ts](../../packages/shared-types/src/entities/user-evaluation.ts) `UserWorkEvaluation` |
| Favorite | 音声ボタンのお気に入り（`users/{userId}/favorites`） | — | [favorite.ts](../../packages/shared-types/src/entities/favorite.ts) |
| Contact | お問い合わせ | — | [contact.ts](../../packages/shared-types/src/entities/contact.ts) |
| Circle | サークル | [circle-plain.ts](../../packages/shared-types/src/plain-objects/circle-plain.ts) | [firestore/circle.ts](../../packages/shared-types/src/types/firestore/circle.ts) `CircleDocument` |
| Creator / CreatorWorkRelation | クリエイター・作品の非正規化関連付け（`creators/{id}/works` サブコレクション） | — | [firestore/creator.ts](../../packages/shared-types/src/types/firestore/creator.ts) `CreatorDocument` / `CreatorWorkRelation` |

> AudioButton / Video は DLsite 作品への直接参照を持たない（AudioButton は `videoId` のみ保持）。

## エンティティ間の関係

```
AudioButton → Video         (videoId で参照)
User        → AudioButton    (作成者 / Favorite)
User        → Work           (WorkEvaluation)
Circle      → Work           (circleId で参照)
creators/{id}/works → Work, Creator  (非正規化関連)

※ Work ↔ Video / AudioButton の直接参照は無い
```

整合性は cron（`checkDataIntegrity`）が事後修復する（Circle workIds / 孤立 Creator マッピング / Work-Circle 整合）。
非正規化を増やすとこの負債が増える点に留意（CLAUDE.md 軸1）。

## データ表現と変換の正本

- **PlainObject**: [plain-objects/](../../packages/shared-types/src/plain-objects/) — RSC 境界を越えるデータ形の正本。
- **Transformers**: [transformers/](../../packages/shared-types/src/transformers/) — Firestore ⇔ PlainObject 変換（純関数）。
  読み取りの入口は各 `fromFirestore`、逆変換は `toFirestore`。barrel（`@suzumina.click/shared-types`）が
  `workTransformers` / `videoTransformers` / `audioButtonTransformers` として再エクスポートする。
- **Operations**: [operations/](../../packages/shared-types/src/operations/) — PlainObject に対する表示・集計の純関数。
- **Utilities**: [utilities/](../../packages/shared-types/src/utilities/) — 検証・整形（例: 日付正規化
  [date-optimizer.ts](../../packages/shared-types/src/utilities/formatters/date-optimizer.ts)、
  ID 検証 [validators/dlsite-ids.ts](../../packages/shared-types/src/utilities/validators/dlsite-ids.ts)）。

読み取り境界の典型（Zod で検証 → transformer で PlainObject 化）:

```typescript
import { WorkDocumentSchema, workTransformers } from "@suzumina.click/shared-types";

const parsed = WorkDocumentSchema.safeParse(raw);            // 読み取り境界の漏斗（default を実効化）
const data = parsed.success ? parsed.data : (raw as WorkDocument);
const work = workTransformers.fromFirestore(data);            // WorkPlainObject
```

## 設計原則

1. **データ表現の一本化**: 各ドメインは PlainObject 型 + Zod スキーマで定義し、Firestore ⇄ 型の変換は
   `transformers/` の純関数で行う（クラス Entity・クラス VO は持たない）。
2. **不変性**: PlainObject は読み取り専用の値として扱い、書き換えず新しい値を作る。
3. **変換層を増やさない**: Firestore Document ⇄ PlainObject の変換層は RSC 境界の誤り訂正符号
   （フレームワークに強制された冗長）であり、新たな変換層・抽象を足さない（CLAUDE.md 軸2）。
4. **読み取り境界で検証**: Firestore 読み取りは Zod `safeParse` を漏斗として通す（実装の正本は
   [work-converters.ts](../../apps/web/src/app/works/utils/work-converters.ts) の `parseWorkDocument`、SPR-201）。
5. **型安全性**: TypeScript strict mode + `@suzumina.click/shared-types` の型を使う。

## 型システム基盤

- **Branded types**: [core/branded-types.ts](../../packages/shared-types/src/core/branded-types.ts)（`Brand<K, T>` ヘルパー）/
  [core/ids.ts](../../packages/shared-types/src/core/ids.ts)（`WorkId` / `CircleId` / `VideoId` / `ChannelId` /
  `UserId` / `AudioButtonId` の具体型と検証付きファクトリ）。
- **Result**: [core/result.ts](../../packages/shared-types/src/core/result.ts)（`Result<T, E>` と各ドメインエラー型）。

## 業務ルール（意図の索引・実効値はリンク先が正本）

転記を避けるため、ルールの**実効値（正規表現・上下限）はリンク先のコードが正本**。ここは意図の索引に留める。

- **Work**: ID は DLsite 形式。検証の正本は
  [validators/dlsite-ids.ts](../../packages/shared-types/src/utilities/validators/dlsite-ids.ts)。
  価格・評価の制約（価格は非負・割引は元値以下、評価は星の範囲内）は
  [work-document-schema.ts](../../packages/shared-types/src/entities/work/work-document-schema.ts) の Zod スキーマで強制。
- **Video**: `videoId`（YouTube）・`channelId`（`UC` 始まり）の形式は
  [core/ids.ts](../../packages/shared-types/src/core/ids.ts) のファクトリで検証。
  ライブ判定は `liveBroadcastContent` / `liveStreamingDetails` に基づく（派生は `VideoPlainObject._computed`）。
- **AudioButton**: 一定長以上のアーカイブ配信に対してのみ作成可（product 制約。実装は app 層）。

## 実装状況・Entity 化の方針

- Work / Video / AudioButton / Circle のデータは PlainObject + Zod + transformers に一本化。
  User / WorkEvaluation / UserWorkEvaluation / Favorite / Contact は Zod スキーマ中心（型定義・検証）。
- 新規ドメインにクラス Entity を作る前に、**CLAUDE.md「Entity 化のゲート」**
  （ビジネスルール 5 個以上 / 明確な状態遷移 / 複雑な不変条件のいずれか）を必ず通す。
  実装手順は [entity-implementation-guide.md](entity-implementation-guide.md)。

## 関連ドキュメント

- [entity-implementation-guide.md](entity-implementation-guide.md) — 実装手順（関数型）
- [ubiquitous-language.md](ubiquitous-language.md) — 用語と命名の正本
- [database-schema.md](database-schema.md) — Firestore コレクション構成
- [ADR-001](../decisions/architecture/ADR-001-ddd-implementation-guidelines.md) Entity 化の指針 /
  [ADR-005](../decisions/architecture/ADR-005-entity-implementation-lessons.md) Entity 実装の教訓 /
  [ADR-006](../decisions/architecture/ADR-006-functional-architecture-migration.md) 関数型アーキテクチャ移行

---

最終更新: 2026-06-13（SPR-205: domain-object-catalog.md を統合し、フィールド / 型 shape の転記を排してリンク化。
#654 の関数型「設計原則」と読み取り境界 `parseWorkDocument`（SPR-201）ポインタを取り込み統合）

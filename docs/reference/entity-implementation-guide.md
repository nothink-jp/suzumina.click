# ドメインオブジェクト実装ガイド（関数型・現行アーキテクチャ）

このガイドは、suzumina.click でドメインオブジェクト（Work / Video / AudioButton など）の
**読み取り・変換・追加**を実装する際の手順書です。

> **2026-06 (SPR-174) 全面改訂**: 本ガイドはかつて「クラス Entity の実装手順」
> （`extends BaseEntity` / `implements EntityValidatable` / プライベートコンストラクタ /
> `static create()` / `static fromFirestoreData()` を持つクラス）を解説していたが、
> **その API は現存しない**。クラス Entity は関数型アーキテクチャへの移行で全廃され、
> クラス Value Object は SPR-181 で削除済み（`packages/shared-types/src/value-objects/` ごと削除）。
> grep で `extends BaseEntity` / `EntityValidatable` / `fromFirestoreData` は **0 件**。
> データ表現は **PlainObject 型 + Zod スキーマ + `transformers/` の純関数**に一本化されている。
> 関数型アーキテクチャへの移行記録は [ADR-006](../decisions/architecture/ADR-006-functional-architecture-migration.md)、
> 旧クラス実装の教訓は [ADR-005](../decisions/architecture/ADR-005-entity-implementation-lessons.md)（いずれも歴史文書）を参照。

## 現行アーキテクチャ（3つの姿と1方向の変換）

一つのドメイン（例: Work）は3つの姿を持つ。**正本（どれが真か）は文脈で決まる**:

| 姿 | 何か | 正本ファイル |
|---|---|---|
| **Firestore Document** | Firestore に永続化される生の形 | コレクション `works`（DLsite 作品） |
| **`WorkDocument`（型 + Zod）** | Document の型・読み取り境界の検証スキーマ | `packages/shared-types/src/entities/work/work-document-schema.ts`（`WorkDocumentSchema` / `WorkDocument`） |
| **`WorkPlainObject`** | RSC 境界（Server→Client）を越える表示用の形 | `packages/shared-types/src/plain-objects/work-plain.ts`（`WorkPlainObject`） |

変換は **`transformers/` の純関数**が担う。Entity/PlainObject の変換層は
「RSC 境界の誤り訂正符号」＝フレームワークに強制された冗長であり、新しい変換層・抽象を足さない
（CLAUDE.md §0 軸2）。

- **変換**: `packages/shared-types/src/transformers/`
  （`work-firestore.ts` / `video-firestore.ts` / `audio-button.ts`）
- **表示・集計の純関数**: `packages/shared-types/src/operations/`（現状 `video.ts`）、
  および各ドメイン配下の utils（例: `entities/work/work-utils.ts`）
- **検証・整形ユーティリティ**: `packages/shared-types/src/utilities/`
- **エラー型・Result**: `packages/shared-types/src/core/result.ts`（`Result` / `DatabaseError` 等。
  読み取り境界の純変換では基本使わないが、core ユーティリティで利用）

## 読み取りパス（Firestore Document → 画面）

公開 API は **barrel の `xxxTransformers.fromFirestore`** に統一されている:

```
Work        → workTransformers.fromFirestore
Video       → videoTransformers.fromFirestore（videoFromFirestore 別名）
AudioButton → audioButtonTransformers.fromFirestore
```

実装手順:

1. **Zod スキーマを定義/拡張**する（`*-document-schema.ts`）。
   `.default([])` 等のデフォルトは **parse 時にのみ効く**点に注意（後述 SPR-201）。
2. **PlainObject 型を定義/拡張**する（`plain-objects/*-plain.ts`）。プリミティブのみ。
3. **`transformers/*.fromFirestore`** に Document→PlainObject の写像を書く。
4. **読み取り境界（Server Action / loader）で `safeParse` を通す**。
   正本パターンは [parseWorkDocument](../../apps/web/src/app/works/utils/work-converters.ts)（SPR-201）:

```typescript
// apps/web/src/app/works/utils/work-converters.ts（要約）
export function parseWorkDocument(raw: unknown): WorkDocument {
  const parsed = WorkDocumentSchema.safeParse(raw);
  if (parsed.success) {
    // parse 済み（default 適用）を基準に、schema が strip する未定義フィールドは raw から温存
    return { ...(raw as Record<string, unknown>), ...parsed.data } as WorkDocument;
  }
  // 非破壊フォールバック（cast で継続）+ warn でスキーマドリフトを観測
  logger.warn("WorkDocument スキーマ検証に失敗（cast で継続）", { /* ... */ });
  return raw as WorkDocument;
}

// 読み取りの入口
const data = parseWorkDocument({ ...doc.data(), id: doc.id });
const work = workTransformers.fromFirestore(data); // WorkPlainObject
```

**なぜ blind cast でなく safeParse か（SPR-201）**: 従来の `as WorkDocument` 直 cast は
`.default([])` を実効化せず、「required のはずのフィールドが実行時に欠ける静かな型嘘」を残していた。
検証失敗時に落とさず warn するのは、本番データとスキーマの整合が未確認のため
「落とさず観測」を選んでいるから。warn が常態化したら schema を実態へ寄せ、収束後は skip へ倒す余地がある。

## 書き込みパス（画面 → Firestore Document）

- **データ操作は Server Actions**（正本は `apps/web/src/actions/`。route 同居 `app/*/actions.ts` は段階移行中）。
- 書き込み（Plain→Document）の **transformer は基本持たない**。各 Server Action / 収集パイプラインが
  Document を直接構築する（旧 `work-firestore.ts` の `toFirestore` は呼び出しゼロの死蔵だったため削除済み。
  Video は `videoToFirestore` を残す）。
- **カウンタ更新は `lib/firestore-helpers` の `updateCounter` を直接使う**（CLAUDE.md §2）。
- **merge の sticky フィールドに注意**: `merge:true` + `ignoreUndefinedProperties` では `undefined` が
  スキップされ旧値が残る。不在を表すなら `FieldValue.delete()` で明示する。

## 新しいドメインオブジェクトを足すとき

まず **CLAUDE.md の「Entity化のゲート」を通す**。次のいずれも満たさなければ
「型定義 + 純関数」に留める（クラス化しない）:

- ビジネスルールが5個以上ある、または
- 明確な状態遷移がある（例: draft→published→archived）、または
- 不変条件が複雑

「他のドメインが成功したから」は理由にしない（過剰一般化の禁止。判断背景は
[ADR-001](../decisions/architecture/ADR-001-ddd-implementation-guidelines.md) /
[ADR-005](../decisions/architecture/ADR-005-entity-implementation-lessons.md)）。
**現時点では全ドメインが「型 + Zod + 純関数」に収まっており、クラス Entity はゼロ**。
ゲートを通さない通常ケースの実装は次の3点に集約される:

1. `*-document-schema.ts` に Zod スキーマと `XxxDocument` 型を追加
2. `plain-objects/*-plain.ts` に `XxxPlainObject` を追加
3. `transformers/*.ts` に `fromFirestore` を追加し、barrel から `xxxTransformers` を公開

## テスト

- テストは `__tests__` ディレクトリに置く（ソースと同居させない）。
- 検証対象は **Zod スキーマ（parse の成否・default 適用）と transformer（写像の正しさ）**。
- 完了前は必ず `pnpm verify`（lint + typecheck + test、カバレッジ閾値も強制）。

## 参考実装（正本ファイル）

- スキーマ: [work-document-schema.ts](../../packages/shared-types/src/entities/work/work-document-schema.ts)
- PlainObject: [work-plain.ts](../../packages/shared-types/src/plain-objects/work-plain.ts)
- 変換: [work-firestore.ts](../../packages/shared-types/src/transformers/work-firestore.ts) /
  [video-firestore.ts](../../packages/shared-types/src/transformers/video-firestore.ts) /
  [audio-button.ts](../../packages/shared-types/src/transformers/audio-button.ts)
- 読み取り境界の safeParse: [work-converters.ts](../../apps/web/src/app/works/utils/work-converters.ts)
- ドメイン一覧と業務ルール: [domain-object-catalog.md](domain-object-catalog.md) /
  [domain-model.md](domain-model.md)

---

**最終更新**: 2026-06-13
**バージョン**: 3.0（SPR-174: 関数型アーキテクチャに全面改訂。旧 2.0 のクラス Entity 実装手順は全廃済み API のため撤去）

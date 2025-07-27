# 非推奨API（アクティブ）

**最終更新**: 2025-07-27  
**目的**: 現在非推奨で、将来削除予定のAPIを追跡

## 実装状況確認結果（2025-07-27）

### V2サフィックス付きファイル
- **状態**: ✅ 既に削除済み（ファイルなし）

### ENABLE_ENTITY_V2フィーチャーフラグ
- **状態**: ⚠️ 未削除
- **残存箇所**: 
  - `/apps/web/.env.example` (line 35)
  - 実際のコードでは未使用

### fromLegacy/toLegacyメソッド

- **状態**: ⚠️ AudioButtonエンティティに残存
- **使用箇所**: マイグレーションコードで使用中

## 今後の削除予定

### 2025年10月予定

#### ~~V2サフィックスとフィーチャーフラグの削除~~ 部分完了

- 対象: ~~すべての`-v2`サフィックス付きファイル~~ ✅ 削除済み
- フィーチャーフラグ: `ENABLE_ENTITY_V2` ⚠️ .env.exampleに残存
- 関連PR: #24（予定）

### 2026年1月予定

#### 互換性コードの削除

- 対象: `fromLegacy()` / `toLegacy()` メソッド
- **状態**: ⚠️ AudioButtonエンティティに残存
  - `/packages/shared-types/src/entities/audio-button.ts`
  - `/packages/shared-types/src/migrations/audio-button-migration.ts`
- 理由: レガシー形式のサポート終了
- 関連: Phase 8

## 移行ガイド

新しいAPIへの移行については以下を参照：

- `/docs/DOMAIN_MODEL_SIMPLE.md` - ドメインモデル概要
- `/docs/ENTITY_IMPLEMENTATION_GUIDE.md` - 実装ガイド

## 削除済みAPIの記録

過去に削除されたAPIの詳細は、アーカイブを参照：
`/docs/archive/2025-07-deprecated-apis/DEPRECATED_APIS_HISTORY.md`

# 非推奨API（アクティブ）

**最終更新**: 2025-07-27  
**目的**: 現在非推奨で、将来削除予定のAPIを追跡

## 今後の削除予定

### 2025年10月予定

#### V2サフィックスとフィーチャーフラグの削除

- 対象: すべての`-v2`サフィックス付きファイル
- フィーチャーフラグ: `ENABLE_ENTITY_V2`
- 関連PR: #24（予定）

### 2026年1月予定

#### 互換性コードの削除

- 対象: `fromLegacy()` / `toLegacy()` メソッド
- 理由: レガシー形式のサポート終了
- 関連: Phase 8

## 移行ガイド

新しいAPIへの移行については以下を参照：

- `/docs/DOMAIN_MODEL_SIMPLE.md` - ドメインモデル概要
- `/docs/ENTITY_IMPLEMENTATION_GUIDE.md` - 実装ガイド

## 削除済みAPIの記録

過去に削除されたAPIの詳細は、アーカイブを参照：
`/docs/archive/2025-07-deprecated-apis/DEPRECATED_APIS_HISTORY.md`

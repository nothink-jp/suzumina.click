# Test Utils

UIパッケージのテスト関連ユーティリティ集です。

## 📋 概要

このディレクトリは開発・テスト環境でのテスト支援機能を提供します。

## 🛠️ 提供機能

### レスポンシブテストユーティリティ

- **`responsive-testing.ts`** - レスポンシブデザインのテスト用ユーティリティ
  - `mockViewport()` - ビューポートサイズのモック
  - `testAcrossViewports()` - 複数ビューポートでのテスト実行
  - `validateResponsiveClasses()` - レスポンシブクラスの検証

### テストプロバイダー

- **`test-providers.tsx`** - テスト用プロバイダーコンポーネント

### テスト型定義

- **`test-types.ts`** - テスト関連の型定義

## 🚀 使用方法

```typescript
import {
  mockViewport,
  testAcrossViewports,
  validateResponsiveClasses,
} from "@suzumina.click/ui/test-utils/responsive-testing";

// ビューポートサイズをモック
mockViewport(1440, 900);

// 複数ビューポートでテスト
testAcrossViewports(() => {
  // テストコード
});

// レスポンシブクラスの検証
validateResponsiveClasses(element, ["sm:h-9", "h-11"]);
```

## ⚠️ 注意事項

- **本番環境では使用禁止**: これらのユーティリティは開発・テスト専用です

## 📚 関連ドキュメント

- [UIパッケージREADME](../../README.md) - UIコンポーネントライブラリ概要
- [開発ガイド](../../../../docs/guides/development.md) - 開発環境・原則

---

**suzumina.click プロジェクト - テストユーティリティ**

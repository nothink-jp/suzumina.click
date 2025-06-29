# @suzumina.click/typescript-config

suzumina.click プロジェクト用の共有 TypeScript 設定パッケージです。
モノレポ全体で一貫した TypeScript 設定を提供し、設定の重複を避けることができます。

## 📋 提供される設定

### `base.json` - 基本設定
- **対象**: すべてのプロジェクトの基盤となる設定
- **特徴**: strict モード、ES2022 ターゲット、NodeNext モジュール解決
- **使用場面**: ライブラリ、ユーティリティ、サーバーサイドコード

```json
{
  "extends": "@suzumina.click/typescript-config/base.json"
}
```

### `nextjs.json` - Next.js 設定
- **継承**: base.json の設定を拡張
- **特徴**: ESNext モジュール、Bundler 解決、JSX preserve、allowJs
- **使用場面**: Next.js Web アプリケーション

```json
{
  "extends": "@suzumina.click/typescript-config/nextjs.json"
}
```

### `react-library.json` - React ライブラリ設定
- **継承**: base.json の設定を拡張
- **特徴**: jsx=react-jsx、ESNext モジュール、Bundler 解決
- **使用場面**: React コンポーネントライブラリ

```json
{
  "extends": "@suzumina.click/typescript-config/react-library.json"
}
```

### `vitest.json` - テスト設定
- **継承**: nextjs.json の設定を拡張
- **特徴**: テスト環境向けに strict 設定を緩和
- **使用場面**: Vitest テストファイル

```json
{
  "extends": "@suzumina.click/typescript-config/vitest.json"
}
```

## 🏗️ 設定継承階層

```
base.json (基盤設定)
├── nextjs.json (Next.js 用)
│   └── vitest.json (テスト用)
└── react-library.json (React ライブラリ用)
```

## 📁 プロジェクトでの使用例

### Web アプリケーション (`apps/web/`)
```json
// tsconfig.json
{
  "extends": "@suzumina.click/typescript-config/nextjs.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}

// tsconfig.test.json (テストファイル用)
{
  "extends": "@suzumina.click/typescript-config/vitest.json"
}
```

### Cloud Functions (`apps/functions/`)
```json
{
  "extends": "@suzumina.click/typescript-config/base.json",
  "compilerOptions": {
    "outDir": "lib",
    "noImplicitReturns": true,
    "noUnusedLocals": true
  }
}
```

### React UI ライブラリ (`packages/ui/`)
```json
{
  "extends": "@suzumina.click/typescript-config/react-library.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  }
}
```

### 共有型定義 (`packages/shared-types/`)
```json
{
  "extends": "@suzumina.click/typescript-config/base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true
  }
}
```

## ⚙️ カスタマイズガイドライン

### 推奨される上書き
- `outDir`, `rootDir` - 出力・ソースディレクトリ
- `baseUrl`, `paths` - パスマッピング
- `noImplicitReturns`, `noUnusedLocals` - 追加の strict 設定

### 避けるべき上書き
- `strict`, `target`, `module` - 基本的な TypeScript 設定
- `esModuleInterop`, `skipLibCheck` - 互換性設定
- `moduleResolution` - 既に適切に設定済み

## 🔧 メンテナンス

新しい設定を追加する場合は、継承階層を考慮して適切な場所に配置してください：

1. **全プロジェクト共通** → `base.json` に追加
2. **Next.js 特有** → `nextjs.json` に追加
3. **React ライブラリ特有** → `react-library.json` に追加
4. **テスト特有** → `vitest.json` に追加

## 📦 パッケージ依存関係

このパッケージを使用するには、`package.json` の `devDependencies` に追加してください：

```json
{
  "devDependencies": {
    "@suzumina.click/typescript-config": "workspace:*"
  }
}
```
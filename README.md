# suzumina.click

[suzumina.click](https://suzumina.click)のウェブサイトソースコード

## 開発環境

### 必要条件

- Node.js >= 22
- [bun](https://bun.sh) >= 1.2.8

### 使用技術

- [Next.js](https://nextjs.org/) 15.2.4
- [React](https://react.dev/) 19.1.0
- [TypeScript](https://www.typescriptlang.org/) 5.8.2
- [Turbo](https://turbo.build/) 2.4.4
- [Biome](https://biomejs.dev/) 1.9.4

## プロジェクト構成

このプロジェクトは[Turborepo](https://turbo.build/repo)を使用したモノレポ構成です。

### アプリケーションとパッケージ

- `apps/web`: メインの[Next.js](https://nextjs.org/)アプリケーション
- `apps/functions`: サーバーレス関数群
- `packages/typescript-config`: 共有TypeScript設定

各パッケージ/アプリケーションは100% [TypeScript](https://www.typescriptlang.org/)で記述されています。

### 開発ツール

- [Biome](https://biomejs.dev/): リンターとフォーマッター
- [CSpell](https://cspell.org/): スペルチェッカー
- [Turbo](https://turbo.build/): ビルドシステム

## 開発手順

### インストール

```bash
bun install
```

### 開発サーバーの起動

```bash
bun run dev
```

### ビルド

```bash
bun run build
```

### 型チェック

```bash
bun run check-types
```

### リントとフォーマット

```bash
# リントチェック
bun run check

# フォーマットチェック
bun run format

# リントとフォーマットの自動修正
bun run ci:fix
```

### スペルチェック

```bash
bun run spell-check
```

## CI/CD

以下のチェックが自動実行されます：

1. コードの型チェック
2. リントチェック
3. フォーマットチェック
4. Markdownリントチェック
5. スペルチェック

## リモートキャッシュ

Turborepoの[リモートキャッシュ](https://turbo.build/repo/docs/core-concepts/remote-caching)機能を使用して、チーム間でのビルドキャッシュの共有が可能です。

### キャッシュの設定

```bash
# Vercelへのログイン
bunx turbo login

# リモートキャッシュの設定
bunx turbo link
```

## 参考リンク

- [Tasks](https://turbo.build/repo/docs/core-concepts/monorepos/running-tasks)
- [Caching](https://turbo.build/repo/docs/core-concepts/caching)
- [Remote Caching](https://turbo.build/repo/docs/core-concepts/remote-caching)
- [Filtering](https://turbo.build/repo/docs/core-concepts/monorepos/filtering)
- [Configuration Options](https://turbo.build/repo/docs/reference/configuration)
- [CLI Usage](https://turbo.build/repo/docs/reference/command-line-reference)

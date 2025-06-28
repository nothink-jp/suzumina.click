# Cheerio アップグレードガイド

このドキュメントは、次回メンテナンス時にcheerioを1.1.0以降にアップグレードするための手順と注意点をまとめています。

## 現在の状況（2025年6月現在）

### 安定稼働構成
- **Node.js**: 22.x
- **cheerio**: 1.0.0（固定）
- **Cloud Functions**: nodejs22 ランタイム
- **ステータス**: 本番環境で安定稼働中

### 既知の問題
- cheerio 1.1.0でESM/CommonJS互換性問題が発生
- `cheerio-select@2.1.0` → `css-select` のモジュール解決エラー
- pnpmの依存関係キャッシュとの相性問題

## アップグレード手順

### 1. 事前準備

```bash
# 現在のバージョンを記録
pnpm list cheerio

# テスト環境での事前確認
git checkout -b feature/cheerio-upgrade
```

### 2. 段階的アップグレード

#### Step 1: 依存関係の調査
```bash
# cheerio最新版の依存関係確認
npm info cheerio@latest dependencies
npm info cheerio-select@latest dependencies
npm info css-select@latest
```

#### Step 2: 実装問題の修正（既に完了）
- [x] `cheerio.load(element)(element)` パターンの修正
- [x] 適切な `$(element)` 使用への変更

#### Step 3: 設定調整
```bash
# package.jsonでバージョン指定
{
  "dependencies": {
    "cheerio": "^1.1.0"
  }
}

# 必要に応じてESM設定追加
{
  "type": "module"  // 必要に応じて
}
```

#### Step 4: テスト実行
```bash
# 依存関係クリーンインストール
rm -rf node_modules pnpm-lock.yaml
pnpm install

# テスト実行
pnpm --filter @suzumina.click/functions test
```

### 3. 問題対応パターン

#### A. css-selectモジュール解決エラー
```bash
# 明示的依存関係追加
pnpm --filter @suzumina.click/functions add css-select@latest

# vitest設定でexternal指定
// vitest.config.ts
export default defineConfig({
  test: {
    server: {
      deps: {
        external: ["cheerio", "cheerio-select", "css-select"]
      }
    }
  }
})
```

#### B. ESM/CommonJS混在問題
```json
// package.json
{
  "type": "module",
  "engines": {
    "node": "22"
  }
}
```

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "node",
    "target": "ES2022"
  }
}
```

#### C. pnpm設定調整
```yaml
# .npmrc
auto-install-peers=true
shamefully-hoist=true  # 必要に応じて
```

### 4. 検証項目

#### 機能テスト
- [ ] DLsiteスクレイピング機能
- [ ] HTMLパース処理
- [ ] タグ抽出機能
- [ ] 作品情報取得

#### 環境テスト
- [ ] ローカル開発環境
- [ ] Cloud Functions Node.js 22
- [ ] CI/CDパイプライン
- [ ] 本番デプロイ

### 5. ロールバック手順

問題が発生した場合の復旧手順：

```bash
# 安定版に戻す
cd apps/functions
pnpm add cheerio@1.0.0 --save-exact

# 依存関係再インストール
rm -rf node_modules pnpm-lock.yaml
pnpm install

# テスト確認
pnpm test
```

## 関連ファイル

### 修正が必要な可能性があるファイル
- `apps/functions/src/utils/dlsite-parser.ts`
- `apps/functions/package.json`
- `apps/functions/vitest.config.ts`
- `apps/functions/tsconfig.json`

### 影響範囲
- DLsite作品取得機能
- HTMLパース処理全般
- Cloud Functions デプロイ

## 注意事項

1. **本番影響**: DLsite機能は本番サービスの重要機能のため、十分なテストが必要
2. **Cloud Functions**: Node.js 22との組み合わせでの動作確認必須
3. **依存関係**: pnpmのキャッシュ問題に注意
4. **ESM移行**: 必要に応じてESMモジュール構成への変更を検討

## 成功判定基準

- [ ] 全テストがパス（95件以上）
- [ ] Cloud Functionsデプロイ成功
- [ ] DLsite作品取得の正常動作
- [ ] パフォーマンス劣化なし

## 参考情報

- [cheerio 1.1.0 Release Notes](https://github.com/cheeriojs/cheerio/releases/tag/v1.1.0)
- [Node.js 22 ESM Documentation](https://nodejs.org/api/esm.html)
- [pnpm Dependency Management](https://pnpm.io/npmrc)

---

**更新履歴**
- 2025-06-28: 初版作成（v0.2.2での知見を基に）
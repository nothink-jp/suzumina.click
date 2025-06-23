# 依存関係更新戦略

## 🎯 目標
- 安全性を保ちながら依存関係を最新化
- 破壊的変更による予期しないエラーを防止
- 型安全性とテストカバレッジを維持

## 📋 段階的アップデート手法

### Step 1: パッチ・マイナーバージョンの安全更新

```bash
# 1. セマンティックバージョニング範囲内の安全更新
pnpm update

# 2. 特定パッケージの範囲内更新
pnpm update @types/react @types/node

# 3. 開発依存関係のみ更新
pnpm update --dev
```

### Step 2: 個別メジャーバージョン更新

```bash
# 1. 特定パッケージの最新バージョン確認
pnpm outdated

# 2. 個別に最新化（1つずつ）
pnpm add @types/react@latest
pnpm add typescript@latest

# 3. 各更新後にテスト実行
pnpm test && pnpm typecheck && pnpm build
```

### Step 3: Beta・RC版の慎重な採用

```bash
# next-auth v5のようなBeta版は固定バージョンで管理
pnpm add next-auth@5.0.0-beta.28

# 依存する@auth/coreも同期
pnpm add @auth/core@0.39.1
```

## 🔍 更新前チェックリスト

### 1. 依存関係調査
```bash
# 現在の状況確認
pnpm outdated
pnpm audit

# 特定パッケージの詳細確認
pnpm info next-auth versions --json
pnpm info @auth/core peerDependencies
```

### 2. 影響範囲分析
- [ ] CHANGELOG確認
- [ ] Breaking Changes調査
- [ ] peer dependencies確認
- [ ] TypeScript互換性確認

### 3. テスト環境での検証
```bash
# 更新前の状態保存
git stash
git checkout -b dependency-update

# 更新実行
pnpm add package@latest

# 包括的テスト
pnpm test:coverage
pnpm typecheck
pnpm build
pnpm test:e2e
```

## 🛡️ リスク軽減策

### 1. 依存関係固定戦略

**Beta/RC版は固定バージョン**
```json
{
  "dependencies": {
    "next-auth": "5.0.0-beta.28",  // ❌ ^5.0.0-beta.28
    "@auth/core": "0.39.1"         // ❌ ^0.39.1
  }
}
```

**安定版は範囲指定**
```json
{
  "dependencies": {
    "react": "^19.1.0",           // ✅ マイナー更新許可
    "next": "15.3.4",             // ✅ 固定（メジャー更新慎重）
    "typescript": "^5.8.3"        // ✅ マイナー更新許可
  }
}
```

### 2. pnpm設定最適化

```yaml
# .npmrc
auto-install-peers=true
strict-peer-dependencies=false
resolution-mode=highest
prefer-frozen-lockfile=true
```

### 3. 更新頻度とタイミング

**週次・月次の定期更新**
- パッチバージョン: 週次
- マイナーバージョン: 月次
- メジャーバージョン: 四半期

**緊急セキュリティ更新**
```bash
# セキュリティ脆弱性の即座対応
pnpm audit fix
```

## 🤖 自動化ツール活用

### 1. Renovate設定（推奨）

```json
{
  "extends": ["config:base"],
  "schedule": ["before 6am on monday"],
  "separateMinorPatch": true,
  "groupName": "dependencies",
  "rangeStrategy": "bump",
  "semanticCommits": "enabled",
  "packageRules": [
    {
      "matchPackagePatterns": ["^@types/"],
      "groupName": "type definitions",
      "schedule": ["before 6am on monday"]
    },
    {
      "matchPackageNames": ["next-auth", "@auth/core"],
      "groupName": "authentication",
      "schedule": ["before 6am on first day of month"]
    },
    {
      "matchDepTypes": ["devDependencies"],
      "groupName": "dev dependencies",
      "schedule": ["before 6am on monday"]
    }
  ]
}
```

### 2. Dependabot設定

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "06:00"
    groups:
      dev-dependencies:
        dependency-type: "development"
      type-definitions:
        patterns:
          - "@types/*"
```

### 3. GitHub Actions統合

```yaml
# .github/workflows/dependency-update.yml
name: Dependency Update Check
on:
  pull_request:
    paths: ["package.json", "pnpm-lock.yaml"]

jobs:
  test-dependencies:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - name: Install dependencies
        run: pnpm install
      - name: Run tests
        run: |
          pnpm test:coverage
          pnpm typecheck
          pnpm build
          pnpm test:e2e
```

## 📊 モニタリング・検証

### 1. 更新後チェック項目

```bash
# 基本機能確認
pnpm dev  # 開発サーバー起動確認
pnpm build  # ビルド成功確認
pnpm test:coverage  # テストカバレッジ維持確認

# 型安全性確認
pnpm typecheck  # TypeScriptエラーなし
pnpm lint  # コード品質維持

# E2E確認
pnpm test:e2e  # ユーザーフロー正常動作
```

### 2. パフォーマンス監視

```bash
# バンドルサイズ確認
pnpm build  # Next.jsビルドレポート確認

# 依存関係サイズ分析
pnpm add -D webpack-bundle-analyzer
```

### 3. セキュリティ監査

```bash
# 脆弱性スキャン
pnpm audit
pnpm audit --fix

# 定期的なセキュリティ更新
pnpm update --latest --dev @types/*
```

## 🚨 トラブルシューティング

### 型エラー発生時
1. 関連パッケージの依存関係確認
2. peerDependencies整合性確認
3. 段階的ロールバック実行

### ビルドエラー発生時
1. キャッシュクリア: `pnpm clean:all`
2. 依存関係再インストール
3. 個別パッケージ切り戻し

### テスト失敗時
1. 破壊的変更の特定
2. テストコード更新の検討
3. 機能レベルでの影響評価

## 📝 更新ログ管理

更新履歴を `DEPENDENCY_UPDATES.md` で管理:

```markdown
# 依存関係更新履歴

## 2024-XX-XX
- ✅ @types/react: 19.1.7 → 19.1.8 (型定義更新)
- ✅ typescript: 5.8.2 → 5.8.3 (パッチ更新)
- ❌ recharts: 2.15.3 → 3.0.0 (メジャー更新延期 - 型互換性問題)

## 注意事項
- next-auth v5 Beta: 固定バージョン維持
- @auth/core: next-authとの同期必須
```

この戦略により、安全性を保ちながら依存関係を最新化できます。
# PrettierからBiomeへの移行計画

## 1. 現状分析

### 現在の設定
- ルートの`package.json`でBiome（v1.9.4）が既にインストール済み
- ルートの`package.json`でPrettier（v3.5.3）を使用
- グローバルなformat scriptで`**/*.{ts,tsx,md}`をフォーマット
- 各ワークスペースは共通のPrettier設定を使用

### 影響範囲
- すべてのTypeScript/TSXファイル
- すべてのMarkdownファイル
- すべてのワークスペース（apps/*, packages/*）

## 2. 移行手順

### Phase 1: 準備

1. 現存するBiome設定の確認
```bash
# 既存のBiome設定を確認
cat biome.json
```

2. 既存のフォーマッターとリンターの削除

a. ルートレベルの依存関係:
```bash
# Prettierの削除
bun remove prettier
```

b. apps/webの依存関係:
```bash
# ESLint関連パッケージの削除
cd apps/web
bun remove eslint @repo/eslint-config
```
※ package.jsonから`"lint": "next lint --max-warnings 0"`を削除


2. Biomeのインストール
```bash
bun add -d @biomejs/biome
```

3. 既存のフォーマット設定の削除
- ルートの`package.json`から古い`format`スクリプトを削除
- `.prettierrc`や`.prettierignore`が存在する場合は削除

4. `packages/eslint-config`の削除
```bash
# 依存関係の削除を確認
rm -rf packages/eslint-config

# package.jsonからworkspace参照を削除（必要な場合）
```

### Phase 2: Biome設定の追加

1. ルートディレクトリに`biome.json`を作成
```json
{
  "$schema": "https://biomejs.dev/schemas/1.5.3/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 80
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double",
      "trailingComma": "all",
      "semicolons": "always"
    }
  }
}
```

2. `package.json`にBiomeスクリプトを追加
```json
{
  "scripts": {
    "format": "biome format --write .",
    "lint": "turbo run lint",  # Turbo経由で各パッケージのlintを実行
    "check": "biome check --apply ."
  }
}
```

3. Turbo設定の更新（`turbo.json`）
```json
{
  "pipeline": {
    "format": {
      "cache": false
    }
  }
}
```

4. apps/web/package.jsonのスクリプト更新
```json
{
  "scripts": {
    "dev": "next dev --turbopack --port 3000",
    "build": "next build",
    "start": "next start",
    "lint": "biome check .",
    "check-types": "tsc --noEmit"
  }
}
```

### Phase 3: CI/CD対応

1. GitHub Actionsの更新
   - Prettierの代わりにBiomeを使用するようワークフローを更新
   - フォーマットチェックをCIに追加
   - ESLintステップの削除とBiomeステップへの置き換え

2. Pre-commitフックの更新
   - Biomeを使用したフォーマットチェックを追加

## 3. 移行スケジュール

1. 準備フェーズ（1日）
   - 依存関係の更新
   - 既存のBiome設定の確認と更新
   - ESLint関連パッケージと設定の削除計画策定

2. 設定フェーズ（1-2日）
   - Biome設定ファイルの作成
   - スクリプトの更新
   - 初回フォーマット実行
   - ESLint設定の段階的削除開始

### Phase 4: 移行の実行順序

1. 依存関係の少ないパッケージから開始
   ```
   packages/typescript-config  # 設定のみ
   packages/ui                # 共有コンポーネント
   apps/functions            # サーバーレス関数
   apps/web                  # メインアプリケーション
   ```

2. 各パッケージでの作業手順
   a. ESLint設定の削除
   b. Biome設定の適用
   c. フォーマットの実行
   d. 動作確認とテスト

3. 確認項目
   - ビルドが正常に完了すること
   - 型チェックが通ること
   - 開発サーバーが正常に起動すること
   - 既存の機能が正常に動作すること

3. CI/CD更新フェーズ（1日）
   - GitHub Actions更新
   - Pre-commitフック更新

   ```yaml
   # 更新後のワークフローの例
   jobs:
     check:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: oven-sh/setup-bun@v1
         - run: bun install
         - run: bun run check        # Biomeによるチェック
         - run: bun run check-types  # 型チェック
         - run: bun run build        # ビルド確認
   ```

4. テストフェーズ（2-3日）
   - 各ワークスペースでのテスト
   - 問題箇所の修正
   - ESLintからBiomeへの移行の検証
   - 移行完了の確認手順の実施

## 4. リスクと対策

### 想定されるリスク
1. フォーマット差異による大量の変更
   - 対策：変更を段階的にコミット
   - 対策：重要な機能変更と分けてコミット

2. CIパイプラインの中断
   - 対策：並行して新旧両方のチェックを実行
   - 対策：段階的な移行期間を設ける

3. チーム内の混乱
   - 対策：明確なドキュメント作成
   - 対策：エディタ設定方法の共有

## 5. ロールバック計画

1. ESLint設定の復元
   - packages/eslint-configの復元
   - 各ワークスペースのESLint設定復元

2. Biome設定の削除
   - `biome.json`の削除
   - スクリプトの復元

3. Prettier設定の復元
   - 依存関係の再インストール
   - 設定ファイルの復元
   
3. CI/CD設定の復元
   - GitHub Actionsの復元
   - Pre-commitフックの復元

## 6. 検証項目チェックリスト

1. **ビルド検証**
   - [ ] 全パッケージでビルドが成功
   - [ ] 型チェックが通過
   - [ ] 開発サーバーが正常起動

2. **コード品質検証**
   - [ ] Biomeによるリント/フォーマットが正常動作
   - [ ] ESLint関連の設定が完全に削除
   - [ ] CIパイプラインが正常に完了

## 7. 成功基準

1. 全ファイルが正常にフォーマットされること
2. CIパイプラインが正常に動作すること
3. チームメンバーがローカルで問題なく開発できること
4. ビルドとテストが正常に通ること

## 8. 参考資料

- [Biome公式ドキュメント](https://biomejs.dev/)
- [Biome VS Code拡張](https://marketplace.visualstudio.com/items?itemName=biomejs.biome)
- [Prettier to Biome Migration Guide](https://biomejs.dev/guides/migrate-from-prettier)
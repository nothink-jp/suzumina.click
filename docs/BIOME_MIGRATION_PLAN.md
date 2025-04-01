# PrettierからBiomeへの移行計画

## 1. 現状分析

### 現在の設定
- ルートの`package.json`でPrettier（v3.5.3）を使用
- グローバルなformat scriptで`**/*.{ts,tsx,md}`をフォーマット
- 各ワークスペースは共通のPrettier設定を使用

### 影響範囲
- すべてのTypeScript/TSXファイル
- すべてのMarkdownファイル
- すべてのワークスペース（apps/*, packages/*）

## 2. 移行手順

### Phase 1: 準備

1. Prettierの削除
```bash
bun remove prettier
```

2. Biomeのインストール
```bash
bun add -d @biomejs/biome
```

3. 既存のフォーマット設定の削除
   - ルートの`package.json`から`format`スクリプトを削除
   - `.prettierrc`や`.prettierignore`が存在する場合は削除

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
    "lint": "biome lint .",
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

### Phase 3: CI/CD対応

1. GitHub Actionsの更新
   - Prettierの代わりにBiomeを使用するようワークフローを更新
   - フォーマットチェックをCIに追加

2. Pre-commitフックの更新
   - Biomeを使用したフォーマットチェックを追加

## 3. 移行スケジュール

1. 準備フェーズ（1日）
   - 依存関係の更新
   - 既存設定の削除

2. 設定フェーズ（1-2日）
   - Biome設定ファイルの作成
   - スクリプトの更新
   - 初回フォーマット実行

3. CI/CD更新フェーズ（1日）
   - GitHub Actions更新
   - Pre-commitフック更新

4. テストフェーズ（2-3日）
   - 各ワークスペースでのテスト
   - 問題箇所の修正

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

1. Biome設定の削除
   - `biome.json`の削除
   - スクリプトの復元

2. Prettier設定の復元
   - 依存関係の再インストール
   - 設定ファイルの復元

3. CI/CD設定の復元
   - GitHub Actionsの復元
   - Pre-commitフックの復元

## 6. 成功基準

1. 全ファイルが正常にフォーマットされること
2. CIパイプラインが正常に動作すること
3. チームメンバーがローカルで問題なく開発できること
4. ビルドとテストが正常に通ること

## 7. 参考資料

- [Biome公式ドキュメント](https://biomejs.dev/)
- [Biome VS Code拡張](https://marketplace.visualstudio.com/items?itemName=biomejs.biome)
- [Prettier to Biome Migration Guide](https://biomejs.dev/guides/migrate-from-prettier)
# shadcn/ui 更新チェックリスト

**プロジェクト**: suzumina.click  
**更新サイクル**: 半年毎（1月・7月）  
**推定作業時間**: 2.5時間  
**対象**: packages/ui/src/components/ui/ 内の全コンポーネント

## 📋 概要

このチェックリストは、suzumina.clickプロジェクトでのshadcn/ui半年更新作業を効率的かつ安全に実行するための詳細手順です。

**重要**: 更新作業は必ず開発環境で実施し、テスト完了後に本番反映してください。

## 🕐 更新スケジュール

### 推奨実行タイミング

- **1月第3週**: 年始の機能追加・バグ修正を反映
- **7月第3週**: 上半期の機能追加・バグ修正を反映

### 作業時間配分

- **更新前確認**: 1時間
- **更新実行**: 1時間
- **テスト・検証**: 30分

## 🔍 Phase 1: 更新前確認（1時間）

### 1.1 環境確認・準備（15分）

#### 作業環境の確認

```bash
# 現在のブランチ確認
git status

# 開発ブランチに切り替え
git checkout -b feature/shadcn-ui-update-$(date +%Y%m%d)

# 最新の状態に更新
git pull origin main

# 依存関係の確認
cd packages/ui
pnpm install
```

#### バックアップ作成

```bash
# 重要コンポーネントのバックアップ
cp src/components/ui/button.tsx src/components/ui/button.backup.tsx
cp src/components/ui/dialog.tsx src/components/ui/dialog.backup.tsx

# 作業ディレクトリのタイムスタンプ
echo "Backup created at: $(date)" > backup-info.txt
```

### 1.2 現在のカスタマイゼーション状態確認（20分）

#### Critical コンポーネントの確認

```bash
# button.tsx のカスタマイゼーション確認
echo "🔍 button.tsx カスタマイゼーション確認"
grep -n "h-11 sm:h-9" src/components/ui/button.tsx
grep -n "focus-visible:ring-\[3px\]" src/components/ui/button.tsx
grep -n "has-\[>svg\]:px-3" src/components/ui/button.tsx
grep -n "data-slot" src/components/ui/button.tsx

# dialog.tsx のカスタマイゼーション確認
echo "🔍 dialog.tsx カスタマイゼーション確認"
grep -n "showCloseButton" src/components/ui/dialog.tsx
grep -n "max-w-\[calc(100%-2rem)\]" src/components/ui/dialog.tsx
grep -n "data-slot" src/components/ui/dialog.tsx
```

#### 現在のテスト状態確認

```bash
# Critical コンポーネントのテスト実行
echo "🧪 現在のテスト状態確認"
pnpm test -- button.test.tsx
pnpm test -- dialog.test.tsx

# テスト結果の記録
echo "Pre-update test results:" > test-results-pre.txt
pnpm test -- button.test.tsx >> test-results-pre.txt 2>&1
pnpm test -- dialog.test.tsx >> test-results-pre.txt 2>&1
```

### 1.3 利用可能な更新の調査（25分）

#### 更新可能なコンポーネントの確認

```bash
echo "📦 利用可能な更新確認"
pnpm dlx shadcn@canary diff --list > available-updates.txt
cat available-updates.txt
```

#### 重要コンポーネントの変更内容確認

```bash
# button.tsx の変更内容確認
echo "🔍 button.tsx の変更内容"
pnpm dlx shadcn@canary diff button > button-changes.txt
cat button-changes.txt

# dialog.tsx の変更内容確認
echo "🔍 dialog.tsx の変更内容"
pnpm dlx shadcn@canary diff dialog > dialog-changes.txt
cat dialog-changes.txt
```

#### 更新判断の記録

```bash
# 更新判断の記録テンプレート
cat > update-decision.txt << 'EOF'
# shadcn/ui 更新判断記録
日付: $(date)
調査者: [your-name]

## 更新候補コンポーネント
- button.tsx: [更新理由・変更内容]
- dialog.tsx: [更新理由・変更内容]
- その他: [コンポーネント名と理由]

## 更新対象の決定
### 更新実行
- [ ] button.tsx: 理由 - 
- [ ] dialog.tsx: 理由 - 

### 更新見送り
- [ ] コンポーネント名: 理由 - 

## 特記事項
- 
EOF
```

## 🚀 Phase 2: 更新実行（1時間）

### 2.1 Critical コンポーネントの更新（30分）

#### button.tsx の更新

```bash
echo "🔄 button.tsx を更新中..."

# 1. 原版を取得
pnpm dlx shadcn@canary add button --overwrite

# 2. カスタマイゼーションの再適用確認
echo "📋 button.tsx カスタマイゼーション再適用チェック"
echo "以下の項目を手動で確認・再適用してください:"
echo "- [ ] レスポンシブサイズ: h-11 sm:h-9"
echo "- [ ] アクセシビリティ: focus-visible:ring-[3px]"
echo "- [ ] SVG統合: has-[>svg]:px-3"
echo "- [ ] data-slot属性: data-slot=\"button\""
echo "- [ ] アニメーション: transition-all"

# 3. 変更内容の確認
git diff src/components/ui/button.tsx
```

#### dialog.tsx の更新

```bash
echo "🔄 dialog.tsx を更新中..."

# 1. 原版を取得
pnpm dlx shadcn@canary add dialog --overwrite

# 2. カスタマイゼーションの再適用確認
echo "📋 dialog.tsx カスタマイゼーション再適用チェック"
echo "以下の項目を手動で確認・再適用してください:"
echo "- [ ] showCloseButton プロパティ: showCloseButton?: boolean"
echo "- [ ] レスポンシブ幅: max-w-[calc(100%-2rem)]"
echo "- [ ] data-slot属性: data-slot=\"dialog-content\""
echo "- [ ] アニメーション設定の保持"

# 3. 変更内容の確認
git diff src/components/ui/dialog.tsx
```

### 2.2 Medium重要度コンポーネントの選択的更新（20分）

#### セキュリティ修正・重要改善のみ更新

```bash
echo "🔄 Medium重要度コンポーネントの更新"

# 更新対象の例（実際の更新は判断に基づく）
MEDIUM_COMPONENTS=(
  "select"    # size プロパティ
  "tabs"      # suzuka-500 カラー
  "switch"    # suzuka-400/500 カラー
  "card"      # CardAction コンポーネント
  "alert"     # Grid レイアウト
)

for component in "${MEDIUM_COMPONENTS[@]}"; do
  echo "📦 $component の更新確認"
  # 必要に応じて更新実行
  # pnpm dlx shadcn@canary add $component --overwrite
done
```

### 2.3 data-slot属性の一括再適用（10分）

#### 軽微カスタマイゼーションの確認

```bash
echo "📝 data-slot属性の一括確認"

# 主要コンポーネントのdata-slot属性確認
BASIC_COMPONENTS=(
  "input" "label" "textarea" "checkbox" "radio-group"
  "badge" "separator" "skeleton" "progress" "accordion"
)

for component in "${BASIC_COMPONENTS[@]}"; do
  echo "🔍 $component の data-slot 属性確認"
  grep -n "data-slot" "src/components/ui/$component.tsx" || echo "⚠️ data-slot 属性が見つかりません"
done
```

## 🧪 Phase 3: テスト・検証（30分）

### 3.1 Critical コンポーネントのテスト実行（10分）

#### 自動テスト実行

```bash
echo "🧪 Critical コンポーネントのテスト実行"

# button.tsx テスト
echo "📋 button.test.tsx 実行"
pnpm test -- button.test.tsx

# dialog.tsx テスト
echo "📋 dialog.test.tsx 実行"
pnpm test -- dialog.test.tsx

# テスト結果の記録
echo "Post-update test results:" > test-results-post.txt
pnpm test -- button.test.tsx >> test-results-post.txt 2>&1
pnpm test -- dialog.test.tsx >> test-results-post.txt 2>&1
```

### 3.2 手動動作確認（15分）

#### 主要機能の動作確認

```bash
echo "🔍 手動動作確認の開始"

# 開発サーバーの起動
pnpm dev &
DEV_PID=$!

echo "📋 以下のページで動作確認を実行してください:"
echo "- [ ] / (ホームページ) - ボタン・カード表示"
echo "- [ ] /buttons (音声ボタン) - AudioButton コンポーネント"
echo "- [ ] /admin (管理画面) - Dialog・Form コンポーネント"

echo "🔍 確認項目:"
echo "- [ ] ボタンのレスポンシブサイズ (モバイル h-11, デスクトップ h-9)"
echo "- [ ] ボタンのフォーカス表示 (3px リング)"
echo "- [ ] ダイアログの表示・非表示"
echo "- [ ] ダイアログの閉じるボタン制御"
echo "- [ ] 主要コンポーネントのdata-slot属性"

# 手動確認完了後にサーバーを停止
# kill $DEV_PID
```

### 3.3 data-slot属性の抜き打ち確認（5分）

#### 開発者ツールでの確認

```bash
echo "🔍 data-slot属性の抜き打ち確認"
echo "開発者ツールで以下の属性を確認してください:"
echo "- [ ] button要素: data-slot=\"button\""
echo "- [ ] input要素: data-slot=\"input\""
echo "- [ ] dialog要素: data-slot=\"dialog-content\""
echo "- [ ] select要素: data-slot=\"select-trigger\""
echo "- [ ] checkbox要素: data-slot=\"checkbox\""
```

## 🚨 問題発生時の対応

### ロールバック手順

#### テスト失敗時の対応

```bash
echo "🚨 テスト失敗 - ロールバック実行"

# バックアップからの復元
cp src/components/ui/button.backup.tsx src/components/ui/button.tsx
cp src/components/ui/dialog.backup.tsx src/components/ui/dialog.tsx

# 復元確認
pnpm test -- button.test.tsx
pnpm test -- dialog.test.tsx

# 正常動作確認
pnpm dev
```

#### 部分的な問題の対応

```bash
echo "🔧 部分的な問題の修正"

# 特定コンポーネントのみ復元
cp src/components/ui/button.backup.tsx src/components/ui/button.tsx

# カスタマイゼーションの再適用
echo "CUSTOMIZATIONS.md を参照してカスタマイゼーションを再適用してください"
```

### 問題記録テンプレート

```bash
cat > issue-report.txt << 'EOF'
# 更新問題レポート
日付: $(date)
更新者: [your-name]

## 発生した問題
- コンポーネント: 
- エラー内容: 
- 再現手順: 

## 対応方法
- 実行した対応: 
- 参照した資料: 
- 解決状況: 

## 今後の対策
- 予防策: 
- 改善点: 
EOF
```

## 📝 更新完了の確認

### 最終チェックリスト

#### 技術的確認

- [ ] button.test.tsx: 全テスト通過
- [ ] dialog.test.tsx: 全テスト通過
- [ ] 開発サーバー: 正常起動
- [ ] 主要ページ: 正常表示
- [ ] レスポンシブ: モバイル・デスクトップ対応
- [ ] アクセシビリティ: フォーカス・キーボード操作

#### ドキュメント更新

- [ ] CUSTOMIZATIONS.md: 変更内容反映
- [ ] UPDATE_CHECKLIST.md: 改善点記録
- [ ] CHANGELOG.md: 更新履歴記録

#### Git管理

- [ ] 変更内容のコミット
- [ ] プルリクエスト作成
- [ ] レビュー完了
- [ ] メインブランチへマージ

### 更新完了報告テンプレート

```bash
cat > update-report.txt << 'EOF'
# shadcn/ui 更新完了報告
日付: $(date)
更新者: [your-name]

## 更新実行内容
### Critical コンポーネント
- [ ] button.tsx: 更新内容 - 
- [ ] dialog.tsx: 更新内容 - 

### Medium コンポーネント
- [ ] 更新したコンポーネント: 
- [ ] 見送ったコンポーネント: 

## テスト結果
- [ ] button.test.tsx: 通過
- [ ] dialog.test.tsx: 通過
- [ ] 手動動作確認: 完了

## 作業時間
- 更新前確認: 分
- 更新実行: 分
- テスト・検証: 分
- 総作業時間: 分

## 改善点・次回への申し送り
- 効率化できる点: 
- 注意すべき点: 
- ツール・プロセス改善: 

## 次回更新予定
- 予定日: 2026年1月 or 2026年7月
- 特記事項: 
EOF
```

## 🔧 便利なコマンド集

### 一括確認コマンド

```bash
# 全コンポーネントのdata-slot属性確認
find src/components/ui -name "*.tsx" -exec grep -l "data-slot" {} \;

# カスタマイゼーション箇所の一括確認
grep -r "suzuka-" src/components/ui/
grep -r "focus-visible:ring-\[3px\]" src/components/ui/
grep -r "max-w-\[calc(" src/components/ui/

# テスト実行の短縮コマンド
alias test-critical="pnpm test -- button.test.tsx dialog.test.tsx"
alias test-all-ui="pnpm test -- --testPathPattern=\"ui.*\\.test\\.tsx\""
```

### 差分確認コマンド

```bash
# 更新前後の差分確認
git diff HEAD~1 src/components/ui/button.tsx
git diff HEAD~1 src/components/ui/dialog.tsx

# 特定のカスタマイゼーション箇所の差分
git diff HEAD~1 src/components/ui/button.tsx | grep -A5 -B5 "h-11 sm:h-9"
git diff HEAD~1 src/components/ui/dialog.tsx | grep -A5 -B5 "showCloseButton"
```

## 📚 参考資料

### 内部ドキュメント

- [CUSTOMIZATIONS.md](./CUSTOMIZATIONS.md): 全カスタマイゼーション詳細
- [shadcn/ui 管理戦略](../../docs/SHADCN_UI_MANAGEMENT_STRATEGY.md): 戦略・方針
- [UI テスト戦略](../../docs/UI_TESTING_STRATEGY.md): テスト方針

### 外部リソース

- [shadcn/ui Changelog](https://github.com/shadcn-ui/ui/releases): 公式変更履歴
- [Radix UI Updates](https://github.com/radix-ui/primitives/releases): 基盤ライブラリ更新
- [Tailwind CSS Updates](https://tailwindcss.com/blog): スタイリング変更

## 🎯 成功基準

### 更新成功の判定基準

1. **機能動作**: 全ての主要機能が正常動作
2. **テスト通過**: Critical コンポーネントのテスト100%通過
3. **カスタマイゼーション保持**: 48個のカスタマイゼーションが適切に保持
4. **パフォーマンス**: 更新前と同等のパフォーマンス維持

### 品質維持の指標

- **レスポンシブ対応**: モバイル・デスクトップで適切な表示
- **アクセシビリティ**: WCAG 2.1 AA準拠の維持
- **ブランド統一**: suzuka-500カラー等の保持
- **開発効率**: data-slot属性による開発支援機能の維持

---

**最終更新**: 2025年7月15日  
**バージョン**: v1.0.0  
**作成者**: Claude Code Assistant  
**次回更新予定**: 2026年1月 or 2026年7月
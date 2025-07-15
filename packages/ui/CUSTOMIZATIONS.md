# shadcn/ui カスタマイゼーション記録

**プロジェクト**: suzumina.click  
**作成日**: 2025年7月15日  
**対象**: src/components/ui/ 内の全コンポーネント  
**目的**: 半年更新サイクルでのカスタマイゼーション保護

## 📋 概要

このドキュメントは、suzumina.clickプロジェクトで使用しているshadcn/uiコンポーネントの全カスタマイゼーションを記録しています。shadcn/ui更新時の参照資料として使用します。

**総コンポーネント数**: 46個  
**カスタマイゼーション総数**: 48個  
**重要度分類**: 3レベル（Critical/Medium/Low）

## 🚨 Critical カスタマイゼーション（テスト必須）

### 1. button.tsx - 大幅カスタマイズ

**重要度**: 🔴 Critical  
**テスト要件**: button.test.tsx で検証必須  
**影響範囲**: 全サイト（音声ボタン・フォーム・管理画面）

#### 主要カスタマイゼーション

**1. レスポンシブサイズ調整**
```typescript
// デフォルトサイズ: モバイル h-11 → デスクトップ h-9
"h-11 px-4 py-2 has-[>svg]:px-3 sm:h-9"

// 理由: タッチデバイスでの操作性向上（最小44px）
// 更新時確認: サイズ調整が保持されているか
```

**2. アクセシビリティ強化**
```typescript
// フォーカス表示強化
"focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"

// バリデーション状態対応
"aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive"

// 理由: WCAG 2.1 AA準拠のアクセシビリティ
// 更新時確認: フォーカス・バリデーションスタイルが保持されているか
```

**3. SVG自動調整**
```typescript
// SVG統合最適化
"[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0"

// アイコン付きボタンの自動パディング調整
"has-[>svg]:px-3"

// 理由: アイコンとテキストの完全な統合
// 更新時確認: SVG統合とパディング調整が保持されているか
```

**4. アニメーション**
```typescript
// スムーズな状態変更
"transition-all"

// 理由: ユーザー体験向上
// 更新時確認: アニメーションが保持されているか
```

#### 更新時チェックリスト
- [ ] レスポンシブサイズ（h-11 sm:h-9）の確認
- [ ] アクセシビリティ（focus-visible、aria-invalid）の確認
- [ ] SVG統合（has-[>svg]、[&_svg]）の確認
- [ ] アニメーション（transition-all）の確認
- [ ] data-slot="button" 属性の確認

### 2. dialog.tsx - 独自プロパティ

**重要度**: 🔴 Critical  
**テスト要件**: dialog.test.tsx で検証必須  
**影響範囲**: 管理画面・フォーム・モーダル

#### 主要カスタマイゼーション

**1. showCloseButton プロパティ（独自機能）**
```typescript
interface DialogContentProps {
  showCloseButton?: boolean; // デフォルト: true
}

// 実装: 条件付きレンダリング
{showCloseButton && (
  <DialogPrimitive.Close className="absolute right-4 top-4 ...">
    <X className="h-4 w-4" />
  </DialogPrimitive.Close>
)}

// 理由: 特定のダイアログで閉じるボタンを非表示にする必要
// 更新時確認: showCloseButton プロパティが保持されているか
```

**2. レスポンシブデザイン強化**
```typescript
// モバイル対応の最大幅調整
"max-w-[calc(100%-2rem)]"

// 理由: 小画面での表示最適化
// 更新時確認: レスポンシブ幅調整が保持されているか
```

**3. アニメーション設定**
```typescript
// 詳細なアニメーション設定
"data-[state=open]:animate-in data-[state=closed]:animate-out"
"data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"

// 理由: スムーズなモーダル表示
// 更新時確認: アニメーション設定が保持されているか
```

#### 更新時チェックリスト
- [ ] showCloseButton プロパティの確認
- [ ] レスポンシブ幅（max-w-[calc(100%-2rem)]）の確認
- [ ] アニメーション設定の確認
- [ ] data-slot="dialog-content" 属性の確認

## 🟡 Medium カスタマイゼーション（選択的対応）

### 1. card.tsx - 拡張コンポーネント

**重要度**: 🟡 Medium  
**影響範囲**: 作品表示・統計カード

#### カスタマイゼーション
- **CardAction コンポーネント**: 独自のアクション要素
- **Container Queries**: `@container/card-header` 対応
- **Grid Layout**: Header構造最適化

### 2. select.tsx - サイズプロパティ

**重要度**: 🟡 Medium  
**影響範囲**: フォーム・フィルタリング

#### カスタマイゼーション
- **size プロパティ**: "sm" | "default" 選択
- **レスポンシブサイズ**: `data-[size=default]:h-9 data-[size=sm]:h-8`

### 3. tabs.tsx - プロジェクト専用カラー

**重要度**: 🟡 Medium  
**影響範囲**: ナビゲーション・検索タブ

#### カスタマイゼーション
- **suzuka-500 カラー**: 涼花みなせのテーマカラー
- **強制カラー適用**: `[&[data-state=active]]:!bg-[hsl(340_75%_55%)]`

### 4. switch.tsx - プロジェクト専用カラー

**重要度**: 🟡 Medium  
**影響範囲**: 設定・管理画面

#### カスタマイゼーション
- **suzuka-400/500 カラー**: フォーカス・アクティブ状態
- **ダークモード対応**: `dark:data-[state=unchecked]:bg-gray-600`

### 5. alert.tsx - Grid レイアウト

**重要度**: 🟡 Medium  
**影響範囲**: エラー表示・通知

#### カスタマイゼーション
- **Grid レイアウト**: `grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr]`
- **SVG 統合**: アイコンとテキストの完全統合

### 6. dropdown-menu.tsx - 拡張プロパティ

**重要度**: 🟡 Medium  
**影響範囲**: メニュー・操作パネル

#### カスタマイゼーション
- **inset プロパティ**: インセット調整
- **variant プロパティ**: "default" | "destructive"

### 7. navigation-menu.tsx - Viewport制御

**重要度**: 🟡 Medium  
**影響範囲**: ナビゲーション

#### カスタマイゼーション
- **viewport プロパティ**: boolean 制御
- **navigationMenuTriggerStyle**: 関数エクスポート

### 8. table.tsx - レスポンシブ対応

**重要度**: 🟡 Medium  
**影響範囲**: データ表示

#### カスタマイゼーション
- **コンテナラップ**: `data-slot="table-container"`
- **レスポンシブ**: `overflow-x-auto`

### 9. pagination.tsx - 状態管理

**重要度**: 🟡 Medium  
**影響範囲**: ページネーション

#### カスタマイゼーション
- **isActive プロパティ**: アクティブ状態管理
- **レスポンシブテキスト**: `sm:block`

### 10. sheet.tsx - サイド制御

**重要度**: 🟡 Medium  
**影響範囲**: サイドパネル

#### カスタマイゼーション
- **side プロパティ**: "top" | "right" | "bottom" | "left"
- **サイド別アニメーション**: 方向別設定

## 🟢 Low カスタマイゼーション（手動確認で十分）

### data-slot属性のみ（35コンポーネント）

以下のコンポーネントは**data-slot属性の追加のみ**で、その他のカスタマイゼーションは最小限です。shadcn/ui更新時は**手動確認**で十分です。

#### 基本コンポーネント
- **accordion.tsx**: `data-slot="accordion-*"`
- **avatar.tsx**: `data-slot="avatar-*"`
- **badge.tsx**: `data-slot="badge"`
- **breadcrumb.tsx**: `data-slot="breadcrumb-*"`
- **checkbox.tsx**: `data-slot="checkbox"`
- **input.tsx**: `data-slot="input"`
- **label.tsx**: `data-slot="label"`
- **separator.tsx**: `data-slot="separator"`
- **skeleton.tsx**: `data-slot="skeleton"`
- **textarea.tsx**: `data-slot="textarea"`

#### 複合コンポーネント
- **alert-dialog.tsx**: `data-slot="alert-dialog-*"`
- **popover.tsx**: `data-slot="popover-*"`
- **progress.tsx**: `data-slot="progress"`
- **radio-group.tsx**: `data-slot="radio-group-*"`
- **collapsible.tsx**: `data-slot="collapsible-*"`

#### 高度なコンポーネント
- **calendar.tsx**: `data-slot="calendar-*"`
- **carousel.tsx**: `data-slot="carousel-*"`
- **chart.tsx**: `data-slot="chart-*"`
- **command.tsx**: `data-slot="command-*"`
- **context-menu.tsx**: `data-slot="context-menu-*"`
- **drawer.tsx**: `data-slot="drawer-*"`
- **form.tsx**: `data-slot="form-*"`
- **hover-card.tsx**: `data-slot="hover-card-*"`
- **input-otp.tsx**: `data-slot="input-otp-*"`
- **menubar.tsx**: `data-slot="menubar-*"`
- **resizable.tsx**: `data-slot="resizable-*"`
- **scroll-area.tsx**: `data-slot="scroll-area-*"`
- **sidebar.tsx**: `data-slot="sidebar-*"`
- **slider.tsx**: `data-slot="slider-*"`
- **sonner.tsx**: `data-slot="sonner"`
- **toggle.tsx**: `data-slot="toggle"`
- **toggle-group.tsx**: `data-slot="toggle-group-*"`
- **tooltip.tsx**: `data-slot="tooltip-*"`
- **aspect-ratio.tsx**: `data-slot="aspect-ratio"`

### 更新時の手動確認方法

```bash
# 数個のコンポーネントでdata-slot属性を目視確認
echo "Checking data-slot attributes..."

# 開発者ツールで確認
# 1. ブラウザでページを開く
# 2. 開発者ツールでElements確認
# 3. data-slot属性が正しく付与されているか確認

# 主要ページでの確認
# - / (ホームページ)
# - /buttons (音声ボタン)
# - /admin (管理画面)
```

## 🔄 更新時チェックリスト

### 📋 更新前確認

#### 1. 現在のカスタマイゼーション状態確認
```bash
# 重要コンポーネントのバックアップ
cp src/components/ui/button.tsx src/components/ui/button.backup.tsx
cp src/components/ui/dialog.tsx src/components/ui/dialog.backup.tsx
```

#### 2. 利用可能な更新確認
```bash
# 更新可能なコンポーネント確認
pnpm dlx shadcn@canary diff --list

# 変更内容確認
pnpm dlx shadcn@canary diff button
pnpm dlx shadcn@canary diff dialog
```

### 📋 更新実行

#### 1. 重要コンポーネントの選択的更新
```bash
# セキュリティ修正・重要な改善のみ更新
pnpm dlx shadcn@canary add button --overwrite
pnpm dlx shadcn@canary add dialog --overwrite
```

#### 2. カスタマイゼーション再適用
- [ ] **button.tsx**: このドキュメントのCritical項目を参照
- [ ] **dialog.tsx**: このドキュメントのCritical項目を参照
- [ ] **Medium重要度コンポーネント**: 必要に応じて更新・再適用

### 📋 更新後確認

#### 1. 重要コンポーネントのテスト
```bash
# Critical カスタマイゼーションのテスト
pnpm test -- button.test.tsx
pnpm test -- dialog.test.tsx
```

#### 2. 手動動作確認
- [ ] **音声ボタン**: ボタンの表示・操作確認
- [ ] **フォーム**: 入力・送信機能確認
- [ ] **管理画面**: ダイアログ・メニュー確認
- [ ] **レスポンシブ**: モバイル・デスクトップ表示確認

#### 3. data-slot属性の抜き打ち確認
```bash
# 5-10個のコンポーネントでdata-slot属性を目視確認
# 開発者ツールで確認：
# - input要素: data-slot="input"
# - button要素: data-slot="button"
# - その他主要コンポーネント
```

### 📋 ロールバック手順

#### 問題発生時の対応
```bash
# バックアップからの復元
cp src/components/ui/button.backup.tsx src/components/ui/button.tsx
cp src/components/ui/dialog.backup.tsx src/components/ui/dialog.tsx

# テスト実行
pnpm test -- button.test.tsx
pnpm test -- dialog.test.tsx

# 動作確認
pnpm dev
```

## 🎯 プロジェクト固有の特徴

### 1. 涼花みなせテーマカラー
- **suzuka-500**: `hsl(340, 75%, 55%)` - メインカラー
- **suzuka-400**: `hsl(340, 75%, 65%)` - フォーカス状態
- **適用箇所**: tabs.tsx, switch.tsx

### 2. レスポンシブ設計
- **モバイルファースト**: タッチデバイス最適化
- **44px最小タップターゲット**: アクセシビリティ準拠
- **sm:ブレークポイント**: 640px以上での最適化

### 3. アクセシビリティ重視
- **WCAG 2.1 AA準拠**: 全コンポーネントで実装
- **aria-invalid対応**: フォーム検証との統合
- **focus-visible**: 詳細なフォーカス管理

### 4. パフォーマンス最適化
- **data-slot属性**: CSS-in-JS最適化
- **SVG統合**: アイコンとテキストの完全統合
- **Container Queries**: モダンCSS技術の活用

## 🚀 実装判断基準

### ✅ 必須実装（Critical）
- **複雑なカスタマイゼーション**: button.tsx, dialog.tsx
- **独自機能**: showCloseButton等の独自プロパティ
- **テスト必須**: 自動テストで品質保証

### 🔄 選択的実装（Medium）
- **プロジェクト固有**: suzuka-500カラー等
- **中程度の機能拡張**: size, variant プロパティ
- **手動確認**: 更新時の動作確認

### 📝 手動確認（Low）
- **軽微なカスタマイゼーション**: data-slot属性のみ
- **基本スタイリング**: 原版からの最小変更
- **目視確認**: 開発者ツールでの確認

## 📚 参考資料

### 関連ドキュメント
- [shadcn/ui 管理戦略](../../docs/SHADCN_UI_MANAGEMENT_STRATEGY.md)
- [UI テスト戦略](../../docs/UI_TESTING_STRATEGY.md)
- [開発環境・原則](../../docs/DEVELOPMENT.md)

### 外部リンク
- [shadcn/ui 公式ドキュメント](https://ui.shadcn.com/)
- [Radix UI ドキュメント](https://www.radix-ui.com/)
- [Tailwind CSS ドキュメント](https://tailwindcss.com/)

---

**最終更新**: 2025年7月15日  
**作成者**: Claude Code Assistant  
**レビュー**: プロジェクトチーム  
**次回更新予定**: 2026年1月（半年後）
# packages/ui リファクタリング計画

## 概要
packages/uiパッケージの包括的なリファクタリング計画書。YAGNI、KISS、DRY原則に基づいて、未使用コンポーネントの削除と構造の最適化を行う。

## 現状分析

### コンポーネント統計
| カテゴリ | 総数 | 使用中 | 未使用 | 使用率 |
|---------|------|--------|--------|--------|
| カスタムコンポーネント | 28 | 16 | 12 | 57.1% |
| shadcn/ui コンポーネント | 46 | 20 | 26 | 43.5% |
| ユーティリティ | 4 | 3 | 1 | 75.0% |
| **合計** | **78** | **39** | **39** | **50.0%** |

### 未使用コンポーネント詳細リスト

#### カスタムコンポーネント（削除対象）
1. `audio-button-performance-test.tsx` - パフォーマンステスト用
2. `audio-button-preview.tsx` - プレビュー機能（未実装）
3. `audio-button-skeleton.tsx` - スケルトン表示（未使用）
4. `date-range-filter.tsx` - 日付範囲フィルター（未実装）
5. `large-dataset-integration-test.tsx` - 統合テスト用
6. `not-implemented-overlay.tsx` - 未実装オーバーレイ
7. `numeric-range-filter.tsx` - 数値範囲フィルター（未実装）
8. `progressive-audio-button-list.tsx` - プログレッシブリスト（未使用）
9. `search-and-filter-panel.tsx` - 検索フィルターパネル（重複）
10. `search-filter-panel.tsx` - 検索フィルターパネル（重複）
11. `virtualized-audio-button-list.tsx` - 仮想化リスト（未使用）
12. `validation-message.tsx` - バリデーションメッセージ（未使用）

#### shadcn/ui コンポーネント（削除対象）
1. `accordion.tsx`
2. `aspect-ratio.tsx`
3. `avatar.tsx`
4. `breadcrumb.tsx`
5. `chart.tsx`
6. `collapsible.tsx`
7. `command.tsx`
8. `context-menu.tsx`
9. `drawer.tsx`
10. `form.tsx`
11. `hover-card.tsx`
12. `input-otp.tsx`
13. `menubar.tsx`
14. `navigation-menu.tsx`
15. `resizable.tsx`
16. `scroll-area.tsx`
17. `sidebar.tsx`
18. `slider.tsx`
19. `toggle-group.tsx`
20. `toggle.tsx`
21. `tooltip.tsx`

### 依存関係の問題

#### 要注意の依存関係
| コンポーネント | 依存先 | 対応方法 |
|---------------|--------|----------|
| `audio-button.tsx` | `tag-list.tsx` | tag-listを内部化または維持 |
| `advanced-filter-panel.tsx` | `date-range-filter.tsx`, `numeric-range-filter.tsx` | 統合または削除 |
| `configurable-list.tsx` | 複数のユーティリティ | 使用箇所確認後に判断 |

## フェーズ別実行計画

### フェーズ1: 安全な削除（リスク: 低）
**期間**: 1日
**対象**: 独立したshadcn/uiコンポーネント

```bash
# 実行コマンド
rm packages/ui/src/components/ui/accordion.tsx
rm packages/ui/src/components/ui/aspect-ratio.tsx
rm packages/ui/src/components/ui/avatar.tsx
rm packages/ui/src/components/ui/breadcrumb.tsx
rm packages/ui/src/components/ui/chart.tsx
rm packages/ui/src/components/ui/collapsible.tsx
rm packages/ui/src/components/ui/command.tsx
rm packages/ui/src/components/ui/context-menu.tsx
rm packages/ui/src/components/ui/drawer.tsx
rm packages/ui/src/components/ui/hover-card.tsx
rm packages/ui/src/components/ui/menubar.tsx
rm packages/ui/src/components/ui/resizable.tsx
rm packages/ui/src/components/ui/scroll-area.tsx
rm packages/ui/src/components/ui/sidebar.tsx
rm packages/ui/src/components/ui/slider.tsx
rm packages/ui/src/components/ui/toggle-group.tsx
rm packages/ui/src/components/ui/toggle.tsx
rm packages/ui/src/components/ui/tooltip.tsx
```

**検証方法**:
```bash
pnpm build
pnpm test
pnpm typecheck
```

### フェーズ2: 独立カスタムコンポーネントの削除（リスク: 中）
**期間**: 1日
**対象**: 依存関係のないカスタムコンポーネント

```bash
# パフォーマンステスト関連の削除
rm packages/ui/src/components/custom/audio-button-performance-test.tsx
rm packages/ui/src/components/custom/audio-button-performance-test.stories.tsx
rm packages/ui/src/components/custom/__tests__/audio-button-performance-test.test.tsx

rm packages/ui/src/components/custom/large-dataset-integration-test.tsx
rm packages/ui/src/components/custom/__tests__/large-dataset-integration-test.test.tsx

# 未使用のリスト実装
rm packages/ui/src/components/custom/progressive-audio-button-list.*
rm packages/ui/src/components/custom/virtualized-audio-button-list.*

# 未実装機能
rm packages/ui/src/components/custom/not-implemented-overlay.*
rm packages/ui/src/components/custom/validation-message.*
```

### フェーズ3: 依存関係の解決（リスク: 高）
**期間**: 2日
**対象**: 依存関係のあるコンポーネント

#### 3.1 TagList依存の解決
```typescript
// Option A: tag-listの機能をaudio-buttonに内部化
// Option B: tag-listを維持（使用されているため）
```

#### 3.2 フィルターコンポーネントの統合
```typescript
// advanced-filter-panelから不要な依存を削除
// date-range-filterとnumeric-range-filterの機能を統合
```

#### 3.3 重複コンポーネントの統合
- `search-and-filter-panel.tsx`と`search-filter-panel.tsx`を統合
- `simple-list.tsx`と`configurable-list.tsx`の統合検討

### フェーズ4: テストとStorybook更新（リスク: 低）
**期間**: 1日

```bash
# 削除されたコンポーネントのテストを削除
find packages/ui -name "*.test.tsx" -type f | xargs grep -l "削除したコンポーネント名" | xargs rm

# Storybookのストーリーを削除
find packages/ui -name "*.stories.tsx" -type f | xargs grep -l "削除したコンポーネント名" | xargs rm

# index.tsからのエクスポート削除
# packages/ui/src/components/custom/index.ts を更新
# packages/ui/src/components/ui/index.ts を更新
```

### フェーズ5: 最適化と文書更新（リスク: 低）
**期間**: 1日

- READMEの更新
- CHANGELOGの作成
- 移行ガイドの作成（もし必要なら）

## リスク評価と緩和策

### リスクマトリクス
| リスク | 確率 | 影響 | 緩和策 |
|--------|------|------|--------|
| 実は使用されているコンポーネントの削除 | 低 | 高 | 徹底的な使用箇所検索、段階的削除 |
| ビルドエラー | 中 | 中 | 各フェーズ後のビルド確認 |
| テストの失敗 | 中 | 低 | テストの事前更新 |
| Storybookの破損 | 高 | 低 | Storyの同時削除 |
| TypeScriptエラー | 中 | 中 | 型定義の確認と更新 |

### ロールバック計画
```bash
# 各フェーズ前にブランチ作成
git checkout -b refactor/ui-cleanup-phase-X

# 問題発生時
git checkout main
git branch -D refactor/ui-cleanup-phase-X
```

## 検証コマンド

### 使用状況の確認
```bash
# コンポーネントの使用箇所を検索
grep -r "from.*@suzumina.click/ui.*ComponentName" apps/web/

# 内部依存の確認
grep -r "from.*ComponentName" packages/ui/src/

# インポートの確認
rg "ComponentName" --type tsx --type ts
```

### ビルドとテストの検証
```bash
# 完全なビルドテスト
pnpm clean && pnpm install && pnpm build

# 型チェック
pnpm typecheck

# テスト実行
pnpm test

# Storybookビルド
cd packages/ui && pnpm build-storybook
```

## 成功指標

### 定量的指標
- [ ] コンポーネント数: 78 → 39（50%削減）
- [ ] バンドルサイズ: 10-15%削減
- [ ] TypeScriptコンパイル時間: 20%短縮
- [ ] テストファイル数: 30%削減

### 定性的指標
- [ ] YAGNI原則への準拠
- [ ] KISS原則への準拠
- [ ] DRY原則への準拠
- [ ] 保守性の向上
- [ ] 開発者体験の改善

## タイムライン

| フェーズ | 期間 | 開始予定 | 完了予定 |
|---------|------|----------|----------|
| フェーズ1 | 1日 | Day 1 | Day 1 |
| フェーズ2 | 1日 | Day 2 | Day 2 |
| フェーズ3 | 2日 | Day 3 | Day 4 |
| フェーズ4 | 1日 | Day 5 | Day 5 |
| フェーズ5 | 1日 | Day 6 | Day 6 |
| **合計** | **6日** | - | - |

## 次のステップ

1. この計画のレビューと承認
2. リファクタリングブランチの作成
3. フェーズ1の実行開始
4. 各フェーズ後の検証とレビュー
5. 完了後のドキュメント更新

## 備考

- 各フェーズは独立して実行可能
- 問題発生時は即座に停止し、原因を調査
- 本番環境への影響を最小限にするため、段階的なリリースを推奨

---
作成日: 2025-08-12
作成者: Claude Code
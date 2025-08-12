# ポストモーテム: UIコンポーネント誤削除インシデント

**日付**: 2025年8月12日  
**影響時間**: 約30分  
**影響範囲**: ビルド失敗、CI/CDパイプライン停止  
**重要度**: 中

## 概要
packages/uiのリファクタリング中に、実際に使用されているコンポーネント2つを誤って削除し、ビルドエラーを引き起こした。

## タイムライン

1. **20:33 JST** - リファクタリング計画に基づき、未使用コンポーネントの削除を開始
2. **20:39 JST** - フェーズ1,2完了、ローカルテストは成功
3. **20:45 JST** - PR #219を作成してプッシュ
4. **20:50 JST** - CIでビルドエラー発生を確認
5. **21:00 JST** - 問題を特定し、修正完了

## 根本原因分析

### 直接原因
`not-implemented-overlay`と`validation-message`コンポーネントが実際に使用されていたにも関わらず削除した。

### 根本原因

#### 1. 不完全な使用状況分析
```bash
# 実行した検索（packages/ui内のみ）
grep -r "NotImplementedOverlay" packages/ui/
grep -r "ValidationMessage" packages/ui/

# 実行すべきだった検索（プロジェクト全体）
grep -r "NotImplementedOverlay" apps/
grep -r "ValidationMessage" apps/
```

#### 2. 誤った前提
- **誤認識**: 「not-implemented」「validation-message」という名前から、開発中の一時的なコンポーネントと判断
- **実際**: プロダクション機能の一部として使用中

#### 3. 不十分な依存関係チェック
```typescript
// 見落とした使用箇所
// apps/web/src/app/works/[workId]/components/WorkDetail.tsx
import { NotImplementedOverlay } from "@suzumina.click/ui/components/custom/not-implemented-overlay";

// apps/web/src/components/audio/time-control-panel.tsx
import { ValidationMessage } from "@suzumina.click/ui/components/custom/validation-message";
```

#### 4. テスト範囲の問題
- packages/ui単体のテストは成功
- apps/webのビルドテストを実施せず

## 影響

### 定量的影響
- **ビルド失敗時間**: 30分
- **影響を受けたPR**: 1件（#219）
- **追加コミット**: 1件必要

### 定性的影響
- CI/CDパイプラインの一時停止
- 開発フローの中断

## 良かった点

1. **迅速な検知**: CIによる自動検知で本番環境への影響を防止
2. **明確なエラーメッセージ**: Next.jsのビルドエラーが具体的な欠落モジュールを指摘
3. **バージョン管理**: Gitによる変更履歴で迅速な復元が可能
4. **段階的アプローチ**: フェーズ分けにより影響範囲を限定

## 改善アクション

### 即時対応（実施済み）
- [x] 必要なコンポーネントの復元
- [x] ビルドエラーの修正
- [x] CIの再実行と確認

### 短期改善
- [ ] 削除前チェックリストの作成
- [ ] 使用状況確認スクリプトの作成

### 長期改善
- [ ] 依存関係可視化ツールの導入
- [ ] 統合テストの強化
- [ ] コンポーネント命名規則の見直し

## 学んだ教訓

### 1. 包括的な使用状況分析の重要性
```bash
# 推奨される分析手順
1. プロジェクト全体での検索
   rg "ComponentName" --type tsx --type ts

2. 動的インポートの確認
   rg "import.*ComponentName" apps/

3. ビルド依存関係の確認
   pnpm build --dry-run

4. 実際のビルドテスト
   pnpm build
```

### 2. コンポーネント名からの判断の危険性
- `not-implemented-overlay` → 実装済み機能の一部
- `validation-message` → 本番で使用中のバリデーション表示

### 3. 段階的削除の利点
- フェーズ分けにより、問題の特定と修正が容易
- 一度に全て削除していたら、問題の特定が困難だった

## 推奨事項

### 削除前チェックリスト
```markdown
- [ ] プロジェクト全体での使用状況を確認
- [ ] 動的インポートを確認
- [ ] エクスポートチェーンを追跡
- [ ] apps/でのビルドテスト実施
- [ ] Storybookでの依存関係確認
```

### 自動化ツールの提案
```typescript
// scripts/check-component-usage.ts
import { findUsages } from './utils';

export async function checkComponentUsage(componentName: string) {
  const usages = await findUsages(componentName, {
    searchPaths: ['apps/', 'packages/'],
    includeTests: false,
    includeDynamicImports: true
  });
  
  return {
    isUsed: usages.length > 0,
    locations: usages,
    recommendation: usages.length === 0 ? 'SAFE_TO_DELETE' : 'IN_USE'
  };
}
```

## 結論

このインシデントは、リファクタリング時の包括的な影響分析の重要性を示している。コンポーネント名からの推測に頼らず、実際の使用状況を確認することが重要。また、CIによる自動検知とGitによるバージョン管理により、影響を最小限に抑えることができた。

今後は、削除前チェックリストと自動化ツールの導入により、同様のインシデントを防止する。

---
**作成者**: Claude Code  
**レビュー状態**: ドラフト  
**次回アクション**: チーム内での共有と改善策の実装
# shadcn/ui コンポーネント管理戦略

## 📋 概要

このドキュメントは、suzumina.click プロジェクトにおける shadcn/ui コンポーネントの管理戦略を記述しています。個人開発・半年更新サイクルに最適化された最小限のアプローチを提供します。

## 🎯 目標

1. **カスタマイゼーション保護**: shadcn/ui 更新時のカスタマイズ部分の保護
2. **効率的な手動更新**: 半年サイクルに最適化された更新プロセス
3. **品質保証**: 重要カスタマイゼーションの継続的テスト
4. **メンテナンス性**: 個人開発に適した管理体制

## 📊 現状分析

### 現在の課題

| 問題 | 影響度 | 対策必要性 |
|------|--------|------------|
| **カスタマイズの上書き** | 高 | 最優先 |
| **更新の手動管理** | 中 | 重要 |
| **テスト対象の不明確** | 中 | 重要 |
| **カスタマイズの追跡困難** | 高 | 最優先 |

### カスタマイゼーション分析

- **軽微**: 45コンポーネント (`data-slot` 属性追加)
- **中程度**: 2コンポーネント (独自プロパティ追加)
- **大幅**: 1コンポーネント (button.tsx - レスポンシブ対応・アクセシビリティ強化)

#### 具体的なカスタマイゼーション例

```typescript
// 軽微なカスタマイズ (data-slot 属性)
function Input({ className, type, ...props }) {
  return (
    <input
      data-slot="input"  // ← 独自追加
      className={cn(/* カスタムスタイル */, className)}
      {...props}
    />
  );
}

// 中程度のカスタマイズ (独自プロパティ)
function DialogContent({ showCloseButton = true, ...props }) {
  // showCloseButton プロパティを独自追加
}

// 大幅なカスタマイズ (button.tsx)
const buttonVariants = cva(
  // レスポンシブ対応・アクセシビリティ強化
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      size: {
        default: "h-11 px-4 py-2 has-[>svg]:px-3 sm:h-9", // レスポンシブ対応
        // ...
      },
    },
  }
);
```

## 🏗️ 推奨戦略: 個人開発向け最小限管理

### **❌ 実装しない (オーバーエンジニアリング)**

以下のシステムは個人開発・半年更新サイクルには過度に複雑:

- 自動化スクリプト (4-Phase実装計画)
- 複雑なディレクトリ構造 (_base/, _custom/, _backup/)
- 自動テスト生成システム
- CI/CD統合

### **✅ 実装する (最小限アプローチ)**

#### 1. CUSTOMIZATIONS.md - カスタマイゼーション記録

```markdown
# shadcn/ui カスタマイゼーション記録

## 🚨 重要カスタマイゼーション (テスト必須)

### button.tsx - 大幅カスタマイズ
- **レスポンシブ対応**: `h-11 sm:h-9` (モバイル最適化)
- **アクセシビリティ**: `focus-visible:ring-[3px]`
- **テスト要件**: button.test.tsx で検証必須

### dialog.tsx - 独自プロパティ
- **showCloseButton**: 閉じるボタン表示制御
- **テスト要件**: dialog.test.tsx で検証必須

## 📝 軽微カスタマイゼーション (45コンポーネント)

### data-slot属性追加
- input, select, checkbox, radio-group, tabs, accordion...
- 各コンポーネントに `data-slot="componentName"` を追加

## 🔄 更新時チェックリスト

1. [ ] button.tsx のカスタマイゼーション保持確認
2. [ ] dialog.tsx のshowCloseButton プロパティ保持確認
3. [ ] data-slot属性の再適用
4. [ ] 重要コンポーネントのテスト実行
5. [ ] 手動動作確認
```

#### 2. 手動更新プロセス

```bash
# 1. 更新前の確認
pnpm dlx shadcn@canary diff --list

# 2. 重要コンポーネントのバックアップ
cp packages/ui/src/components/ui/button.tsx packages/ui/src/components/ui/button.backup.tsx
cp packages/ui/src/components/ui/dialog.tsx packages/ui/src/components/ui/dialog.backup.tsx

# 3. 選択的更新 (セキュリティ修正のみ)
pnpm dlx shadcn@canary add button --overwrite

# 4. カスタマイゼーション再適用
# (手動で CUSTOMIZATIONS.md を参照しながら再適用)

# 5. テスト実行
pnpm test -- button.test.tsx
pnpm test -- dialog.test.tsx

# 6. 動作確認
pnpm dev
```

#### 3. 簡易更新チェッカー

```bash
#!/bin/bash
# scripts/check-shadcn-updates.sh

echo "🔍 Checking shadcn/ui updates..."
echo "📋 Current customizations:"
echo "- button.tsx: レスポンシブ + アクセシビリティ"
echo "- dialog.tsx: showCloseButton prop"
echo "- 45 components: data-slot attribute"
echo ""
echo "📦 Available updates:"
pnpm dlx shadcn@canary diff --list

echo ""
echo "⚠️  重要: 更新前に CUSTOMIZATIONS.md を確認し、手動でカスタマイゼーションを再適用してください"
```

## 📁 実装計画 (個人開発向け)

### **推奨実装 (5.5時間の初期投資)**

#### 1. CUSTOMIZATIONS.md 作成 (2時間)
```markdown
# 全48カスタマイゼーションの記録
- 重要度分類 (Critical/Medium/Low)
- 具体的なカスタマイゼーション内容
- 更新時の注意点・手順
```

#### 2. 更新チェックリスト作成 (1.5時間)
```markdown
# 半年更新用チェックリスト
- 更新前確認事項
- バックアップ手順
- カスタマイゼーション再適用手順
- テスト・動作確認手順
- ロールバック手順
```

#### 3. 重要コンポーネントのテスト (2時間)
```typescript
// button.test.tsx - 大幅カスタマイゼーション
describe('Button Custom Features', () => {
  test('responsive sizing', () => {
    // レスポンシブ対応テスト
  });
  test('accessibility enhancements', () => {
    // アクセシビリティテスト
  });
});

// dialog.test.tsx - 独自プロパティ
describe('Dialog Custom Props', () => {
  test('showCloseButton functionality', () => {
    // showCloseButton テスト
  });
});
```

### **半年更新プロセス (2.5時間/回)**

#### 1. 更新前確認 (1時間)
- shadcn/ui changelog 確認
- breaking changes 調査
- セキュリティ修正の特定

#### 2. 選択的更新 (1時間)
- 重要修正のみ適用
- カスタマイゼーション再適用
- データ-slot属性の再追加

#### 3. テスト・検証 (30分)
- button.test.tsx, dialog.test.tsx 実行
- 手動動作確認
- 本番反映

### **年間コスト見積もり**
- **初期投資**: 5.5時間 (一回のみ)
- **運用コスト**: 5時間/年 (2.5時間 × 2回)
- **総コスト**: 年間10.5時間

## 🧪 テスト戦略 (最小限)

### **✅ 実装するテスト (2コンポーネントのみ)**

#### 1. button.test.tsx - 大幅カスタマイズ
```typescript
describe('Button - Custom Features', () => {
  test('responsive sizing customization', () => {
    render(<Button size="default">Test</Button>);
    expect(screen.getByRole('button')).toHaveClass('h-11 sm:h-9');
  });
  
  test('accessibility enhancements', () => {
    render(<Button>Test</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('data-slot', 'button');
  });
});
```

#### 2. dialog.test.tsx - 独自プロパティ
```typescript
describe('Dialog - Custom Props', () => {
  test('showCloseButton functionality', () => {
    render(<DialogContent showCloseButton={false}>Content</DialogContent>);
    expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument();
  });
});
```

### **❌ 実装しないテスト**

- **45コンポーネントのdata-slot属性**: 軽微カスタマイゼーションのため手動確認で十分
- **自動テスト生成**: 個人開発には過度に複雑
- **包括的テストスイート**: 費用対効果が低い

## 📋 実装チェックリスト (最小限)

### **必須タスク**
- [ ] CUSTOMIZATIONS.md 作成 (2時間)
- [ ] 更新チェックリスト作成 (1.5時間)
- [ ] button.test.tsx 実装 (1時間)
- [ ] dialog.test.tsx 実装 (1時間)
- [ ] 簡易更新チェッカー作成 (30分)

### **オプション (時間がある場合)**
- [ ] 頻繁使用コンポーネント (input, select) の基本テスト
- [ ] 更新プロセスの自動化スクリプト

## 🎯 期待される効果 (個人開発向け)

### **最小限実装での効果**
1. **カスタマイゼーション保護**: 重要な2コンポーネントの保護
2. **効率的更新**: 明確な手順による確実な更新
3. **品質保証**: 最重要機能のテストによる品質維持

### **コスト削減効果**
- **開発時間**: 6週間 → 5.5時間 (95%削減)
- **保守コスト**: 複雑システム → 年間5時間の単純プロセス
- **学習コスト**: 最小限のドキュメント量

## 📚 関連ドキュメント

- [shadcn/ui 公式ドキュメント](https://ui.shadcn.com/)
- [UI テスト戦略](./UI_TESTING_STRATEGY.md)
- [開発環境・原則](./DEVELOPMENT.md)
- [UI コンポーネントライブラリ](../packages/ui/README.md)

## 🚀 実装判断理由

### **個人開発に適した戦略**
- **半年更新サイクル**: 頻繁な更新が不要なため自動化の価値が低い
- **48カスタマイゼーション**: 重要な2コンポーネントのみテスト対象
- **運用コスト**: 年間10.5時間は個人開発に適正

### **企業開発での考慮事項**
- **頻繁更新**: 週次更新なら自動化システムが有効
- **チーム規模**: 3名以上なら包括的テストが必要
- **品質要件**: エンタープライズなら全コンポーネントテストが必要

---

**最終更新**: 2025年7月15日  
**バージョン**: v2.0.0 (個人開発最適化版)  
**作成者**: Claude Code Assistant  
**適用範囲**: 個人開発・半年更新サイクル  
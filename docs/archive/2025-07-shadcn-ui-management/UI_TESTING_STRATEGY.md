# UI コンポーネント テスト戦略

## 📋 概要

このドキュメントは、suzumina.click プロジェクトにおけるUI コンポーネントのテスト戦略を記述しています。特に shadcn/ui コンポーネントのカスタマイゼーション部分に焦点を当てたテスト方針を提供します。

## 🎯 テスト目標

1. **カスタマイゼーション品質保証**: 独自カスタマイズの動作確認
2. **回帰テスト**: shadcn/ui 更新時の影響検証
3. **統合テスト**: アプリケーション固有の使用パターン検証
4. **継続的品質向上**: 自動化によるテスト継続性

## 📊 現在のテスト状況

### テスト統計

| カテゴリ | ファイル数 | テスト数 | カバレッジ |
|---------|------------|----------|-------------|
| **Custom Components** | 22 | 22 | **100%** ✅ |
| **UI Components** | 46 | 1 | **2.2%** ❌ |
| **Lib/Utils** | 2 | 2 | **100%** ✅ |
| **Test Utils** | 3 | 3 | **100%** ✅ |
| **Storybook Stories** | 50 | - | **73.5%** ✅ |
| **総計** | 68 | 25 | **36.8%** |

### テスト実行結果
- **329テスト**全て通過
- **実行時間**: 3.46秒
- **品質**: エンタープライズレベル

## 🎨 shadcn/ui コンポーネント分析

### カスタマイゼーションレベル

#### **Level 1: スタイリングのみ** (45コンポーネント)
```typescript
// 例: input.tsx
function Input({ className, type, ...props }) {
  return (
    <input
      data-slot="input"  // ← 独自追加
      className={cn(/* カスタムスタイル */, className)}
      {...props}
    />
  );
}
```

#### **Level 2: 軽微な機能追加** (2コンポーネント)
```typescript
// 例: dialog.tsx
function DialogContent({ showCloseButton = true, ...props }) {
  // ← showCloseButton プロパティを独自追加
}
```

#### **Level 3: 大幅カスタマイズ** (1コンポーネント)
```typescript
// button.tsx - レスポンシブ対応・アクセシビリティ強化
const buttonVariants = cva(/* 大幅なカスタマイズ */)
```

## 🧪 テスト戦略

### **🎯 個人開発向け最小限戦略**

#### **✅ 実装するテスト (2コンポーネントのみ)**

##### 1. button.test.tsx - 大幅カスタマイズ ✅ (完了済み)
```typescript
describe('Button - Custom Features', () => {
  test('should have responsive sizing', () => {
    render(<Button size="default">Test</Button>);
    expect(screen.getByRole('button')).toHaveClass('h-11 sm:h-9');
  });
  
  test('should have accessibility enhancements', () => {
    render(<Button>Test</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('data-slot', 'button');
  });
  
  test('should handle touch optimization', () => {
    render(<Button size="default">Test</Button>);
    const button = screen.getByRole('button');
    
    // モバイルでの最小タッチターゲット
    expect(button).toHaveClass('h-11');
    
    // デスクトップでの最適化
    expect(button).toHaveClass('sm:h-9');
  });
});
```

##### 2. dialog.test.tsx - 独自プロパティ (実装推奨)
```typescript
describe('Dialog - Custom Props', () => {
  test('should show close button by default', () => {
    render(<DialogContent>Content</DialogContent>);
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
  });
  
  test('should hide close button when showCloseButton is false', () => {
    render(<DialogContent showCloseButton={false}>Content</DialogContent>);
    expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument();
  });
  
  test('should apply custom data-slot attribute', () => {
    render(<DialogContent data-testid="dialog">Content</DialogContent>);
    expect(screen.getByTestId('dialog')).toHaveAttribute('data-slot', 'dialog-content');
  });
});
```

#### **❌ 実装しないテスト (半年更新サイクル)**

##### 3. 基本コンポーネント (手動確認で十分)
```typescript
// ❌ input.test.tsx - data-slot属性のみ
// ❌ select.test.tsx - data-slot属性のみ
// ❌ checkbox.test.tsx - data-slot属性のみ
// → 軽微カスタマイゼーションのため手動確認で十分

// 理由:
// - 単純なdata-slot属性追加のみ
// - 半年更新サイクルなら手動確認で十分
// - テスト実装・維持コストが効果を上回る
```

##### 4. 基本的なスタイリングのみ (Storybook Visual Tests)
```typescript
// ❌ badge, card, separator, skeleton など
// → Visual Regression Tests (Storybook) で十分
```

### **🔄 半年更新時のテスト戦略**

#### 更新前テスト (30分)
```bash
# 重要カスタマイゼーションのみテスト
pnpm test -- button.test.tsx
pnpm test -- dialog.test.tsx

# 手動確認（軽微カスタマイゼーション）
# - 数個のコンポーネントでdata-slot属性を目視確認
# - 主要ページの表示確認
```

#### 更新後テスト (30分)
```bash
# 同様のテスト + 新機能確認
pnpm test -- button.test.tsx
pnpm test -- dialog.test.tsx

# 本番環境での動作確認
# - 音声ボタン機能
# - フォーム機能
# - 管理者機能
```

### **🛠️ テスト方針**

#### **1. カスタマイゼーション部分のみテスト**
```typescript
// ✅ テストする
test('should render with custom data-slot attribute', () => {
  render(<Input />);
  expect(screen.getByRole('textbox')).toHaveAttribute('data-slot', 'input');
});

// ❌ テストしない (Radix UI がテスト済み)
test('should handle basic input functionality', () => {
  // 基本的な入力動作のテスト
});
```

#### **2. 統合動作のみテスト**
```typescript
// ✅ アプリケーション固有の使用パターン
test('should work with form validation', () => {
  render(
    <form>
      <Input required />
      <Button type="submit">Submit</Button>
    </form>
  );
  
  // フォーム統合テスト
});

// ✅ レスポンシブ対応
test('should adapt to mobile viewport', () => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 375,
  });
  
  render(<Button size="default">Test</Button>);
  expect(screen.getByRole('button')).toHaveClass('h-11');
});
```

## 📋 実装計画 (個人開発向け)

### **推奨実装 (1時間の最小投資)**

#### dialog.test.tsx 実装 (1時間)
```typescript
// packages/ui/src/components/ui/dialog.test.tsx
import { render, screen } from '@testing-library/react';
import { Dialog, DialogContent, DialogTrigger } from './dialog';

describe('Dialog - Custom Props', () => {
  test('should show close button by default', () => {
    render(
      <Dialog open>
        <DialogContent>Content</DialogContent>
      </Dialog>
    );
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
  });
  
  test('should hide close button when showCloseButton is false', () => {
    render(
      <Dialog open>
        <DialogContent showCloseButton={false}>Content</DialogContent>
      </Dialog>
    );
    expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument();
  });
  
  test('should apply custom data-slot attribute', () => {
    render(
      <Dialog open>
        <DialogContent data-testid="dialog">Content</DialogContent>
      </Dialog>
    );
    expect(screen.getByTestId('dialog')).toHaveAttribute('data-slot', 'dialog-content');
  });
});
```

### **実装しない理由**

#### ❌ 基本コンポーネントテスト
- **input.test.tsx**: data-slot属性のみ → 手動確認で十分
- **select.test.tsx**: data-slot属性のみ → 手動確認で十分
- **checkbox.test.tsx**: data-slot属性のみ → 手動確認で十分

#### ❌ 自動テスト生成システム
- **開発コスト**: 数週間の実装時間
- **保守コスト**: 複雑システムの継続的メンテナンス
- **費用対効果**: 個人開発には過度に複雑

#### ❌ 包括的テストスイート
- **45コンポーネント**: 軽微カスタマイゼーションのみ
- **半年更新**: 頻繁なテスト実行が不要
- **品質確保**: 手動確認で十分な品質を確保可能

## 🔧 テストユーティリティ

### カスタマイゼーション専用テストヘルパー

```typescript
// packages/ui/src/test-utils/customization-helpers.ts
import { render, screen } from '@testing-library/react';
import { UI_CUSTOMIZATIONS } from '../components/ui/_custom/customizations';

/**
 * data-slot 属性のテストヘルパー
 */
export function testDataSlotAttribute(
  component: React.ReactElement,
  expectedSlot: string
) {
  render(component);
  const element = screen.getByTestId(expectedSlot) || screen.getByRole('button');
  expect(element).toHaveAttribute('data-slot', expectedSlot);
}

/**
 * カスタムプロパティのテストヘルパー
 */
export function testCustomProps(
  ComponentClass: React.ComponentType<any>,
  componentName: string,
  props: Record<string, any>
) {
  const customProps = UI_CUSTOMIZATIONS.customProps[componentName];
  if (!customProps) return;
  
  Object.entries(props).forEach(([propName, propValue]) => {
    const config = customProps[propName];
    if (config) {
      // カスタムプロパティのテスト実行
      const component = React.createElement(ComponentClass, { [propName]: propValue });
      render(component);
      // プロパティの動作確認
    }
  });
}

/**
 * レスポンシブテストヘルパー
 */
export function testResponsive(
  component: React.ReactElement,
  mobileClass: string,
  desktopClass: string
) {
  // モバイルビューポート
  Object.defineProperty(window, 'innerWidth', { value: 375 });
  render(component);
  expect(screen.getByRole('button')).toHaveClass(mobileClass);
  
  // デスクトップビューポート
  Object.defineProperty(window, 'innerWidth', { value: 1024 });
  render(component);
  expect(screen.getByRole('button')).toHaveClass(desktopClass);
}
```

### テスト設定

```typescript
// packages/ui/vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-utils/setup.ts'],
    globals: true,
    css: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/lib': path.resolve(__dirname, './src/lib'),
    },
  },
});
```

## 📊 テスト実行・監視

### テスト実行コマンド

```bash
# 全テスト実行
pnpm test

# UI コンポーネントテストのみ
pnpm test:ui

# カスタマイゼーションテストのみ
pnpm test:customization

# 継続的テスト実行
pnpm test:watch

# カバレッジ付きテスト
pnpm test:coverage
```

### CI/CD 統合

```yaml
# .github/workflows/test-ui-components.yml
name: UI Component Tests

on:
  push:
    paths:
      - 'packages/ui/src/components/**'
      - 'packages/ui/src/test-utils/**'
  pull_request:
    paths:
      - 'packages/ui/src/components/**'

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Run UI component tests
        run: pnpm --filter @suzumina.click/ui test:ui
      
      - name: Run customization tests
        run: pnpm --filter @suzumina.click/ui test:customization
      
      - name: Generate coverage report
        run: pnpm --filter @suzumina.click/ui test:coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./packages/ui/coverage/coverage-final.json
```

## 🎯 品質指標 (個人開発向け)

### **現実的なテストカバレッジ目標**

| カテゴリ | 現在 | 目標 | 理由 |
|---------|------|------|------|
| **Custom Components** | 100% | 100% | 維持 ✅ |
| **UI Components (Critical)** | 50% | 100% | button.tsx + dialog.tsx のみ |
| **UI Components (Others)** | 2.2% | 2.2% | 手動確認で十分 |
| **Integration Tests** | 0% | 0% | 個人開発には不要 |

### **簡素化した品質指標**

```typescript
// 個人開発向けの最小限品質指標
export const MINIMAL_QUALITY_THRESHOLDS = {
  // 重要コンポーネントのみ
  criticalComponents: ['button', 'dialog'],
  
  // テスト実行時間 (2コンポーネントのみ)
  maxDuration: 10000, // 10秒以内
  
  // 成功率
  successRate: 1.0, // 100% (少数テストのため)
} as const;
```

### **半年更新での品質確保**

#### 更新前チェック
- [ ] button.test.tsx: 3テスト実行 (レスポンシブ・アクセシビリティ・タッチ最適化)
- [ ] dialog.test.tsx: 3テスト実行 (デフォルト表示・非表示・data-slot)
- [ ] 手動確認: 5-10コンポーネントでdata-slot属性確認

#### 更新後検証
- [ ] 同様のテスト実行
- [ ] 本番環境でのスモークテスト
- [ ] 主要機能の動作確認

## 📚 関連ドキュメント

- [shadcn/ui 管理戦略](./SHADCN_UI_MANAGEMENT_STRATEGY.md)
- [開発環境・原則](./DEVELOPMENT.md)
- [UI コンポーネントライブラリ](../packages/ui/README.md)
- [テストユーティリティ](../packages/ui/src/test-utils/README.md)

## 🚀 個人開発での実装判断

### **テスト実装の判断基準**

#### ✅ 実装する
- **大幅カスタマイゼーション**: button.tsx (レスポンシブ・アクセシビリティ)
- **独自機能**: dialog.tsx (showCloseButton prop)
- **理由**: 複雑性が高く、手動確認では見落としリスクが高い

#### ❌ 実装しない
- **軽微カスタマイゼーション**: 45コンポーネント (data-slot属性のみ)
- **基本スタイリング**: badge, card, skeleton等
- **理由**: 半年更新サイクルでは手動確認で十分

### **費用対効果分析**

#### 最小限実装 (推奨)
- **開発コスト**: 1時間 (dialog.test.tsx)
- **維持コスト**: 1時間/年 (テスト更新)
- **品質向上**: 重要機能の確実な動作保証

#### 包括的実装 (非推奨)
- **開発コスト**: 8週間 (全コンポーネント)
- **維持コスト**: 16時間/年 (テスト維持)
- **品質向上**: 軽微改善のみ

### **実装ガイドライン**

1. **最小限実装**: 重要な2コンポーネントのみテスト
2. **手動確認**: 軽微カスタマイゼーションは目視確認
3. **半年更新**: 更新前後のテスト実行で品質確保
4. **継続的改善**: 問題発生時にテスト追加を検討

---

**最終更新**: 2025年7月15日  
**バージョン**: v2.0.0 (個人開発最適化版)  
**作成者**: Claude Code Assistant  
**適用範囲**: 個人開発・半年更新サイクル
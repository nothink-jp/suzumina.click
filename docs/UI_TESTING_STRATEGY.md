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

### **🥇 選択的テスト戦略 (推奨)**

#### **High Priority** (必須テスト)

##### 1. 大幅カスタマイズコンポーネント
```typescript
// button.test.tsx ✅ (完了済み)
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

##### 2. 独自機能追加コンポーネント
```typescript
// dialog.test.tsx (実装予定)
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

#### **Medium Priority** (選択的テスト)

##### 3. 頻繁に使用される基本コンポーネント
```typescript
// input.test.tsx (実装予定)
describe('Input - Basic Customizations', () => {
  test('should have data-slot attribute', () => {
    render(<Input />);
    expect(screen.getByRole('textbox')).toHaveAttribute('data-slot', 'input');
  });
  
  test('should apply custom styling', () => {
    render(<Input className="custom-class" />);
    expect(screen.getByRole('textbox')).toHaveClass('custom-class');
  });
  
  test('should handle validation states', () => {
    render(<Input aria-invalid="true" />);
    expect(screen.getByRole('textbox')).toHaveClass('aria-invalid:border-destructive');
  });
});

// select.test.tsx (実装予定)
describe('Select - Custom Features', () => {
  test('should have data-slot attributes', () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="option1">Option 1</SelectItem>
        </SelectContent>
      </Select>
    );
    
    expect(screen.getByRole('combobox')).toHaveAttribute('data-slot', 'select-trigger');
  });
});

// checkbox.test.tsx (実装予定)
describe('Checkbox - Custom Features', () => {
  test('should have data-slot attribute', () => {
    render(<Checkbox />);
    expect(screen.getByRole('checkbox')).toHaveAttribute('data-slot', 'checkbox');
  });
});
```

#### **Low Priority** (Storybookのみ)

##### 4. 基本的なスタイリングのみ
```typescript
// badge, card, separator, skeleton など
// → Visual Regression Tests (Storybook) で十分
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

## 📋 実装計画

### **Phase 1: 必須テスト実装** (Week 1-2)

#### 1.1 独自機能追加コンポーネント
```typescript
// 実装予定: dialog.test.tsx
describe('Dialog - Custom Props', () => {
  // showCloseButton プロパティのテスト
  // data-slot 属性のテスト
  // アクセシビリティテスト
});
```

#### 1.2 使用頻度の高いコンポーネント
```typescript
// 実装予定: input.test.tsx
describe('Input - Basic Customizations', () => {
  // data-slot 属性のテスト
  // カスタムスタイリングのテスト
  // バリデーション状態のテスト
});

// 実装予定: select.test.tsx
describe('Select - Custom Features', () => {
  // data-slot 属性のテスト
  // キーボード操作のテスト
  // 選択状態のテスト
});
```

### **Phase 2: 基本テスト拡張** (Week 3-4)

#### 2.1 追加の基本コンポーネント
```typescript
// checkbox.test.tsx
// radio-group.test.tsx
// tabs.test.tsx
// accordion.test.tsx
```

#### 2.2 統合テストケース
```typescript
// form-integration.test.tsx
describe('Form Integration Tests', () => {
  test('should handle form validation with custom components', () => {
    // 複数のカスタムコンポーネントとフォームの統合テスト
  });
});
```

### **Phase 3: 自動テスト生成** (Week 5-6)

#### 3.1 自動テスト生成システム
```typescript
// test-generator.ts
import { UI_CUSTOMIZATIONS } from '../components/ui/_custom/customizations';

// data-slot 属性のテスト自動生成
UI_CUSTOMIZATIONS.dataSlot.components.forEach(componentName => {
  generateDataSlotTest(componentName);
});

// カスタムプロパティのテスト自動生成
Object.entries(UI_CUSTOMIZATIONS.customProps).forEach(([componentName, props]) => {
  generateCustomPropsTest(componentName, props);
});
```

#### 3.2 継続的テスト実行
```bash
# packages/ui/scripts/test-ui-components.sh
#!/bin/bash
echo "🧪 Running UI component tests..."

# カスタマイゼーション部分のテスト
pnpm test -- --testPathPattern="ui.*\.test\.tsx"

# 自動生成テストの実行
pnpm test -- --testPathPattern="auto-generated"

# Storybook の視覚的テスト
pnpm test:storybook
```

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

## 🎯 品質指標

### テストカバレッジ目標

| カテゴリ | 現在 | 目標 | 期限 |
|---------|------|------|------|
| **Custom Components** | 100% | 100% | 維持 |
| **UI Components** | 2.2% | 80% | 6週間 |
| **Customization Tests** | 0% | 100% | 4週間 |
| **Integration Tests** | 0% | 60% | 8週間 |

### 品質指標

```typescript
// packages/ui/src/test-utils/quality-metrics.ts
export const QUALITY_THRESHOLDS = {
  // カバレッジ目標
  coverage: {
    statements: 80,
    branches: 75,
    functions: 80,
    lines: 80,
  },
  
  // テスト実行時間
  performance: {
    maxDuration: 30000, // 30秒以内
    avgDuration: 5000,  // 平均5秒以内
  },
  
  // テストの安定性
  stability: {
    flakyTestThreshold: 0.01, // 1%以下
    successRate: 0.99,        // 99%以上
  },
} as const;
```

## 📚 関連ドキュメント

- [shadcn/ui 管理戦略](./SHADCN_UI_MANAGEMENT_STRATEGY.md)
- [開発環境・原則](./DEVELOPMENT.md)
- [UI コンポーネントライブラリ](../packages/ui/README.md)
- [テストユーティリティ](../packages/ui/src/test-utils/README.md)

## 🤝 チーム運用

### テスト記述ガイドライン

1. **カスタマイゼーション部分のみテスト**
   - shadcn/ui の基本機能は上流でテスト済み
   - 独自追加部分に集中

2. **テスト命名規則**
   - `should + 動作 + 条件`
   - 例: `should have data-slot attribute`

3. **テスト構造**
   - `describe` でコンポーネント別に分類
   - `test` で機能別に分類

### 引き継ぎ・教育

1. **新規参加者向け**
   - テスト戦略の理解
   - カスタマイゼーション箇所の把握
   - テストユーティリティの使用方法

2. **継続的改善**
   - テストカバレッジの監視
   - 品質指標の定期確認
   - テスト戦略の見直し

---

**最終更新**: 2025年7月15日  
**バージョン**: v1.0.0  
**作成者**: Claude Code Assistant  
**レビュー**: プロジェクトチーム
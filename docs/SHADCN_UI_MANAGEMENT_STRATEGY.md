# shadcn/ui コンポーネント管理戦略

## 📋 概要

このドキュメントは、suzumina.click プロジェクトにおける shadcn/ui コンポーネントの管理戦略と実装計画を記述しています。現在の手動更新プロセスを自動化し、カスタマイゼーションを体系的に管理するためのベストプラクティスを提供します。

## 🎯 目標

1. **カスタマイゼーション保護**: shadcn/ui 更新時のカスタマイズ部分の保護
2. **自動更新**: 手動更新プロセスの自動化
3. **品質保証**: カスタマイゼーション部分の継続的テスト
4. **メンテナンス性**: 体系的な管理によるメンテナンス性向上

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

## 🏗️ 推奨戦略: Layered Customization Management

### ディレクトリ構造

```
packages/ui/src/components/
├── ui/                     # shadcn/ui ベースコンポーネント
│   ├── _base/             # 📦 原版 shadcn/ui コンポーネント
│   ├── _custom/           # 🎨 カスタマイズ管理システム
│   ├── _backup/           # 💾 更新前バックアップ
│   └── *.tsx              # 🔄 統合されたコンポーネント
├── custom/                # 🚀 アプリケーション特化コンポーネント
└── design-tokens/         # 🎭 デザインシステム
```

### カスタマイゼーション管理システム

#### 1. カスタマイゼーション定義

```typescript
// packages/ui/src/components/ui/_custom/customizations.ts
export const UI_CUSTOMIZATIONS = {
  // 軽微なカスタマイズ (data-slot)
  dataSlot: {
    enabled: true,
    components: [
      'button', 'input', 'card', 'dialog', 'select', 'checkbox',
      'radio-group', 'tabs', 'accordion', 'alert', 'badge',
      // ... 45 コンポーネント
    ]
  },
  
  // 独自プロパティ追加
  customProps: {
    dialog: {
      showCloseButton: { 
        type: 'boolean', 
        default: true,
        description: 'ダイアログの閉じるボタンを表示するかどうか'
      }
    }
  },
  
  // 大幅カスタマイズ
  majorCustomizations: {
    button: {
      features: ['responsive', 'accessibility', 'variants'],
      testRequired: true,
      description: 'レスポンシブ対応とアクセシビリティ強化'
    }
  }
} as const;
```

#### 2. カスタマイゼーション適用システム

```typescript
// packages/ui/src/components/ui/_custom/apply-customizations.ts
import { UI_CUSTOMIZATIONS } from './customizations';

export function applyDataSlot<T extends React.ComponentProps<any>>(
  component: string,
  props: T
): T {
  if (UI_CUSTOMIZATIONS.dataSlot.enabled && 
      UI_CUSTOMIZATIONS.dataSlot.components.includes(component)) {
    return {
      ...props,
      'data-slot': component
    };
  }
  return props;
}

export function createCustomComponent<T>(
  baseComponent: React.ComponentType<T>,
  componentName: string,
  customizations?: object
) {
  return React.forwardRef<any, T>((props, ref) => {
    const customizedProps = applyDataSlot(componentName, props);
    return React.createElement(baseComponent, { ...customizedProps, ref });
  });
}
```

#### 3. 自動テスト生成

```typescript
// packages/ui/src/components/ui/_custom/test-customizations.ts
import { UI_CUSTOMIZATIONS } from './customizations';

export function generateCustomizationTests(componentName: string) {
  const tests = [];
  
  // data-slot テスト
  if (UI_CUSTOMIZATIONS.dataSlot.components.includes(componentName)) {
    tests.push({
      name: `should have data-slot="${componentName}" attribute`,
      test: (component: any) => {
        expect(component).toHaveAttribute('data-slot', componentName);
      }
    });
  }
  
  // カスタムプロパティテスト
  const customProps = UI_CUSTOMIZATIONS.customProps[componentName];
  if (customProps) {
    Object.entries(customProps).forEach(([prop, config]) => {
      tests.push({
        name: `should handle custom prop ${prop}`,
        test: (component: any) => {
          // カスタムプロパティのテスト実装
        }
      });
    });
  }
  
  return tests;
}
```

## 🔄 更新管理プロセス

### 1. 更新前チェック

```bash
#!/bin/bash
# packages/ui/scripts/update-check.sh

echo "🔍 Checking for shadcn/ui updates..."

# 現在のコンポーネントリスト生成
find src/components/ui -name "*.tsx" \
  -not -path "*/stories/*" \
  -not -path "*/test/*" \
  -not -path "*/_*/*" > current-components.txt

# 更新可能なコンポーネントチェック
pnpm dlx shadcn@canary diff --list > available-updates.txt

# カスタマイズ衝突チェック
node scripts/check-customization-conflicts.js
```

### 2. 安全な更新プロセス

```bash
#!/bin/bash
# packages/ui/scripts/safe-update.sh

COMPONENT=$1

echo "🔄 Updating component: $COMPONENT"

# 1. 現在のコンポーネントをバックアップ
cp "src/components/ui/$COMPONENT.tsx" "src/components/ui/_backup/$COMPONENT.tsx"

# 2. 原版を _base にダウンロード
pnpm dlx shadcn@canary add $COMPONENT --output "src/components/ui/_base/"

# 3. カスタマイズ差分を適用
node scripts/apply-customizations.js $COMPONENT

# 4. テスト実行
pnpm test -- --testNamePattern="$COMPONENT"

# 5. 成功時のみ本番に反映
if [ $? -eq 0 ]; then
  echo "✅ Update successful for $COMPONENT"
else
  echo "❌ Update failed for $COMPONENT, rolling back..."
  cp "src/components/ui/_backup/$COMPONENT.tsx" "src/components/ui/$COMPONENT.tsx"
fi
```

### 3. 一括更新スクリプト

```bash
#!/bin/bash
# packages/ui/scripts/update-all-components.sh

echo "🚀 Starting bulk update of shadcn/ui components..."

# 更新対象コンポーネントリスト
COMPONENTS=(
  "button" "input" "select" "checkbox" "radio-group"
  "dialog" "card" "badge" "alert" "tabs" "accordion"
  # ... 他のコンポーネント
)

# 各コンポーネントを安全に更新
for component in "${COMPONENTS[@]}"; do
  echo "📦 Updating $component..."
  ./scripts/safe-update.sh $component
  
  if [ $? -ne 0 ]; then
    echo "❌ Failed to update $component, stopping..."
    exit 1
  fi
done

echo "✅ All components updated successfully!"
```

## 📁 実装計画

### Phase 1: 基盤構築 (Week 1-2)

#### 1.1 ディレクトリ構造準備
```bash
# 必要なディレクトリを作成
mkdir -p packages/ui/src/components/ui/_base
mkdir -p packages/ui/src/components/ui/_custom
mkdir -p packages/ui/src/components/ui/_backup
mkdir -p packages/ui/scripts
```

#### 1.2 カスタマイゼーション管理システム実装
- [ ] `customizations.ts` - カスタマイゼーション定義
- [ ] `apply-customizations.ts` - カスタマイゼーション適用
- [ ] `test-customizations.ts` - 自動テスト生成

#### 1.3 基本スクリプト作成
- [ ] `update-check.sh` - 更新チェック
- [ ] `safe-update.sh` - 安全な更新
- [ ] `apply-customizations.js` - カスタマイゼーション適用

### Phase 2: 既存コンポーネント移行 (Week 3-4)

#### 2.1 原版保存
```bash
# 現在の shadcn/ui コンポーネントの原版をダウンロード
for component in button input select dialog card badge alert; do
  pnpm dlx shadcn@canary add $component --output "src/components/ui/_base/$component.tsx"
done
```

#### 2.2 カスタマイゼーション抽出
```bash
# 現在のカスタマイズを分析し、_custom に抽出
node scripts/extract-customizations.js
```

### Phase 3: テスト統合 (Week 5)

#### 3.1 自動テスト生成
```typescript
// packages/ui/src/components/ui/_custom/auto-tests.ts
import { UI_CUSTOMIZATIONS } from './customizations';

// 各コンポーネントのカスタマイゼーションテストを自動生成
Object.keys(UI_CUSTOMIZATIONS.dataSlot.components).forEach(componentName => {
  const tests = generateCustomizationTests(componentName);
  // テストファイル生成
});
```

#### 3.2 継続的テスト設定
```bash
# packages/ui/scripts/test-customizations.sh
#!/bin/bash
echo "🧪 Testing customizations..."
pnpm test -- --testPathPattern="customization"
```

### Phase 4: 自動更新システム (Week 6)

#### 4.1 CI/CD 統合
```yaml
# .github/workflows/update-shadcn.yml
name: Update shadcn/ui Components
on:
  schedule:
    - cron: '0 0 * * 1' # 毎週月曜日
  workflow_dispatch:

jobs:
  update:
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
      
      - name: Update components
        run: ./packages/ui/scripts/update-all-components.sh
      
      - name: Run tests
        run: pnpm test
      
      - name: Create PR
        uses: peter-evans/create-pull-request@v5
        with:
          title: 'chore: update shadcn/ui components'
          body: |
            ## 🔄 shadcn/ui コンポーネント自動更新
            
            この PR は shadcn/ui コンポーネントの自動更新です。
            
            ### 更新内容
            - shadcn/ui の最新バージョンに更新
            - カスタマイゼーションの適用
            - 自動テストの実行
            
            ### 確認事項
            - [ ] 全テストが通過している
            - [ ] カスタマイゼーションが保持されている
            - [ ] 新機能が正しく動作している
          branch: update-shadcn-ui
```

## 🧪 テスト戦略

### カスタマイゼーション部分のテスト

#### 1. 必須テスト (High Priority)
```typescript
// button.test.tsx - 大幅カスタマイズ
describe('Button - Custom Features', () => {
  it('should have responsive sizing', () => {
    render(<Button size="default">Test</Button>);
    expect(screen.getByRole('button')).toHaveClass('h-11 sm:h-9');
  });
  
  it('should have accessibility enhancements', () => {
    render(<Button>Test</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('data-slot', 'button');
  });
});

// dialog.test.tsx - 独自プロパティ
describe('Dialog - Custom Props', () => {
  it('should show close button by default', () => {
    render(<DialogContent>Content</DialogContent>);
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
  });
  
  it('should hide close button when showCloseButton is false', () => {
    render(<DialogContent showCloseButton={false}>Content</DialogContent>);
    expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument();
  });
});
```

#### 2. 基本テスト (Medium Priority)
```typescript
// input.test.tsx - 使用頻度高
describe('Input - Basic Customizations', () => {
  it('should have data-slot attribute', () => {
    render(<Input />);
    expect(screen.getByRole('textbox')).toHaveAttribute('data-slot', 'input');
  });
  
  it('should apply custom styling', () => {
    render(<Input className="custom-class" />);
    expect(screen.getByRole('textbox')).toHaveClass('custom-class');
  });
});
```

#### 3. 自動生成テスト (Low Priority)
```typescript
// 自動生成されるテスト
UI_CUSTOMIZATIONS.dataSlot.components.forEach(componentName => {
  describe(`${componentName} - Auto-generated Tests`, () => {
    it(`should have data-slot="${componentName}" attribute`, () => {
      // 自動生成テストロジック
    });
  });
});
```

## 📋 チェックリスト

### Phase 1 実装チェックリスト

#### 基盤構築
- [ ] ディレクトリ構造作成
  - [ ] `_base/` - 原版格納
  - [ ] `_custom/` - カスタマイゼーション管理
  - [ ] `_backup/` - バックアップ
  - [ ] `scripts/` - 自動化スクリプト

- [ ] カスタマイゼーション管理システム
  - [ ] `customizations.ts` - 定義ファイル
  - [ ] `apply-customizations.ts` - 適用システム
  - [ ] `test-customizations.ts` - テスト生成

- [ ] 基本スクリプト
  - [ ] `update-check.sh` - 更新チェック
  - [ ] `safe-update.sh` - 安全更新
  - [ ] `apply-customizations.js` - 適用スクリプト

### Phase 2 移行チェックリスト

#### 既存コンポーネント分析
- [ ] 全コンポーネントのカスタマイゼーション調査
- [ ] 原版との差分抽出
- [ ] カスタマイゼーション分類
  - [ ] 軽微 (data-slot): 45コンポーネント
  - [ ] 中程度 (独自プロパティ): 2コンポーネント
  - [ ] 大幅 (button): 1コンポーネント

#### 移行作業
- [ ] 原版を `_base/` に保存
- [ ] カスタマイゼーションを `_custom/` に抽出
- [ ] 統合コンポーネントの動作確認

### Phase 3 テスト統合チェックリスト

#### 必須テスト実装
- [ ] `button.test.tsx` - 大幅カスタマイズテスト
- [ ] `dialog.test.tsx` - 独自プロパティテスト
- [ ] `input.test.tsx` - 基本カスタマイゼーションテスト

#### 自動テスト生成
- [ ] data-slot 属性テスト自動生成
- [ ] カスタムプロパティテスト自動生成
- [ ] 継続的テスト実行設定

### Phase 4 自動化チェックリスト

#### 自動更新システム
- [ ] 一括更新スクリプト
- [ ] CI/CD パイプライン設定
- [ ] 自動PR作成
- [ ] 更新通知システム

## 🔧 必要なツール・依存関係

### 開発ツール
```json
{
  "devDependencies": {
    "@shadcn/ui": "latest",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "vitest": "^1.0.0"
  }
}
```

### スクリプトツール
- `bash` - 更新スクリプト
- `node.js` - カスタマイゼーション適用
- `git` - バージョン管理
- `pnpm` - パッケージ管理

## 🎯 期待される効果

### 短期的効果 (1-2ヶ月)
1. **カスタマイゼーション保護**: 更新時の上書き防止
2. **自動テスト**: カスタマイゼーション品質保証
3. **明確な分離**: 原版とカスタマイズの分離

### 中期的効果 (3-6ヶ月)
1. **自動更新**: 手動作業の90%削減
2. **品質向上**: 継続的テストによる品質保証
3. **開発効率**: 更新プロセスの標準化

### 長期的効果 (6-12ヶ月)
1. **技術的負債削減**: 体系的管理による負債削減
2. **スケーラビリティ**: 新コンポーネント追加の効率化
3. **チーム生産性**: 標準化されたプロセス

## 📚 関連ドキュメント

- [shadcn/ui 公式ドキュメント](https://ui.shadcn.com/)
- [プロジェクトのテスト戦略](./TESTING_STRATEGY.md)
- [開発環境・原則](./DEVELOPMENT.md)
- [UI コンポーネントライブラリ](../packages/ui/README.md)

## 🤝 貢献・引き継ぎ

### 引き継ぎ時のポイント
1. **Phase 1 から順次実装** - 基盤構築を最優先
2. **既存システムへの影響を最小化** - 段階的移行
3. **テスト駆動開発** - カスタマイゼーション部分のテスト必須
4. **継続的改善** - 自動化システムの段階的導入

### 質問・サポート
- プロジェクトの Discord チャンネル
- GitHub Issues での質問
- コードレビューでの相談

---

**最終更新**: 2025年7月15日  
**バージョン**: v1.0.0  
**作成者**: Claude Code Assistant  
**レビュー**: プロジェクトチーム  
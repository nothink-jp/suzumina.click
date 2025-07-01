# テスト構造標準化・再編成計画

**作成日**: 2025年7月1日  
**対象**: @apps/web/ のテストファイル構造統一

## 🎯 目標

1. **ディレクトリ構造の統一**: `__tests__` ディレクトリからコロケーション方式への移行
2. **重複テストファイルの解消**: 同一コンポーネントの重複テスト除去
3. **命名規約の統一**: 拡張子・命名パターンの完全統一
4. **共有テストユーティリティの活用拡大**: レスポンシブテスト等の利用促進

## 🔍 現状分析

### 問題のあるファイル（重複・分離）

#### **重複テストファイル** ⚠️ **5件**
```
1. AutocompleteDropdown
   - 🔥 削除対象: src/components/__tests__/AutocompleteDropdown.test.tsx
   - ✅ 保持対象: src/components/AutocompleteDropdown.test.tsx (存在すると仮定)

2. HighlightText  
   - 🔥 削除対象: src/components/__tests__/HighlightText.test.tsx
   - ✅ 保持対象: src/components/HighlightText.test.tsx (存在すると仮定)

3. LikeButton
   - 🔥 削除対象: src/components/__tests__/LikeButton.test.tsx
   - ✅ 保持対象: src/components/LikeButton.test.tsx (存在すると仮定)

4. SearchFilters
   - 🔥 削除対象: src/components/__tests__/SearchFilters.test.tsx
   - ✅ 保持対象: src/components/SearchFilters.test.tsx (存在すると仮定)

5. SearchInputWithAutocomplete
   - 🔥 削除対象: src/components/__tests__/SearchInputWithAutocomplete.test.tsx
   - ✅ 保持対象: src/components/SearchInputWithAutocomplete.test.tsx (存在すると仮定)
```

#### **__tests__ ディレクトリ内テストファイル** 📁 **9件**
```
移行対象ファイル:
1. src/actions/__tests__/likes.test.ts 
   → src/actions/likes.test.ts

2. src/hooks/__tests__/useDebounce.test.ts
   → src/hooks/useDebounce.test.ts

3. src/hooks/__tests__/useAutocomplete.test.ts  
   → src/hooks/useAutocomplete.test.ts

4. src/hooks/__tests__/useAutocomplete.simple.test.ts
   → src/hooks/useAutocomplete.simple.test.ts

5. src/app/api/search/__tests__/route-filters.test.ts
   → src/app/api/search/route-filters.test.ts

6-10. src/components/__tests__/* (5件)
   → 重複のため削除（上記参照）
```

## 📋 実行計画

### **Phase 1: 重複解消とファイル存在確認** 🔍

#### **1.1 重複テストファイルの実態調査**
```bash
# 各コンポーネントのテストファイル存在確認
ls src/components/AutocompleteDropdown.test.tsx 2>/dev/null || echo "❌ Not found"
ls src/components/HighlightText.test.tsx 2>/dev/null || echo "❌ Not found"  
ls src/components/LikeButton.test.tsx 2>/dev/null || echo "❌ Not found"
ls src/components/SearchFilters.test.tsx 2>/dev/null || echo "❌ Not found"
ls src/components/SearchInputWithAutocomplete.test.tsx 2>/dev/null || echo "❌ Not found"
```

#### **1.2 対応方針決定**
- **Co-located テストが存在する場合**: `__tests__/` 内を削除
- **Co-located テストが存在しない場合**: `__tests__/` から移動

### **Phase 2: ファイル移動・削除実行** 📦

#### **2.1 Actions テスト移動**
```bash
# 移動先ディレクトリ作成
mkdir -p src/actions

# ファイル移動
mv src/actions/__tests__/likes.test.ts src/actions/likes.test.ts

# 空ディレクトリ削除
rmdir src/actions/__tests__
```

#### **2.2 Hooks テスト移動**
```bash
# 移動先ディレクトリ作成
mkdir -p src/hooks

# ファイル移動
mv src/hooks/__tests__/useDebounce.test.ts src/hooks/useDebounce.test.ts
mv src/hooks/__tests__/useAutocomplete.test.ts src/hooks/useAutocomplete.test.ts  
mv src/hooks/__tests__/useAutocomplete.simple.test.ts src/hooks/useAutocomplete.simple.test.ts

# 空ディレクトリ削除
rmdir src/hooks/__tests__
```

#### **2.3 API Route テスト移動**
```bash
# ファイル移動
mv src/app/api/search/__tests__/route-filters.test.ts src/app/api/search/route-filters.test.ts

# 空ディレクトリ削除
rmdir src/app/api/search/__tests__
```

#### **2.4 Components テスト処理**
```bash
# 重複ファイル削除（co-located が存在する場合）
# または移動（co-located が存在しない場合）

# Phase 1.1 の調査結果に基づいて実行
```

### **Phase 3: テスト設定更新** ⚙️

#### **3.1 Import パス確認**
```typescript
// 移動後のファイルで相対パス調整が必要かチェック
// 例: hooks テストファイルの import パス

// Before (in __tests__ directory):
import { useDebounce } from '../useDebounce';

// After (co-located):  
import { useDebounce } from './useDebounce';
```

#### **3.2 テスト実行確認**
```bash
# 全テスト実行で問題がないか確認
pnpm test

# 特定のテストファイル実行確認
pnpm test useDebounce.test.ts
pnpm test likes.test.ts
pnpm test route-filters.test.ts
```

### **Phase 4: 共有テストユーティリティ拡大** 🔧

#### **4.1 レスポンシブテスト適用拡大**
```typescript
// 現在: FavoriteButton.test.tsx のみ
// 目標: 全コンポーネントテストに適用

// 対象ファイル例:
- AudioButtonCreator.test.tsx
- SearchForm.test.tsx  
- UserMenu.test.tsx
- SiteHeader.test.tsx
- Pagination.test.tsx
```

#### **4.2 モックヘルパー作成**
```typescript
// 新規作成: src/test-utils/mock-helpers.ts
export const createMockUser = (overrides = {}) => ({ ... });
export const createMockAudioButton = (overrides = {}) => ({ ... });
export const createMockFirestoreDoc = (data, id) => ({ ... });
```

## 🎯 実行後の期待構造

### **最終的なディレクトリ構造**
```
src/
├── actions/
│   ├── likes.ts
│   └── likes.test.ts                    # ✅ Co-located
├── hooks/  
│   ├── useDebounce.ts
│   ├── useDebounce.test.ts              # ✅ Co-located
│   ├── useAutocomplete.ts
│   ├── useAutocomplete.test.ts          # ✅ Co-located
│   └── useAutocomplete.simple.test.ts   # ✅ Co-located
├── components/
│   ├── AudioButton.tsx
│   ├── AudioButton.test.tsx             # ✅ Co-located
│   ├── SearchForm.tsx
│   ├── SearchForm.test.tsx              # ✅ Co-located
│   └── (no __tests__ directories)       # ✅ 削除完了
├── app/
│   ├── api/
│   │   └── search/
│   │       ├── route.ts
│   │       ├── route.test.ts            # ✅ Co-located  
│   │       ├── route-filters.test.ts    # ✅ Co-located
│   │       └── (no __tests__ directories) # ✅ 削除完了
│   ├── buttons/
│   │   ├── page.tsx
│   │   ├── page.test.tsx                # ✅ Co-located
│   │   ├── actions.ts
│   │   └── actions.test.ts              # ✅ Co-located
├── lib/
│   ├── firestore.ts
│   ├── firestore.test.ts                # ✅ Co-located
│   ├── audio-buttons-firestore.ts
│   └── audio-buttons-firestore.test.ts  # ✅ Co-located
├── test-utils/                          # 🆕 共有テストユーティリティ
│   └── mock-helpers.ts                  # 🆕 追加予定
├── middleware.ts
├── middleware.test.ts                   # ✅ Co-located
└── e2e/                                 # ✅ E2E専用ディレクトリ
    ├── auth.spec.ts
    ├── buttons.spec.ts
    └── ...
```

## ✅ 完了チェックリスト

### **Phase 1: 調査・確認**
- [ ] 重複ファイルの存在調査完了
- [ ] 移動対象ファイル一覧確定
- [ ] バックアップ作成（git stash推奨）

### **Phase 2: ファイル移動・削除**
- [ ] Actions テスト移動完了 (1件)
- [ ] Hooks テスト移動完了 (3件)  
- [ ] API Route テスト移動完了 (1件)
- [ ] Components 重複テスト処理完了 (5件)
- [ ] 空 `__tests__` ディレクトリ削除完了

### **Phase 3: 設定・確認**
- [ ] Import パス調整完了
- [ ] 全テスト実行成功確認
- [ ] Lint チェック完了
- [ ] TypeScript型チェック完了

### **Phase 4: 拡張・改善**
- [ ] レスポンシブテスト適用拡大 (5+件)
- [ ] 共有モックヘルパー作成
- [ ] ドキュメント更新完了

## 🚨 注意事項

1. **Git 履歴の保持**: `git mv` コマンド使用推奨
2. **段階的実行**: Phase毎にテスト実行・確認
3. **Import パス**: 相対パス調整の必要性確認
4. **IDE設定**: VSCode等のテスト検出設定更新の可能性
5. **CI/CD**: GitHub Actions等のテストパス変更の必要性確認

## 📈 期待効果

1. **開発者体験向上**: テストファイルとソースファイルの近接配置
2. **メンテナンス性向上**: ファイル移動時のテスト追従性向上
3. **一貫性確保**: プロジェクト全体の構造統一
4. **新規開発効率化**: 明確なテスト配置ルール
5. **コードレビュー効率化**: 関連ファイルの同時確認可能

---

**実行担当**: 開発チーム  
**完了予定**: テスト戦略標準化後  
**影響範囲**: @apps/web/src/ 配下のテストファイル
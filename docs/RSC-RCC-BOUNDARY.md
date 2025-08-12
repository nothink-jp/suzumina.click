# RSC/RCC境界ルール

## 概要
このプロジェクトでは、Next.js App RouterのServer Components (RSC)とClient Components (RCC)を適切に分離しています。

## 基本ルール

### 1. Server Components (RSC)
- **page.tsx**: すべてのページコンポーネント
- **layout.tsx**: レイアウトコンポーネント
- **actions.ts**: Server Actions
- **データ取得処理**: 初期データの取得

### 2. Client Components (RCC)
- **インタラクティブなUI**: フォーム、ボタン、モーダルなど
- **Hooks使用**: useState, useEffect, カスタムHooksを使用するコンポーネント
- **ブラウザAPI使用**: localStorage, windowオブジェクトへのアクセス
- **リアルタイム更新**: WebSocket、ポーリングなど

## ディレクトリ構造

```
apps/web/src/app/
├── [page]/
│   ├── page.tsx              # RSC: データ取得と初期レンダリング
│   ├── actions.ts            # RSC: Server Actions
│   └── components/
│       └── [Component].tsx   # RCC: "use client"付きのインタラクティブコンポーネント
```

## パッケージエクスポートルール

### packages/ui/src/components/custom/

1. **index.ts** (メインエクスポート)
   - 型定義: OK
   - ユーティリティ関数: OK  
   - React Hooks: NG (Server Componentがインポートエラーになる)
   - "use client"付きコンポーネント: OK

2. **[component].client.ts** (Client専用エクスポート)
   - React Hooks: OK
   - Client-onlyコード: OK
   - "use client"ディレクティブ必須

## 実装例

### ❌ 悪い例
```typescript
// packages/ui/src/components/custom/index.ts
export { useListData } from "./hooks/useListData"; // Server Componentでエラー
```

### ✅ 良い例
```typescript
// packages/ui/src/components/custom/index.ts
export type { ListDataSource } from "./types"; // 型定義はOK
export { ConfigurableList } from "./configurable-list"; // "use client"付きコンポーネントはOK

// packages/ui/src/components/custom/configurable-list.client.ts
"use client";
export { useListData } from "./hooks/useListData"; // Client専用エクスポート
```

## トラブルシューティング

### エラー: "useEffect only works in a Client Component"
**原因**: Server ComponentがReact Hooksをインポートしている
**解決策**: 
1. Hooksを使用するファイルに`"use client"`を追加
2. index.tsからのエクスポートを削除
3. 必要に応じて`.client.ts`ファイルを作成

### エラー: "window is not defined"
**原因**: Server Componentでブラウザ専用APIを使用
**解決策**: 該当コンポーネントを`"use client"`に変更

## ベストプラクティス

1. **データ取得はServer Componentで**
   - page.tsxで初期データを取得
   - propsとしてClient Componentに渡す

2. **インタラクションはClient Componentで**
   - フォーム、ボタン、モーダルは"use client"
   - 状態管理が必要な場合も"use client"

3. **適切な境界設定**
   - 必要最小限のコンポーネントをClient化
   - 可能な限りServer Componentを維持

4. **パッケージのエクスポート管理**
   - React Hooksは別ファイルからエクスポート
   - 型定義とユーティリティは通常通りエクスポート可能
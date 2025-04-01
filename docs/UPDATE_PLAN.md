# パッケージ更新計画

## 目的

1. React 19との型定義の互換性を確保する
2. プロジェクト全体でのTypeScriptバージョン指定を統一する

## 更新手順

### フェーズ1: React型定義の更新

```bash
cd apps/web
bun add -D @types/react@latest @types/react-dom@latest
```

#### 想定される影響
- React 19の新機能に対する型サポートが改善される
- 既存のコードに型エラーが発生する可能性がある
  - useEffectの依存配列
  - イベントハンドラーの型
  - コンポーネントのprops型

#### 対応策
1. 型エラーが発生した場合は、新しい型定義に合わせてコードを修正
2. 必要に応じて一時的に@ts-ignoreを使用（ただし、後で適切に修正すること）

### フェーズ2: TypeScriptバージョン指定の統一

1. ルートの`package.json`を修正
```diff
- "typescript": "^5.8.2"
+ "typescript": "5.8.2"
```

#### 想定される影響
- パッチバージョンの自動更新が停止する
- プロジェクト全体で同じTypeScriptバージョンが使用されることが保証される

## 検証手順

1. 型定義の更新後:
```bash
bun run check-types
```

2. アプリケーションの動作確認:
```bash
bun run build
bun run dev
```

## ロールバック手順

### React型定義のロールバック
```bash
cd apps/web
bun add -D @types/react@19.0.12 @types/react-dom@19.0.4
```

### TypeScriptバージョン指定のロールバック
```diff
- "typescript": "5.8.2"
+ "typescript": "^5.8.2"
```

## タイムライン

1. フェーズ1: 30分
   - React型定義の更新: 5分
   - 型エラーの確認と修正: 20分
   - 動作確認: 5分

2. フェーズ2: 15分
   - package.jsonの修正: 5分
   - 依存関係の更新確認: 5分
   - 動作確認: 5分

合計予想時間: 45分

## 成功基準

1. `bun run check-types`が成功すること
2. `bun run build`が成功すること
3. アプリケーションが正常に動作すること
4. 新しいReact型定義による型エラーが0件であること

## バックアップ戦略

1. 更新前に以下のファイルをコミットしておく:
   - package.json
   - bun.lock
   - apps/web/package.json

2. 更新作業用のブランチを作成:
```bash
git checkout -b feat/update-package-versions
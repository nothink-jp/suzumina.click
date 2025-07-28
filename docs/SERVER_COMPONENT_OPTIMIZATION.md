# Server Component最適化ガイドライン

## 概要
Next.js 15のServer Componentを活用して、PageSpeed Insightsスコアを向上させるための最適化指針。

## 問題の診断

### 現在のトップページの問題
1. **大量のPOSTリクエスト（開発環境で約26件）**
   - Client ComponentからServer Actionsを呼び出している
   - React 18 StrictModeでuseEffectが2回実行される
   - 並列処理により複数のServer Actionが同時実行

2. **パフォーマンスへの影響**
   - 初回表示後にJavaScript実行が必要
   - 追加のネットワークリクエストによるTTI遅延
   - ローディング状態によるCLS発生

## 解決パターン

### Server Component方式（推奨）
```typescript
// app/page.tsx
export default async function Page() {
  // 並列でデータ取得
  const [data1, data2, data3] = await Promise.all([
    getData1(),
    getData2(), 
    getData3()
  ]);

  return <PageContent {...{data1, data2, data3}} />;
}
```

### メリット
- **Performance**: +15-20点向上見込み
- **初回表示が最速**: HTMLに全データが含まれる
- **TTI改善**: JavaScript実行後の追加フェッチ不要
- **CLS削減**: データが最初から存在
- **ネットワーク効率**: クライアントからのPOST不要

## 実装チェックリスト

### 1. Server Component化の判断基準
- [ ] SEOが重要なページか？
- [ ] 初回表示速度が重要か？
- [ ] インタラクティブ性は低いか？
- [ ] リアルタイム更新は不要か？
- [ ] 認証状態に依存しないデータか？

### 2. 実装手順
1. **データフェッチをServer Componentに移動**
   ```typescript
   // Before: Client Component with useEffect
   useEffect(() => {
     loadData(); // Server Action
   }, []);

   // After: Server Component
   const data = await getData();
   ```

2. **並列実行の活用**
   ```typescript
   // 逐次実行を避ける
   const [a, b, c] = await Promise.all([
     fetchA(),
     fetchB(),
     fetchC()
   ]);
   ```

3. **必要最小限のClient Component化**
   - インタラクティブな部分のみClient Component
   - 静的な表示部分はServer Component

## 優先順位マトリクス

| ページタイプ | 優先度 | 理由 |
|------------|--------|------|
| トップページ | 最高 | 最も訪問数が多い |
| 詳細ページ（動画/作品） | 高 | SEO・SNS共有で重要 |
| 一覧ページ | 中 | 初回表示は重要だがフィルタリングも必要 |
| 作成/編集ページ | 低 | インタラクティブ性が最優先 |
| 管理画面 | 低 | 認証必須・操作性重視 |

## 測定指標

### 改善前後で比較すべき指標
1. **PageSpeed Insights**
   - Performance Score
   - FCP (First Contentful Paint)
   - TTI (Time to Interactive)
   - CLS (Cumulative Layout Shift)

2. **開発環境での確認**
   - ネットワークタブでPOSTリクエスト数
   - React DevToolsでレンダリング回数

## アンチパターン

### 避けるべき実装
1. **Client ComponentでのServer Action濫用**
   ```typescript
   // ❌ Bad
   useEffect(() => {
     fetchData1();
     fetchData2();
     fetchData3();
   }, []);
   ```

2. **不要なClient Component化**
   ```typescript
   // ❌ Bad: 表示だけなのに"use client"
   "use client";
   export function StaticContent({ data }) {
     return <div>{data}</div>;
   }
   ```

## 実装例

### Before（Client Component方式）
```typescript
// ❌ 多数のPOSTリクエストが発生
"use client";
export function HomePage() {
  const { videos, works } = useParallelSectionData();
  // useEffect内でServer Actions実行
}
```

### After（Server Component方式）
```typescript
// ✅ サーバーサイドで全データ取得
export default async function HomePage() {
  const [audioButtons, videos, works] = await Promise.all([
    getLatestAudioButtons(10),
    getLatestVideos(10),
    getLatestWorks(10)
  ]);
  
  return <HomePageContent {...{audioButtons, videos, works}} />;
}
```

## まとめ

Server Component最適化は、特に以下の場合に効果的：
- トラフィックの多いページ
- SEOが重要なページ
- 初回表示速度が重要なページ

逆に、以下の場合は慎重に検討：
- リアルタイム更新が必要
- 高度なインタラクティブ性が必要
- 認証状態に強く依存

このガイドラインに従って段階的に最適化を進めることで、ユーザー体験とPageSpeed Insightsスコアの両方を改善できます。
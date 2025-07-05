# DLsite データ構造仕様書

> **📅 作成日**: 2025年7月4日 | **📅 最終更新**: 2025年7月5日  
> **📝 ステータス**: 実装完了・運用中  
> **🔧 対象バージョン**: v0.3.0 (統合データ構造実装済み)  

## 📋 概要

**✅ 実装完了**: DLsiteから取得される3種類のデータソースの統合データ構造がCloud Firestoreで稼働中です。  
**🔗 実装ファイル**: `apps/functions/src/services/dlsite/dlsite-unified-mapper.ts`  
**📊 収集状況**: 1015件の完全データ収集を達成 (35%データ欠損問題解決済み)

## 🎯 DLsite固有の制約・仕様

### 重要な制約事項

#### 1. **ジャンル vs タグの区別**
- ❌ **DLsiteには「タグ」という概念は存在しない**
- ✅ **「ジャンル」(genres) のみが正式な分類**
- 📝 フロントエンドでは「タグ」として表示するが、内部的には全て「ジャンル」として扱う

#### 2. **クリエイター情報の制限**
DLsiteでは以下の**5種類のみ**がクリエイター情報として提供される：
- **作者** (author) - メイン制作者
- **シナリオ** (scenario) - シナリオライター  
- **イラスト** (illustration) - イラストレーター
- **声優** (voiceActors) - 声の出演者
- **音楽** (music) - 音楽・効果音担当
- ❌ **「デザイナー」は存在しない** - DLsiteの仕様上提供されない

#### 3. **トラック情報の扱い**
- ❌ **構造化されたトラック情報はDLsiteでは提供されない**
- ⚠️ 各作者がテキストベースで記載する場合と記載しない場合がある
- 📝 **データとして保持しない** - 説明文の一部として扱う

#### 4. **販売日の形式**
- **ソート用**: Date型またはISO 8601文字列
- **表示用**: 日本語形式（例: "2025年06月14日"）
- 両方の形式を保持して用途に応じて使い分け

## 🔄 3種類のデータソース分析

### データソース1: **検索結果HTML** (一覧ページ)
```typescript
// 取得方法: スクレイピング
// URL: https://www.dlsite.com/maniax/fsr/=/keyword_creater/"涼花みなせ"
// 特徴: 高速・基本情報のみ・大量処理向け

interface SearchResultData {
  productId: string;           // RJ01393393
  title: string;               // 作品タイトル
  circle: string;              // サークル名
  price: PriceInfo;           // 価格・割引情報
  rating: RatingInfo;         // 星評価・評価数
  thumbnailUrl: string;       // サムネイル画像
  genres: string[];           // ジャンル（DLsiteでは「タグ」と表示）
  ageRating?: string;         // 年齢制限
  isExclusive: boolean;       // 独占配信フラグ
}
```

### データソース2: **DLsite Info API** (詳細統計)
```typescript
// 取得方法: REST API
// URL: https://www.dlsite.com/maniax-touch/product/info/ajax?product_id=RJ01393393
// 特徴: 詳細統計・レート制限厳しい・高品質データ

interface InfoAPIData {
  // 詳細統計情報
  salesCount?: number;        // 販売数
  totalDownloadCount?: number; // 総DL数
  wishlistCount?: number;     // ウィッシュリスト数
  rankingHistory?: RankingInfo[]; // ランキング履歴
  
  // メタデータ
  makerId?: string;           // メーカーID
  registDate?: string;        // 登録日（ISO形式）
  ageCategory?: number;       // 年齢カテゴリ（数値）
  options?: string;           // 作品オプション
  
  // 多言語・キャンペーン情報
  localePrices?: LocalePrice[]; // 多通貨価格
  campaignInfo?: CampaignInfo; // キャンペーン情報
  customGenres?: string[];    // カスタムジャンル
}
```

### データソース3: **作品詳細ページHTML** (拡張情報)
```typescript
// 取得方法: スクレイピング
// URL: https://www.dlsite.com/maniax/work/=/product_id/RJ01393393.html
// 特徴: 最も詳細・処理時間長・5種クリエイター完全情報

interface DetailPageData {
  // work_outline テーブルから取得
  basicInfo: {
    releaseDate?: string;      // 販売日（日本語形式）
    seriesName?: string;       // シリーズ名
    author: string[];          // 作者（複数可）
    scenario: string[];        // シナリオ（複数可）
    illustration: string[];    // イラスト（複数可）
    voiceActors: string[];     // 声優（複数可）
    music: string[];           // 音楽（複数可）
    ageRating?: string;        // 年齢指定
    workFormat?: string;       // 作品形式
    fileFormat?: string;       // ファイル形式
    genres: string[];          // ジャンル（work_outline）
    detailTags: string[];      // 詳細タグ
    fileSize?: string;         // ファイル容量
  };
  
  // 追加拡張情報
  fileInfo?: FileInfo;         // ファイル詳細情報
  bonusContent?: BonusContent[]; // 特典情報
  detailedDescription: string; // 詳細説明文
  highResImageUrl?: string;    // 高解像度画像
  detailedRating?: DetailedRatingInfo; // 精密評価
}
```

## 🏗️ 統合データ構造設計

### 統合戦略: **実装済みハイブリッドアプローチ**

**✅ 実装完了**: 頻繁にアクセスされるデータは**トップレベル**に配置し、ソース固有データは**階層化**して保持

```typescript
// ✅ 実装済み: 統合されたFirestore作品データ構造 (FirestoreDLsiteWorkData)
export interface UnifiedDLsiteWorkData {
  // === 基本識別情報 ===
  id: string;                 // FirestoreドキュメントID
  productId: string;          // DLsite商品ID (RJ01393393)
  
  // === 基本作品情報（トップレベル - 頻繁アクセス） ===
  title: string;              // 作品タイトル
  circle: string;             // サークル名
  description: string;        // 作品説明
  category: WorkCategory;     // 作品カテゴリ
  workUrl: string;            // DLsite作品URL
  thumbnailUrl: string;       // サムネイル画像
  highResImageUrl?: string;   // 高解像度画像（詳細ページから）
  
  // === 価格・評価情報（統合 - 優先度: infoAPI > detailPage > searchHTML） ===
  price: PriceInfo;           // 統合価格情報
  rating?: RatingInfo;        // 統合評価情報
  salesCount?: number;        // 販売数
  
  // === 統一クリエイター情報（5種類のみ - 重複排除済み） ===
  voiceActors: string[];      // 声優（最優先データ）
  scenario: string[];         // シナリオ
  illustration: string[];     // イラスト  
  music: string[];           // 音楽
  author: string[];          // 作者（声優と異なる場合のみ）
  
  // === 統一作品メタデータ（重複排除済み） ===
  releaseDate?: string;       // 販売日（ISO形式 - ソート用）
  releaseDateDisplay?: string; // 販売日（日本語形式 - 表示用）
  seriesName?: string;        // シリーズ名
  ageRating?: string;         // 年齢制限
  workFormat?: string;        // 作品形式
  fileFormat?: string;        // ファイル形式
  genres: string[];           // 統合ジャンル（全ソースマージ + 重複除去）
  
  // === 詳細情報（階層化 - 低頻度アクセス） ===
  fileInfo?: FileInfo;        // ファイル詳細情報
  bonusContent?: BonusContent[]; // 特典情報（詳細ページのみ）
  
  // === ソース別データ（デバッグ・品質管理用） ===
  dataSources: {
    searchResult?: {
      lastFetched: string;    // 最終取得日時
      genres: string[];       // 検索結果のジャンル
    };
    infoAPI?: {
      lastFetched: string;    // 最終取得日時
      salesCount?: number;    // API統計データ
      wishlistCount?: number;
      customGenres?: string[];
    };
    detailPage?: {
      lastFetched: string;    // 最終取得日時
      basicInfo: BasicWorkInfo; // work_outline データ
      detailedDescription: string;
    };
  };
  
  // === システム管理情報 ===
  isExclusive: boolean;       // 独占配信
  lastFetchedAt: string;      // 全体最終更新
  createdAt: string;          // 作成日時
  updatedAt: string;          // 更新日時
}
```

## 🔄 データ統合ロジック

### 優先度ベース統合戦略 (✅ 実装完了)

```typescript
// ✅ 実装済み: データソース優先度マッピング (dlsite-unified-mapper.ts)
export const DATA_MERGE_PRIORITY = {
  // 価格情報: infoAPI > detailPage > searchHTML
  price: ['infoAPI', 'detailPage', 'searchHTML'],
  
  // 評価情報: infoAPI > searchHTML
  rating: ['infoAPI', 'searchHTML'],
  
  // クリエイター情報: detailPage.basicInfo > searchHTML
  voiceActors: ['detailPage.basicInfo.voiceActors', 'searchHTML.author'],
  scenario: ['detailPage.basicInfo.scenario'],
  illustration: ['detailPage.basicInfo.illustration'],
  music: ['detailPage.basicInfo.music'],
  
  // 日付情報: detailPage > infoAPI
  releaseDate: ['detailPage.basicInfo.releaseDate', 'infoAPI.registDate'],
  
  // ジャンル情報: 全ソースマージ + 重複除去
  genres: {
    merge: [
      'detailPage.basicInfo.genres',
      'detailPage.basicInfo.detailTags', 
      'searchHTML.genres',
      'infoAPI.customGenres'
    ],
    deduplication: true
  }
};
```

### 統合マッパー関数 (✅ 実装完了)

```typescript
// ✅ 実装済み: dlsite-unified-mapper.ts
export function mergeWorkDataSources(
  searchData?: SearchResultData,
  infoData?: InfoAPIData, 
  detailData?: DetailPageData
): UnifiedDLsiteWorkData {
  
  return {
    // 基本情報（searchDataから）
    id: searchData?.productId || '',
    productId: searchData?.productId || '',
    title: searchData?.title || '',
    circle: searchData?.circle || '',
    
    // 統合価格（優先度: infoAPI > detailPage > searchHTML）
    price: selectBestPrice(infoData?.price, detailData?.price, searchData?.price),
    
    // 統合クリエイター情報（重複除去）
    voiceActors: mergeAndDeduplicate([
      ...(detailData?.basicInfo.voiceActors || []),
      ...(searchData?.author || [])
    ]),
    scenario: detailData?.basicInfo.scenario || [],
    illustration: detailData?.basicInfo.illustration || [],
    music: detailData?.basicInfo.music || [],
    author: filterAuthorFromVoiceActors(
      detailData?.basicInfo.author || [],
      detailData?.basicInfo.voiceActors || []
    ),
    
    // 統合ジャンル（全ソースマージ + 重複除去）
    genres: mergeAndDeduplicate([
      ...(detailData?.basicInfo.genres || []),
      ...(detailData?.basicInfo.detailTags || []),
      ...(searchData?.genres || []),
      ...(infoData?.customGenres || [])
    ]),
    
    // 販売日（両形式保持）
    releaseDate: parseToISODate(detailData?.basicInfo.releaseDate) || infoData?.registDate,
    releaseDateDisplay: detailData?.basicInfo.releaseDate,
    
    // ソース別データ保持
    dataSources: {
      searchResult: searchData ? {
        lastFetched: new Date().toISOString(),
        genres: searchData.genres
      } : undefined,
      infoAPI: infoData ? {
        lastFetched: new Date().toISOString(),
        salesCount: infoData.salesCount,
        wishlistCount: infoData.wishlistCount,
        customGenres: infoData.customGenres
      } : undefined,
      detailPage: detailData ? {
        lastFetched: new Date().toISOString(),
        basicInfo: detailData.basicInfo,
        detailedDescription: detailData.detailedDescription
      } : undefined
    }
  };
}
```

## 🔧 バックエンド利用パターン

### 条件付きデータ取得戦略

```typescript
export type DataFetchStrategy = 'minimal' | 'standard' | 'comprehensive';

export async function fetchDLsiteWorkConditionally(
  productId: string,
  strategy: DataFetchStrategy = 'standard'
): Promise<UnifiedDLsiteWorkData> {
  
  let searchData, infoData, detailData;
  
  // 段階1: 基本データ（必須）
  searchData = await fetchFromSearchResults(productId);
  
  // 段階2: 詳細統計（標準・包括時）
  if (strategy === 'standard' || strategy === 'comprehensive') {
    infoData = await fetchWorkInfo(productId);
  }
  
  // 段階3: 拡張情報（包括時のみ）
  if (strategy === 'comprehensive') {
    detailData = await fetchWorkDetailPage(productId);
  }
  
  return mergeWorkDataSources(searchData, infoData, detailData);
}
```

## 🎨 フロントエンド利用パターン

### WorkCard（一覧表示）
```typescript
function WorkCard({ work }: { work: UnifiedDLsiteWorkData }) {
  return (
    <div className="work-card">
      <img src={work.thumbnailUrl} alt={work.title} />
      <h3>{work.title}</h3>
      <p>{work.circle}</p>
      
      {/* 統合された価格表示 */}
      <div className="price">{formatPrice(work.price)}</div>
      
      {/* 統合された声優表示 */}
      {work.voiceActors.length > 0 && (
        <div className="voice-actors">CV: {work.voiceActors.join(', ')}</div>
      )}
      
      {/* 統合されたジャンル表示 */}
      <div className="genres">
        {work.genres.slice(0, 3).map(genre => (
          <span key={genre} className="genre-tag">{genre}</span>
        ))}
      </div>
      
      {/* 販売日表示（表示用形式） */}
      {work.releaseDateDisplay && (
        <div className="release-date">{work.releaseDateDisplay}</div>
      )}
    </div>
  );
}
```

### WorkDetail（詳細表示）
```typescript
function WorkDetail({ work }: { work: UnifiedDLsiteWorkData }) {
  return (
    <div className="work-detail">
      {/* 高解像度画像表示 */}
      <img 
        src={work.highResImageUrl || work.thumbnailUrl} 
        alt={work.title}
        className="high-res-cover"
      />
      
      {/* 詳細クリエイター情報 */}
      <section className="creators">
        <h4>制作陣</h4>
        {work.voiceActors.length > 0 && (
          <div>声優: {work.voiceActors.join(', ')}</div>
        )}
        {work.scenario.length > 0 && (
          <div>シナリオ: {work.scenario.join(', ')}</div>
        )}
        {work.illustration.length > 0 && (
          <div>イラスト: {work.illustration.join(', ')}</div>
        )}
        {work.music.length > 0 && (
          <div>音楽: {work.music.join(', ')}</div>
        )}
      </section>
      
      {/* ファイル情報（詳細ページ取得時のみ） */}
      {work.fileInfo && (
        <section className="file-info">
          <h4>ファイル情報</h4>
          <div>容量: {work.fileInfo.totalSizeText}</div>
          <div>形式: {work.fileInfo.formats.join(', ')}</div>
        </section>
      )}
      
      {/* 特典情報（詳細ページ取得時のみ） */}
      {work.bonusContent && work.bonusContent.length > 0 && (
        <section className="bonus-content">
          <h4>特典</h4>
          {work.bonusContent.map((bonus, index) => (
            <div key={index}>
              <strong>{bonus.title}</strong>
              {bonus.description && <p>{bonus.description}</p>}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
```

## 📊 パフォーマンス最適化

### データ取得戦略の使い分け

| 用途 | 戦略 | 取得データ | 処理時間 | API呼び出し |
|------|------|-----------|----------|-------------|
| 開発・プレビュー | minimal | 基本情報のみ | ~100ms | 1回 |
| 本番・一覧表示 | standard | 基本+統計 | ~400ms | 2回 |
| 詳細ページ | comprehensive | 全データ | ~900ms | 3回 |

### キャッシュ戦略

```typescript
// Firestore階層的キャッシュ
const cacheStrategy = {
  // 基本データ: 24時間キャッシュ
  basicData: { ttl: 24 * 60 * 60 * 1000 },
  
  // 統計データ: 6時間キャッシュ（変動あり）
  statsData: { ttl: 6 * 60 * 60 * 1000 },
  
  // 詳細データ: 7日間キャッシュ（固定的）
  detailData: { ttl: 7 * 24 * 60 * 60 * 1000 }
};
```

## ✅ 実装完了状況

### Phase 1: 統合データ構造実装 ✅ 完了
- ✅ UnifiedDLsiteWorkData スキーマ定義完了
- ✅ データ統合マッパー関数実装完了 (`dlsite-unified-mapper.ts`)
- ✅ 優先度ベース統合ロジック実装完了 (`DATA_MERGE_PRIORITY`)
- ✅ 重複除去アルゴリズム実装完了 (`mergeAndDeduplicate`)

### Phase 2: データ収集システム ✅ 完了
- ✅ 35%データ欠損問題解決完了 (663件→1015件)
- ✅ URL最適化実装完了 (フィルター削除)
- ✅ 3段階最終ページ判定実装完了
- ✅ エラーハンドリング強化完了

### Phase 3: フロントエンド統合 🔄 進行中
- ✅ WorkCard コンポーネント統合データ対応済み
- ✅ WorkDetail コンポーネント統合データ対応済み  
- 🔄 Server Actions統合データ最適化 (進行中)
- 📋 検索・フィルタリング機能強化 (予定)

## 📚 関連ファイル

### ✅ 実装済みファイル
- ✅ `/apps/functions/src/services/dlsite/dlsite-unified-mapper.ts` - 統合データマッパー
- ✅ `/apps/functions/src/services/dlsite/dlsite-mapper.ts` - 基本マッパー (既存データ保持対応)
- ✅ `/packages/shared-types/src/work.ts` - 統合型定義 (FirestoreDLsiteWorkData)
- ✅ `/apps/web/src/app/works/components/WorkCard.tsx` - 統合データ表示対応
- ✅ `/apps/web/src/app/works/[workId]/components/WorkDetail.tsx` - 統合データ表示対応

### 🔄 進行中ファイル
- 🔄 `/apps/web/src/app/works/actions.ts` - Server Actions統合データ最適化

### 📋 次期対象ファイル
- 📋 `/apps/web/src/app/search/actions.ts` - 統合検索強化
- 📋 `/apps/web/src/lib/work-transformers.ts` - データ変換ユーティリティ

### 設定ファイル
- ✅ `/apps/functions/.env` - 本番環境設定済み
- ✅ `/terraform/` - Cloud Functions環境変数設定済み

---

**📝 現在のアクション**: Server Actions統合データ最適化とフロントエンド連携強化

**🔄 更新頻度**: 実装進捗に応じて更新

**👥 関係者**: フルスタック開発者、UI/UXデザイナー

**🔗 関連ドキュメント**: 
- [`BACKEND_FRONTEND_INTEGRATION.md`](./BACKEND_FRONTEND_INTEGRATION.md) - Server Actions設計
- [`FIRESTORE_STRUCTURE.md`](./FIRESTORE_STRUCTURE.md) - データベース構造
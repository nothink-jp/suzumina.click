# Backend-Frontend Integration Design

> **📅 作成日**: 2025年7月5日  
> **📝 ステータス**: 設計完了・実装開始  
> **🔧 対象バージョン**: v0.3.0+  
> **🔗 関連**: [DLsite データ構造仕様書](./DLSITE_DATA_STRUCTURE_SPECIFICATION.md)

## 📋 概要

DLsite統合データ構造を活用し、効率的なバックエンド・フロントエンド連携アーキテクチャを設計・実装します。

## 🎯 設計目標

1. **パフォーマンス最適化**: 必要なデータのみを効率的に取得
2. **型安全性**: TypeScript + Zodスキーマによる完全な型保証
3. **キャッシュ戦略**: 適切なレベルでのデータキャッシュ
4. **スケーラビリティ**: 大量データ対応の段階的取得
5. **ユーザー体験**: 高速な画面遷移とリアルタイム更新

## 🏗️ アーキテクチャ概要

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │  Server Actions  │    │  Cloud         │
│   (Next.js)     │◄──►│   (Next.js)      │◄──►│  Functions     │
│                 │    │                  │    │                 │
│ • WorkCard      │    │ • getWorks()     │    │ • DLsite       │
│ • WorkDetail    │    │ • getWorkById()  │    │   Collection   │
│ • WorkList      │    │ • actions.ts     │    │ • Data         │
│ • Search        │    │ • Direct Firestore   │   Processing   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
        │                       │                       │
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Data Layer    │    │   Cache Layer    │    │   Firestore     │
│                 │    │                  │    │                 │
│ • Type Safe     │    │ • Next.js Cache  │    │ • dlsiteWorks   │
│ • Validation    │    │ • Memory Cache   │    │ • Unified Data  │
│ • Transformation│    │ • ISR/SSG        │    │ • Real-time     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🔌 Server Actions Design

### 1. 作品一覧取得 Server Action

```typescript
// apps/web/src/app/works/actions.ts (拡張)
interface WorksParams {
  page?: number;           // ページ番号 (デフォルト: 1)
  limit?: number;          // 1ページあたりの件数 (デフォルト: 12, 最大: 50)
  sort?: SortOption;       // ソート順 (newest, oldest, price_low, price_high, rating, popular)
  search?: string;         // 検索キーワード
  category?: WorkCategory; // カテゴリフィルター
  strategy?: DataFetchStrategy; // データ取得戦略 (minimal, standard, comprehensive)
}

interface WorksResult {
  works: FrontendDLsiteWorkData[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasMore: boolean;
    limit: number;
  };
  filters: {
    availableCategories: WorkCategory[];
    availableTags: string[];
  };
}

export async function getWorks(params: WorksParams = {}): Promise<WorksResult> {
  // 統合データ活用したFirestore直接アクセス
}
```

### 2. 作品詳細取得 Server Action

```typescript
// apps/web/src/app/works/actions.ts (拡張)
interface WorkDetailParams {
  workId: string;          // DLsite商品ID
  includeRelated?: boolean; // 関連作品を含むか
}

interface WorkDetailResult {
  work: FrontendDLsiteWorkData | null;
  related?: FrontendDLsiteWorkData[]; // 同サークル・関連作品
  recommendations?: FrontendDLsiteWorkData[]; // おすすめ作品
}

export async function getWorkById(workId: string): Promise<FrontendDLsiteWorkData | null> {
  // 既存実装 + 統合データ活用
}

export async function getWorkWithRelated(params: WorkDetailParams): Promise<WorkDetailResult> {
  // 新規実装: 関連作品・おすすめ含む詳細取得
}
```

### 3. 統合検索 Server Action (既存拡張)

```typescript
// apps/web/src/app/search/actions.ts (拡張)
interface UnifiedSearchParams {
  q: string;
  type?: 'all' | 'works' | 'audioButtons' | 'videos';
  filters?: SearchFilters;
}

interface UnifiedSearchResult {
  works: FrontendDLsiteWorkData[];
  audioButtons: AudioButtonData[];
  videos: VideoData[];
  totalResults: {
    works: number;
    audioButtons: number;
    videos: number;
  };
}

export async function searchUnified(params: UnifiedSearchParams): Promise<UnifiedSearchResult> {
  // 既存実装 + DLsite作品検索強化
}
```

### 4. 作品統計 Server Action

```typescript
// apps/web/src/app/works/actions.ts (新規)
interface WorkStatsParams {
  period?: '7d' | '30d' | '90d' | '1y';
  groupBy?: 'category' | 'circle' | 'price';
}

interface WorkStatsResult {
  overview: {
    totalWorks: number;
    totalValue: number;
    averagePrice: number;
    averageRating: number;
  };
  byCategory: Record<WorkCategory, {
    count: number;
    totalValue: number;
    averagePrice: number;
    averageRating: number;
  }>;
  trends: {
    popularTags: Array<{
      tag: string;
      count: number;
    }>;
  };
}

export async function getWorkStats(params: WorkStatsParams = {}): Promise<WorkStatsResult> {
  // 統計データ計算・キャッシュ活用
}
```

## 🔄 Data Flow Patterns

### 1. 一覧表示フロー (Server Actions)

```typescript
// 1. Server Action (SSR/SSG) - シンプルアプローチ
export async function getWorks(params: WorksParams = {}): Promise<WorksResult> {
  try {
    const firestore = getFirestore();
    
    // 1. Firestore直接アクセス (統合データ活用)
    const snapshot = await firestore.collection("dlsiteWorks").get();
    
    // 2. データ変換・フィルタリング・ソート
    let allWorks = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
    })) as FirestoreDLsiteWorkData[];
    
    // 3. 検索・カテゴリフィルタリング
    allWorks = filterWorks(allWorks, params.search, params.category);
    
    // 4. ソート・ページネーション
    const sortedWorks = sortWorks(allWorks, params.sort);
    const paginatedWorks = paginateWorks(sortedWorks, params.page, params.limit);
    
    // 5. フロントエンド形式変換
    const works = paginatedWorks.map(convertToFrontendWork);
    
    return {
      works,
      pagination: buildPaginationInfo(allWorks.length, params.page, params.limit),
      filters: getAvailableFilters(allWorks)
    };
    
  } catch (error) {
    return { works: [], pagination: defaultPagination, filters: defaultFilters };
  }
}

// 2. Page Component Usage
export default async function WorksPage({ searchParams }: { searchParams: any }) {
  const params = parseSearchParams(searchParams);
  const result = await getWorks(params);
  
  return <WorkList {...result} />;
}
```

### 2. 詳細表示フロー (Server Actions)

```typescript
// 1. Static Generation (ISR) - 既存パターン
export async function generateStaticParams() {
  const works = await getWorks({ limit: 100, sort: 'popular' });
  return works.works.map(work => ({ workId: work.id }));
}

// 2. Server Action - 統合データ活用
export async function getWorkById(workId: string): Promise<FrontendDLsiteWorkData | null> {
  try {
    const firestore = getFirestore();
    const doc = await firestore.collection("dlsiteWorks").doc(workId).get();
    
    if (!doc.exists) return null;
    
    const data = doc.data() as FirestoreDLsiteWorkData;
    if (!data.id) data.id = doc.id;
    
    // 統合データ構造をそのまま活用
    return convertToFrontendWork(data);
    
  } catch (error) {
    return null;
  }
}

// 3. 関連作品取得 (新規実装)
export async function getWorkWithRelated(workId: string): Promise<WorkDetailResult> {
  const work = await getWorkById(workId);
  if (!work) return { work: null };
  
  // 並列で関連データ取得
  const [related, recommendations] = await Promise.all([
    getRelatedWorks(work.circle, work.id),
    getRecommendationsByTags(work.tags, work.category, work.id)
  ]);
  
  return { work, related, recommendations };
}
```

## 🎨 Frontend Components Integration

### 1. WorkCard コンポーネント強化

```typescript
// apps/web/src/app/works/components/WorkCard.tsx (拡張版)
interface WorkCardProps {
  work: FrontendDLsiteWorkData;
  variant?: "minimal" | "standard" | "detailed";
  priority?: boolean;
  showMetadata?: boolean;
  onUpdate?: (workId: string) => void;
}

export default function WorkCard({ 
  work, 
  variant = "standard",
  showMetadata = false 
}: WorkCardProps) {
  // === 統合データ活用 ===
  
  // 1. 統合された声優情報表示
  const displayVoiceActors = work.voiceActors?.slice(0, 2) || [];
  
  // 2. 統合された価格情報
  const priceInfo = useMemo(() => ({
    current: work.price.current,
    original: work.price.original,
    discount: work.price.discount,
    isOnSale: work.price.discount && work.price.discount > 0
  }), [work.price]);
  
  // 3. 統合されたタグ・ジャンル表示
  const displayTags = work.tags?.slice(0, 3) || [];
  
  // 4. メタデータ表示 (データソース品質)
  const dataQuality = showMetadata ? calculateDataQuality(work) : null;
  
  return (
    <article className="work-card" data-testid={`work-card-${work.id}`}>
      {/* 高解像度画像対応 */}
      <ThumbnailImage
        src={work.highResImageUrl || work.thumbnailUrl}
        fallbackSrc={work.thumbnailUrl}
        alt={work.title}
        priority={priority}
        sizes="(max-width: 768px) 50vw, 25vw"
      />
      
      {/* 統合データ表示 */}
      <div className="work-info">
        <h3>{work.title}</h3>
        <p>{work.circle}</p>
        
        {/* 統合された声優情報 */}
        {displayVoiceActors.length > 0 && (
          <div className="voice-actors">
            CV: {displayVoiceActors.join(", ")}
            {work.voiceActors.length > 2 && " 他"}
          </div>
        )}
        
        {/* 統合されたタグ */}
        <div className="tags">
          {displayTags.map(tag => (
            <Badge key={tag} variant="outline">{tag}</Badge>
          ))}
        </div>
        
        {/* 価格表示 */}
        <PriceDisplay {...priceInfo} />
        
        {/* データ品質インジケーター (開発時) */}
        {dataQuality && (
          <DataQualityIndicator quality={dataQuality} />
        )}
      </div>
    </article>
  );
}
```

### 2. WorkDetail コンポーネント強化

```typescript
// apps/web/src/app/works/[workId]/components/WorkDetail.tsx (拡張版)
export default function WorkDetail({ work }: { work: FrontendDLsiteWorkData }) {
  
  // === 統合データ最大活用 ===
  
  // 1. 全クリエイター情報の体系的表示
  const creatorSections = useMemo(() => [
    { title: "声優", data: work.voiceActors, icon: "🎤" },
    { title: "シナリオ", data: work.scenario, icon: "📝" },
    { title: "イラスト", data: work.illustration, icon: "🎨" },
    { title: "音楽", data: work.music, icon: "🎵" },
    { title: "デザイン", data: work.design, icon: "🎯" },
    ...Object.entries(work.otherCreators || {}).map(([role, creators]) => ({
      title: role,
      data: creators,
      icon: "👤"
    }))
  ].filter(section => section.data && section.data.length > 0), [work]);
  
  // 2. ファイル情報の詳細表示
  const fileDetails = work.fileInfo && (
    <FileInfoSection 
      fileInfo={work.fileInfo}
      workFormat={work.workFormat}
      fileFormat={work.fileFormat}
    />
  );
  
  // 3. 特典・おまけ情報
  const bonusContent = work.bonusContent && work.bonusContent.length > 0 && (
    <BonusContentSection bonusContent={work.bonusContent} />
  );
  
  return (
    <div className="work-detail">
      {/* ヒーロー部分 */}
      <WorkDetailHero 
        work={work}
        imageUrl={work.highResImageUrl || work.thumbnailUrl}
      />
      
      {/* タブ構造 */}
      <Tabs defaultValue="overview">
        <TabsContent value="overview">
          {/* 作品説明 */}
          <WorkDescription description={work.description} />
          
          {/* 制作陣情報 */}
          <CreatorInfoSection sections={creatorSections} />
          
          {/* ファイル・技術情報 */}
          {fileDetails}
          
          {/* 特典情報 */}
          {bonusContent}
        </TabsContent>
        
        <TabsContent value="stats">
          {/* 統計・分析タブ */}
          <WorkStatsSection work={work} />
        </TabsContent>
        
        <TabsContent value="related">
          {/* 関連作品タブ */}
          <RelatedWorksSection workId={work.id} circle={work.circle} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

## 🔧 Data Transformation Utilities

### 1. 統合データ変換ユーティリティ

```typescript
// apps/web/src/lib/work-transformers.ts
export class WorkDataTransformer {
  
  /**
   * データ品質スコア計算
   */
  static calculateDataQuality(work: FrontendDLsiteWorkData): DataQualityReport {
    const requiredFields = ['title', 'circle', 'price', 'thumbnailUrl'];
    const optionalHighValueFields = ['voiceActors', 'rating', 'description', 'tags'];
    
    const missingRequired = requiredFields.filter(field => !work[field]);
    const missingOptional = optionalHighValueFields.filter(field => {
      const value = work[field];
      return !value || (Array.isArray(value) && value.length === 0);
    });
    
    const completeness = ((requiredFields.length - missingRequired.length) / requiredFields.length) * 100;
    
    // データソース数による品質評価
    let sourceCount = 0;
    if (work.thumbnailUrl) sourceCount++; // searchResult
    if (work.salesCount || work.wishlistCount) sourceCount++; // infoAPI
    if (work.highResImageUrl || work.description) sourceCount++; // detailPage
    
    const qualityScore = Math.min(100, completeness + (sourceCount * 10));
    
    return {
      completeness,
      qualityScore,
      sourceCount,
      missingFields: [...missingRequired, ...missingOptional],
      dataSourceCoverage: sourceCount >= 2 ? 'good' : sourceCount === 1 ? 'fair' : 'poor'
    };
  }
  
  /**
   * 表示用データ生成
   */
  static generateDisplayData(work: FrontendDLsiteWorkData): WorkDisplayData {
    return {
      // 価格表示
      priceDisplay: this.formatPrice(work.price),
      
      // 評価表示
      ratingDisplay: work.rating 
        ? `★${work.rating.stars.toFixed(1)} (${work.rating.count}件)`
        : null,
        
      // 声優表示 (統合済みデータ使用)
      voiceActorDisplay: work.voiceActors?.length > 0
        ? work.voiceActors.slice(0, 3).join(", ") + 
          (work.voiceActors.length > 3 ? " 他" : "")
        : null,
        
      // タグ表示 (統合済みデータ使用)
      tagsDisplay: work.tags?.slice(0, 5) || [],
      
      // 販売日表示 (両形式対応)
      releaseDateDisplay: work.releaseDate 
        ? this.formatJapaneseDate(work.releaseDate)
        : work.registDate
        ? this.formatDate(work.registDate)
        : null,
        
      // データ品質
      dataQuality: this.calculateDataQuality(work)
    };
  }
  
  /**
   * 検索用インデックスデータ生成
   */
  static generateSearchIndex(work: FrontendDLsiteWorkData): WorkSearchIndex {
    return {
      id: work.id,
      productId: work.productId,
      title: work.title,
      circle: work.circle,
      category: work.category,
      
      // 統合された検索対象データ
      searchableText: [
        work.title,
        work.circle,
        work.description,
        ...(work.voiceActors || []),
        ...(work.scenario || []),
        ...(work.illustration || []),
        ...(work.music || []),
        ...(work.tags || [])
      ].filter(Boolean).join(" ").toLowerCase(),
      
      // フィルタリング用
      priceRange: this.getPriceRange(work.price.current),
      ratingRange: work.rating ? Math.floor(work.rating.stars) : 0,
      hasVoiceActors: (work.voiceActors?.length || 0) > 0,
      hasRating: !!work.rating,
      
      // ソート用
      releaseDate: work.releaseDate || work.registDate,
      priceValue: work.price.current,
      ratingValue: work.rating?.stars || 0,
      popularityValue: work.rating?.count || 0
    };
  }
}
```

### 2. キャッシュ戦略実装

```typescript
// apps/web/src/lib/work-cache.ts
export class WorkCacheManager {
  
  static readonly CACHE_KEYS = {
    WORKS_LIST: (params: string) => `works:list:${params}`,
    WORK_DETAIL: (id: string) => `works:detail:${id}`,
    WORK_RELATED: (id: string) => `works:related:${id}`,
    WORK_STATS: (period: string) => `works:stats:${period}`
  } as const;
  
  static readonly TTL = {
    WORKS_LIST: 5 * 60, // 5分
    WORK_DETAIL: 30 * 60, // 30分
    WORK_RELATED: 60 * 60, // 1時間
    WORK_STATS: 24 * 60 * 60 // 24時間
  } as const;
  
  /**
   * 段階的キャッシュ戦略
   */
  static async getWithFallback<T>(
    cacheKey: string,
    fetchFn: () => Promise<T>,
    ttl: number
  ): Promise<T> {
    
    // 1. メモリキャッシュ確認
    const memoryCache = this.getFromMemory<T>(cacheKey);
    if (memoryCache && !this.isStale(memoryCache)) {
      return memoryCache.data;
    }
    
    // 2. Next.js Cache確認
    const nextCache = await this.getFromNextCache<T>(cacheKey);
    if (nextCache && !this.isStale(nextCache)) {
      this.setToMemory(cacheKey, nextCache.data, ttl);
      return nextCache.data;
    }
    
    // 3. データベースから取得
    try {
      const freshData = await fetchFn();
      
      // 4. 全レベルにキャッシュ保存
      await Promise.all([
        this.setToMemory(cacheKey, freshData, ttl),
        this.setToNextCache(cacheKey, freshData, ttl)
      ]);
      
      return freshData;
      
    } catch (error) {
      // 5. エラー時はstaleデータを返す
      if (nextCache) {
        return nextCache.data;
      }
      throw error;
    }
  }
  
  /**
   * 部分的キャッシュ無効化
   */
  static async invalidateWorkCache(workId: string): Promise<void> {
    const keysToInvalidate = [
      this.CACHE_KEYS.WORK_DETAIL(workId),
      this.CACHE_KEYS.WORK_RELATED(workId)
    ];
    
    await Promise.all(
      keysToInvalidate.map(key => this.invalidate(key))
    );
  }
  
  /**
   * 智能キャッシュ更新
   */
  static async smartUpdate(workId: string, newData: FrontendDLsiteWorkData): Promise<void> {
    // 1. 詳細キャッシュ更新
    await this.setToNextCache(
      this.CACHE_KEYS.WORK_DETAIL(workId),
      newData,
      this.TTL.WORK_DETAIL
    );
    
    // 2. 一覧キャッシュの部分更新
    await this.updateInListCaches(workId, newData);
    
    // 3. 関連キャッシュ再計算 (非同期)
    this.scheduleRelatedCacheUpdate(workId);
  }
}
```

## 📊 Performance Monitoring

### 1. パフォーマンス測定

```typescript
// apps/web/src/lib/work-performance.ts
export class WorkPerformanceMonitor {
  
  /**
   * API応答時間測定
   */
  static async measureAPIResponse<T>(
    operation: string,
    apiCall: () => Promise<T>
  ): Promise<{ data: T; metrics: PerformanceMetrics }> {
    
    const startTime = performance.now();
    const startMemory = performance.memory?.usedJSHeapSize || 0;
    
    try {
      const data = await apiCall();
      const endTime = performance.now();
      const endMemory = performance.memory?.usedJSHeapSize || 0;
      
      const metrics: PerformanceMetrics = {
        operation,
        responseTime: endTime - startTime,
        memoryDelta: endMemory - startMemory,
        timestamp: new Date().toISOString(),
        success: true
      };
      
      // 開発環境でのロギング
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Performance] ${operation}:`, metrics);
      }
      
      // プロダクション環境での監視データ送信
      if (process.env.NODE_ENV === 'production') {
        this.sendMetrics(metrics);
      }
      
      return { data, metrics };
      
    } catch (error) {
      const endTime = performance.now();
      
      const metrics: PerformanceMetrics = {
        operation,
        responseTime: endTime - startTime,
        timestamp: new Date().toISOString(),
        success: false,
        error: error.message
      };
      
      this.sendMetrics(metrics);
      throw error;
    }
  }
  
  /**
   * コンポーネントレンダリング最適化
   */
  static optimizeWorkListRendering(works: FrontendDLsiteWorkData[]): {
    priorityWorks: FrontendDLsiteWorkData[];
    deferredWorks: FrontendDLsiteWorkData[];
  } {
    // 上位5件は優先表示、残りは遅延読み込み
    return {
      priorityWorks: works.slice(0, 5),
      deferredWorks: works.slice(5)
    };
  }
}
```

## 🚀 実装ロードマップ (Server Actions中心)

### Phase 1: Server Actions強化 (1週間)
- [ ] `getWorks()` Server Action強化 - 統合データ活用
- [ ] `getWorkWithRelated()` Server Action新規実装
- [ ] データ変換ユーティリティ実装
- [ ] 基本的なキャッシュ戦略実装

### Phase 2: Frontend Integration (1週間)
- [ ] WorkCard コンポーネント強化 - 統合データ表示
- [ ] WorkDetail コンポーネント強化 - 全クリエイター情報表示
- [ ] データ品質インジケーター実装
- [ ] エラーハンドリング強化

### Phase 3: Performance Optimization (1週間)
- [ ] Next.js キャッシュ戦略実装
- [ ] ISR/SSG最適化
- [ ] パフォーマンス監視実装
- [ ] レスポンシブ画像最適化

### Phase 4: Advanced Features (1週間)
- [ ] 統計・分析 Server Action実装
- [ ] 関連作品推薦システム
- [ ] 検索機能強化
- [ ] 詳細フィルタリング強化

## 📚 関連ファイル

### 新規作成予定
- `/apps/web/src/lib/work-transformers.ts` - データ変換ユーティリティ
- `/apps/web/src/lib/work-cache.ts` - キャッシュ戦略
- `/apps/web/src/lib/work-performance.ts` - パフォーマンス監視

### 拡張対象
- `/apps/web/src/app/works/actions.ts` - Server Actions強化
- `/apps/web/src/app/works/components/WorkCard.tsx` - 統合データ対応
- `/apps/web/src/app/works/[workId]/components/WorkDetail.tsx` - 統合データ対応

### 設定ファイル
- `/apps/web/next.config.js` - キャッシュ設定
- `/apps/web/.env.local` - 環境設定

---

**📝 次のアクション**: Phase 1の実装開始 - Server Actions強化とデータ変換ユーティリティの作成

**🔄 更新頻度**: 実装進捗に応じて週次更新

**👥 関係者**: フルスタック開発者、UI/UXデザイナー
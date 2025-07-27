# 今後のEntity実装計画

**最終更新**: 2025-07-27  
**目的**: 未実装のEntity/Value Object拡張計画の簡潔な記録

## 未実装項目

### 1. 型名の簡潔化

**対象となる型**
- `DLsiteRawApiResponse` → `DLsiteApiResponse`
- `UnifiedDataCollectionMetadata` → `CollectionMetadata`
- `FirestoreFieldTimestamp` → `Timestamp`

**実装手順**
1. エイリアス導入で段階的移行
2. 新規コードから順次使用
3. 既存コードの段階的更新

### 2. WorkV2スキーマバージョニング

**目的**: 将来的なスキーマ変更への対応

**基本構造案**
```typescript
interface WorkV2 {
  id: string;
  version: 2;
  basic: {
    title: string;
    circle: CircleInfo;
    categories: Category[];
  };
  pricing: Price;
  rating: Rating;
  meta: {
    created: Timestamp;
    modified: Timestamp;
  };
}
```

### 3. 未実装エンティティ

**User Entity（完全実装）**
- 現在は簡易実装のみ
- UserRole値オブジェクトが必要

**Evaluation Entity**
- 作品評価システム用
- Top10Ranking, StarRating, NgEvaluation値オブジェクト

**PriceHistory Entity**
- 価格履歴追跡用
- PriceSnapshot値オブジェクト

## 実装優先度

1. **高**: 型名の簡潔化（既存コードへの影響大）
2. **中**: User Entityの完全実装
3. **低**: その他の新規エンティティ

## 参考資料

- 実装済みエンティティ: Work, Video, AudioButton
- 実装ガイド: `/docs/ENTITY_IMPLEMENTATION_GUIDE.md`
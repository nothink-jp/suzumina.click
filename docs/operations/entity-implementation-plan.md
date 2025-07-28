# Entity実装計画

**作成日**: 2025-07-28
**更新日**: 2025-07-28
**目的**: Entity化されていないコレクションの実装優先順位と計画

## 現在の実装状況

### ✅ 実装済みEntity
- **Work Entity** (`work-entity.ts`) - 完全実装済み
- **AudioButton Entity** (`audio-button.ts`) - 完全実装済み

### ❌ 未実装Entity
- Video Entity - 型定義のみ、クラス未実装
- Circle Entity - スキーマのみ
- その他多数

## 実装優先順位（更新版）

### Priority 1: コアビジネスエンティティ（即座に実装）

#### 1. Video Entity ← 最優先
- **重要度**: ⭐⭐⭐⭐⭐ 
- **理由**: 
  - メインコンテンツタイプ
  - 一覧ページで頻繁に使用
  - AudioButtonとの連携が必要
- **現状**: 
  - `video.ts`に型定義とインターフェースは存在
  - 値オブジェクトはインポート済み
  - **Entityクラスが未実装**
- **実装内容**:
  - VideoEntityクラスの実装（BaseEntity継承）
  - 既存の値オブジェクトを統合
  - ビジネスロジック（統計情報の集計等）


### Priority 2: サポートエンティティ（次のスプリント）

#### 2. Circle Entity
- **重要度**: ⭐⭐⭐⭐
- **理由**:
  - 作品の整理・分類に重要
  - 作品詳細ページで表示
- **現状**: スキーマのみ
- **実装内容**:
  - CircleEntityクラス
  - 作品数集計機能

### Priority 3: メタデータエンティティ（将来）

#### 5. DlsiteMetadata Entity
- **重要度**: ⭐⭐⭐
- **理由**: システム監視用
- **実装内容**: 同期状態管理

#### 6. YouTubeMetadata Entity  
- **重要度**: ⭐⭐⭐
- **理由**: 動画同期追跡
- **実装内容**: YouTube API同期管理

#### 7. CreatorWorkMapping Entity
- **重要度**: ⭐⭐⭐
- **理由**: クリエイター検索機能
- **実装内容**: リレーション管理

## 実装アプローチ

### 1. Work Entityから開始
- 最も重要かつ複雑
- 他のEntityのパターンを確立
- 既存の型定義を活用

### 2. DDDパターンの適用
- BaseEntityを継承
- 値オブジェクトの活用
- ドメインロジックの実装

### 3. 後方互換性の維持
- 既存の型定義は維持
- 段階的な移行戦略
- テストカバレッジ80%以上

## 実装スケジュール案

**Phase 1 (1-2週間)**
- Work Entity実装
- 関連値オブジェクト実装
- 既存コードの移行

**Phase 2 (1週間)**
- Video Entity実装
- AudioButton Entity完成

**Phase 3 (1週間)**
- Circle Entity実装
- CreatorWorkMapping実装

**Phase 4 (随時)**
- メタデータEntity実装
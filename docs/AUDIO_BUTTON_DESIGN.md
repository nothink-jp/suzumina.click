# 音声参照機能 実装ドキュメント（タイムスタンプ参照システム）

## 概要

suzumina.clickプロジェクトの音声参照機能として、**タイムスタンプ参照システム**を実装・完了しました。YouTube動画の音声ファイルを保存せず、特定時間への参照情報のみを保存することで、法的リスクを回避しつつ実用的な音声参照機能を提供します。

## ✅ 実装完了状況

**開発期間**: 2025年6月（Phase 2として完了）  
**実装状況**: 本格運用準備完了

### 実装済み機能
- ✅ **音声参照作成・編集システム**
- ✅ **タイムスタンプベース再生機能** 
- ✅ **メタデータ管理（タイトル・説明・タグ）**
- ✅ **音声参照一覧・検索機能**
- ✅ **レスポンシブデザイン・アクセシビリティ対応**

### 技術的実装
- ✅ 法的コンプライアンス確保（YouTube規約準拠）
- ✅ タイムスタンプ参照による軽量実装
- ✅ Firestore メタデータ管理
- ✅ YouTube Embed API統合

## 🎯 設計方針

### 採用された設計コンセプト
- **音声ファイル保存なし**: YouTube規約に完全準拠
- **タイムスタンプ参照**: 動画の特定時間区間への参照のみ
- **ユーザー主導作成**: 動画視聴中にリアルタイムで参照作成
- **コミュニティ共有**: ファン同士での名場面共有

### 技術的優位性
- ✅ 法的コンプライアンス確保
- ✅ 実装簡単（2週間で完成）
- ✅ ストレージコスト不要
- ✅ 既存インフラ活用

## 📱 画面設計・ユーザーフロー

### 1. 音声参照作成画面

```
┌─────────────────────────────────────┐
│ 🎵 音声参照を作成                     │
├─────────────────────────────────────┤
│ YouTube URL:                        │
│ [https://youtube.com/watch?v=...]   │
│                                     │
│ 開始時間: [01:23] 終了時間: [01:45]   │
│                                     │
│ タイトル:                           │
│ [「こんにちは」の挨拶]               │
│                                     │
│ 説明:                              │
│ [配信開始時の元気な挨拶シーン]        │
│                                     │
│ タグ: [挨拶] [配信開始] [元気]       │
│                                     │
│ [ プレビュー ]    [ 保存 ]          │
└─────────────────────────────────────┘
```

### 2. 音声参照一覧画面

```
┌─────────────────────────────────────┐
│ 🎵 音声参照一覧                      │
├─────────────────────────────────────┤
│ 🔍 [検索・フィルター]                │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ 🎥「こんにちは」の挨拶           │ │
│ │ └ 01:23-01:45 | 👁 42回         │ │
│ │ ▶️ [再生] 🔗 [共有]              │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 🎥 歌声サンプル                 │ │
│ │ └ 15:30-16:15 | 👁 28回         │ │
│ │ ▶️ [再生] 🔗 [共有]              │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

## 🏗️ システム構成

### データフロー
```
ユーザー入力 → 時間指定 → YouTube Embed URL生成 → Firestore保存 → 一覧表示
     ↓              ↓              ↓                ↓            ↓
  フォーム     タイムスタンプ    埋め込み再生URL   参照メタデータ  検索・フィルター
```

### コンポーネント構成

#### Server Components（表示・データ取得）
- **AudioReferenceList**: 音声参照一覧の表示
- **AudioReferenceCard**: 個別音声参照の表示
- **Page Components**: データプリロードとレイアウト

#### Client Components（インタラクション）
- **AudioReferenceCreator**: 音声参照作成フォーム
- **YouTubePlayer**: YouTube埋め込み再生
- **Pagination**: ページネーション
- **SearchForm**: 検索・フィルター

## 📊 データ構造

### Firestore: `audioReferences` コレクション

```typescript
interface FirestoreAudioReferenceData {
  // 基本情報
  id: string;                    // 音声参照ID
  title: string;                 // タイトル（1-100文字）
  description?: string;          // 説明（最大500文字）
  
  // YouTube動画参照情報
  videoId: string;               // YouTube動画ID
  videoTitle?: string;           // 動画タイトル
  startTime: number;             // 開始時刻（秒）
  endTime: number;               // 終了時刻（秒）
  youtubeEmbedUrl: string;       // 埋め込み再生URL
  
  // 分類・メタデータ
  tags?: string[];               // タグ配列（最大10個）
  category?: string;             // カテゴリ
  
  // 公開・権限設定
  isPublic: boolean;             // 公開/非公開
  createdBy?: string;            // 作成者（将来の認証用）
  
  // 統計情報
  playCount: number;             // 再生回数
  
  // 管理情報
  createdAt: Timestamp;          // 作成日時
  updatedAt: Timestamp;          // 更新日時
}
```

### URL生成ロジック

```typescript
function generateYouTubeEmbedUrl(videoId: string, startTime: number, endTime: number): string {
  return `https://www.youtube.com/embed/${videoId}?start=${startTime}&end=${endTime}&autoplay=1`;
}
```

## 🔧 実装詳細

### 1. Server Actions（データ操作）

#### 音声参照作成
```typescript
// apps/web/src/app/buttons/actions.ts
export async function createAudioReference(data: CreateAudioReferenceInput) {
  // 1. 入力データバリデーション
  // 2. YouTube URL解析・動画ID抽出
  // 3. 埋め込みURL生成
  // 4. Firestoreに保存
  // 5. 成功レスポンス
}
```

#### 音声参照一覧取得
```typescript
export async function getAudioReferences(query: AudioReferenceQuery) {
  // 1. クエリパラメータ解析
  // 2. Firestore複合クエリ実行
  // 3. ページネーション処理
  // 4. フロントエンド用データ変換
}
```

### 2. UIコンポーネント

#### AudioReferenceCreator（音声参照作成）
```typescript
'use client';

export function AudioReferenceCreator() {
  const [videoUrl, setVideoUrl] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [title, setTitle] = useState('');
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Server Action呼び出し
    await createAudioReference({
      videoUrl,
      startTime: parseTimeToSeconds(startTime),
      endTime: parseTimeToSeconds(endTime),
      title,
      // ...
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* フォーム実装 */}
    </form>
  );
}
```

#### YouTubePlayer（埋め込み再生）
```typescript
'use client';

interface YouTubePlayerProps {
  embedUrl: string;
  title: string;
}

export function YouTubePlayer({ embedUrl, title }: YouTubePlayerProps) {
  return (
    <div className="youtube-player">
      <iframe
        src={embedUrl}
        title={title}
        width="560"
        height="315"
        frameBorder="0"
        allowFullScreen
      />
    </div>
  );
}
```

### 3. 型定義（shared-types）

```typescript
// packages/shared-types/src/audio-reference.ts

// Zod スキーマ
export const AudioReferenceSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  videoId: z.string(),
  startTime: z.number().min(0),
  endTime: z.number().min(0),
  // ...
});

// 型定義
export type AudioReferenceData = z.infer<typeof AudioReferenceSchema>;

// 変換関数
export function convertToFrontendAudioReference(
  firestoreData: FirestoreAudioReferenceData
): FrontendAudioReferenceData {
  return {
    ...firestoreData,
    createdAt: firestoreData.createdAt.toDate(),
    updatedAt: firestoreData.updatedAt.toDate(),
  };
}
```

## 🔒 セキュリティ・制約

### Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 音声参照 - 公開分のみ読み取り可能
    match /audioReferences/{referenceId} {
      allow read: if resource.data.isPublic == true;
      allow write: if false; // 現在はServer Actionsのみ
    }
  }
}
```

### データ制約
- **時間制限**: 最大参照時間5分
- **タイトル制限**: 1-100文字
- **説明制限**: 最大500文字
- **タグ制限**: 最大10個、各タグ最大20文字

## 📈 運用・監視

### パフォーマンス監視
- Firestore読み書き操作数
- YouTube Embed API呼び出し数
- ページ読み込み時間
- ユーザーエンゲージメント

### 使用統計
- 音声参照作成数
- 再生回数
- 人気の参照時間帯
- タグ使用頻度

## 🎯 今後の拡張予定

### Phase 5 運用最適化（進行中）
- 検索・フィルター機能強化
- レスポンシブデザイン改善
- パフォーマンス最適化
- UX改善

### 将来検討項目
- ユーザー認証・権限管理
- 実音声ファイル機能（法的検討・コスト評価後）
- リアルタイム機能（WebSocket）
- CDN統合・配信最適化

## 📝 重要ファイル

### 実装ファイル
- `apps/web/src/app/buttons/` - 音声参照機能ページ
- `apps/web/src/components/AudioReference*` - UI コンポーネント
- `packages/shared-types/src/audio-reference.ts` - 型定義

### 設定ファイル
- `docs/FIRESTORE_STRUCTURE.md` - データ構造詳細
- `terraform/firestore_rules.tf` - セキュリティルール

## まとめ

音声参照機能は、**実音声ファイルを保存せずYouTube動画の特定区間への参照情報のみを管理する**軽量かつ法的コンプライアンスを重視したシステムとして実装されています。

この設計により、**著作権リスクを回避**しながら、ユーザーが声優「涼花みなせ」の魅力的な音声シーンを簡単に共有・発見できる実用的なプラットフォームを実現しています。

---

**最終更新**: 2025年6月20日  
**バージョン**: 2.0.0 (タイムスタンプ参照システム)  
**実装状況**: ✅ 完了・運用準備完了
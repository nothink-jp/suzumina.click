# YouTube動画種別判定と音声ボタン作成可否ルール

## 概要

涼花みなせ様の音声ボタン作成において、YouTube動画の種別を判定し、著作権とライブ配信ポリシーに基づいて作成可否を決定するためのルール定義です。

## 動画種別の判定ロジック

### 1. ライブ配信アーカイブ（音声ボタン作成**可能**）

**判定条件:**

```typescript
✅ snippet.liveBroadcastContent === "none"
✅ liveStreamingDetails が存在
✅ liveStreamingDetails.actualEndTime が存在
✅ contentDetails.duration > 15分 (900秒)
```

**説明:**
- 元々ライブ配信だったものが配信終了後にアーカイブとして保存された動画
- リアルタイムでの配信が終了し、実際の終了時刻が記録されている
- **動画時間が15分を超える**場合にライブ配信アーカイブと判定
- 涼花みなせ様のライブ配信は切り抜き・音声ボタン作成が許可されている

### 2. プレミア公開動画（音声ボタン作成**不可**）

**判定条件A（未終了プレミア）:**
```
❌ snippet.liveBroadcastContent === "none"
❌ liveStreamingDetails が存在
❌ liveStreamingDetails.scheduledStartTime が存在
❌ liveStreamingDetails.actualEndTime が存在しない
```

**判定条件B（終了済み短時間プレミア）:**
```
❌ snippet.liveBroadcastContent === "none"  
❌ liveStreamingDetails が存在
❌ liveStreamingDetails.actualEndTime が存在
❌ contentDetails.duration ≤ 15分 (900秒)
```

**説明:**
- **パターンA**: 予約公開されたが実際の終了時間が記録されていないプレミア公開動画
- **パターンB**: 実際に公開されたが**動画時間が15分以下**の短時間プレミア公開動画
- 事前にアップロードされた動画が特定時間にライブチャット付きで公開されたもの
- 通常動画と同様に著作権の関係上、音声ボタン作成は不可

### 3. 通常動画（音声ボタン作成**不可**）

**判定条件:**
```
❌ snippet.liveBroadcastContent === "none"
❌ liveStreamingDetails が存在しない
❌ contentDetails.duration !== "P0D"
```

**説明:**
- 一般的にアップロードされた動画
- 著作権の関係上、音声ボタン作成は不可

### 4. 配信中・配信予定（音声ボタン作成**不可**）

**判定条件:**
```
❌ snippet.liveBroadcastContent === "live" OR "upcoming"
```

**説明:**
- 現在配信中またはこれから配信予定の動画
- 配信終了後のアーカイブになるまで音声ボタン作成は不可

## API取得パラメータ

YouTube Data API v3の`videos:list`エンドポイントで以下のパートを指定：

```
part=snippet,contentDetails,liveStreamingDetails
```

## 実装フロー

```mermaid
flowchart TD
    A[YouTube動画ID取得] --> B[YouTube Data API呼び出し]
    B --> C{liveBroadcastContent確認}
    
    C -->|"live" or "upcoming"| D[❌ 配信中・配信予定<br/>作成不可]
    C -->|"none"| E{liveStreamingDetails存在?}
    
    E -->|存在しない| F[❌ 通常動画<br/>作成不可]
    E -->|存在する| G{actualEndTime存在?}
    
    G -->|存在しない| H[❌ プレミア公開<br/>(未終了)<br/>作成不可]
    G -->|存在する| I{動画時間15分以下?}
    
    I -->|15分以下| J[❌ プレミア公開<br/>(短時間)<br/>作成不可]
    I -->|15分超過| K[✅ ライブアーカイブ<br/>作成可能]
```

## エラーメッセージ

### 日本語メッセージ
- **配信中・配信予定**: 「ライブ配信は終了後のアーカイブでのみ音声ボタンを作成できます」
- **通常動画**: 「通常動画は著作権の関係上、音声ボタンの作成はできません」
- **プレミア公開**: 「プレミア公開動画は著作権の関係上、音声ボタンの作成はできません」

### 英語メッセージ（開発用）
- **Live/Upcoming**: "Audio buttons can only be created from archived live streams"
- **Regular Video**: "Audio buttons cannot be created from regular uploaded videos due to copyright restrictions"
- **Premiere Video**: "Audio buttons cannot be created from premiere videos due to copyright restrictions"

## 実装上の注意点

1. **API呼び出し最適化**: 既存のYouTube Data API呼び出しに`liveStreamingDetails`を追加
2. **キャッシュ対応**: 動画種別判定結果をキャッシュして重複API呼び出しを避ける
3. **エラーハンドリング**: API制限やネットワークエラーに対する適切な処理
4. **UI表示**: 音声ボタン作成画面で事前に動画種別を表示し、作成不可の場合は理由を明示

## 関連ファイル

- `packages/shared-types/src/audio-button.ts`: バリデーション関数の拡張
- `packages/shared-types/src/video.ts`: `parseDurationToSeconds`関数による時間解析
- `apps/web/src/app/buttons/actions.ts`: サーバーアクション内での動画種別チェック
- `apps/web/src/app/videos/actions.ts`: `getVideoType`関数による15分閾値判定
- `apps/web/src/app/videos/components/VideoCard.tsx`: UI表示での動画種別バッジ
- `apps/functions/src/services/youtube.ts`: YouTube Data API呼び出し処理

## 実装詳細

### 15分閾値判定の実装

```typescript
// apps/web/src/app/videos/actions.ts
const durationSeconds = parseDurationToSeconds(duration);
const fifteenMinutes = 15 * 60; // 900秒

if (durationSeconds > 0 && durationSeconds <= fifteenMinutes) {
  return "premiere"; // 15分以下はプレミア公開
}
return "live_archive"; // 15分超過は配信アーカイブ
```

### Duration解析関数

ISO 8601形式（例: `PT1H23M45S`）の動画時間を秒数に変換する`parseDurationToSeconds`関数を使用。

---

**最終更新**: 2025-07-17  
**バージョン**: 1.1 - 15分閾値判定の実装反映
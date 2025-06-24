# AudioPlayer コンポーネント簡素化

## 概要

AudioPlayerコンポーネントの複雑性を解消するため、再生機能に特化したシンプルな設計に変更しました。

## 変更前の問題点

- **高い複雑性**: 複数のuseEffectフック、多数のイベントリスナー、キーボード操作、ボリューム制御、シーク機能など
- **多すぎる機能**: 27個のプロパティ、3つのバリアント、複雑な状態管理
- **保守性の低下**: 600行以上のコード、多数のbiome-ignoreコメント

## 変更後の設計

### 核心機能に特化
- **再生/一時停止のみ**: 最も重要な機能に集中
- **シンプルなUI**: ボタン + タイトル表示のみ
- **軽量実装**: 189行のコード（約70%削減）

### プロパティの簡素化

```typescript
interface SimpleAudioPlayerProps {
	src: string;              // 音声ファイルURL（必須）
	title?: string;           // 表示タイトル
	autoPlay?: boolean;       // 自動再生
	className?: string;       // スタイルカスタマイズ
	onPlay?: () => void;      // 再生開始コールバック
	onPause?: () => void;     // 一時停止コールバック
	onEnded?: () => void;     // 再生終了コールバック
	onError?: (error: string) => void;  // エラーコールバック
	size?: "sm" | "md" | "lg";  // サイズ（3段階）
}
```

### 削除された機能
- ~~ボリューム制御~~
- ~~シーク機能（進行状況バー）~~
- ~~スキップボタン（前後10秒）~~
- ~~リプレイボタン~~
- ~~キーボード操作~~
- ~~複数バリアント~~
- ~~アクセシビリティ拡張機能~~

## 利点

### 1. 保守性の向上
- コード量の大幅削減（600行 → 189行）
- 単一責任原則の徹底
- biome-ignoreコメント不要

### 2. パフォーマンス改善
- 軽量な実装
- 少ないイベントリスナー
- シンプルな状態管理

### 3. 使いやすさ
- 直感的なAPI
- 最小限の設定で動作
- 明確な用途（音声ボタン用途）

## 使用例

```typescript
// 基本的な使用
<AudioPlayer src="audio.mp3" title="音声タイトル" />

// コールバック付き
<AudioPlayer 
  src="audio.mp3" 
  title="音声タイトル"
  onPlay={() => console.log('再生開始')}
  onError={(error) => console.error(error)}
/>

// 小さなサイズ
<AudioPlayer src="audio.mp3" size="sm" />
```

## 今後の拡張性

必要に応じて、以下の機能を別コンポーネントとして実装可能：

- `FullAudioPlayer`: ボリューム・シーク機能付き
- `MiniAudioButton`: 再生ボタンのみ
- `PlaylistPlayer`: 複数音声対応

## 移行ガイド

### 既存コードの置き換え

```typescript
// 変更前
<AudioPlayer 
  src="audio.mp3"
  title="音声"
  showProgress={false}
  showVolume={false}
  showSkipButtons={false}
  variant="minimal"
/>

// 変更後（シンプル）
<AudioPlayer 
  src="audio.mp3"
  title="音声"
  size="sm"
/>
```

## テスト

- 6個のテストケースで主要機能を網羅
- 簡素化されたテスト実装
- 高いテストカバレッジを維持

## Storybook

- 6個のストーリーで全パターンを確認
- 直感的なプロパティ設定
- 実装の簡素化による理解しやすさ

## 結論

AudioPlayerコンポーネントの簡素化により、suzumina.clickの音声ボタン機能により適した、保守しやすい実装を実現しました。複雑性を解消しながら、必要な機能は維持されています。
# AudioButtonコンポーネント実装

## 概要

AudioPlayerコンポーネントを、実音声ファイル用のAudioButtonコンポーネントとして再設計しました。suzumina.clickプロジェクトの音声ボタン機能に特化したコンポーネントです。

## 🎯 設計方針

### 実音声ファイル専用
- **タイムスタンプ参照ではなく実音声ファイル**: `audioUrl`で直接音声ファイルを指定
- **音声ボタンの型定義に準拠**: `@suzumina.click/shared-types/src/audio-button.ts`の設計に従った実装
- **カテゴリベースのスタイリング**: voice/bgm/se/talk/singing/otherの6カテゴリをサポート

### 機能の焦点
- **再生/一時停止のみ**: 最も重要な機能に集中
- **再生回数カウント**: 初回再生時のみカウント（重複防止）
- **時間表示**: duration引数による再生時間の表示
- **エラーハンドリング**: 音声ファイル読み込み失敗に対する適切な処理

## 📋 プロパティ仕様

```typescript
interface AudioButtonProps {
	/** 音声ファイルのURL（必須） */
	audioUrl: string;
	/** 音声ボタンのタイトル（必須） */
	title: string;
	/** 音声の長さ（秒） */
	duration?: number;
	/** 音声ボタンのカテゴリ */
	category?: "voice" | "bgm" | "se" | "talk" | "singing" | "other";
	/** 自動再生するかどうか */
	autoPlay?: boolean;
	/** 無効化するかどうか */
	disabled?: boolean;
	/** カスタムクラス名 */
	className?: string;
	/** サイズ */
	size?: "sm" | "md" | "lg";
	/** 再生開始時のコールバック */
	onPlay?: () => void;
	/** 一時停止時のコールバック */
	onPause?: () => void;
	/** 再生終了時のコールバック */
	onEnded?: () => void;
	/** エラー時のコールバック */
	onError?: (error: string) => void;
	/** 再生回数をカウントするコールバック */
	onPlayCountIncrement?: () => void;
}
```

## 🎨 カテゴリ別スタイリング

各音声カテゴリに応じた色分け：

- **voice** (ボイス): `text-pink-600` - ピンク
- **bgm** (BGM): `text-purple-600` - パープル  
- **se** (効果音): `text-yellow-600` - イエロー
- **talk** (トーク): `text-blue-600` - ブルー
- **singing** (歌唱): `text-red-600` - レッド
- **other** (その他): `text-gray-600` - グレー

## 📏 サイズバリエーション

### Small (`sm`)
- コンテナ: `gap-2 p-2`
- ボタン: `h-8 w-8`
- アイコン: `h-4 w-4`
- テキスト: `text-sm`
- 時間: `text-xs`

### Medium (`md`) - デフォルト
- コンテナ: `gap-3 p-3`
- ボタン: `h-10 w-10`
- アイコン: `h-5 w-5`
- テキスト: `text-base`
- 時間: `text-sm`

### Large (`lg`)
- コンテナ: `gap-4 p-4`
- ボタン: `h-12 w-12`
- アイコン: `h-6 w-6`
- テキスト: `text-lg`
- 時間: `text-sm`

## 🔧 主要機能

### 1. 再生回数カウント
```typescript
const hasPlayedRef = useRef(false);

const handlePlay = () => {
	setIsPlaying(true);
	onPlay?.();
	
	// 初回再生時のみ再生回数をカウント
	if (!hasPlayedRef.current) {
		hasPlayedRef.current = true;
		onPlayCountIncrement?.();
	}
};
```

### 2. 時間フォーマット
```typescript
const formatDuration = (seconds: number): string => {
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs.toString().padStart(2, "0")}`;
};
```

### 3. エラーハンドリング
- 音声ファイル読み込み失敗時の適切な表示
- 再生失敗時のフォールバック処理
- エラー状態でのボタン無効化

## 📦 使用例

### 基本的な使用
```typescript
<AudioButton 
	audioUrl="https://example.com/audio.mp3"
	title="サンプル音声"
	duration={83}
	category="voice"
/>
```

### コールバック付き
```typescript
<AudioButton 
	audioUrl="https://example.com/audio.mp3"
	title="サンプル音声"
	duration={83}
	category="voice"
	onPlay={() => console.log('再生開始')}
	onPlayCountIncrement={() => incrementPlayCount()}
	onError={(error) => handleError(error)}
/>
```

### サイズとカテゴリの組み合わせ
```typescript
<AudioButton 
	audioUrl="https://example.com/bgm.mp3"
	title="BGMサンプル"
	duration={120}
	category="bgm"
	size="lg"
/>
```

## 🧪 テスト

9個のテストケースで主要機能を網羅：

1. ✅ 基本的な音声ボタンが表示される
2. ✅ 再生ボタンをクリックすると再生される
3. ✅ 時間が表示される
4. ✅ カテゴリに応じたスタイルが適用される
5. ✅ 無効化状態で正しく動作する
6. ✅ エラーハンドリングが動作する
7. ✅ 再生終了時のコールバックが動作する
8. ✅ 異なるサイズで正しく表示される
9. ✅ 再生回数カウントが初回のみ実行される

## 📚 Storybook

10個のストーリーで全バリエーションを確認：

1. **Default**: 基本設定
2. **VoiceCategory**: ボイスカテゴリ
3. **BGMCategory**: BGMカテゴリ
4. **SECategory**: 効果音カテゴリ
5. **Small**: 小サイズ
6. **Large**: 大サイズ
7. **WithoutDuration**: 時間表示なし
8. **Disabled**: 無効化状態
9. **WithCallbacks**: コールバック付き
10. **AutoPlay**: 自動再生

## 🔄 AudioPlayerからの移行

### 削除された機能
- ~~ボリューム制御~~
- ~~シーク機能（進行状況バー）~~
- ~~スキップボタン~~
- ~~リプレイボタン~~
- ~~キーボード操作~~
- ~~複数バリアント~~

### 追加された機能
- ✅ **カテゴリベーススタイリング**
- ✅ **再生回数カウント（重複防止）**
- ✅ **時間表示フォーマット**
- ✅ **無効化サポート**

### プロパティの変更
```typescript
// AudioPlayer → AudioButton
src → audioUrl
showTitle → 常に表示（titleが必須）
variant → category（6種類のカテゴリ）
+ duration（時間表示）
+ disabled（無効化）
+ onPlayCountIncrement（再生回数カウント）
```

## 🎯 suzumina.clickでの活用

### 統合箇所
- `apps/web/src/components/` - 音声ボタン表示
- `apps/web/src/app/buttons/` - 音声ボタンページ
- 管理者インターフェース - 音声ボタン管理

### 型定義との連携
- `@suzumina.click/shared-types/src/audio-button.ts`
- `FrontendAudioButtonData`型との完全互換
- Server Actionsとのシームレスな連携

### パフォーマンス
- 軽量実装（258行）
- 最小限のイベントリスナー
- 効率的な状態管理

## 📋 ファイル構成

```
packages/ui/src/components/
├── audio-button.tsx          # メインコンポーネント
├── audio-button.test.tsx     # テスト（9件）
└── audio-button.stories.tsx  # Storybook（10パターン）
```

## 🎉 結論

AudioButtonコンポーネントは、suzumina.clickの実音声ファイル機能に特化した、シンプルで拡張性のあるコンポーネントとして実装されました。AudioPlayerの複雑性を解消しながら、音声ボタンに必要な機能をすべて提供しています。
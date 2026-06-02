/**
 * 遅延読み込み対応コンポーネント
 * Core Web Vitals改善のため、フォールドベロー（画面外）のコンポーネントを遅延読み込み
 *
 * 重い Featured*Carousel は `next/dynamic({ ssr: true, loading })` で chunk 分離し、
 * 各セクションの実 skeleton と同じ寸法の placeholder を表示する。
 * SSR を維持するため Mobile/SEO への副作用なし。
 */

import { LoadingSkeleton } from "@suzumina.click/ui/components/custom/loading-skeleton";
import dynamic from "next/dynamic";
import { lazy } from "react";

// 画面外のカルーセルコンポーネントを遅延読み込み
// LCP改善: サーバーコンポーネントではなくクライアントコンポーネントを直接使用
// ユーザー状態（いいね・低評価・お気に入り）はクライアントサイドで非同期取得
//
// 注: FeaturedAudioButtonsCarousel は SPR-71 Workstream C で初期 bundle から完全に
// 除外するため `audio-buttons-carousel-deferred.tsx` (React.lazy + mounted gate) に
// 移行済み。本ファイルには定義しない。

export const LazyFeaturedVideosCarousel = dynamic(
	() =>
		import("@/components/content/featured-videos-carousel").then(
			(module) => module.FeaturedVideosCarousel,
		),
	{
		loading: () => <LoadingSkeleton variant="carousel" height={300} />,
	},
);

export const LazyFeaturedWorksCarousel = dynamic(
	() =>
		import("@/components/content/featured-works-carousel").then(
			(module) => module.FeaturedWorksCarousel,
		),
	{
		loading: () => <LoadingSkeleton variant="carousel" height={350} />,
	},
);

// ユーザーメニューの遅延読み込み
export const LazyUserMenu = lazy(() =>
	import("@/components/user/user-menu").then((module) => ({ default: module.default })),
);

// 管理者機能の遅延読み込み
export const LazyAudioButtonCreator = lazy(() =>
	import("@/components/audio/audio-button-creator").then((module) => ({
		default: module.AudioButtonCreator,
	})),
);

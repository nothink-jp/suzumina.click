/**
 * 遅延読み込み対応コンポーネント
 * Core Web Vitals改善のため、フォールドベロー（画面外）のコンポーネントを遅延読み込み
 */

import { lazy } from "react";

// 画面外のカルーセルコンポーネントを遅延読み込み
export const LazyFeaturedAudioButtonsCarousel = lazy(() =>
	import("@/components/audio/featured-audio-buttons-carousel").then((module) => ({
		default: module.FeaturedAudioButtonsCarousel,
	})),
);

export const LazyFeaturedVideosCarousel = lazy(() =>
	import("@/components/content/featured-videos-carousel").then((module) => ({
		default: module.FeaturedVideosCarousel,
	})),
);

export const LazyFeaturedWorksCarousel = lazy(() =>
	import("@/components/content/featured-works-carousel").then((module) => ({
		default: module.FeaturedWorksCarousel,
	})),
);

// 検索フォームの遅延読み込み（オートコンプリート機能など重い処理）
export const LazySearchForm = lazy(() =>
	import("@/components/search/search-form").then((module) => ({ default: module.default })),
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

// データ取得付きセクションの遅延読み込み
export const LazyVideosSection = lazy(() =>
	import("@/components/sections/videos-section").then((module) => ({
		default: module.VideosSection,
	})),
);

export const LazyWorksSection = lazy(() =>
	import("@/components/sections/works-section").then((module) => ({
		default: module.WorksSection,
	})),
);

"use client";

import type { AudioButtonPlainObject } from "@suzumina.click/shared-types";
import { LoadingSkeleton } from "@suzumina.click/ui/components/custom/loading-skeleton";
import { lazy, Suspense, useEffect, useState } from "react";

/**
 * Featured AudioButtons Carousel を初期 bundle から完全に除外する client wrapper。
 *
 * 子の AudioButtonWithFavoriteClient が `useSession()` を呼ぶため、
 * 通常 import すると next-auth/react が `/` の初期 JS bundle に流入する。
 * `React.lazy` + `useEffect` で hydration 後にのみ chunk import を開始し、
 * 初期 bundle から完全に除外する (SPR-71 Workstream C 検証)。
 *
 * CLS 対策:
 * - SSR / hydration 初回: 同サイズの skeleton (h=280) を返す
 * - useEffect 発火後: lazy chunk の Suspense fallback も同じ skeleton
 * - chunk load 完了: 実 Carousel に差し替え (同サイズなので shift なし)
 *
 * 上位の AudioButtonsSection の Suspense fallback (AudioButtonsSectionSkeleton)
 * は data 取得待ち時に使用され、本 component の skeleton と高さ整合済み。
 */

const LazyCarousel = lazy(() =>
	import("@/components/audio/featured-audio-buttons-carousel").then((m) => ({
		default: m.FeaturedAudioButtonsCarousel,
	})),
);

export function AudioButtonsCarouselDeferred({
	audioButtons,
}: {
	audioButtons: AudioButtonPlainObject[];
}) {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	const fallback = <LoadingSkeleton variant="carousel" height={280} />;

	if (!mounted) return fallback;

	return (
		<Suspense fallback={fallback}>
			<LazyCarousel audioButtons={audioButtons} />
		</Suspense>
	);
}

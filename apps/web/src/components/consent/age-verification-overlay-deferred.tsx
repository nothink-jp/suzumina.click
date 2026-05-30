"use client";

import { lazy, Suspense, useEffect, useState } from "react";

/**
 * AgeVerificationOverlay を hydration 後に遅延ロードする wrapper (SPR-81 WS-A)。
 *
 * SPR-7 で overlay 方式に変更されコンテンツを非ブロック化済みのため、first paint 後の
 * 表示で UX 上の問題はない。`React.lazy` で初期 bundle から overlay の chunk を分離し、
 * mounted gate で hydration 後にのみ import + hydration することで、初期 hydration の
 * main-thread 占有を削減する。
 *
 * 注: `useAgeVerification` を参照するため、本コンポーネントは引き続き
 * AgeVerificationProvider の配下に配置する必要がある。
 */

const AgeVerificationOverlay = lazy(() =>
	import("@/components/consent/age-verification-overlay").then((m) => ({
		default: m.AgeVerificationOverlay,
	})),
);

export function AgeVerificationOverlayDeferred() {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) return null;

	return (
		<Suspense fallback={null}>
			<AgeVerificationOverlay />
		</Suspense>
	);
}

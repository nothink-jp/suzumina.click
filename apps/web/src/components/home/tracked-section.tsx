"use client";

import { type MouseEvent, type ReactNode, useEffect, useRef } from "react";
import { trackSectionClick, trackSectionView } from "@/lib/analytics/events";
import { type HomeSection, toLinkDestination } from "@/lib/analytics/home-section";
import { runWhenGaConfigured } from "@/lib/consent/google-consent-mode";

/**
 * 画面の上半分を「見られた」とみなす。セクションの上端が画面の中央線を越えた時点で届く。
 * 高さ比（threshold 0.5）にしないのは、スマホでは画面の 2 倍より高いセクションが 50% 見えることがなく、
 * 読み進めていても永遠に届かないため
 */
const VIEW_ROOT_MARGIN = "0px 0px -50% 0px";

/**
 * トップページの 1 セクションを包み、section_view / section_click を送る。
 *
 * 子（Server Component・Suspense 境界）はそのまま描画し、包むのはスタイルの無い div 1 枚だけ
 * （セクションの見た目と CLS 対策の skeleton には触れない）。
 * クリックは子孫の `<a href>` を委譲で拾う。ボタン（音声の再生など）は対象外で、再生は play_button が数える。
 */
export function TrackedSection({
	section,
	children,
}: {
	section: HomeSection;
	children: ReactNode;
}) {
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const element = ref.current;
		if (!element || typeof IntersectionObserver === "undefined") return;

		let cancelWait = () => {};
		const observer = new IntersectionObserver(
			(entries) => {
				if (!entries.some((entry) => entry.isIntersecting)) return;
				observer.disconnect();
				cancelWait = runWhenGaConfigured(() => trackSectionView(section));
			},
			{ rootMargin: VIEW_ROOT_MARGIN },
		);
		observer.observe(element);
		return () => {
			observer.disconnect();
			cancelWait();
		};
	}, [section]);

	const handleClickCapture = (event: MouseEvent<HTMLDivElement>) => {
		const anchor = (event.target as Element).closest?.("a[href]");
		if (!anchor || !event.currentTarget.contains(anchor)) return;
		const destination = toLinkDestination(
			anchor.getAttribute("href") ?? "",
			window.location.origin,
		);
		if (destination) trackSectionClick(section, destination);
	};

	return (
		<div ref={ref} data-home-section={section} onClickCapture={handleClickCapture}>
			{children}
		</div>
	);
}

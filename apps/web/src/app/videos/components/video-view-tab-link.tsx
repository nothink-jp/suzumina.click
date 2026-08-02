"use client";

import Link from "next/link";
import { trackVideoTabSelect } from "@/lib/analytics/events";

interface VideoViewTabLinkProps {
	href: string;
	label: string;
	/** GA4 に送るビュー識別子（VideoViewTab の値） */
	tab: string;
	isActive: boolean;
}

/**
 * ビュータブ1つ分。計測（onClick）のためだけに client にしている（SPR-305）。
 * 受け取るのは文字列と真偽値だけ＝server shell から関数 prop を渡さない
 * （渡すと server 描画文脈で "Functions cannot be passed to Client Components" になる）。
 */
export function VideoViewTabLink({ href, label, tab, isActive }: VideoViewTabLinkProps) {
	return (
		<Link
			href={href}
			aria-current={isActive ? "page" : undefined}
			onClick={() => trackVideoTabSelect(tab)}
			className={
				isActive
					? "rounded-full bg-primary text-primary-foreground text-sm px-4 py-1.5 font-medium"
					: "rounded-full border text-sm px-4 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
			}
		>
			{label}
		</Link>
	);
}

// next/link の design-sync 用 shim。本物の next/link は Next.js ランタイム
// （process.env.__NEXT_* / process.nextTick）を IIFE 初期化時に参照して
// "process is not defined" でバンドル全体を落とすため、プレビューでは素の <a> に置換する。
// Storybook も next/navigation のみ mock しており next/link は実体だが、Storybook(vite)は
// process define を持つので問題にならない。standalone バンドルではこちらを使う。
import * as React from "react";

// Next 固有の props は DOM に渡さず落とす（React の unknown-attribute 警告回避）。
const NEXT_ONLY = new Set([
	"prefetch",
	"replace",
	"scroll",
	"shallow",
	"passHref",
	"legacyBehavior",
	"locale",
	"as",
	"onNavigate",
]);

type LinkProps = {
	href?: string | { pathname?: string };
	children?: React.ReactNode;
	[key: string]: unknown;
};

export default function Link({ href, children, ...rest }: LinkProps) {
	const h = typeof href === "string" ? href : (href?.pathname ?? "#");
	const domProps: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(rest)) {
		if (!NEXT_ONLY.has(k)) domProps[k] = v;
	}
	return React.createElement("a", { href: h, ...domProps }, children as React.ReactNode);
}

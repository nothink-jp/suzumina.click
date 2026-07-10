import type { ReactNode } from "react";

/**
 * buttons セグメントの layout（SPR-251 spike）。
 * @modal parallel route を受け、一覧の上に詳細モーダルを重ねる。
 * 直接アクセス・リロード時は @modal が default.tsx（null）になり、
 * children（一覧 or フル詳細ページ）のみが表示される＝OGP 受け皿は温存される。
 */
export default function ButtonsLayout({
	children,
	modal,
}: {
	children: ReactNode;
	modal: ReactNode;
}) {
	return (
		<>
			{children}
			{modal}
		</>
	);
}

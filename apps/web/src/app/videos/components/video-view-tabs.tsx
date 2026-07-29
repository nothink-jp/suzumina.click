import Link from "next/link";

export type VideoViewTab = "newest" | "pickable" | "live_upcoming";

/** 現在の searchParams からアクティブなビューを判定する（URL が状態の正本） */
export function resolveVideoViewTab(params: { videoType?: string; sort?: string }): VideoViewTab {
	if (params.videoType === "live_upcoming") {
		return "live_upcoming";
	}
	if (params.sort === "least_buttons") {
		return "pickable";
	}
	return "newest";
}

const TABS: Array<{ key: VideoViewTab; label: string; href: string }> = [
	{ key: "newest", label: "新着", href: "/videos" },
	// 拾える配信 = 配信アーカイブ × ボタンが少ない順（S4「どの配信を拾うか決める」の家）
	{
		key: "pickable",
		label: "拾える配信",
		href: "/videos?videoType=live_archive&sort=least_buttons",
	},
	{ key: "live_upcoming", label: "配信中・予定", href: "/videos?videoType=live_upcoming" },
];

/**
 * 動画一覧のビュー切り替えタブ（導線再設計 段3）。
 * 実体はフィルタ＋ソートのプリセットへの Link で、状態は URL に持たせる
 * （ConfigurableList も URL を正本にしているため二重管理にならない）。
 */
export function VideoViewTabs({ active }: { active: VideoViewTab }) {
	return (
		<nav aria-label="動画の見方" className="flex flex-wrap gap-2">
			{TABS.map((tab) => (
				<Link
					key={tab.key}
					href={tab.href}
					aria-current={active === tab.key ? "page" : undefined}
					className={
						active === tab.key
							? "rounded-full bg-primary text-primary-foreground text-sm px-4 py-1.5 font-medium"
							: "rounded-full border text-sm px-4 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
					}
				>
					{tab.label}
				</Link>
			))}
		</nav>
	);
}

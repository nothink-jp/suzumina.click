import { AUDIO_BUTTON_USAGE_TAGS } from "@suzumina.click/shared-types";
import { cn } from "@suzumina.click/ui/lib/utils";
import Link from "next/link";

/**
 * 一覧の表示切替（すべて/用途別/動画ごと）と公式用途タグのチップ行（SPR-257 PR②）。
 * しぐれういボタンの「全一覧/会話用途別/元動画別」と同型の3ビュー構造。
 * 状態は持たず URL で表現する（ビュー切替はフィルタをクリアした素の遷移・チップは ?tags= 絞り込み）。
 * デザイン正本: Claude Design「ボタン一覧.dc.html」（改訂版）
 */

export type ButtonsView = "all" | "usage" | "video";

const VIEWS: Array<{ view: ButtonsView; label: string; href: string }> = [
	{ view: "all", label: "すべて", href: "/buttons" },
	{ view: "usage", label: "用途別", href: "/buttons?view=usage" },
	{ view: "video", label: "動画ごと", href: "/buttons?view=video" },
];

interface ButtonsViewNavProps {
	currentView: ButtonsView;
	/** 現在の ?tags= 絞り込み（チップの active 表示用） */
	activeTags?: string[];
}

export function ButtonsViewNav({ currentView, activeTags = [] }: ButtonsViewNavProps) {
	return (
		<div className="mb-4 flex flex-col gap-3">
			<nav aria-label="表示切替" className="flex">
				<div className="inline-flex gap-0.5 rounded-full bg-muted p-[3px]">
					{VIEWS.map(({ view, label, href }) => (
						<Link
							key={view}
							href={href}
							aria-current={currentView === view ? "page" : undefined}
							className={cn(
								"rounded-full px-4 py-1.5 text-[13px] font-bold no-underline transition-colors",
								"focus-visible:outline-3 focus-visible:outline-suzuka-400 focus-visible:outline-offset-2",
								currentView === view
									? "bg-card text-foreground shadow"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							{label}
						</Link>
					))}
				</div>
			</nav>

			<div className="flex flex-wrap items-center gap-2">
				<span className="mr-0.5 text-xs font-bold text-muted-foreground">タグ:</span>
				{AUDIO_BUTTON_USAGE_TAGS.map((tag) => {
					const active = activeTags.includes(tag);
					return (
						<Link
							key={tag}
							href={`/buttons?tags=${encodeURIComponent(tag)}`}
							className={cn(
								"rounded-full border border-border px-3.5 py-1.5 text-xs font-bold no-underline transition-colors",
								"focus-visible:outline-3 focus-visible:outline-suzuka-400 focus-visible:outline-offset-2",
								active
									? "border-suzuka-500 bg-suzuka-500 text-white"
									: "bg-secondary text-secondary-foreground hover:border-suzuka-300",
							)}
						>
							{tag}
						</Link>
					);
				})}
			</div>
		</div>
	);
}

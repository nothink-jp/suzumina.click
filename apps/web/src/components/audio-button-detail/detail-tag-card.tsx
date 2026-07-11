import { Tag } from "lucide-react";
import Link from "next/link";

/**
 * タグカード（SPR-255）: タグを押すと同タグの一覧フィルタへ遷移する回遊導線。
 * タグ編集はここでは行わない（作成者は編集ページで行う・確定済み）。
 */

interface DetailTagCardProps {
	tags: string[];
}

export function DetailTagCard({ tags }: DetailTagCardProps) {
	if (tags.length === 0) {
		return null;
	}
	return (
		<section className="rounded-[20px] border border-border bg-card px-[18px] py-4">
			<p className="mb-2.5 text-[11px] font-bold tracking-[0.1em] text-muted-foreground">タグ</p>
			<div className="flex flex-wrap gap-2">
				{tags.map((tag) => (
					<Link
						key={tag}
						href={`/buttons?tags=${encodeURIComponent(tag)}`}
						className="inline-flex items-center gap-1.5 rounded-full border border-suzuka-200 bg-suzuka-50 px-3.5 py-1.5 text-[13px] font-bold text-suzuka-800 transition-colors hover:border-suzuka-500 hover:bg-suzuka-500 hover:text-white"
					>
						<Tag className="h-3 w-3" />
						{tag}
					</Link>
				))}
			</div>
			<p className="mt-2.5 text-[11.5px] text-muted-foreground">
				タグを押すと同じタグのボタンを一覧で探せます
			</p>
		</section>
	);
}
